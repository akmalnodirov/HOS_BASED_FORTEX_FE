// src/types/monitoring.ts
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

export interface MonitoringDriverEvent {
  id: string
  dateTime: string
  eventCode: number
  eventType: number
  actionState?: number
  errorTitles?: string[]
  warningTitles?: string[]
}

export interface MonitoringDriver {
  dateTime: string
  driverId: string
  driverName: string
  eventCode: number
  eventType: number
  hasViolation: boolean
  hosRecords: HosRecord[]
  hosTimeRemainder: HosTimeRemainder
  isCertified: boolean
  vehicleId: string
  vehicleUnit: string
  events?: MonitoringDriverEvent[]
  resetPinTimes?: unknown[]
  timeZone?: string
}

export interface MonitoringCompany {
  companyId: string
  companyName: string
  hasProblem: boolean
  monitoringDrivers: MonitoringDriver[]
  clientName: string
  timeZone: string
  timeZoneInfo: {
    id: string
    offset: number
    displayName: string
    daylightName: string
    shortName: string
    ianaId: string
  }
}

export interface MonitoringResponse {
  successResult: {
    data: MonitoringCompany[]
    totalCount: number
  }
}

export interface MonitoringStats {
  warnings: number
  errors: number
  mostCommonError: string
}

// Company Detail Types
export interface IssuerState {
  id: string
  name: string
  parentId: string
  stateCode: string
}

export interface TimeZoneInfo {
  id: string
  offset: number
  displayName: string
  daylightName: string
  shortName: string
  ianaId: string
}

export interface CompanyTerminal {
  id: string
  timeZoneInfo: TimeZoneInfo
  street: string
  city: string
  zipCode: string
  issuerState: IssuerState
}

export interface HosRule {
  id: string
  name: string
}

export interface CargoType {
  id: string
  name: string
}

export interface Restart {
  id: string
  name: string
}

export interface RestBreak {
  id: string
  name: string
}

export interface CompanyDriverLogSetting {
  id: string
  exemptDriver: boolean
  shortHaulException: boolean
  allowYardMoves: boolean
  allowPersonalUse: boolean
  hosRule: HosRule
  cargoType: CargoType
  restart: Restart
  restBreak: RestBreak
  startingTime24HourPeriod: string
  allowIFTA: boolean
  allowTracking: boolean
}

export interface Client {
  id: string
  name: string
  email: string
  phoneNumber: string
  isActive: boolean
  carriersCount: number
  vehiclesCount: number
  user: unknown | null
  permissions: unknown[]
}

export interface CompanyDetail {
  id: string
  name: string
  usdotNumber: string
  phoneNumber: string
  email: string
  street: string
  city: string
  zipCode: string
  issuerState: IssuerState
  timeZoneInfo: TimeZoneInfo
  carrierTerminals: CompanyTerminal[]
  carrierDriverLogSetting: CompanyDriverLogSetting
  provider: Client
}

export interface CompanyDetailResponse {
  successResult: CompanyDetail
}

// Monitoring Event/Error Types
export interface MonitoringEvent {
  id: string
  event: string
  errorType: string
  time: string
  errorMessage: string
}

export interface MonitoringEventSummary {
  lastEvent: string
  truck: string
  break: string
  driver: string
  shift: string
  cycle: string
  hasProfileForms: boolean
  violated: boolean
  lastUpdated: string
}
