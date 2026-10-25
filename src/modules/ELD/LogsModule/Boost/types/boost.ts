import type { Dayjs } from 'dayjs'

export interface SessionRequest {
  driverId: string
  type: number
  startDate: string
  endDate: string
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
  startDate: string
  endDate: string
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
  locationOrigin: number | null
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
  dateTime: string
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
  type: string | number
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

export interface BoostEventStatusForm {
  responsibleUserId?: string
  id: number
  eventId: string
  sequenceId: string | null
  event: { eventCode: number | null; eventType: number | null }
  eventCodeId?: string | null
  originalEventCode?: string | null
  originalIsEditable?: boolean
  origin: number | null
  recordStatus: string | null
  vehicleId: string | null
  vehicleUnit: string | null
  eldId: string | null
  positioning: 'MANUAL' | 'AUTOMATIC' | null
  odometer: number | null
  engineHours: number | null
  trailer: string | null
  doc: string | null
  /** Legacy API compatibility only. The Boost editor exposes `positioning` as the single control. */
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

export interface RouteEldDailyLogDetail {
  id: string
  logDate: string
  timeZone: string | null
  driverName: string
  driverEmail: string | null
  driverLicense: string | null
  driverLicenseState: string | null
  isExempt: boolean
  coDriverName: string | null
  coDriverEmail: string | null
  coDriverId: string | null
  trailers: string[]
  shippingDocuments: string[]
  carrierName: string | null
  mainOffice: string | null
  homeTerminal: string | null
  dotNumber: string | null
  eldSerialNumber: string | null
  eldMacAddress: string | null
  eldRegistrationId: string | null
  eldIdentifier: string | null
  hasDiagnosticIndicator: boolean
  hasMalfunctionIndicator: boolean
  signature: string | null
}

export interface RouteEldVehicleOption {
  id: string
  name: string
  vin: string | null
  isActive: boolean
}

export interface RouteEldEldOption {
  id: string
  serialNumber: string | null
  sn: string | null
  isActive: boolean
}

export interface RouteEldEventEditOptions {
  vehicles: RouteEldVehicleOption[]
  elds: RouteEldEldOption[]
}

export interface RouteEldSchedule {
  driverId: string
  driverName: string
  externalDriverId: string
  companyName: string
  fromDate: string
  toDate: string
  disableSleeperBerth: boolean
  dailyLogs: RouteEldDailyLogDetail[]
  editOptions: RouteEldEventEditOptions
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

export interface DailyFormListResponse {
  id: string
  formDate: string
  trailers: string[]
  shippingDocuments: string[]
  coDriver: string | null
  isCertified: boolean
  isEdited: boolean
}

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
  coDriverName: string | null
  coDrivers: DriverInfoResponse[]
  trailer: string | null
  shippingDocs: string | null
  signature: string | null
  signaturePaths: string[]
  assignedVehicleIds: string[]
}

export type RouteEldNormalizeType =
  | 'future_event'
  | 'malfunction'
  | 'unidentified'
  | 'sequence'
  | 'driving'
  | 'engine_hours'
  | 'intermediate'
  | 'location'
  | 'odometer'
  | 'duplicate'
  | 'power_up/shut_down'
  | 'on_duty'
  | 'missing_location_or_odometer'
  | 'pti'
  | 'manual_location'
  | 'login_logout'

export interface RouteEldNormalizeRepairMessage {
  type: RouteEldNormalizeType
  localEventId: string
  providerEventId: string
  sequenceId: string | null
  engineHours: number | null
  code: string
  message: string
}

export interface RouteEldNormalizeResponse {
  success: boolean
  changedEventCount: number
  messages: RouteEldNormalizeRepairMessage[]
}

export interface RouteEldEventSessionListItem {
  id: string
  driverId: string
  driverName: string
  companyName: string
  dispatcherId?: string | null
  dispatcherName?: string | null
  name: string
  fromDate: string
  toDate: string
  status: 'DRAFT' | 'SUBMITTED' | 'ROLLED_BACK' | string
  tabCount: number
  changedEventCount: number
  createdAt: string
  submittedAt?: string | null
  rolledBackAt?: string | null
  isRollbackBlocked: boolean
}

export interface RouteEldEventSessionPage {
  data: RouteEldEventSessionListItem[]
  pagination: {
    pageNumber: number
    pageSize: number
    totalCount: number
    totalPages: number
  }
  draftCount: number
  submittedCount: number
  rolledBackCount: number
}

export interface RouteEldEventTab {
  id: string
  name: string
  kind: 'INITIAL' | 'WORKING' | 'FINAL' | 'ROLLBACK' | string
  position: number
  changedEventCount: number
  createdAt: string
}

export interface RouteEldEventSession {
  id: string
  driverId: string
  driverName: string
  companyName: string
  name: string
  fromDate: string
  toDate: string
  disableSleeperBerth: boolean
  status: 'DRAFT' | 'SUBMITTED' | 'ROLLED_BACK' | string
  createdAt: string
  submittedAt?: string | null
  rolledBackAt?: string | null
  changes: Array<{
    historyId: string
    eventId: string
    version: number
    changeType: string
    isSubmitted: boolean
    isRolledBack: boolean
  }>
  tabs: RouteEldEventTab[]
  isRollbackBlocked: boolean
  pendingSubmissionCount: number
  pendingRollbackCount: number
  coDriverId?: string | null
  coDriverDisableSleeperBerth?: boolean | null
  coDriverName?: string | null
}

export interface RouteEldSessionOperationFailure {
  label: string
  message: string
}

export interface RouteEldSessionOperation {
  id: string
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | string
  total: number
  completed: number
  succeeded: number
  failed: number
  failures: RouteEldSessionOperationFailure[]
  error?: string | null
}

export interface RouteEldCertificationDay {
  logDate: string
  isCertified: boolean
  isSigned: boolean | null
  certifications: RouteEldCertificationEvent[]
}

export interface RouteEldCertificationEvent {
  certifiedLogDate: string | null
  eventLogDate: string
  eventId: string
  sequenceId: string | null
  eventCode: string
  timestamp: number
  positioning: 'MANUAL' | 'AUTOMATIC' | null
  latitude: number | null
  longitude: number | null
  location: string | null
  driverLocationDescription: string | null
  odometerMiles: number | null
  engineHours: number | null
  isCertificationDateValid: boolean
  hasProhibitedData: boolean
  requiresFix: boolean
}

export interface RouteEldCertificationReport {
  companyName: string
  driverName: string
  certifiedDays: number
  totalDays: number
  days: RouteEldCertificationDay[]
  invalidDateCertifications: RouteEldCertificationEvent[]
}

export interface RouteEldHosEvent {
  id: string
  revision?: string | null
  sequenceId?: string | null
  eventCode: string
  eventName: string
  eventCategory: string
  timestamp: number
  logCreationTime?: number | null
  logDate: string
  timeZone?: string | null
  recordOrigin?: string | null
  recordStatus: string
  vehicleId?: string | null
  vehicleName?: string | null
  vehicleVin?: string | null
  latitude?: number | null
  longitude?: number | null
  location?: string | null
  odometerMiles?: number | null
  engineHours?: number | null
  notes?: string | null
  eldId?: string | null
  eldSerialNumber?: string | null
  eldMacAddress?: string | null
  positioning?: string | null
  driverLocationDescription?: string | null
  isEditable: boolean
  dateToCertify?: string | null
  isFrozen?: boolean
  freezeSource?: string | null
  trailers: string[]
  documents: string[]
}

export interface RouteEldWorkspaceEvent {
  event: RouteEldHosEvent
  trailers: string[]
  documents: string[]
  changeStatus: string
  historyId?: string | null
  version: number
  isSubmitted: boolean
  isRolledBack: boolean
  isDeleted: boolean
  isInserted: boolean
  ownerDriverId?: string | null
}

export interface RouteEldCalculatedClock {
  remainingMs: number
  limitMs: number
  accumulatedMs: number
}

export interface RouteEldScheduleCalculations {
  hos: {
    currentStatus: string
    break: RouteEldCalculatedClock
    drive: RouteEldCalculatedClock
    shift: RouteEldCalculatedClock
    cycle: RouteEldCalculatedClock
  }
  freeTimes: Array<{
    eventId: string
    eventCode: string
    eventTimestamp: number
    startedAt: number
    endedAt: number
    freeDurationMs: number
    eventDurationMs: number
  }>
  violations: Array<{
    eventId: string
    type: string
    title: string
    startedAt: number
    endedAt: number
  }>
  eventIssues: Array<{
    eventId: string
    severity: string
    code: string
    title: string
    timestamp: number
  }>
}

export interface RouteEldWorkspace {
  session: RouteEldEventSession
  tabId: string
  canEdit: boolean
  events: RouteEldWorkspaceEvent[]
  calculations: RouteEldScheduleCalculations
  calculationsByDriver?: Record<string, RouteEldScheduleCalculations>
  reassignedEvents: Array<{
    event: RouteEldHosEvent
    type: string
    toDriverName: string
  }>
  freezePeriods: Array<Record<string, unknown>>
}

export interface RouteEldAlprOrigin {
  eventId: string
  sequenceId: string | null
  timestamp: number
  location: import('@/modules/AlprCamera/types').AlprLocation
}

export interface RouteEldAlprRouteHistoryItem {
  id: string
  originLabel: string
  destinationLabel: string
  createdAt: string
  routeCount: number
  recommendedCameraCount: number | null
  originEventId: string
  originSequenceId: string | null
}

export interface RouteEldAlprRouteContext {
  origin: RouteEldAlprOrigin | null
  history: RouteEldAlprRouteHistoryItem[]
}

export interface RouteEldAlprRouteAnalysis {
  id: string | null
  createdAt: string
  origin: RouteEldAlprOrigin
  analysis: import('@/modules/AlprCamera/types').AlprCameraRouteAnalysisResponse
}

export interface RouteEldAlprRouteHistoryDetail {
  id: string
  originEventId: string
  originSequenceId: string | null
  report: import('@/modules/AlprCamera/types').AlprCameraRouteHistoryDetail
}

export interface RouteEldMatchedCamera {
  id: number
  displayName: string
  latitude: number
  longitude: number
  distanceMetres: number
  routePositionMetres: number
  bearings: number[]
  bearingConfidence?: string | null
  brand?: string | null
  operator?: string | null
}

export interface RouteEldEventCameraMatch {
  eventId: string
  eventTimestamp: number
  eventLatitude: number
  eventLongitude: number
  eventLocation?: string | null
  route: Array<{ longitude: number; latitude: number }>
  routeEventIds: string[]
  cameras: RouteEldMatchedCamera[]
}

export interface RouteEldEventCameraAnalysis {
  driverId: string
  fromDate: string
  toDate: string
  radiusMetres: number
  locatedEventCount: number
  routedIntervalCount: number
  routedDistanceMetres: number
  matches: RouteEldEventCameraMatch[]
}

export interface RouteEldEventCameraPresence {
  eventId: string
  hasCamera: boolean
}

export interface RouteEldProfileForm {
  ownerDriverId?: string | null
  logDate: string
  coDriverId?: string | null
  coDriverName?: string | null
  trailers: string[]
  shippingDocuments: string[]
  signatureFileName?: string | null
  signatureUrl?: string | null
  isModified: boolean
  isSubmitted: boolean
  isRolledBack: boolean
}

export interface RouteEldResponsibleUser {
  id: string
  name: string
  active: boolean
}

export interface RouteEldDriverOption {
  id: string
  externalCompanyId: string
  externalCompanyName: string
  externalDriverId: string
  displayName: string
  isActive: boolean
  isMonitoringEnabled: boolean
}

export interface RouteEldAiAdvice {
  id?: string | null
  sessionId?: string | null
  tabId?: string | null
  adviceType: string
  title: string
  analysis: string
  metrics: {
    eventCount: number
    violationCount: number
    errorCount: number
    warningCount: number
    breakRemainingHours: number
    driveRemainingHours: number
    shiftRemainingHours: number
    cycleRemainingHours: number
    immediatelyAvailableDrivingHours: number
  }
  steps: Array<{
    order: number
    priority: string
    title: string
    detail: string
    expectedOutcome: string
    eventId?: string | null
    eventTimestamp?: number | null
    affectedEventCount: number
    recommendedAction?: string | null
    actionReason?: string | null
    instructions?: string[] | null
  }>
  generatedAt: string
}
