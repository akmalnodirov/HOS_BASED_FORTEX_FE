import type { Dayjs } from 'dayjs'

// ============================================
// Location Types
// ============================================

export interface LocationField {
  id: string
  location: string
  latitude: string
  longitude: string
}

export interface TripLocation {
  latitude: number
  longitude: number
  address: string
  locationType: number
}

// ============================================
// Trip Types
// ============================================

export interface Trip {
  bolNumber: string
  trailerNumber: string
  odometer: number
  engineHours: number
  dailyDistanceInMile: number
  from: TripLocation
  to: TripLocation
  fuelLocations: TripLocation[]
}

// ============================================
// Audit Request (sent to API)
// ============================================

export interface AuditRequest {
  carrierId: string
  driverId: string
  trips: Trip[]
  startDate: Dayjs | string
  endDate: Dayjs | string
  startTime: TimeValue | string
  endTime: TimeValue | string
}

export interface TimeValue {
  hours: number
  minutes: number
  seconds: number
}

// ============================================
// Audit Form (local form state per trip tab)
// ============================================

export interface AuditTripForm {
  carrier: string
  driver: string
  bolNumber: string
  trailerNumber: string
  startDateTime: {
    date: Dayjs
    time: TimeValue
  }
  endDateTime: {
    date: Dayjs
    time: TimeValue
  }
  insertInfo: {
    odometer: number
    engHours: number
    dailyDistance: number
  }
  from: {
    location: string
    latitude: number
    longitude: number
  }
  to: {
    location: string
    latitude: number
    longitude: number
  }
  fuel: {
    location: string
    latitude: number
    longitude: number
  }
  fuelLocations: FuelLocationItem[]
}

export interface FuelLocationItem {
  id: number
  latitude: number
  longitude: number
  location: string
}

// ============================================
// Carrier / Driver for dropdowns
// ============================================

export interface AuditCarrier {
  id: string
  name: string
  timeZoneInfo?: { ianaId: string }
}

export interface AuditDriver {
  id: string
  name: string
  user?: {
    firstName: string
    lastName: string
  }
}

// ============================================
// Audit Detail API Response Types
// ============================================

export interface AuditDailyEvent {
  id: string
  dateTime: Dayjs | string
  sequenceId: number
  eventCode: number
  eventType: number
  certifiedDate: Dayjs | string
  durationInSeconds: number | null
  locationOrigin?: number | null
  calculatedLocation: string | null
  manualLocation: string | null
  totalVehicleMiles: number
  totalEngineHours: number
  annotation: string
  recordOrigin: number
  recordStatus: number
  dotInspectionId: string | null
  isDOTInspected: boolean
  trailer: string | null
  doc: string | null
}

export interface AuditWeeklyViolation {
  dateOfViolations: Dayjs | string
  violations: AuditViolation[]
}

export interface AuditViolation {
  startedAt: Dayjs | string
  description: {
    shortName?: string
    description?: string
  }
}

export interface WeightStation {
  id: string
  name: string
  stateCode: string
  location: string
  direction: string
  marker: string
  type: string
  latitude: number
  longitude: number
}

export interface AuditTracking {
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

// ============================================
// Audit Events Table Row
// ============================================

export interface AuditEventTableRow {
  sequence: number
  time: string
  event: string
  eventType: number
  eventCode: number
  eventId: string
  certifiedDate: Dayjs | string
  duration: string
  location: string
  odometer: number
  hours: number
  recordOrigin: number
  recordStatus: number
  notes: string
}
