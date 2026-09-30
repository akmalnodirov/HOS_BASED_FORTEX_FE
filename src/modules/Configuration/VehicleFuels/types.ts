// Type definitions for Vehicle Fuels module

export interface VehicleFuel {
  id: number | string
  no: number
  name: string
}

export type SortKey = 'name'
export type SortOrder = 'asc' | 'desc'

export interface VehicleFuelFormData {
  name: string
}

export interface VehicleFuelResponse {
  id: string
  name: string
}

export interface VehicleFuelRequest {
  name: string
}

export interface VehicleFuelListResponse {
  successResult: {
    data: VehicleFuelResponse[]
    totalCount: number
    pageNumber: number
    pageSize: number
    isFirst: boolean
    isLast: boolean
  }
}
