/**
 * Types for RestBreaks module
 */

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
