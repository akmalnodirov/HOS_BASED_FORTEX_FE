// src/types/deletionMenu.ts
export interface Driver {
  driverId: string
  firstName: string
  lastName: string
  email: string
  phoneNumber: string
  vehicleId: string | null
  vehicleUnit: string | null
  status: boolean
  isTestDriver: boolean
  workedDurationInSeconds: number
  isConnected: boolean
}

export interface DeletionMenuItem {
  id: string
  providerId: string
  providerName: string
  name: string // carrier name
  drivers: Driver[]
}

export interface DeletionMenuListResponse {
  successResult: {
    data: DeletionMenuItem[]
    totalCount: number
  }
}

export interface AssignTestDriverRequest {
  driverId: string
  carrierId: string
  isTestDriver: boolean
}

export interface DeletionMenuProvider {
  id: string
  name: string
}

export interface DeletionMenuProvidersResponse {
  successResult: DeletionMenuProvider[]
}
