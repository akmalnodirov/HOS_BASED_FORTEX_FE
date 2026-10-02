import type { Dayjs } from 'dayjs'

export interface SessionRequest {
  driverId: string
  type: number
  startDate: string // UTC string
  endDate: string // UTC string
  status: number
}

export interface SessionResponse {
  id: string
  type: number | null
  companyId: string
  companyName: string
  driverId: string
  driverName: string
  status: number
  operator?: {
    id: string
    firstName: string
    lastName: string
  }
  currentTime?: Dayjs | string
  startDate: Dayjs | string
  endDate: Dayjs | string
  isSubmitted: boolean
  changes?: string
}

export interface TabRequest {
  sessionId: string
  name: string
  type: number
}

export interface TabResponse {
  id: string
  name: string
  type: number
  sessionId: string
}

export interface BoostEventRequest {
  driverId: string
  startDate: string // UTC
  endDate: string // UTC
}

export interface BoostHistoryRequest {
  tabId: string
  sessionId: string
}

export interface BoostHistoryWithScreenRequest extends BoostHistoryRequest {
  screenResolution: number
}

export interface BoostEventResponse {
  id: string
  sequenceId: number
  dateTime: string
  certifiedDate: string | null
  durationInSeconds: number
  eventCode: number
  eventType: number
  eventCodeDescription?: string
  eventTypeDescription?: string
  isDOTInspected?: boolean
  dotInspectionId?: string | null
  calculatedLocation?: string
  manualLocation?: string
  recordStatus: number
  recordOrigin: number
  totalEngineHours: number
  totalVehicleMiles: number
  trailer: string | null
  doc: string | null
  vehicleId?: string
  annotation?: string
  actionState: number
  locationOrigin?: number | null
  latitude: number | null
  longitude: number | null
  driverId: string
  driver: {
    driverId: string
    firstName?: string
    lastName?: string
    email?: string
    phoneNumber?: string
    vehicleId: string
    vehicleUnit?: string
    status?: boolean
    isTestDriver?: boolean | null
    workedDurationInSeconds?: number
    isConnected?: boolean
  }
  wasChanged?: boolean
  errorTitles?: string[]
  warningTitles?: string[]
}

export interface BoostEventsResponse {
  date: string
  events: BoostEventResponse[]
}

export interface BoostEventAddUpdateRequest {
  tabId: string
  sessionId: string
  driverId: string
  vehicleId: string
  sequenceId: number
  recordStatus: number
  recordOrigin: number
  eventType: number
  eventCode: number
  dateTime: string // UTC
  totalVehicleMiles: number
  totalEngineHours: number
  annotation: string | null
  certifiedDate: string | null
  trailer: string | null
  doc: string | null
  locationOrigin: number | null
  latitude: number | null
  longitude: number | null
  calculatedLocation: string | null
  manualLocation: string | null
}

export interface BoostEventActionRequest {
  tabId: string
  sessionId: string
  eventId: string
}

export interface BoostEventsDeleteRequest {
  tabId: string
  sessionId: string
  eventIds: string[]
}

export interface BoostEventsReassignRequest {
  tabId: string
  sessionId: string
  eventIds: string[]
  toDriverId: string
}

export interface BoostEventMoveTimeRequest {
  moveEventTimeType: number
  timeAmount: number
  eventIds: string[]
  sessionId: string
  tabId: string
  eventsDurations: number[]
}

export interface LocationSearchRequest {
  sessionId: string
  tabId: string
  calculatedLocation: string
  latitude: number
  longitude: number
}

export interface LocationSearchResponse {
  id: string
  dateTime: string
  eventType: number
  eventCode: number
  latitude: number
  longitude: number
  location: string
  distance: number
}

export interface HosTimeRemainder {
  breakDuration: number
  drivingDuration: number
  shiftDuration: number
  cycleDuration: number
}

export interface BoostViolationResponse {
  type: number
  startedAt: string
  violationDateTime: string
  violationEventId: string
  description: {
    shortName?: string
    description?: string
  }
}

export interface BoostViolationRequest {
  tabId: string
  sessionId: string
  screenResolution: number
}

export interface OptimizeCategory {
  id: string
  name: string
  description?: string
}

export interface BoostEventStatusForm {
  id: number
  eventId: string
  event: { eventCode: number | null; eventType: number | null }
  origin: number | null
  vehicleId: string | null
  vehicleUnit: string | null
  odometer: number | null
  engineHours: number | null
  trailer: string | null
  doc: string | null
  locationOrigin: number | null
  latitude: number | string | null
  longitude: number | string | null
  location: string | null
  locationNote: string | null
  notes: string | null
  startDate: string
  time: { hours: number; minutes: number; seconds: number }
  certifiedDate: string | null
  certifiedTime: { hours: number; minutes: number; seconds: number }
}

export interface BoostEventsReplicateRequest {
  tabId: string
  sessionId: string
  eventIds: string[]
  toDriverId: string
}

export interface BoostEventsMultiUpdateRequest {
  eventIds: string[]
  trailer: string | null
  doc: string | null
  coDriverId: string | null
  shiftedTimes: number | null
  sessionId: string
  tabId: string
}

// ─── Daily Form list (for accordion header) ───────────────────────────────────
export interface DailyFormListResponse {
  id: string
  formDate: string
  trailers: string[]
  shippingDocuments: string[]
  coDriver: string | null
  isCertified: boolean
  isEdited: boolean
}

// ─── Daily Form types ─────────────────────────────────────────────────────────
export interface DriverInfoResponse {
  driverId: string
  firstName: string
  lastName: string
}

export interface DriverDailyFormResponse {
  id: string
  trailers: string[]
  shippingDocuments: string[]
  coDriver?: { id: string }
  assignedVehicles: { id: string }[]
  signaturePath?: string
}

export interface EditDriverDailyFormByDateResponse {
  coDrivers: DriverInfoResponse[]
  signaturePath: string
  signaturePaths: string[]
  driverDailyForm: DriverDailyFormResponse
}

export interface BoostDailyFormRequest {
  driverId: string
  assignedVehicleIds: string[]
  trailers: string[]
  shippingDocuments: string[]
  coDriverId: string | null
  formDate: string
  certifiedDate: string
  signaturePath: string | null
  tabId: string
  sessionId: string
}

export interface BoostDailyFormRevertRequest {
  formId: string
  sessionId: string
  tabId: string
}

export interface BoostEventEditProfile {
  date: string
  dailyFormId: string | null
  coDriver: string | null
  coDrivers: DriverInfoResponse[]
  trailer: string | null
  shippingDocs: string | null
  signature: string | null
  signaturePaths: string[]
  assignedVehicleIds: string[]
}

