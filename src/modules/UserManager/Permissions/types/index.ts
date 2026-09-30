/**
 * Types for Permissions module
 */

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
  successResult: PermissionResponse[]
}
