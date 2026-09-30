// src/types/dotInspection.ts
export interface DotInspection {
  id: string
  providerId: string
  providerName: string
  carrierId: string
  carrierName: string
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
  carrierId: string
  driverId: string
  startDate: string
  endDate: string
  description: string
  status: number
}

export interface UpdateDotInspectionStatusRequest {
  status: number
}
