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

export type RouteEldMotionStatus = 'MOVING' | 'STOPPED' | 'UNKNOWN'

export interface RouteEldLiveTrackingPoint {
  id: string
  timestamp: number
  latitude: number
  longitude: number
  speed: number | null
  odometer: number | null
  engineHours: number | null
  motionStatus: RouteEldMotionStatus
  engineEventCode: string | null
  stateCode: string | null
  source: string | null
  location: string | null
  driverId: string | null
  driverName: string | null
}

export interface RouteEldLiveDriver {
  driverId: string
  externalCompanyId: string
  externalDriverId: string
  driverName: string
  email: string | null
  phoneNumber: string | null
  vehicleId: string | null
  vehicleName: string | null
  vehicleVin: string | null
  currentStatus: string
  connectionStatus: string
  motionStatus: RouteEldMotionStatus
  latestPoint: RouteEldLiveTrackingPoint | null
}

export interface RouteEldDriverTracking {
  driver: RouteEldLiveDriver
  fromTimestamp: number
  toTimestamp: number
  points: RouteEldLiveTrackingPoint[]
}

export interface RouteEldLiveShareResponse {
  token: string
  shareUrl: string
  companyId: string
  vehicleId: string
  vehicleName: string
  recipientEmail: string | null
  recipientTelegram: string | null
  expiresAt: string
  recipientEmails: string[]
  recipientTelegrams: string[]
}

export interface RouteEldLiveShareTracking {
  expiresAt: string
  tracking: {
    vehicle: {
      companyId: string
      companyName: string
      vehicleId: string
      name: string
      vin: string | null
      driverId: string | null
      driverName: string | null
      motionStatus: RouteEldMotionStatus
      latestPoint: RouteEldLiveTrackingPoint | null
    }
    fromTimestamp: number
    toTimestamp: number
    points: RouteEldLiveTrackingPoint[]
  }
}
