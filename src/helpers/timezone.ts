import dayjs, { Dayjs } from "dayjs";
import duration from 'dayjs/plugin/duration';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

// dayjs
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(duration);

// let defaultTimezoneId = localStorage.getItem('company_timezoneid') || dayjs.tz.guess();
const getInitialTimeZone = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('company_timezoneid') || dayjs.tz.guess();
  }
  return dayjs.tz.guess();
};

let defaultTimezoneId = getInitialTimeZone();

export interface TimeZoneResponse {
  id: string;
  shortName?: string;
  daylightName?: string;
  displayName?: string;
}

export function useTimeZoneHelper() {
  const setDefaultTimeZoneId = (newTimeZoneId: string): void => {
    if (!newTimeZoneId || !newTimeZoneId.trim()) return;
    defaultTimezoneId = newTimeZoneId;
  };

  const getDefaultTimeZoneId = (): string => {
    return defaultTimezoneId;
  }

  const acceptAsTimeZone = (date: string | Dayjs, timeZoneId: string | null = null, isDriverTimeZone: boolean = false): Dayjs => {
    if (!isDriverTimeZone) {
      timeZoneId ??= defaultTimezoneId;
    }
    if (dayjs.isDayjs(date)) {
      return date.tz(timeZoneId!, true);
    }
    return dayjs.tz(date, timeZoneId!);
  };

  const convertToTimeZone = (date?: string | Dayjs | null, timeZoneId: string | null = null, isDriverTimeZone: boolean = false): Dayjs => {
    if (!isDriverTimeZone) {
      timeZoneId ??= defaultTimezoneId;
    }
    if (!date) {
      return dayjs().tz(timeZoneId!);
    }
    const dateString = typeof date === "string" ? date : dayjs(date).tz(timeZoneId!).format();
    return dayjs(dateString).tz(timeZoneId!);
  };

  const convertToUTC = (date: string | Dayjs, timeZoneId: string | null = null, isDriverTimeZone: boolean = false): Dayjs => {
    if (!isDriverTimeZone) {
      timeZoneId ??= defaultTimezoneId;
    }
    const dateString = typeof date === "string" ? date : dayjs(date).tz(timeZoneId!).format();
    return convertToTimeZone(dateString, timeZoneId, isDriverTimeZone).utc();
  };

  const formatToTimeZone = (date: string | Dayjs | null, formatType: string = "", timeZoneId: string | null = null, isDriverTimeZone: boolean = false): string => {
    return convertToTimeZone(date, timeZoneId, isDriverTimeZone).format(formatType);
  };

  const formatToUTC = (date: string | Dayjs, formatType: string = "", timeZoneId: string | null = null, isDriverTimeZone: boolean = false): string => {
    return convertToUTC(date, timeZoneId, isDriverTimeZone).format(formatType);
  };

  const getStartOf = (date?: Dayjs | string | null, isAlreadyInTimeZone: boolean = false, timeZoneId: string | null = null, isDriverTimeZone: boolean = false): Dayjs => {
    if (!isDriverTimeZone) {
      timeZoneId ??= defaultTimezoneId;
    }
    if (!date) {
      return dayjs().tz(timeZoneId!).startOf('day');
    }
    if (dayjs.isDayjs(date)) {
      return isAlreadyInTimeZone ? date.startOf('day') : date.tz(timeZoneId!).startOf('day');
    }
    return isAlreadyInTimeZone ? acceptAsTimeZone(date, timeZoneId).startOf('day') : dayjs(date).tz(timeZoneId!).startOf('day'); 
  };

  const getEndOf = (date?: string | Dayjs | null, timeZoneId: string | null = null, isDriverTimeZone: boolean = false): Dayjs => {
    if (!isDriverTimeZone) {
      timeZoneId ??= defaultTimezoneId;
    }
    if (!date) {
      return dayjs().tz(timeZoneId!).endOf('day');
    }
    const currentDate = dayjs().tz(timeZoneId!);
    const dateInDayjs = dayjs.isDayjs(date) ? date.tz(timeZoneId!).endOf('day') : dayjs(date).tz(timeZoneId!).endOf('day');
    if (dateInDayjs.format('YYYY-MM-DD') === currentDate.format('YYYY-MM-DD')) {
      return currentDate;
    }
    return dateInDayjs;
  };

  const formatTimeDynamic = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds} second${seconds !== 1 ? 's' : ''} ago`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    } else if (seconds < 86400) {
      const hours = Math.floor(seconds / 3600);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else if (seconds < 2592000) {
      const days = Math.floor(seconds / 86400);
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    } else if (seconds < 31536000) {
      const months = Math.floor(seconds / 2592000);
      return `${months} month${months !== 1 ? 's' : ''} ago`;
    } else {
      const years = Math.floor(seconds / 31536000);
      return `${years} year${years !== 1 ? 's' : ''} ago`;
    }
  };

  return { 
    acceptAsTimeZone, 
    formatToTimeZone, 
    convertToTimeZone, 
    formatToUTC, 
    convertToUTC, 
    getStartOf, 
    getEndOf, 
    setDefaultTimeZoneId, 
    getDefaultTimeZoneId, 
    formatTimeDynamic 
  };
}

const getAbbreviation = (words: string): string => {
  return words.trim().split(" ").map(word => word[0]).join("");
};

export const getTimeZoneShortNameObject = (timeZone: TimeZoneResponse): { id: string; shortName: string } => {
  if (timeZone.shortName) {
    return {
      id: timeZone.id,
      shortName: timeZone.shortName
    }
  }
  if (timeZone.daylightName) {
    return {
      id: timeZone.id,
      shortName: getAbbreviation(timeZone.daylightName),
    };
  }
  if (timeZone.displayName) {
    const words = timeZone.displayName.trim().split(" ").slice(1, -1);
    return {
      id: timeZone.id,
      shortName: getAbbreviation(words.join(" ")),
    };
  }
  return {
    id: timeZone.id,
    shortName: "",
  };
};

export const formatTime = (date: string | Dayjs, format: string = 'MM-DD-YYYY'): string => {
  return dayjs(date).format(format);
};
