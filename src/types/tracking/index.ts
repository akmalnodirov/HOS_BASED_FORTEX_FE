import { Dayjs } from 'dayjs'

export interface DriverDetails {
  driverId: string
  firstName: string
  lastName: string
  email: string
  phoneNumber: string
  vehicleId: string
  vehicleUnit: string
  isConnected: boolean
}

export interface TrackingResponse {
  eventId: string
  eventCode: number
  eventType: number
  calculatedLocation: string
  manualLocation: string
  latitude: number
  longitude: number
  startTime: Dayjs | string
  endTime: Dayjs | string
  duration: number
  vehicleMiles: number
  vehicleSpeed: number
  vehicleUnit: string
  annotation: string
}

export interface DailyTrackingResponse {
  driverId: string
  firstName: string
  lastName: string
  email: string
  phoneNumber: string
  trackingEventResponse: TrackingResponse[]
}

export interface EveryTrackingResponse {
  driverId: string
  vehicleId: string
  latitude: number | null
  longitude: number | null
  status: number
  locationType: number
  currentTime: Dayjs | string
}

export interface LastTrackingResponse {
  driverDetails: DriverDetails
  eventType: number
  eventCode: number
  calculatedLocation: string
  manualLocation: string
  latitude: number
  longitude: number
  vehicleSpeed: number
}

export interface DriverLogsDailyEventsRequest {
  startDate: Dayjs | string
  endDate: Dayjs | string
  driverId: string
}

export interface DriverLogsLastEventRequest {
  driverId: string
  lastEventDateTime: string
}

export interface DriverLogsShareLiveRequest {
  emails: string[]
  telegrams: string[]
  driverId: string
  expireAt: string
}