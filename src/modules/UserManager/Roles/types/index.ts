/**
 * Types for Roles module
 */

// Permission type
export interface PermissionResponse {
  id: string
  name: string
  code: string
}

// Role response from API
export interface RoleResponse {
  id: string
  name: string
  type: number
  permissions: PermissionResponse[]
}

// Role request for create/update
export interface RoleRequest {
  name: string
  type: number
  providerId: string
  permissionIds: string[]
}

// Form data for role modal
export interface RoleFormData {
  name: string
  type: string
  permissions: string[]
}

// List response wrapper (API returns array directly or paginated)
export interface RoleListResponse {
  successResult: RoleResponse[] | {
    data: RoleResponse[]
    totalCount: number
  }
}

// Role type option for dropdown
export interface RoleType {
  type: number
  name: string
}

// Sorting types
export type SortKey = 'no' | 'name' | 'permission'
export type SortOrder = 'asc' | 'desc'

// Table row type
export interface Role {
  id: string | number
  no: number
  name: string
  permission: number
  type?: number
  permissions?: PermissionResponse[]
}
