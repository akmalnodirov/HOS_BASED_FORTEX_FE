// API response shape from server
export interface VehicleApiResponse {
  id: string
  macAddress: string | null
  make: string | null
  model: string | null
  serialNumber: string | null
  status: boolean
  unit: string | null
  vin: string | null
  isAllowedSleep: boolean
}

// Single vehicle detail response (for edit)
export interface VehicleSingleResponse {
  id: string
  unit: string
  make: string
  model: string
  vin: string
  manufactureYear: number
  status: boolean
  isAllowedSleep: boolean
  vehicleFuel: { id: number | string; name: string }
  eldVehicleConnection: { id: number | string; name: string }
  licensePlate: {
    plateNumber: string
    issuerState: {
      id: string
      parentId: string
      name: string
      stateCode: string
    }
  }
}

// UI display shape (used by table component)
export interface Vehicle {
  id: number | string
  unit: string
  model: string
  make: string
  eld: string
  vin: string
  status: boolean
  vehicleId?: string
  year?: string
  licensePlateState?: string
  licensePlateNumber?: string
  fuel?: string
  isAllowedSleep?: boolean
}

// API request for add/update
export interface VehicleRequest {
  unit: string
  make: string
  model: string
  manufactureYear: number
  vin: string
  vehicleFuelId: string | number
  eldVehicleConnectionId: string | number
  licensePlate?: LicensePlateRequest | null
  carrierId: string
  isAllowedSleep: boolean
}

export interface LicensePlateRequest {
  issuerStateId: string
  plateNumber: string
}

// VIN decode response
export interface VinDecodeResponse {
  isValid: boolean
  year?: number
  make?: string
  model?: string
  fuelType?: string
  eldConnectionId?: number | string
}

// Configuration option types
export interface FuelOption {
  id: number | string
  name: string
}

export interface EldConnectionOption {
  id: number | string
  name: string
}

export interface IssuerStateOption {
  id: string
  name: string
  parentId?: string
  stateCode?: string
}
