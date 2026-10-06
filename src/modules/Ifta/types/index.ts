export interface IftaReport {
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

export interface IftaVehicle {
  id: string
  name: string | null
  vin: string | null
  make: string | null
  model: string | null
  year: number | null
}

export interface IftaGenerateForm {
  vehicleIds: string[]
  fromDate: string
  toDate: string
  states: string[]
}

export interface IftaGenerateRequest {
  companyId: string
  companyName: string
  fromDate: string
  toDate: string
  timeZoneId: string
  vehicles: IftaVehicle[]
  states: string[]
}

export interface IftaSelectOption {
  value: string
  label: string
}

export type IftaSortKey = 'timeSubmitted' | 'fromDate' | 'toDate' | 'vehicleName' | 'status'
export type IftaDownloadFormat = 'pdf' | 'csv' | 'all'
