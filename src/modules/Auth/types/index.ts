// Permission type
export interface Permission {
  id: string
  name: string
  code: string
}

// Role type
export interface Role {
  id: string
  name: string
  type: number
  permissions: Permission[]
}

// User type from API
export interface User {
  id: string
  userName: string
  firstName: string
  lastName: string
  email: string | null
  phoneNumber: string | null
  carriersCount?: number
  driversCount?: number
  state?: number
  roles: Role[]
  toolCodes: number[] | null
}

// Login Credentials
export interface LoginCredentials {
  username: string
  password: string
}

// Login Success Result
export interface LoginSuccessResult {
  token: string
  refreshToken: string
  user: User
}

// Login API Response
export interface LoginResponse {
  successResult: LoginSuccessResult
}

// TimeZone Info from API
export interface TimeZoneInfo {
  id: string
  offset: number
  displayName: string
  daylightName: string
  shortName: string
  ianaId: string
}

// Provider from carrier
export interface Provider {
  id: string
  name: string
  email: string
  phoneNumber: string
  isActive: boolean
  carriersCount: number
  vehiclesCount: number
  user: unknown | null
  permissions: Permission[]
}

// Carrier from current-user API
export interface CurrentUserCarrier {
  id: string
  name: string
  usdotNumber: string
  phoneNumber: string
  email: string
  street?: string
  city?: string
  zipCode?: string
  issuerState?: string | null
  timeZoneInfo: TimeZoneInfo
  carrierTerminals?: unknown[]
  carrierDriverLogSetting?: unknown | null
  provider: Provider | null
}

// Current User API Response
export interface CurrentUserResponse {
  successResult?: {
    user: User
    carrier: CurrentUserCarrier | null
  }
}

// Auth Store State
export interface AuthState {
  user: User | null
  carrier: CurrentUserCarrier | null
  loggedIn: boolean
  token: string | null
  refreshToken: string | null
}
