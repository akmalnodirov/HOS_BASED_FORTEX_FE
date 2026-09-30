import dayjs from 'dayjs';
import { EldEvent, IEventValidator } from '@/types/events';
import { addErrorMessage } from '../utils/messageHandler';

/**
 * Merged validator for engine hours and login/logout errors
 * Optimized version that processes both checks in a single pass
 * 
 * Single Responsibility: Validates engine hours and login/logout in one efficient pass
 */
export class EngineHoursLoginLogoutValidator implements IEventValidator {
  private readonly LOGIN_LOGOUT_EVENT_TYPE = 5;
  private readonly LOGIN_EVENT_CODE = 1;
  private readonly LOGOUT_EVENT_CODE = 2;
  private readonly ENG_UP_NORMAL = "ENG_UP_NORMAL";
  private readonly ENG_DOWN_NORMAL = "ENG_DOWN_NORMAL";

  /**
   * Validate engine hours and login/logout in a single pass
   * @param events - Array of events to validate
   */
  validate(events: EldEvent[]): void {
    let loginCount = 0;
    let logoutCount = 0;
    let engineUpCount = 0;
    let engineDownCount = 0;

    for (let i = 0; i < events.length; i++) {
      const currentEvent = events[i];

      // Process login/logout events
      if (currentEvent.eventType === this.LOGIN_LOGOUT_EVENT_TYPE) {
        if (currentEvent.eventCode === this.LOGIN_EVENT_CODE) {
          if (loginCount > 0) {
            addErrorMessage(currentEvent, 'Logout not exists', 'Excessive Events');
          }
          loginCount++;
          logoutCount = 0;
        } else if (currentEvent.eventCode === this.LOGOUT_EVENT_CODE) {
          if (logoutCount > 0) {
            addErrorMessage(currentEvent, 'Login not exists', 'Excessive Events');
          }
          logoutCount++;
          loginCount = 0;
        }
      }

      // Process engine hours events
      if (currentEvent.eventCodeDescription === this.ENG_UP_NORMAL) {
        engineUpCount++;
        engineDownCount = 0;

        if (engineUpCount > 1) {
          addErrorMessage(currentEvent, 'Two Identical Events', 'Two Identical Events Error');
        }
      } else if (currentEvent.eventCodeDescription === this.ENG_DOWN_NORMAL) {
        engineDownCount++;
        engineUpCount = 0;

        if (engineDownCount > 1) {
          addErrorMessage(currentEvent, 'Two Identical Events', 'Two Identical Events Error');
        }
      }
    }
  }
}

// Export singleton instance
export const engineHoursLoginLogoutValidator = new EngineHoursLoginLogoutValidator();
