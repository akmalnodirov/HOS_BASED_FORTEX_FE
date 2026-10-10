export interface VehicleReportRow {
  vehicleId: string
  name: string
  vin?: string | null
  make?: string | null
  model?: string | null
  year?: number | null
  plateNumber?: string | null
  eldSerialNumber?: string | null
  isActiveFlag: boolean
  worked: boolean
  workedDays: number
  driverName?: string | null
}

export interface VehicleReportResponse {
  companyId: string
  year: number
  month: number
  activeCount: number
  inactiveCount: number
  vehicles: VehicleReportRow[]
}

export interface FullVehicleReportCompany {
  companyId: string
  companyName: string
  workedCount: number
  vehicles: VehicleReportRow[]
}

export interface FullVehicleReportResponse {
  year: number
  month: number
  companyCount: number
  workedCount: number
  companies: FullVehicleReportCompany[]
}
