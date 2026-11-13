export interface CompanyCertificationDayPreview {
  logDate: string
  hasProfileForm: boolean
  isSigned: boolean
  updatedAt: string | null
}

export interface CompanyCertificationDriverPreview {
  driverId: string
  externalDriverId: string
  driverName: string
  days: CompanyCertificationDayPreview[]
  error: string | null
}

export interface CompanyCertificationPreview {
  companyId: string
  companyName: string
  fromDate: string
  toDate: string
  drivers: CompanyCertificationDriverPreview[]
}

export interface CompanyCertificationAction {
  type: string
  eventId: string | null
  message: string
  succeeded: boolean
  error: string | null
}

export type CompanyCertificationItemStatus =
  | 'MISSING'
  | 'PRESENT'
  | 'NOT_SIGNED'
  | 'SIGNED'
  | 'INVALID'
  | 'VALID'

export interface CompanyCertificationDayResult {
  logDate: string
  status: string
  hadProfileForm: boolean
  wasSigned: boolean
  isSigned: boolean
  profileFormBeforeStatus: CompanyCertificationItemStatus
  profileFormAfterStatus: CompanyCertificationItemStatus
  certificationBeforeStatus: CompanyCertificationItemStatus
  certificationAfterStatus: CompanyCertificationItemStatus
  profileFormId: string | null
  signatureFileName: string | null
  actions: CompanyCertificationAction[]
  error: string | null
}

export interface CompanyCertificationDriverResult {
  id: string
  driverId: string
  externalDriverId: string
  driverName: string
  status: string
  totalDays: number
  repairedDays: number
  skippedDays: number
  failedDays: number
  error: string | null
  startedAt: string | null
  completedAt: string | null
  days: CompanyCertificationDayResult[]
}

export interface CompanyCertificationBatch {
  id: string
  companyId: string
  companyName: string
  fromDate: string
  toDate: string
  status: string
  totalDrivers: number
  completedDrivers: number
  succeededDrivers: number
  partiallySucceededDrivers: number
  failedDrivers: number
  error: string | null
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  drivers: CompanyCertificationDriverResult[]
}
