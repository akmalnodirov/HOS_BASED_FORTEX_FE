import dayjs from 'dayjs';
import { EldEvent, IEventValidator } from '@/types/events';
import { addErrorMessage } from '../utils/messageHandler';
import { CERTIFICATION_EVENTS } from '../utils/eventUtils';

/**
 * Intermediate missing validator
 * Validates intermediate events placement and missing intermediates
 * 
 * Single Responsibility: Only validates intermediate events
 */
export class IntermediateMissingValidator implements IEventValidator {
  private readonly NON_ELIGIBLE_STATUSES = CERTIFICATION_EVENTS;
  private readonly SPECIAL_STATUSES = ["INTER_NORMAL_PRECISION", "INTER_REDUCED_PERCISION"];
  private errorCount = 0;

  /**
   * Validate intermediate events
   * @param events - Array of events to validate
   */
  validate(events: EldEvent[]): void {
    this.errorCount = 0;

    const validEntries = this.filterValidEntries(events);
    validEntries.sort((a, b) => dayjs(a.dateTime).diff(dayjs(b.dateTime)));

    this.checkIncorrectPlacement(events, validEntries);
    this.checkMissingIntermediates(events, validEntries);

    console.log(`Intermediate missing error count: ${this.errorCount}`);
  }

  /**
   * Filter valid entries by removing non-eligible statuses
   */
  private filterValidEntries(entries: EldEvent[]): EldEvent[] {
    return entries.filter(
      entry => !this.NON_ELIGIBLE_STATUSES.includes(entry.eventCodeDescription as any)
    );
  }

  /**
   * Check for incorrect intermediate placement
   */
  private checkIncorrectPlacement(allEvents: EldEvent[], validEntries: EldEvent[]): void {
    let lastVisibleEvent: EldEvent | null = null;

    for (let i = 1; i < validEntries.length; i++) {
      const currentEntry = validEntries[i];

      if (this.isIntermediateEvent(currentEntry) && !this.isDrivingEvent(lastVisibleEvent)) {
        this.logIntermediateError(
          allEvents,
          currentEntry,
          'Intermediate Incorrect Placement Error'
        );
      }

      if (this.isVisibleEvent(currentEntry)) {
        lastVisibleEvent = currentEntry;
      }
    }
  }

  /**
   * Check for missing intermediates after driving events
   */
  private checkMissingIntermediates(allEvents: EldEvent[], validEntries: EldEvent[]): void {
    for (let i = 0; i < validEntries.length; i++) {
      if (this.isDrivingEvent(validEntries[i])) {
        const nextValidEntry = validEntries[i + 1];
        
        if (nextValidEntry) {
          const timeDifference = dayjs(nextValidEntry.dateTime)
            .diff(dayjs(validEntries[i].dateTime), 'minutes');

          if (Math.round(timeDifference) > 60) {
            const errorTitle = this.isIntermediateEvent(nextValidEntry)
              ? 'Intermediate difference error'
              : 'Intermediate missing';
            
            this.logIntermediateError(
              allEvents,
              nextValidEntry,
              errorTitle,
              'Intermediate Missing Error'
            );
          }
        }
      }
    }
  }

  /**
   * Log intermediate error to matching events
   */
  private logIntermediateError(
    events: EldEvent[],
    currentEvent: EldEvent,
    errorTitle: string,
    errorMessage?: string
  ): void {
    events.forEach(event => {
      if (dayjs(event.dateTime).isSame(currentEvent.dateTime)) {
        addErrorMessage(event, errorTitle, errorMessage || errorTitle);
        this.errorCount++;
      }
    });
  }

  /**
   * Check if event is a driving event
   */
  private isDrivingEvent(event: EldEvent | null): boolean {
    if (!event) return false;
    return event.eventType === 1 && event.eventCode === 3;
  }

  /**
   * Check if event is an intermediate event
   */
  private isIntermediateEvent(event: EldEvent): boolean {
    return event.eventType === 2 && event.eventCode === 1;
  }

  /**
   * Check if event is a visible event
   */
  private isVisibleEvent(event: EldEvent): boolean {
    return (
      event.eventType === 1 ||
      (event.eventType === 3 && event.eventCode <= 1)
    );
  }
}

// Export singleton instance
export const intermediateMissingValidator = new IntermediateMissingValidator();
