// src/types/dotInspection.ts
export interface DotInspection {
  id: string
  clientId: string
  clientName: string
  companyId: string
  companyName: string
  driverId: string
  driverName: string
  startDate: string
  endDate: string
  description: string
  status: number
  dateTime: string
}

export interface DotInspectionListResponse {
  successResult: {
    data: DotInspection[]
    totalCount: number
  }
}

export interface CreateDotInspectionRequest {
  companyId: string
  driverId: string
  startDate: string
  endDate: string
  description: string
  status: number
}

export interface UpdateDotInspectionStatusRequest {
  status: number
}
