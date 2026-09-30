import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import { EldEvent, IEventValidator } from '@/types/events';
import { addErrorMessage } from '../utils/messageHandler';
import { useTimeZoneHelper } from '@/helpers/timezone';
import { CERTIFICATION_EVENTS } from '../utils/eventUtils';

dayjs.extend(duration);

const { acceptAsTimeZone } = useTimeZoneHelper();

/**
 * Odometer validator
 * Validates odometer readings for errors and inconsistencies
 * 
 * Single Responsibility: Only validates odometer readings
 */
export class OdometerValidator implements IEventValidator {
  private readonly UNRELIABLE_STATUSES = CERTIFICATION_EVENTS;
  private readonly SUSPICIOUS_STATUSES = ['INTER_NORMAL_PRECISION', 'INTER_REDUCED_PERCISION'];

  /**
   * Validate odometer readings
   * @param events - Array of events to validate
   */
  validate(events: EldEvent[]): void {
    if (!events || !Array.isArray(events)) {
      console.error('Invalid input: events must be an array.');
      return;
    }

    events.forEach((event, index) => {
      if (!event || typeof event !== 'object') {
        console.warn(`Invalid event at index ${index}: Skipping.`);
        return;
      }

      if (this.isUnreliableStatus(event)) {
        return;
      }

      const previousEvent = events[index - 1];

      // Check for odometer decrease
      if (previousEvent && typeof previousEvent === 'object' && 
          !this.isUnreliableStatus(previousEvent)) {
        this.checkOdometerDecrease(event, previousEvent);
      }

      // Check for missing odometer
      if (previousEvent && typeof previousEvent === 'object' && 
          !event.totalVehicleMiles && !this.isUnreliableStatus(event)) {
        addErrorMessage(event, 'Odometer missing');
      }

      // Check for odometer not changing after driving
      this.checkOdometerChangeAfterDriving(events, event, index);
    });
  }

  /**
   * Check if event has unreliable status
   */
  private isUnreliableStatus(event: EldEvent): boolean {
    return this.UNRELIABLE_STATUSES.includes(event.eventCodeDescription as any);
  }

  /**
   * Check if odometer decreased
   */
  private checkOdometerDecrease(currentEvent: EldEvent, previousEvent: EldEvent): void {
    const currentOdometer = Number(currentEvent.totalVehicleMiles);
    const previousOdometer = Number(previousEvent.totalVehicleMiles);

    if (!isNaN(currentOdometer) && !isNaN(previousOdometer) && 
        currentOdometer < previousOdometer) {
      addErrorMessage(currentEvent, 'Odometer is less than the previous status');
    }
  }

  /**
   * Check if odometer changed after driving
   */
  private checkOdometerChangeAfterDriving(
    events: EldEvent[], 
    currentEvent: EldEvent, 
    currentIndex: number
  ): void {
    const previousValidEvent = events
      .slice(0, currentIndex)
      .findLast((event: EldEvent) => !this.isUnreliableStatus(event)) || null;

    if (!previousValidEvent) {
      return;
    }

    const durationInMinutes = Math.abs(
      dayjs.duration(
        acceptAsTimeZone(previousValidEvent.dateTime).diff(acceptAsTimeZone(currentEvent.dateTime))
      ).asMinutes()
    );

    const isDrivingOrIntermediate = this.isDrivingOrIntermediate(currentEvent);
    const wasDrivingOrIntermediate = this.isDrivingOrIntermediate(previousValidEvent);

    // Odometer didn't change after driving
    if (previousValidEvent.totalVehicleMiles === currentEvent.totalVehicleMiles && 
        durationInMinutes > 5 && 
        ['DS_D', ...this.SUSPICIOUS_STATUSES].includes(currentEvent.eventCodeDescription)) {
      addErrorMessage(currentEvent, "Odometer didn't change after driving");
    }
    // Odometer changed when it shouldn't
    else if (!wasDrivingOrIntermediate && 
             isDrivingOrIntermediate &&
             previousValidEvent.totalVehicleMiles !== currentEvent.totalVehicleMiles) {
      addErrorMessage(currentEvent, "Odometer changed");
    }
  }

  /**
   * Check if event is driving or intermediate
   */
  private isDrivingOrIntermediate(event: EldEvent): boolean {
    return ['DS_D', 'INTER_NORMAL_PRECISION', 'INTER_REDUCED_PERCISION']
      .includes(event.eventCodeDescription);
  }
}

/**
 * Odometer Jump and Location Change validator
 * Validates odometer jumps and location changes
 */
export class OdometerJumpLocationValidator implements IEventValidator {
  /**
   * Validate odometer jumps and location changes
   * @param events - Array of events to validate
   */
  validate(events: EldEvent[]): void {
    const filteredEvents = events.filter((event) => !this.isCertificationEvent(event));

    // Find the first occurrence of "DS_D"
    const firstDSDIndex = filteredEvents.findIndex(event => event?.eventCodeDescription === "DS_D");

    // Slice the data points starting from the first "DS_D"
    const relevantEvents = firstDSDIndex !== -1 ? filteredEvents.slice(firstDSDIndex) : filteredEvents;

    // Iterate through the relevant data points
    for (let i = 0; i < relevantEvents.length - 1; i++) {
      const currentEvent = relevantEvents[i];
      const nextEvent = relevantEvents[i + 1];

      // Skip comparison if either point is driving/intermediate
      if (this.isDrivingOrIntermediate(currentEvent) || 
          this.isDrivingOrIntermediate(nextEvent)) {
        continue;
      }

      // Find the next point's original index in the full dataset
      const nextEventOriginalIndex = events.findIndex(event => event?.id === nextEvent?.id);
      if (nextEventOriginalIndex === -1) continue;

      const nextEventOriginal = events[nextEventOriginalIndex];

      // Check for odometer jump
      if (currentEvent?.totalVehicleMiles && nextEvent?.totalVehicleMiles &&
          currentEvent.totalVehicleMiles > nextEvent.totalVehicleMiles) {
        addErrorMessage(nextEventOriginal, "Odometer Jump");
      }

      // Skip login/logout events
      if (this.isLoginLogoutEvent(currentEvent) || this.isLoginLogoutEvent(nextEvent)) {
        continue;
      }

      // Check for location change
      if (currentEvent?.calculatedLocation !== nextEvent?.calculatedLocation) {
        addErrorMessage(nextEventOriginal, "Location Changed");
      }
    }
  }

  private isCertificationEvent(event: EldEvent): boolean {
    return event.eventCodeDescription.startsWith('DR_CERT_');
  }

  private isDrivingOrIntermediate(event: EldEvent): boolean {
    return ['DS_D', 'INTER_NORMAL_PRECISION', 'INTER_REDUCED_PERCISION']
      .includes(event.eventCodeDescription);
  }

  private isLoginLogoutEvent(event: EldEvent): boolean {
    return event.eventType === 5;
  }
}

// Export singleton instances
export const odometerValidator = new OdometerValidator();
export const odometerJumpLocationValidator = new OdometerJumpLocationValidator();
