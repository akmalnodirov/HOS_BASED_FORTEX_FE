/**
 * Types for ELDConnections module
 */

export interface ELDConnection {
  id: number | string
  no: number
  name: string
}

export type SortKey = 'name'
export type SortOrder = 'asc' | 'desc'

export interface ELDConnectionFormData {
  name: string
}

export interface ELDConnectionResponse {
  id: string
  name: string
}

export interface ELDConnectionRequest {
  name: string
}

export interface ELDConnectionListResponse {
  successResult: {
    data: ELDConnectionResponse[]
    totalCount: number
    pageNumber: number
    pageSize: number
    isFirst: boolean
    isLast: boolean
  }
}
