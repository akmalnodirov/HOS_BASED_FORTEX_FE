import type { SortOrder } from '@/utils/sort'

export interface DispatcherCompany {
  id: string
  name: string
}

export interface DispatcherPermission {
  id: string
  code: string
  name: string
}

export interface Role {
  id: string
  name: string
  permissions: DispatcherPermission[]
}

export interface RouteEldDispatcherApiResponse {
  id: string
  userId: string
  fullName: string
  email: string
  isActive: boolean
  companies: DispatcherCompany[]
  role: Role
}

export interface User {
  id: string
  no: number
  name: string
  email: string
  role: string
  roleId: string
  companies: DispatcherCompany[]
  companyNames: string
  status: boolean
}

export interface UserFormData {
  name: string
  email: string
  password: string
  confirmPassword: string
  roleId: string
  companyIds: string[]
}

export interface UserRequest {
  fullName: string
  email: string
  password: string | null
  companyIds: string[]
  roleId: string
  isActive?: boolean
}

export type UserFilter = 'all' | 'active' | 'inactive'
export type SortKey = 'no' | 'name' | 'email' | 'role' | 'companyNames' | 'status'
export type { SortOrder }
