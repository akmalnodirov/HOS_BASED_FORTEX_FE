import dayjs from 'dayjs';
import { EldEvent, IEventValidator } from '@/types/events';
import { addErrorMessage } from '../utils/messageHandler';
import { calculateDurationBetweenEvents } from '../utils/dateUtils';
import { CERTIFICATION_EVENTS } from '../utils/eventUtils';

/**
 * Processed event with timestamp
 */
interface ProcessedEvent extends EldEvent {
  timestamp: number;
  vehicleId?: string;
}

/**
 * Engine hours validator
 * Validates engine hours correctness between consecutive events
 * 
 * Single Responsibility: Only validates engine hours
 */
export class EngineHoursValidator implements IEventValidator {
  private readonly ENG_UP_NORMAL = "ENG_UP_NORMAL";
  private readonly ENG_DOWN_NORMAL = "ENG_DOWN_NORMAL";
  private readonly IGNORED_EVENTS = new Set([
    ...CERTIFICATION_EVENTS,
    "DR_LOGOUT",
    "DR_LOGIN"
  ]);
  
  private errorCount = 0;

  /**
   * Validate engine hours
   * @param events - Array of events to validate
   */
  validate(events: EldEvent[]): void {
    this.errorCount = 0;
    
    const { processedEvents, engineStatusChanges, maxEngineHours } = this.prepareEvents(events);
    const eventMap = this.createEventMap(processedEvents);

    if (engineStatusChanges.length === 0) {
      return;
    }

    this.processEngineStatusChanges(
      processedEvents,
      engineStatusChanges,
      maxEngineHours,
      eventMap
    );

    console.log('Engine hours error count:', this.errorCount);
  }

  /**
   * Prepare and filter events
   */
  private prepareEvents(events: EldEvent[]): {
    processedEvents: ProcessedEvent[];
    engineStatusChanges: ProcessedEvent[];
    maxEngineHours: number;
  } {
    const processedEvents: ProcessedEvent[] = [];
    const engineStatusChanges: ProcessedEvent[] = [];
    let maxEngineHours = -Infinity;

    events.forEach(event => {
      if (event.totalEngineHours && event.totalEngineHours > maxEngineHours) {
        maxEngineHours = event.totalEngineHours;
      }

      if (!this.IGNORED_EVENTS.has(event.eventCodeDescription)) {
        const processedEvent: ProcessedEvent = {
          ...event,
          timestamp: dayjs(event.dateTime).valueOf()
        };
        processedEvents.push(processedEvent);

        if (this.isEngineStatusChange(event)) {
          engineStatusChanges.push(processedEvent);
        }
      }
    });

    processedEvents.reverse();
    engineStatusChanges.reverse();

    return { processedEvents, engineStatusChanges, maxEngineHours };
  }

  /**
   * Check if event is an engine status change
   */
  private isEngineStatusChange(event: EldEvent): boolean {
    return event.eventCodeDescription === this.ENG_UP_NORMAL ||
           event.eventCodeDescription === this.ENG_DOWN_NORMAL;
  }

  /**
   * Create event map for quick lookup
   */
  private createEventMap(events: ProcessedEvent[]): Map<string, ProcessedEvent> {
    const eventMap = new Map<string, ProcessedEvent>();
    events.forEach(event => {
      const key = `${event.id}_${event.timestamp}_${event.eventCodeDescription}`;
      eventMap.set(key, event);
    });
    return eventMap;
  }

  /**
   * Process engine status changes
   */
  private processEngineStatusChanges(
    processedEvents: ProcessedEvent[],
    engineStatusChanges: ProcessedEvent[],
    maxEngineHours: number,
    eventMap: Map<string, ProcessedEvent>
  ): void {
    const firstStatusTimestamp = engineStatusChanges[0].timestamp;
    const eventsAfterFirstChange = processedEvents.filter(
      event => event.timestamp > firstStatusTimestamp
    );

    let currentVehicleId: string | null = null;
    let currentMaxEngineHours = maxEngineHours;

    if (eventsAfterFirstChange.length > 0) {
      [currentVehicleId, currentMaxEngineHours] = this.processVehicleEngineHours(
        currentVehicleId,
        eventsAfterFirstChange,
        currentMaxEngineHours
      );
      currentMaxEngineHours = this.validateEngineHours(
        eventsAfterFirstChange,
        currentMaxEngineHours,
        eventMap
      );
    }

    // Process sliding window for each status change
    let windowStartIndex = 0;
    let currentVehicleIdForStatus = currentVehicleId;

    for (let index = engineStatusChanges.length - 1; index >= 0; index--) {
      const statusChange = engineStatusChanges[index];
      const endTimestamp = statusChange.timestamp;
      const startTimestamp = index > 0 ? engineStatusChanges[index - 1].timestamp : Infinity;

      const eventIndex = processedEvents.findIndex(
        event => event.timestamp === statusChange.timestamp &&
                event.eventCodeDescription === statusChange.eventCodeDescription
      );

      const relevantEvents: ProcessedEvent[] = [];
      
      for (let i = windowStartIndex; i < processedEvents.length; i++) {
        const event = processedEvents[i];
        if (event.timestamp > startTimestamp) continue;
        if (event.timestamp < endTimestamp) break;
        relevantEvents.push(event);
      }

      windowStartIndex = eventIndex + 1;

      if (index === engineStatusChanges.length - 1) {
        relevantEvents.push(...processedEvents.slice(0, eventIndex + 1));
      }

      [currentVehicleIdForStatus, currentMaxEngineHours] = this.processVehicleEngineHours(
        currentVehicleIdForStatus,
        relevantEvents,
        currentMaxEngineHours
      );
      currentMaxEngineHours = this.validateEngineHours(
        relevantEvents,
        currentMaxEngineHours,
        eventMap
      );
    }
  }

  /**
   * Process vehicle engine hours for vehicle changes
   */
  private processVehicleEngineHours(
    currentVehicleId: string | null,
    events: ProcessedEvent[],
    maxEngineHours: number
  ): [string | null, number] {
    if (!currentVehicleId) {
      const eventWithId = events.slice().reverse().find(event => event.vehicleId);
      currentVehicleId = eventWithId?.vehicleId || null;
    }

    const differentVehicleEvents = events.filter(
      event => event.vehicleId?.toString() !== currentVehicleId?.toString()
    );

    if (differentVehicleEvents.length > 0) {
      const lastEvent = differentVehicleEvents[differentVehicleEvents.length - 1];
      currentVehicleId = lastEvent?.vehicleId || null;
      maxEngineHours = lastEvent?.totalEngineHours || maxEngineHours;
    }

    return [currentVehicleId, maxEngineHours];
  }

  /**
   * Validate engine hours between consecutive events
   */
  private validateEngineHours(
    events: ProcessedEvent[],
    maxEngineHours: number,
    eventMap: Map<string, ProcessedEvent>
  ): number {
    let currentMaxEngineHours = maxEngineHours;

    for (let i = 0; i < events.length - 1; i++) {
      const currentEvent = events[i];
      const nextEvent = events[i + 1];

      const engineHoursDiff = parseFloat(
        (currentEvent.totalEngineHours! - nextEvent.totalEngineHours!).toFixed(1)
      );
      const minutesDiff = calculateDurationBetweenEvents(currentEvent, nextEvent);

      if (currentEvent.eventCodeDescription !== this.ENG_UP_NORMAL) {
        const expectedEngineHours = this.calculateExpectedEngineHours(minutesDiff);
        currentMaxEngineHours = parseFloat((currentMaxEngineHours - expectedEngineHours).toFixed(1));
        this.checkEngineHoursMismatch(
          currentEvent,
          engineHoursDiff,
          expectedEngineHours,
          eventMap
        );
      }
    }

    return currentMaxEngineHours;
  }

  /**
   * Check for engine hours mismatch
   */
  private checkEngineHoursMismatch(
    event: ProcessedEvent,
    actualDiff: number,
    expectedDiff: number,
    eventMap: Map<string, ProcessedEvent>
  ): void {
    if (actualDiff !== expectedDiff) {
      const key = `${event.id}_${event.timestamp}_${event.eventCodeDescription}`;
      const matchingEvent = eventMap.get(key);
      
      if (matchingEvent && Math.round(10 * (actualDiff - expectedDiff)) / 10 > 0.1) {
        const errorMessage = `Engine Hours incorrect: Current (${actualDiff}), Correct (${expectedDiff})`;
        addErrorMessage(matchingEvent, errorMessage, errorMessage);
        this.errorCount++;
      }
    }
  }

  /**
   * Calculate expected engine hours based on duration
   */
  private calculateExpectedEngineHours(minutesDiff: number): number {
    if (minutesDiff < 6) return 0.0;
    if (minutesDiff < 12) return 0.1;

    const hoursDecimal = 0.0166666666666667 * minutesDiff;
    const [hours, decimal] = hoursDecimal > -1 
      ? hoursDecimal.toString().split('.') 
      : ['0', '0'];
    
    return parseFloat(`${hours}.${decimal?.charAt(0) || '0'}`);
  }
}

// Export singleton instance
export const engineHoursValidator = new EngineHoursValidator();
