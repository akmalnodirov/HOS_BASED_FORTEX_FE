// ranges containing and intersecting
export const contains = (l: number, r: number, x: number, y: number): boolean => {
  return l < x && y < r
}

export const intersectsPos = (l: number, r: number, x: number, y: number): number => {
  if (Math.max(l, x) > Math.min(r, y)) {
    return -1
  }
  if (x < l) {
    return 1
  } else {
    return 2
  }
}

export const firstFoundEventAfterPos = (
  boundX: number,
  dutyTimes: any,
  dutyInd: number | string
) => {
  if (!dutyTimes.duties[dutyInd] || !dutyTimes.duties[dutyInd].length) return null

  let duties = JSON.parse(JSON.stringify(dutyTimes.duties[dutyInd]))
  duties = duties.filter((duty: any) => duty.x1 >= boundX && duty.recordOrigin === 1)

  if (!duties.length) return null

  let ans = Math.min(...duties.map((duty: any) => duty.x1))

  return boundX <= ans ? ans : null
}

export const lastFoundEventBeforePos = (
  boundX: number,
  dutyTimes: any,
  dutyInd: number | string
) => {
  if (!dutyTimes.duties[dutyInd] || !dutyTimes.duties[dutyInd].length) return null

  let duties = JSON.parse(JSON.stringify(dutyTimes.duties[dutyInd]))
  duties = duties.filter((duty: any) => duty.x2 <= boundX && duty.recordOrigin === 1)

  if (!duties.length) return null

  let ans = Math.max(...duties.map((duty: any) => duty.x2))

  return boundX >= ans ? ans : null
}

export const overlapsWithDrivingEvents = (
  startTime: string,
  endTime: string,
  chartData: any,
  screenResolution: number
): boolean => {
  if (chartData === undefined) return false
  const startPixels: number = convertDateToPixel(screenResolution, startTime)
  const endPixels: number = convertDateToPixel(screenResolution, endTime)

  const drivingGraphDuties = chartData.duties['3']
  const overlapping: boolean = drivingGraphDuties?.some(
    (drDuty: any) =>
      drDuty.recordOrigin === 1 &&
      Math.max(drDuty.x1, startPixels) < Math.min(drDuty.x2, endPixels)
  )
  return overlapping
}

// Converts pixels to HH:MM:SS
export const convertPixelToDate = (screenResolution: number, pixels: number): string => {
  const seconds: number = convertPixelstoSeconds(screenResolution, pixels)
  const { h, m, s } = getTime(seconds)

  const hh: string = h.toString().padStart(2, '0')
  const mm: string = m.toString().padStart(2, '0')
  const ss: string = s.toString().padStart(2, '0')

  return `${hh}:${mm}:${ss}`
}

// Converts HH:MM:SS to pixels
export const convertDateToPixel = (screenResolution: number, date: string): number => {
  let totalSeconds: number = convertToSeconds(date)
  if (totalSeconds >= 86400) totalSeconds = 85399

  const pixels = convertSecondsToPixels(screenResolution, totalSeconds)

  return pixels
}

// Import needed functions from time.ts
import {
  convertPixelstoSeconds,
  convertSecondsToPixels,
  convertToSeconds,
  getTime,
} from './time'
