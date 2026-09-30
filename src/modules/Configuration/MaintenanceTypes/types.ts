/**
 * Types for MaintenanceTypes module
 */

export interface MaintenanceType {
  id: number | string
  no: number
  name: string
}

export type SortKey = 'name'
export type SortOrder = 'asc' | 'desc'

export interface MaintenanceTypeFormData {
  name: string
}

export interface MaintenanceTypeResponse {
  id: string
  name: string
}

export interface MaintenanceTypeRequest {
  name: string
}

export interface MaintenanceTypeListResponse {
  successResult: {
    data: MaintenanceTypeResponse[]
    totalCount: number
    pageNumber: number
    pageSize: number
    isFirst: boolean
    isLast: boolean
  }
}
