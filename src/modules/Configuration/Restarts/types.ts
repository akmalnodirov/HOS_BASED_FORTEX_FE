// Type definitions for Restarts module

export interface Restart {
  id: number | string
  no: number
  name: string
}

export type SortKey = 'name'
export type SortOrder = 'asc' | 'desc'

export interface RestartFormData {
  name: string
}

export interface RestartResponse {
  id: string
  name: string
}

export interface RestartRequest {
  name: string
}

export interface RestartListResponse {
  successResult: {
    data: RestartResponse[]
    totalCount: number
    pageNumber: number
    pageSize: number
    isFirst: boolean
    isLast: boolean
  }
}
