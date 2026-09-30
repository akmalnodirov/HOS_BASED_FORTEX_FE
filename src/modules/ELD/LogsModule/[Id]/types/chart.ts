import type { Dayjs } from 'dayjs'
import type { Ref } from 'vue'

export interface GraphDuties {
  x1: number
  x2: number
  y1: number
  y2: number
  eventCode: number
  eventType: number
  eventTime: Dayjs | string
  duration: number
  eventId: string
  eventOrders: Array<number>
  recordStatus: number
  recordOrigin: number
  distanceMiles?: number
  speedMph?: number
}

export interface GraphVerticalLines {
  x1: number
  x2: number
  y1: number
  y2: number
  eventOrders: Array<number>
}

export interface GraphResponse {
  duties: {
    '1': Array<GraphDuties>
    '2': Array<GraphDuties>
    '3': Array<GraphDuties>
    '4': Array<GraphDuties>
    '5': Array<GraphDuties>
    '6': Array<GraphDuties>
  }
  verticalLines: Array<GraphVerticalLines>
  days: number
  svgWidth: number
  svgViewBox: number
  dayNames: Array<string>
  dates: Array<string>
}

export interface HorizontalLine {
  x1: number
  x2: number
  y1: number
  y2: number
  eventCode: number
  eventTime: number | Dayjs | string
  duration: number
  eventId: number | string
  recordStatus: number
  recordOrigin: number
}

export interface DaySeparatorComponent {
  separatorRefs: Ref<SVGPathElement[]>
}

export interface DailySummaryResponse {
  summaryDate: string
  dailyOffDuty: number
  dailySleeperBerth: number
  dailyDriving: number
  dailyOnDuty: number
}

export interface DailyDictionarySummaryResponse {
  [key: string]: DailySummaryResponse
}

export interface ViolationPixelResponse {
  position: number
  startedAt: Dayjs | string
  description: string
}

export interface BoostFreeTime {
  eventId: string
  eventType: number
  eventCode: number
  eventDateTime: Dayjs | string
  startedFreeTime: Dayjs | string
  endedFreeTime: Dayjs | string
  freeDurationInSeconds: number
  eventDurationInSeconds: number
  startPosition: number
  endPosition: number
}

export interface ViolationResponse {
  startedAt: Dayjs | string
  description: {
    shortName?: string
    description?: string
  }
}

export interface WeeklyViolationResponse {
  dateOfViolations: Dayjs | string
  violations: ViolationResponse[]
}
