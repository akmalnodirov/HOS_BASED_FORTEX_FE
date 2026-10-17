export interface PermissionResponse {
  id: string
  name: string
  code: string
}

export interface RoleResponse {
  id: string
  name: string
  type: number
  permissions: PermissionResponse[]
  canManage: boolean
}

export interface RoleRequest {
  name: string
  type: number
  clientId: string | null
  permissionIds: string[]
}

export interface RoleFormData {
  name: string
  type: string
  permissions: string[]
}

export interface RoleListResponse {
  successResult: RoleResponse[] | {
    data: RoleResponse[]
    totalCount: number
  }
}

export interface RoleType {
  type: number
  name: string
}

export type SortKey = 'no' | 'name' | 'permission'
export type SortOrder = 'asc' | 'desc'

export interface Role {
  id: string | number
  no: number
  name: string
  permission: number
  type?: number
  permissions?: PermissionResponse[]
  canManage?: boolean
}
