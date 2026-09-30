import { EldEvent, IEventValidator } from '@/types/events';
import { addErrorMessage } from '../utils/messageHandler';
import { CERTIFICATION_EVENTS } from '../utils/eventUtils';

/**
 * Event statuses configuration
 */
const EVENT_STATUSES = {
  ENG_UP_NORMAL: 'ENG_UP_NORMAL',
  ENG_DOWN_NORMAL: 'ENG_DOWN_NORMAL',
  DR_LOGIN: 'DR_LOGIN',
  DR_LOGOUT: 'DR_LOGOUT'
} as const;

/**
 * Two identical events validator
 * Validates that consecutive identical events are flagged
 * 
 * Single Responsibility: Only validates duplicate events
 */
export class TwoIdenticalEventsValidator implements IEventValidator {
  private readonly CERTIFICATION_STATUSES = new Set<string>(CERTIFICATION_EVENTS);
  private errorCount = 0;

  /**
   * Validate for two identical consecutive events
   * @param events - Array of events to validate
   */
  validate(events: EldEvent[]): void {
    this.errorCount = 0;
    
    this.flagConsecutiveIdenticalEvents(events);
    this.processEventCounts(events);

    console.log(`Two identical events error count: ${this.errorCount}`);
  }

  /**
   * Flag consecutive identical events
   */
  private flagConsecutiveIdenticalEvents(events: EldEvent[]): void {
    let prevDesc = -1;

    for (let i = 1; i < events.length; i++) {
      const current = events[i];
      
      // Skip intermediate events (type 2)
      if (current.eventType === 2) {
        continue;
      }

      // Combine type and code for uniqueness
      const desc = 10 * current.eventType + current.eventCode;

      // Check for consecutive identical events (excluding certification events 40-49)
      if (desc === prevDesc && (desc < 40 || desc > 49)) {
        addErrorMessage(current, 'Two Identical Events', 'Two Identical Events Error');
        this.errorCount++;
      }

      prevDesc = desc;
    }
  }

  /**
   * Process event counts for engine and login/logout events
   */
  private processEventCounts(events: EldEvent[]): void {
    const statusMap: Record<string, string> = {
      [EVENT_STATUSES.ENG_UP_NORMAL]: 'ENG_UP_COUNT',
      [EVENT_STATUSES.ENG_DOWN_NORMAL]: 'ENG_DOWN_COUNT',
      [EVENT_STATUSES.DR_LOGIN]: 'LOGIN_COUNT',
      [EVENT_STATUSES.DR_LOGOUT]: 'LOGOUT_COUNT'
    };

    const counters: Record<string, number> = {
      ENG_UP_COUNT: 0,
      ENG_DOWN_COUNT: 0,
      LOGIN_COUNT: 0,
      LOGOUT_COUNT: 0
    };

    const opposites: Record<string, string> = {
      ENG_UP_COUNT: 'ENG_DOWN_COUNT',
      ENG_DOWN_COUNT: 'ENG_UP_COUNT',
      LOGIN_COUNT: 'LOGOUT_COUNT',
      LOGOUT_COUNT: 'LOGIN_COUNT'
    };

    for (let i = 0; i < events.length; i++) {
      const currentEvent = events[i];
      const { eventCodeDescription } = currentEvent;

      // Skip certification events
      if (this.CERTIFICATION_STATUSES.has(eventCodeDescription)) {
        continue;
      }

      const counterKey = statusMap[eventCodeDescription];

      if (counterKey) {
        // Increment counter for current event type
        counters[counterKey]++;

        // Reset opposite counter
        const oppositeKey = opposites[counterKey];
        counters[oppositeKey] = 0;

        // Flag if count exceeds 1
        if (counters[counterKey] > 1 && this.shouldFlagEvent(currentEvent)) {
          addErrorMessage(currentEvent, 'Two Identical Events', 'Two Identical Events Error');
          this.errorCount++;
        }
      }
    }
  }

  /**
   * Check if event should be flagged
   */
  private shouldFlagEvent(event: EldEvent): boolean {
    // Check if event already has the error
    if (event.errorTitles?.includes('Two Identical Events')) {
      return false;
    }

    // Check if event is one of the flaggable types
    const flaggableEvents = [
      EVENT_STATUSES.ENG_UP_NORMAL,
      EVENT_STATUSES.ENG_DOWN_NORMAL,
      EVENT_STATUSES.DR_LOGIN,
      EVENT_STATUSES.DR_LOGOUT
    ];

    return flaggableEvents.includes(event.eventCodeDescription as any);
  }
}

// Export singleton instance
export const twoIdenticalEventsValidator = new TwoIdenticalEventsValidator();
