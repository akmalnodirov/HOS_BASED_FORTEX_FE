/**
 * Types for Restarts module
 */

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
