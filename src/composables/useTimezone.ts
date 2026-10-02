import dayjs, { Dayjs } from 'dayjs'
import duration from 'dayjs/plugin/duration'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(duration)

// In-memory cache for timezone from API (highest priority)
let apiTimezoneId: string | null = null

/**
 * Set timezone from API response (called from authStore after fetchCurrentUser)
 * This has highest priority over localStorage and browser guess
 */
export const setApiTimeZone = (ianaId: string) => {
  if (ianaId && ianaId.trim()) {
    apiTimezoneId = ianaId
    // Also save to localStorage for persistence
    if (typeof window !== 'undefined') {
      localStorage.setItem('company_timezoneid', ianaId)
    }
  }
}

/**
 * Clear API timezone (called on logout)
 */
export const clearApiTimeZone = () => {
  apiTimezoneId = null
}

/**
 * Get current timezone with priority:
 * 1. API response (in-memory cache)
 * 2. localStorage
 * 3. Browser timezone guess (fallback)
 */
const getCurrentTimeZone = () => {
  // Priority 1: API response (in-memory)
  if (apiTimezoneId) {
    return apiTimezoneId
  }

  // Priority 2: localStorage
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('company_timezoneid')
    if (stored) {
      return stored
    }
  }

  // Priority 3: Browser timezone guess (fallback)
  return dayjs.tz.guess()
}

// Keep for backwards compatibility
let defaultTimezoneId = getCurrentTimeZone()

export interface TimeZoneResponse {
  id: string
  offset: number
  displayName: string
  daylightName: string
  shortName: string
  ianaId: string
}

export function useTimeZoneHelper() {
  const setDefaultTimeZoneId = (newTimeZoneId: string) => {
    if (!newTimeZoneId || !newTimeZoneId.trim()) return
    defaultTimezoneId = newTimeZoneId
  }

  const getDefaultTimeZoneId = () => {
    return defaultTimezoneId
  }

  const acceptAsTimeZone = (
    date: string | Dayjs,
    timeZoneId: string | null = null,
    isDriverTimeZone: boolean = false
  ) => {
    if (!isDriverTimeZone) {
      timeZoneId ??= getCurrentTimeZone()
    }
    if (dayjs.isDayjs(date)) {
      return date.tz(timeZoneId!, true)
    }
    return dayjs.tz(date, timeZoneId!)
  }

  const convertToTimeZone = (
    date?: string | Dayjs | null,
    timeZoneId: string | null = null,
    isDriverTimeZone: boolean = false
  ) => {
    if (!isDriverTimeZone) {
      timeZoneId ??= getCurrentTimeZone()
    }
    if (!date) {
      return dayjs().tz(timeZoneId!)
    }
    const dateString = typeof date === 'string' ? date : dayjs(date).tz(timeZoneId!).format()
    return dayjs(dateString).tz(timeZoneId!)
  }

  const convertToUTC = (
    date: string | Dayjs,
    timeZoneId: string | null = null,
    isDriverTimeZone: boolean = false
  ) => {
    if (!isDriverTimeZone) {
      timeZoneId ??= getCurrentTimeZone()
    }
    // If date is already a Dayjs object with timezone info, just convert to UTC directly
    // This avoids double conversion through browser's local timezone
    if (dayjs.isDayjs(date)) {
      return date.utc()
    }
    // For string dates, parse in the specified timezone first, then convert to UTC
    return dayjs.tz(date, timeZoneId!).utc()
  }

  const formatToTimeZone = (
    date: string | Dayjs | null,
    formatType: string = '',
    timeZoneId: string | null = null,
    isDriverTimeZone: boolean = false
  ) => {
    return convertToTimeZone(date, timeZoneId, isDriverTimeZone).format(formatType)
  }

  const formatToUTC = (
    date: string | Dayjs,
    formatType: string = '',
    timeZoneId: string | null = null,
    isDriverTimeZone: boolean = false
  ) => {
    const utcDate = convertToUTC(date, timeZoneId, isDriverTimeZone)
    // If formatType is empty, use ISO format with Z suffix (same as RouteApp)
    // Format: YYYY-MM-DDTHH:mm:ssZ
    if (!formatType) {
      return utcDate.format('YYYY-MM-DDTHH:mm:ss') + 'Z'
    }
    return utcDate.format(formatType)
  }

  const getStartOf = (
    date?: Dayjs | string | null,
    isAlreadyInTimeZone: boolean = false,
    timeZoneId: string | null = null,
    isDriverTimeZone: boolean = false
  ) => {
    if (!isDriverTimeZone) {
      timeZoneId ??= getCurrentTimeZone()
    }
    if (!date) {
      return dayjs().tz(timeZoneId!).startOf('day')
    }
    // Always extract date string and create in carrier timezone to ensure correct timezone context
    // This fixes the issue where .startOf('day') loses timezone info
    const dateStr = dayjs.isDayjs(date) ? date.format('YYYY-MM-DD') : date.split('T')[0]
    return dayjs.tz(dateStr, timeZoneId!).startOf('day')
  }

  const getEndOf = (
    date?: string | Dayjs | null,
    isAlreadyInTimeZone: boolean = false,
    timeZoneId: string | null = null,
    isDriverTimeZone: boolean = false
  ) => {
    if (!isDriverTimeZone) {
      timeZoneId ??= getCurrentTimeZone()
    }
    if (!date) {
      return dayjs().tz(timeZoneId!).endOf('day')
    }
    // Always extract date string and create in carrier timezone to ensure correct timezone context
    const dateStr = dayjs.isDayjs(date) ? date.format('YYYY-MM-DD') : date.split('T')[0]
    const currentDate = dayjs().tz(timeZoneId!)
    const dateInDayjs = dayjs.tz(dateStr, timeZoneId!).endOf('day')
    // If it's today, return current time instead of end of day
    if (dateInDayjs.format('YYYY-MM-DD') === currentDate.format('YYYY-MM-DD')) {
      return currentDate
    }
    return dateInDayjs
  }

  const formatTimeDynamic = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds} second${seconds !== 1 ? 's' : ''} ago`
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60)
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`
    } else if (seconds < 86400) {
      const hours = Math.floor(seconds / 3600)
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`
    } else if (seconds < 2592000) {
      const days = Math.floor(seconds / 86400)
      return `${days} day${days !== 1 ? 's' : ''} ago`
    } else if (seconds < 31536000) {
      const months = Math.floor(seconds / 2592000)
      return `${months} month${months !== 1 ? 's' : ''} ago`
    } else {
      const years = Math.floor(seconds / 31536000)
      return `${years} year${years !== 1 ? 's' : ''} ago`
    }
  }

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
    formatTimeDynamic,
  }
}

const getAbbreviation = (words: string) => {
  return words
    .trim()
    .split(' ')
    .map((word) => word[0])
    .join('')
}

export const getTimeZoneShortNameObject = (timeZone: TimeZoneResponse) => {
  if (timeZone.shortName) {
    return {
      id: timeZone.id,
      shortName: timeZone.shortName,
    }
  }
  if (timeZone.daylightName) {
    return {
      id: timeZone.id,
      shortName: getAbbreviation(timeZone.daylightName),
    }
  }
  if (timeZone.displayName) {
    const words = timeZone.displayName.trim().split(' ').slice(1, -1)
    return {
      id: timeZone.id,
      shortName: getAbbreviation(words.join(' ')),
    }
  }
  return {
    id: timeZone.id,
    shortName: '',
  }
}
