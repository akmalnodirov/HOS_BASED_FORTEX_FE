/**
 * Types for VehicleFuels module
 */

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
