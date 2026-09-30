/**
 * Types for CargoTypes module
 */

export interface CargoType {
  id: number | string
  no: number
  name: string
}

export type SortKey = 'name'
export type SortOrder = 'asc' | 'desc'

export interface CargoTypeFormData {
  name: string
}

export interface CargoTypeResponse {
  id: string
  name: string
}

export interface CargoTypeRequest {
  name: string
}

export interface CargoTypeListResponse {
  successResult: {
    data: CargoTypeResponse[]
    totalCount: number
    pageNumber: number
    pageSize: number
    isFirst: boolean
    isLast: boolean
  }
}
