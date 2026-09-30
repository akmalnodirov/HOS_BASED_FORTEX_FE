import type { SortOrder } from '@/utils/sort'

// Nested types from API response
export interface DriverUser {
  firstName: string
  lastName: string
  userName: string
  email: string
  phoneNumber: string
  isActive: boolean
}

export interface DriverLicense {
  licenseNumber: string
  issuerState: {
    id: string
    parentId: string
    name: string
    stateCode: string
  }
}

export interface DeviceInfo {
  appVersion: string | null
  osVersion: string | null
  dateTime: string | null
}

export interface NameWithId {
  id: string
  name: string
}

export interface IssuerStateOption extends NameWithId {
  parentId: string | null
  stateCode?: string | null
}

export interface VehicleOption {
  id: string
  unit: string
  make?: string | null
  model?: string | null
}

export interface HomeTerminalResponse {
  id: string
  street: string
  city: string
  zipCode: string
  issuerState?: {
    stateCode: string
  }
}

export interface VehicleSimple {
  id: string | null
  unit?: string | null
}

export interface CarrierResponse {
  id: string
  name?: string
  carrierTerminals?: HomeTerminalResponse[]
}

// API response shape from server
export interface DriverApiResponse {
  id: string
  currentVehicleId?: string | null
  currentVehicleUnit?: string | null
  user: DriverUser
  homeTerminal: HomeTerminalResponse
  hosRule: NameWithId
  cargoType: NameWithId
  restart: NameWithId
  restBreak: NameWithId
  driverLicense: DriverLicense
  vehicles: VehicleSimple[]
  exemptDriver: boolean
  shortHaulException: boolean
  allowPersonalUse: boolean
  unlimitedTrailers: boolean
  allowYardMoves: boolean
  unlimitedShippingDocuments: boolean
  deviceInfo?: DeviceInfo | null
  carrier: CarrierResponse
  isActive: boolean
}

// API request shape for creating/updating
export interface DriverApiRequest {
  firstName: string
  lastName: string
  userName: string
  phoneNumber: string
  email: string
  password: string
  passwordConfirm: string
  issuerStateId: string
  licenseNumber: string
  homeTerminalId: string
  assignedVehicleIds: string[]
  exemptDriver: boolean
  shortHaulException: boolean
  allowPersonalUse: boolean
  unlimitedTrailers: boolean
  allowYardMoves: boolean
  unlimitedShippingDocuments: boolean
  hosRuleId: string
  cargoTypeId: string
  restartId: string
  restBreakId: string
  carrierId: string
}

// UI display shape (used by table component)
export interface Driver {
  id: number | string
  name: string
  unit: string
  username: string
  appVersion: string
  eventsTime: string
  status: boolean
  firstName?: string
  lastName?: string
  phoneNumber?: string
  email?: string
  homeTerminal?: string
  vehicles?: string[]
  issuerStateParent?: string
  issuerState?: string
  driverLicenseNumber?: string
  exemptDriver?: boolean
  shortHaulException?: boolean
  allowPersonalUse?: boolean
  allowYardMove?: boolean
  unlimitedTrailers?: boolean
  unlimitedShippingDocuments?: boolean
  hosRoles?: string
  cargoType?: string
  restart?: string
  restBreak?: string
}

export interface DriverFormData {
  username: string
  password: string
  confirmPassword: string
  firstName: string
  lastName: string
  phoneNumber: string
  email: string
  homeTerminal: string
  vehicles: string[]
  issuerStateParent: string
  issuerState: string
  driverLicenseNumber: string
  exemptDriver: boolean
  shortHaulException: boolean
  allowPersonalUse: boolean
  allowYardMove: boolean
  unlimitedTrailers: boolean
  unlimitedShippingDocuments: boolean
  hosRoles: string
  cargoType: string
  restart: string
  restBreak: string
}

export type DriverFilter = 'all' | 'active' | 'inactive'
export type SortKey = keyof Driver
export type { SortOrder }
