import type { Dayjs } from 'dayjs'

export interface TimeZoneInfo {
  id: string
  offset: number
  displayName: string
  daylightName: string
  shortName: string
  ianaId: string
}

export interface Vehicle {
  id: string
  unit: string | null
  make: string | null
  model: string | null
}

export interface DefectApiResponse {
  id: string
  name: string
  type: number // 0 = vehicle defects, 1 = trailer defects
}

export interface DefectsListResponse {
  successResult: DefectApiResponse[]
}

export interface VehiclesResponse {
  successResult: {
    data: Vehicle[]
    totalCount: number
  }
}

export interface DriverOption {
  id: string
  name: string // full name: `${firstName} ${lastName}`
}

export interface DriversListResponse {
  successResult:
    | {
        data: Array<{ id: string; user: { firstName: string; lastName: string } }>
        totalCount: number
      }
    | Array<{ id: string; user: { firstName: string; lastName: string } }>
}

export interface SignatureResponse {
  successResult: {
    signaturesPath: string[]
    location?: string
  }
}

export interface Defect {
  id: string
  name: string
  description: string
}

// Raw API response shape (what the server returns)
export interface DvirApiResponse {
  id: string
  dateTime: string
  location: string
  odometer: number
  remarks: string
  signaturePath: string
  dvirStatus: { id?: string; name: string } | null
  driver: {
    id?: string
    user: {
      firstName: string
      lastName: string
    }
  } | null
  vehicle: {
    id: string
    unit: string
    make: string
    model: string
    manufactureYear: number
    vin: string
    vehicleFuel: unknown
    licensePlate: unknown
    eldVehicleConnection: unknown
    code: string
    message: string
    isAllowedSleep: boolean
  } | null
  vehicleDefects: { id?: string; name: string }[]
  trailers: string[]
  trailerDefects: { id?: string; name: string }[]
}

// UI display shape (mapped from API response)
export interface DvirRecord {
  id: string
  driverId?: string
  vehicleId?: string
  driverName: string
  time: string
  vehicle: string
  status: string
  defects: string
  odometer?: string
  trailer?: string
  location?: string
  vehicleDefects?: Defect[]
  trailerDefects?: Defect[]
  remarks?: string
  signature?: string
}

export interface DvirListResponse {
  successResult: {
    data: DvirApiResponse[]
    totalCount: number
  }
}

export interface DvirDetailResponse {
  successResult: {
    id: string
    driverName: string
    truck: string
    location: string
    time: string
    odometer: string
    trailer: string
    remarks: string
    vehicleDefects: string[]
    trailerDefects: string[]
    signature: string
  }
}

export interface DvirRequest {
  page: number
  pageSize: number
  startDate: string
  endDate: string
  vehicleId: string | null
  driverId: string | null
  companyId: string
}

export interface DvirStatus {
  id: string
  name: string
}

export interface DvirStatusesResponse {
  successResult: DvirStatus[]
}

export interface CreateDvirRequest {
  driverId: string
  dateTime: string // ISO UTC: "2026-03-02T11:51:29Z"
  location: string
  odometer: number
  remarks: string
  dvirStatusId: string
  vehicleId: string
  vehicleDefectIds: string[]
  trailerDefectIds: string[]
  trailers: string[]
  signaturePath: string
}
