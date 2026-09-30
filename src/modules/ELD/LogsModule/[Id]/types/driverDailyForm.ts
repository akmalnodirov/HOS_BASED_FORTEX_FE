import type { Dayjs } from 'dayjs'

/**
 * Driver Daily Form Response from API
 */
export interface DriverDailyFormResponse {
  id: string
  driverId: string
  formDate: Dayjs | string
  certifiedDate: Dayjs | string
  driver?: {
    id: string
    user: {
      firstName: string
      lastName: string
    }
    homeTerminal?: {
      street: string
    }
  }
  carrier?: {
    name: string
    usdotNumber: string
  }
  coDriver?: {
    id: string
    user: {
      firstName: string
      lastName: string
    }
  }
  trailers: string[]
  shippingDocuments: string[]
  signaturePath: string | null
  signaturePaths?: string[]
  assignedVehicles?: Array<{
    id: string
    unit: string
  }>
}

/**
 * Edit Driver Daily Form Request
 */
export interface EditDriverDailyFormRequest {
  driverId: string
  formDate: Dayjs | string
  certifiedDate: Dayjs | string
  coDriverId: string | null
  shippingDocuments: string[]
  trailers: string[]
  signaturePath: string
}

/**
 * Edit Driver Daily Form (for form state)
 */
export interface EditDriverDailyForm {
  coDrivers: string | null
  shippingDocs: string
  trailers: string
  signaturePath: string
  signaturePaths: string[]
}

/**
 * Driver option for select dropdown
 */
export interface DriverOption {
  id: string
  fullname: string
}
