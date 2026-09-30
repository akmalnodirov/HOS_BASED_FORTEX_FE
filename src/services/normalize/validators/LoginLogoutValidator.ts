import { EldEvent, IEventValidator } from '@/types/events';
import { addErrorMessage } from '../utils/messageHandler';
import { EVENT_TYPES, EVENT_CODES } from '../utils/eventUtils';

/**
 * Login/Logout event validator
 * Checks for excessive login and logout events
 * 
 * Single Responsibility: Only validates login/logout events
 */
export class LoginLogoutValidator implements IEventValidator {
  private readonly LOGIN_EVENT_TYPE = EVENT_TYPES.LOGIN_LOGOUT;
  private readonly LOGIN_EVENT_CODE = EVENT_CODES.LOGIN;
  private readonly LOGOUT_EVENT_CODE = EVENT_CODES.LOGOUT;

  /**
   * Validate login/logout events for excessive occurrences
   * @param events - Array of events to validate
   */
  validate(events: EldEvent[]): void {
    let loginCount = 0;
    let logoutCount = 0;

    for (let i = 0; i < events.length; i++) {
      const currentEvent = events[i];

      // Skip non-login/logout events
      if (currentEvent.eventType !== this.LOGIN_EVENT_TYPE) {
        continue;
      }

      // Process excessive login warnings
      if (currentEvent.eventCode === this.LOGIN_EVENT_CODE) {
        if (loginCount > 0) {
          addErrorMessage(currentEvent, 'Logout not exists', 'Excessive Events');
        }
        loginCount++;
        logoutCount = 0; // Reset logout count on login event
      }
      // Process excessive logout warnings
      else if (currentEvent.eventCode === this.LOGOUT_EVENT_CODE) {
        if (logoutCount > 0) {
          addErrorMessage(currentEvent, 'Login not exists', 'Excessive Events');
        }
        logoutCount++;
        loginCount = 0; // Reset login count on logout event
      }
    }
  }
}

// Export singleton instance for convenience
export const loginLogoutValidator = new LoginLogoutValidator();
