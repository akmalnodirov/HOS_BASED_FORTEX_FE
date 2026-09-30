import dayjs from 'dayjs';
import { EldEvent, IEventValidator, PinTime } from '@/types/events';
import { addErrorMessage, addWarningMessage } from '../utils/messageHandler';
import { CERTIFICATION_EVENTS } from '../utils/eventUtils';

/**
 * PTI (Pre-Trip Inspection) validator
 * Validates PTI events and durations
 * 
 * Single Responsibility: Only validates PTI checks
 */
export class PtiCheckValidator implements IEventValidator {
  private readonly PTI_REGEX = /\b(PTI|pre-trip(\sinspection)?)\b/i;
  private readonly EXCLUDED_STATUSES = CERTIFICATION_EVENTS;
  private readonly MIN_PTI_DURATION = 15; // minutes

  /**
   * Validate PTI checks
   * @param events - Array of events to validate
   * @param pinTimes - Array of pin times
   */
  validate(events: EldEvent[], pinTimes: PinTime[] = []): void {
    if (!Array.isArray(events) || pinTimes.length === 0) {
      return;
    }

    const sortedEvents = [...events].sort((a, b) => 
      dayjs(a.dateTime).diff(dayjs(b.dateTime))
    );
    
    let sortedTimes = [...pinTimes].sort((a, b) => 
      dayjs(a.time).diff(dayjs(b.time))
    );

    // Filter times to include only those after the first event
    const firstEventStartDate = sortedEvents[0]?.dateTime;
    if (firstEventStartDate) {
      sortedTimes = sortedTimes.filter(timeEntry => 
        dayjs(timeEntry.time).isAfter(firstEventStartDate)
      );
    }

    this.processPtiChecks(sortedEvents, sortedTimes);
  }

  /**
   * Process PTI checks for all time entries
   */
  private processPtiChecks(events: EldEvent[], times: PinTime[]): void {
    let eventIndex = 0;
    const validEvents: EldEvent[] = [];

    // Pre-filter and reverse arrays for efficient popping
    const dsDEvents = events
      .filter(e => e.eventCodeDescription === 'DS_D')
      .reverse();
    const dsOnEvents = events
      .filter(e => e.eventCodeDescription === 'DS_ON')
      .reverse();

    times.forEach(timeEntry => {
      // Build validEvents for events before timeEntry.time
      while (eventIndex < events.length && 
             dayjs(timeEntry.time).isAfter(events[eventIndex].dateTime)) {
        if (!this.EXCLUDED_STATUSES.includes(events[eventIndex].eventCodeDescription as any)) {
          validEvents.push(events[eventIndex]);
        }
        eventIndex++;
      }

      // Remove DS_D events not after timeEntry.time
      while (dsDEvents.length > 0 && 
             !dayjs(dsDEvents.at(-1)!.dateTime).isAfter(timeEntry.time)) {
        dsDEvents.pop();
      }

      // Remove DS_ON events not after timeEntry.time
      while (dsOnEvents.length > 0 && 
             !dayjs(dsOnEvents.at(-1)!.dateTime).isAfter(timeEntry.time)) {
        dsOnEvents.pop();
      }

      if (validEvents.length > 0) {
        const dsdEvent = dsDEvents.at(-1) || null;
        const dsonEvent = dsOnEvents.at(-1) || null;

        this.validatePtiForEvents(events, dsdEvent, dsonEvent);
      }
    });
  }

  /**
   * Validate PTI for specific events
   */
  private validatePtiForEvents(
    allEvents: EldEvent[],
    dsdEvent: EldEvent | null,
    dsonEvent: EldEvent | null
  ): void {
    if (!dsonEvent || !dsdEvent) {
      return;
    }

    const isOnDutyBeforeDriving = !dayjs(dsonEvent.dateTime).isAfter(dsdEvent.dateTime);
    const hasPtiWarning = dsdEvent.warningTitles?.includes('No PTI');

    if (isOnDutyBeforeDriving || hasPtiWarning) {
      // Check if PTI annotation exists
      if (!this.PTI_REGEX.test(dsonEvent.annotation || '') && 
          !dsonEvent.warningTitles?.includes('No PTI')) {
        this.addWarning(allEvents, dsonEvent, 'No PTI', 'No PTI Error', 'warning');
      }

      // Check PTI duration
      const ptiDurationMinutes = Math.round(
        dayjs(dsdEvent.dateTime).diff(dayjs(dsonEvent.dateTime), 'minutes')
      );

      if (ptiDurationMinutes < this.MIN_PTI_DURATION && ptiDurationMinutes > 0) {
        this.addWarning(
          allEvents,
          dsonEvent,
          'PTI Duration',
          `PTI Duration is less than ${this.MIN_PTI_DURATION} minutes`,
          'error'
        );
      }
    }
  }

  /**
   * Add warning or error to matching events
   */
  private addWarning(
    events: EldEvent[],
    eventToUpdate: EldEvent,
    warningTitle: string,
    errorMessage: string,
    messageType: 'error' | 'warning'
  ): void {
    events.forEach(event => {
      if (dayjs(event.dateTime).isSame(eventToUpdate.dateTime)) {
        if (messageType === 'error') {
          addErrorMessage(event, warningTitle, errorMessage);
        } else {
          addWarningMessage(event, warningTitle, errorMessage);
        }
      }
    });
  }
}

// Export singleton instance
export const ptiCheckValidator = new PtiCheckValidator();
