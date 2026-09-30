import type { SortOrder } from '@/utils/sort'

// API response shape from server
export interface PortalUserApiResponse {
  id: string
  userName: string
  firstName: string
  lastName: string
  email: string
  phoneNumber: string
  isActive: boolean | null
  role: RoleResponse | null
}

export interface RoleResponse {
  id: string
  name: string
  group?: number
  type?: number
}

// UI display shape (used by table component)
export interface PortalUser {
  id: string
  no: number
  name: string
  email: string
  role: string
  phoneNumber: string
  status: boolean
  // Keep raw data for edit operations
  firstName?: string
  lastName?: string
  userName?: string
  roleId?: string
}

// Form data shape for add/edit modal
export interface PortalUserFormData {
  name: string
  email: string
  password: string
  confirmPassword: string
  role: string
  phoneNumber: string
}

// API request shape for creating/updating user
export interface PortalUserRequest {
  userName: string | null
  firstName: string | null
  lastName: string | null
  email: string | null
  phoneNumber: string | null
  password: string | null
  passwordConfirm: string | null
  providerId: string | null
  carrierId?: string | null
  roleId?: string | null
}

export interface Role {
  id: string
  name: string
  type?: number
}

export type PortalUserFilter = 'all' | 'active' | 'inactive'
export type SortKey = keyof PortalUser
export type { SortOrder }
