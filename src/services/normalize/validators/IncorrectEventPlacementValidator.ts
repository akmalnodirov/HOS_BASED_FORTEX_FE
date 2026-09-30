import dayjs from 'dayjs';
import { EldEvent, IEventValidator } from '@/types/events';
import { addErrorMessage } from '../utils/messageHandler';

/**
 * Incorrect event placement validator
 * Validates that certain events are not placed after driving/intermediate events
 * 
 * Single Responsibility: Only validates event placement
 */
export class IncorrectEventPlacementValidator implements IEventValidator {
  private readonly INCORRECTLY_PLACED_STATUSES = new Set([
    "DR_LOGIN", "DR_LOGOUT",
    "DR_CERT_1", "DR_CERT_2", "DR_CERT_3",
    "DR_CERT_4", "DR_CERT_5", "DR_CERT_6",
    "DR_CERT_7", "DR_CERT_8", "DR_CERT_9"
  ]);
  
  private readonly PRECEDING_STATUSES = new Set([
    "INTER_NORMAL_PRECISION",
    "INTER_REDUCED_PERCISION",
    "DS_D"
  ]);
  
  private readonly MOMENT_FORMAT = "YYYY-MM-DDTHH:mm:ss";

  /**
   * Validate event placement
   * @param events - Array of events to validate
   */
  validate(events: EldEvent[]): void {
    if (!events || !Array.isArray(events)) {
      console.error('Invalid input: events must be an array.');
      return;
    }

    const eventsGroupDict = this.createEventsGroupMap(events);
    const previousValidEvents: EldEvent[] = [];

    events.forEach((currentEvent, currentIndex) => {
      if (currentIndex > 0) {
        const lastValidPreviousEvent = previousValidEvents.at(-1) || null;

        if (this.shouldMarkAsIncorrect(lastValidPreviousEvent, currentEvent)) {
          this.markEventWithError(
            eventsGroupDict,
            currentEvent,
            'Incorrect Event Placement',
            'Incorrect Event Placement Error'
          );
        }

        if (!this.INCORRECTLY_PLACED_STATUSES.has(currentEvent.eventCodeDescription)) {
          previousValidEvents.push(currentEvent);
        }
      }
    });
  }

  /**
   * Create a map grouping events by timestamp and description
   */
  private createEventsGroupMap(events: EldEvent[]): Map<string, EldEvent[]> {
    const eventsGroupDict = new Map<string, EldEvent[]>();

    events.forEach(currentEvent => {
      const timestamp = this.convertToTimeStamp(currentEvent.dateTime);
      const key = `${timestamp}|${currentEvent.eventCodeDescription}`;
      const prevList = eventsGroupDict.get(key) || [];
      prevList.push(currentEvent);
      eventsGroupDict.set(key, prevList);
    });

    return eventsGroupDict;
  }

  /**
   * Check if event should be marked as incorrectly placed
   */
  private shouldMarkAsIncorrect(
    previousEvent: EldEvent | null,
    currentEvent: EldEvent
  ): boolean {
    return !!(
      previousEvent &&
      this.PRECEDING_STATUSES.has(previousEvent.eventCodeDescription) &&
      this.INCORRECTLY_PLACED_STATUSES.has(currentEvent.eventCodeDescription)
    );
  }

  /**
   * Mark all matching events with error
   */
  private markEventWithError(
    eventsGroupDict: Map<string, EldEvent[]>,
    targetEvent: EldEvent,
    errorMessageTitle: string,
    errorMessage: string
  ): void {
    const timestamp = this.convertToTimeStamp(targetEvent.dateTime);
    const key = `${timestamp}|${targetEvent.eventCodeDescription}`;
    const matchingEvents = eventsGroupDict.get(key) || [];

    matchingEvents.forEach(event => {
      addErrorMessage(event, errorMessageTitle, errorMessage);
    });
  }

  /**
   * Convert date time to timestamp string
   */
  private convertToTimeStamp(dateTime: string | dayjs.Dayjs): string {
    return dateTime ? dayjs(dateTime).format(this.MOMENT_FORMAT).valueOf().toString() : 'nullish';
  }
}

// Export singleton instance
export const incorrectEventPlacementValidator = new IncorrectEventPlacementValidator();
