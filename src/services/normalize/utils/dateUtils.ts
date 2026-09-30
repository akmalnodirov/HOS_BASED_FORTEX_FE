import dayjs, { Dayjs } from 'dayjs';
import duration from 'dayjs/plugin/duration';
import { useTimeZoneHelper } from '@/helpers/timezone';
import { EldEvent } from '@/types/events';

dayjs.extend(duration);

const { acceptAsTimeZone, getStartOf } = useTimeZoneHelper();

/**
 * Generate array of dates between start and end date
 * @param startDateStr - Start date string
 * @param endDateStr - End date string
 * @returns Array of date strings in YYYY-MM-DD format
 */
export function generateDateRange(startDateStr: string, endDateStr: string): string[] {
  const start = getStartOf(acceptAsTimeZone(startDateStr));
  const end = getStartOf(acceptAsTimeZone(endDateStr));

  const dates: string[] = [];
  const diffDays = end.diff(start, 'days');

  for (let i = 0; i <= diffDays; i++) {
    dates.push(start.add(i, 'days').format('YYYY-MM-DD'));
  }
  
  return dates;
}

/**
 * Calculate duration between two events in minutes
 * @param event1 - First event
 * @param event2 - Second event
 * @returns Duration in minutes
 */
export function calculateDurationBetweenEvents(event1: EldEvent, event2: EldEvent): number {
  if (event1?.dateTime && event2?.dateTime) {
    const startDate1 = dayjs(event1.dateTime);
    const startDate2 = dayjs(event2.dateTime);
    return Math.abs(Math.round(dayjs.duration(startDate1.diff(startDate2)).asMinutes()));
  }
  return 0;
}

/**
 * Convert date/time to timestamp string
 * @param dateTime - Date time to convert
 * @returns Formatted timestamp or "nullish" if invalid
 */
export function convertToTimeStamp(dateTime?: string | Dayjs | null): string {
  const MOMENT_FORMAT = "YYYY-MM-DDTHH:mm:ss";
  return dateTime ? dayjs(dateTime).format(MOMENT_FORMAT) : "nullish";
}

/**
 * Check if two date times are the same
 * @param date1 - First date
 * @param date2 - Second date
 * @param unit - Unit to compare (default: 'second')
 * @returns True if dates are same
 */
export function isSameDateTime(
  date1: string | Dayjs, 
  date2: string | Dayjs, 
  unit: 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second' = 'second'
): boolean {
  return dayjs(date1).isSame(dayjs(date2), unit);
}
