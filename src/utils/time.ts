import dayjs, { Dayjs } from 'dayjs'

export interface HosTimeRemainder {
  breakDuration: number
  drivingDuration: number
  shiftDuration: number
  cycleDuration: number
}

export const hosTimeRemainder: HosTimeRemainder = {
  breakDuration: 28800,
  drivingDuration: 39600,
  shiftDuration: 50400,
  cycleDuration: 252000,
}

export function add(
  date: Dayjs,
  num: number,
  measure: 'week' | 'day' | 'hour' | 'minute' | 'second'
) {
  return date.add(num, measure)
}

export function subtract(
  date: Dayjs,
  num: number,
  measure: 'week' | 'day' | 'hour' | 'minute' | 'second'
) {
  return date.subtract(num, measure)
}

export function fixDateFormat(dateString: string) {
  return dateString.trim().replace(' ', '+').replace('\n', '').replace('\t', '')
}

export function formatTime(dateTime: Dayjs | Date | string, format: string) {
  if (!dayjs.isDayjs(dateTime)) {
    return dayjs(dateTime).format(format)
  }
  return dateTime.format(format)
}

export function compareDates(date1: Dayjs | Date, date2: Dayjs | Date) {
  return formatTime(date1, 'YYYY-MM-DD') === formatTime(date2, 'YYYY-MM-DD')
}

export const convertPixelstoSeconds = (screenResolution: number, pixels: number): number => {
  return (pixels * 86399) / screenResolution
}

export const convertSecondsToPixels = (screenResolution: number, seconds: number): number => {
  return (seconds * screenResolution) / 86399
}

export function convertToSeconds(dateTime: string) {
  const [h, m, s] = dateTime.split(':').map(Number)
  return h * 3600 + m * 60 + s
}

export function getTime(duration: number) {
  const s: number = Math.floor(duration) % 60
  const m: number = Math.floor(duration / 60) % 60
  const h: number = Math.floor(duration / 3600) % 24
  const d: number = Math.floor(duration / 86400)

  return { d, h, m, s }
}

export function formatDuration(duration: number, show: boolean = false): string {
  let { d, h, m, s } = getTime(duration)

  m += +(s >= 60)
  h += +(m >= 60)
  m %= 60

  let displayTime: string = ''
  if (d) {
    displayTime += d.toString() + 'd'
  }
  if (d && (h || m || s)) displayTime += ' '

  if (h) {
    displayTime += h.toString() + 'h'
  }
  if (h && (m || s)) displayTime += ' '

  if (m) {
    displayTime += m.toString() + 'm'
  }
  if (m && s && show) displayTime += ' '

  if (s && show) {
    displayTime += s.toString() + 's'
  }

  if (duration === 0) {
    displayTime += '0s'
  }
  return displayTime
}

export function fixDatetimeFormat(dateTime: string) {
  let [hh, mm, ss] = dateTime.split(':').map(Number)
  if (hh >= 24) hh = 23
  if (mm >= 60) mm = 59
  if (ss >= 60) ss = 59
  return `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`
}

export function getDateStringSeconds(dateTime: string) {
  return new Date(dateTime).getTime() / 1000
}

export function mergeDateAndTime(
  date: Dayjs,
  time: { hours: number; minutes: number; seconds: number }
) {
  return date.hour(time.hours).minute(time.minutes).second(time.seconds)
}