/**
 * Types for IssuerState module
 */

export interface IssuerState {
  id: number | string
  no: number
  name: string
  parentId: string
  stateCode: string
}

export type SortKey = 'name' | 'stateCode'
export type SortOrder = 'asc' | 'desc'

export interface IssuerStateFormData {
  name: string
  parent: string
  stateCode: string
}

export interface IssuerStateResponse {
  id: string
  name: string
  parentId: string
  stateCode: string
}

export interface IssuerStateRequest {
  name: string
  parentId: string
  stateCode: string
}

export interface IssuerStateListResponse {
  successResult: {
    data: IssuerStateResponse[]
    totalCount: number
    pageNumber: number
    pageSize: number
    isFirst: boolean
    isLast: boolean
  }
}

export interface IssuerStateParentListResponse {
  successResult: IssuerStateResponse[]
}
