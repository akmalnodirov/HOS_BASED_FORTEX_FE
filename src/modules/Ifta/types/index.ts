// API response shape
export interface IftaApiResponse {
  id: string
  startDate: string
  endDate: string
  pdfPath: string
  csvPath: string
  dateTime: string
  vehicle: {
    id: string
    unit: string | null
  }
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
}

// API request for generating IFTA report
export interface IftaGenerateRequest {
  vehicleIds: string[]
  startDate: string
  endDate: string
  carrierId: string
}

// API request for fetching IFTA list
export interface IftaFilterRequest {
  carrierId: string
  pageNumber?: number
  pageSize?: number
}

// Vehicle option for select dropdown
export interface VehicleOption {
  id: string
  unit: string | null
}
