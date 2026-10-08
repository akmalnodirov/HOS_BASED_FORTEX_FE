// API response shape
export interface IftaApiResponse {
  id: string
  status: string
  timeSubmitted: number
  timeGenerated: number | null
  fromDate: string
  toDate: string
  url: string | null
  csvUrl: string | null
  vehicleId: string
  vehicleName: string | null
  vehicleVin: string | null
  vehicleMake: string | null
  vehicleModel: string | null
  vehicleYear: number | null
  states: string[]
  errors: string[]
}

// UI display shape
export interface IftaRecord {
  id: string
  submitted: string
  from: string
  to: string
  vehicleId: string
  status: string
  pdfPath: string
  csvPath: string
  errors: string[]
}

// API request for generating IFTA report
export interface IftaGenerateRequest {
  vehicleIds: string[]
  fromDate: string
  toDate: string
  timeZoneId: string
  companyId: string
  states: string[]
}

// API request for fetching IFTA list
export interface IftaFilterRequest {
  companyId: string
  pageNumber?: number
  pageSize?: number
}

// Vehicle option for select dropdown
export interface VehicleOption {
  id: string
  vin: string | null
  name: string | null
  make: string | null
  model: string | null
  year: number | null
}
