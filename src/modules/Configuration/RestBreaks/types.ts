// Type definitions for Rest Breaks module

export interface RestBreak {
  id: number | string
  no: number
  name: string
}

export type SortKey = 'name'
export type SortOrder = 'asc' | 'desc'

export interface RestBreakFormData {
  name: string
}

export interface RestBreakResponse {
  id: string
  name: string
}

export interface RestBreakRequest {
  name: string
}

export interface RestBreakListResponse {
  successResult: {
    data: RestBreakResponse[]
    totalCount: number
    pageNumber: number
    pageSize: number
    isFirst: boolean
    isLast: boolean
  }
}
