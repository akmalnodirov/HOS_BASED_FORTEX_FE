export interface TimeZoneInfo {
  id: string
  offset: number
  displayName: string
  daylightName: string
  shortName: string
  ianaId: string
}

export interface HosTimeRemainder {
  breakDuration: number
  drivingDuration: number
  shiftDuration: number
  cycleDuration: number
}

export interface HosRecord {
  dateTime: string
  dailyDriving: number
  dailyOnDuty: number
  hasViolation: boolean
  isCertified: boolean
  hasDriverDailyForm: boolean
}

export interface MonitoringDriver {
  driverId: string
  driverName: string
  phoneNumber: string
  vehicleId: string
  vehicleUnit: string
  eventCode: number
  eventType: number
  dateTime: string
  hasViolation: boolean
  isCertified: boolean
  isConnected: boolean
  calculatedLocation: string
  manualLocation: string
  latitude: number
  longitude: number
  violation: unknown | null
  timeZoneInfo: TimeZoneInfo
  hosTimeRemainder: HosTimeRemainder
  hosRecords: HosRecord[]
}

export interface ProcessingEventsData {
  monitoringDrivers: MonitoringDriver[]
}

export interface ProcessingEventsResponse {
  successResult: {
    data: ProcessingEventsData[]
    totalCount?: number
  }
}

// New API types for drivers-last-events
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

export interface DriverLastEvent {
  driverDetails: DriverDetails
  eventCode: number
  eventType: number
  calculatedLocation: string | null
  manualLocation: string | null
  latitude: number
  longitude: number
  vehicleSpeed: number | null
}

export interface DriversLastEventsResponse {
  successResult: DriverLastEvent[]
}

