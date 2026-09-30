import dayjs from 'dayjs';
import { EldEvent } from '@/types/events';

/**
 * Event code descriptions that generate warnings/errors
 */
export const WARNING_GENERATING_EVENTS = [
  "DS_OFF", "DS_SB", "DS_D", "DS_ON", "DS_WT", "DR_IND_YM", "DR_LOGIN",
  "DR_IND_PC", "ELD_DIAG_CLEARED", "ELD_DIAG", "ELD_MALF_CLEARED", "ELD_MALF",
  "ENG_DOWN_REDUCED", "ENG_DOWN_NORMAL", "ENG_UP_REDUCED", "ENG_UP_NORMAL",
  "DR_LOGOUT", "DR_IND_CLEARED", "INTER_REDUCED_PERCISION", "INTER_NORMAL_PRECISION"
] as const;

/**
 * Certification event codes
 */
export const CERTIFICATION_EVENTS = [
  "DR_CERT_1", "DR_CERT_2", "DR_CERT_3", "DR_CERT_4", "DR_CERT_5",
  "DR_CERT_6", "DR_CERT_7", "DR_CERT_8", "DR_CERT_9"
] as const;

/**
 * Event type constants
 */
export const EVENT_TYPES = {
  LOGIN_LOGOUT: 5,
} as const;

/**
 * Event code constants
 */
export const EVENT_CODES = {
  LOGIN: 1,
  LOGOUT: 2,
} as const;

/**
 * Event prefix constants
 */
export const EVENT_PREFIXES = {
  CERTIFICATION: 'DR_CERT_',
  LOGIN: 'DR_LOGIN',
  LOGOUT: 'DR_LOGOUT',
} as const;

/**
 * Get events between status changes
 * @param events - Array of events
 * @param startIndex - Start index
 * @param endIndex - End index
 * @returns Array of events between the indices
 */
export function getEventsBetweenStatusChanges(
  events: EldEvent[], 
  startIndex: number, 
  endIndex: number
): EldEvent[] {
  return events.slice(startIndex, endIndex + 1);
}

/**
 * Check if event is a certification event
 * @param event - Event to check
 * @returns True if certification event
 */
export function isCertificationEvent(event: EldEvent): boolean {
  return event.eventCodeDescription.startsWith(EVENT_PREFIXES.CERTIFICATION);
}

/**
 * Check if event is a login/logout event
 * @param event - Event to check
 * @returns True if login/logout event
 */
export function isLoginLogoutEvent(event: EldEvent): boolean {
  return event.eventType === EVENT_TYPES.LOGIN_LOGOUT;
}

/**
 * Extract certification number from event code description
 * @param eventCodeDescription - Event code description (e.g., "DR_CERT_1")
 * @returns Certification number
 */
export function getCertificationNumber(eventCodeDescription: string): number {
  return parseInt(eventCodeDescription.split('_')[2], 10);
}

/**
 * Sort events by date time
 * @param events - Events to sort
 * @param ascending - Sort in ascending order (default: true)
 * @returns Sorted events array
 */
export function sortEventsByDateTime(events: EldEvent[], ascending: boolean = true): EldEvent[] {
  return events.sort((a, b) => {
    const dateA = dayjs(a.dateTime);
    const dateB = dayjs(b.dateTime);
    
    if (ascending) {
      return dateA.isBefore(dateB) ? -1 : dateA.isAfter(dateB) ? 1 : 0;
    } else {
      return dateA.isAfter(dateB) ? -1 : dateA.isBefore(dateB) ? 1 : 0;
    }
  });
}
