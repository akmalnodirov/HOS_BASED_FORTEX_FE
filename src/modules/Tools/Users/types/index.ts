// src/types/user.ts
export interface Permission {
  id: string
  name: string
  code: string
}

export interface Role {
  id: string
  name: string
  type: number
  permissions: Permission[]
}

export interface User {
  id: string
  userName: string
  firstName: string
  lastName: string
  isActive: boolean
  role: Role
  toolCodes: string[]
}

export interface UsersListResponse {
  successResult: {
    data: User[]
    totalCount: number
  }
}

export interface RolesResponse {
  successResult: Role[]
}

export interface CreateUserRequest {
  userName: string
  firstName: string
  lastName: string
  password: string
  passwordConfirm: string
  providerId: string
  roleId: string
  isActive?: boolean
}

export interface UpdateUserRequest {
  userName: string
  firstName: string
  lastName: string
  roleId: string
  isActive?: boolean
}
