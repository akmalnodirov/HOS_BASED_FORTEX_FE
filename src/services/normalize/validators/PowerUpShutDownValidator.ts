import dayjs from 'dayjs';
import { EldEvent, IEventValidator, PinTime } from '@/types/events';
import { addErrorMessage } from '../utils/messageHandler';
import { CERTIFICATION_EVENTS } from '../utils/eventUtils';

/**
 * Power up/shut down validator
 * Validates power up and shut down events
 * 
 * Single Responsibility: Only validates power up/shut down events
 */
export class PowerUpShutDownValidator implements IEventValidator {
  private readonly CERT_EVENTS = CERTIFICATION_EVENTS;
  private readonly SHUT_DOWN_EVENT = "ENG_DOWN_NORMAL";
  private readonly POWER_UP_EVENT = "ENG_UP_NORMAL";
  private readonly NO_POWER_UP = 'No Power-up Event';
  private readonly NO_SHUT_DOWN = 'No Shut-down Event';
  private readonly ERROR_MESSAGES = {
    NO_POWER_UP: "No Power-up Event Error",
    NO_SHUT_DOWN: "No Shut-down Event Error"
  };

  /**
   * Validate power up/shut down events
   * @param events - Array of events to validate
   * @param pinTimes - Array of pin times
   */
  validate(events: EldEvent[], pinTimes: PinTime[] = []): void {
    if (!pinTimes || pinTimes.length === 0) {
      return;
    }

    const { processedEvents, processedTimes } = this.preprocessEventsAndTimes(events, pinTimes);
    let eventIndex = 0;

    processedTimes.forEach((timeItem, timeIndex) => {
      eventIndex = this.processTimeItem(
        processedEvents,
        processedTimes,
        timeItem,
        timeIndex,
        eventIndex
      );
    });
  }

  /**
   * Preprocess events and times to add timestamps
   */
  private preprocessEventsAndTimes(
    events: EldEvent[],
    times: PinTime[]
  ): {
    processedEvents: Array<EldEvent & { timestamp: number }>;
    processedTimes: Array<PinTime & { timestamp: number }>;
  } {
    return {
      processedEvents: events.map(ev => ({
        ...ev,
        timestamp: dayjs(ev.dateTime).valueOf()
      })),
      processedTimes: times.map(timeItem => ({
        ...timeItem,
        timestamp: dayjs(timeItem.time).valueOf()
      }))
    };
  }

  /**
   * Process a single time item
   */
  private processTimeItem(
    events: Array<EldEvent & { timestamp: number }>,
    times: Array<PinTime & { timestamp: number }>,
    timeItem: PinTime & { timestamp: number },
    timeIndex: number,
    eventIndex: number
  ): number {
    const validEvents: Array<EldEvent & { timestamp: number }> = [];
    let newEventIndex = eventIndex;

    // Build valid events up to timeItem
    for (let i = eventIndex; i < events.length && events[i].timestamp <= timeItem.timestamp; i++) {
      if (!this.CERT_EVENTS.includes(events[i].eventCodeDescription as any)) {
        validEvents.push(events[i]);
      }
      newEventIndex = i + 1;
    }

    if (validEvents.length > 0) {
      this.checkPowerUpCondition(events, timeItem, newEventIndex);
      this.checkShutDownCondition(events, times, timeItem, timeIndex, newEventIndex);
    }

    return newEventIndex;
  }

  /**
   * Check power-up condition
   */
  private checkPowerUpCondition(
    events: Array<EldEvent & { timestamp: number }>,
    timeItem: PinTime & { timestamp: number },
    eventIndex: number
  ): void {
    let nextPowerUp: (EldEvent & { timestamp: number }) | undefined;
    let nextDsD: (EldEvent & { timestamp: number }) | undefined;
    let nextDsOn: (EldEvent & { timestamp: number }) | undefined;

    for (let i = eventIndex; i < events.length; i++) {
      const ev = events[i];
      if (ev.timestamp > timeItem.timestamp) {
        if (!nextPowerUp && ev.eventCodeDescription === this.POWER_UP_EVENT) {
          nextPowerUp = ev;
        }
        if (!nextDsD && ev.eventCodeDescription === 'DS_D') {
          nextDsD = ev;
        }
        if (!nextDsOn && ev.eventCodeDescription === 'DS_ON') {
          nextDsOn = ev;
        }
        if (nextPowerUp && nextDsD && nextDsOn) break;
      }
    }

    const lastRelevantEvent = this.findLastEvent(
      events,
      ev => ev.timestamp <= timeItem.timestamp && !this.CERT_EVENTS.includes(ev.eventCodeDescription as any)
    );

    this.handlePowerUpCondition(events, nextPowerUp, nextDsD, nextDsOn, lastRelevantEvent);
  }

  /**
   * Handle power-up error logic
   */
  private handlePowerUpCondition(
    events: Array<EldEvent & { timestamp: number }>,
    nextPowerUp?: EldEvent & { timestamp: number },
    nextDsD?: EldEvent & { timestamp: number },
    nextDsOn?: EldEvent & { timestamp: number },
    lastRelevantEvent?: EldEvent & { timestamp: number }
  ): void {
    const hasPowerUpError = 
      nextDsD?.errorTitles?.includes(this.NO_POWER_UP) ||
      nextDsOn?.errorTitles?.includes(this.NO_POWER_UP);
    
    const isInvalidSequence = 
      !(nextPowerUp && nextDsD && nextPowerUp.timestamp > nextDsD.timestamp) ||
      lastRelevantEvent?.eventCodeDescription === this.POWER_UP_EVENT;

    if (isInvalidSequence || hasPowerUpError) {
      if (
        nextPowerUp && nextDsOn &&
        nextPowerUp.timestamp > nextDsOn.timestamp &&
        !hasPowerUpError &&
        lastRelevantEvent?.eventCodeDescription !== this.POWER_UP_EVENT
      ) {
        this.addErrorToMatchingEvents(events, nextDsOn, this.NO_POWER_UP, this.ERROR_MESSAGES.NO_POWER_UP);
      }
    } else if (nextDsD) {
      this.addErrorToMatchingEvents(events, nextDsD, this.NO_POWER_UP, this.ERROR_MESSAGES.NO_POWER_UP);
    }
  }

  /**
   * Check shut-down condition
   */
  private checkShutDownCondition(
    events: Array<EldEvent & { timestamp: number }>,
    times: Array<PinTime & { timestamp: number }>,
    timeItem: PinTime & { timestamp: number },
    timeIndex: number,
    eventIndex: number
  ): void {
    if (!times[timeIndex + 1]) return;

    const nextTimeTs = times[timeIndex + 1].timestamp;
    const eventsInTimeRange: Array<EldEvent & { timestamp: number }> = [];

    for (let i = eventIndex; i < events.length && events[i].timestamp < nextTimeTs; i++) {
      if (events[i].timestamp > timeItem.timestamp) {
        eventsInTimeRange.push(events[i]);
      }
    }

    const shutDownEvent = eventsInTimeRange.find(ev => ev.eventCodeDescription === this.SHUT_DOWN_EVENT);
    const lastNonCertEvent = this.findLastEvent(
      eventsInTimeRange,
      ev => !this.CERT_EVENTS.includes(ev.eventCodeDescription as any)
    );

    if (!shutDownEvent && lastNonCertEvent) {
      this.addErrorToMatchingEvents(
        events,
        lastNonCertEvent,
        this.NO_SHUT_DOWN,
        this.ERROR_MESSAGES.NO_SHUT_DOWN
      );
    }
  }

  /**
   * Add error message to events with matching timestamp
   */
  private addErrorToMatchingEvents(
    events: Array<EldEvent & { timestamp: number }>,
    referenceEvent: EldEvent & { timestamp: number },
    eventLabel: string,
    errorLabel: string
  ): void {
    events.forEach(ev => {
      if (ev.timestamp === referenceEvent.timestamp) {
        addErrorMessage(ev, eventLabel, errorLabel);
      }
    });
  }

  /**
   * Find last event matching a predicate
   */
  private findLastEvent<T>(
    array: T[],
    predicate: (value: T) => boolean
  ): T | undefined {
    for (let i = array.length - 1; i >= 0; i--) {
      if (predicate(array[i])) return array[i];
    }
    return undefined;
  }
}

// Export singleton instance
export const powerUpShutDownValidator = new PowerUpShutDownValidator();
