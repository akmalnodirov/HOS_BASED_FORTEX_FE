// Type definitions for Permissions module

export interface Permission {
  id: number | string
  no: number
  name: string
  code?: string
}

export type SortKey = 'name' | 'code'
export type SortOrder = 'asc' | 'desc'

export interface PermissionFormData {
  name: string
  code: string
}

export interface PermissionResponse {
  id: string
  name: string
  code: string
}

export interface PermissionRequest {
  name: string
  code: string
  methodName: string
}

export interface PermissionListResponse {
  successResult: {
    data: PermissionResponse[]
    totalCount: number
  }
}
