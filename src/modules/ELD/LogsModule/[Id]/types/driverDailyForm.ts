import type { Dayjs } from 'dayjs'

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
    mainOffice?: string
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


export interface EditDriverDailyFormRequest {
  driverId: string
  formDate: Dayjs | string
  certifiedDate: Dayjs | string
  coDriverId: string | null
  shippingDocuments: string[]
  trailers: string[]
  signaturePath: string
}


export interface EditDriverDailyForm {
  coDrivers: string | null
  shippingDocs: string
  trailers: string
  signaturePath: string
  signaturePaths: string[]
}

export interface DriverOption {
  id: string
  fullname: string
}
