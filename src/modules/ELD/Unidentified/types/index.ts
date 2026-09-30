import type { Dayjs } from 'dayjs'

// API response type from backend
export interface UnidentifiedEventResponse {
  eventIds: string[]
  vehicleId: string
  vehicleUnit: string
  totalMiles: number
  totalVehicleMiles: number | null
  totalEngineHours: number | null
  dateTime: Dayjs | string
  durationInSeconds: number
  startedLocation: string
  endedLocation: string
  eventCode: number | null
  eventType: number | null
  driver: {
    id: string
    user?: {
      firstName: string
      lastName: string
    }
  } | null
}

export interface UnidentifiedEventsFilterResponse {
  successResult: {
    data: UnidentifiedEventResponse[]
    totalCount: number
  }
}

// Table row type (mapped from API response)
export interface UnidentifiedTableRow {
  ids: string[]
  count: number
  driver: string
  vehicleUnit: string
  distance: number
  location: string
  submitted: string
  odometer: string
  engineHours: string | number
  duration: string
  eventType: number | null
  eventCode: number | null
  event: { eventCode: number | null; eventType: number | null }
}

// Select driving status request
export interface SelectEventRequest {
  eventIds: string[]
  eventCode: number
  eventType: number
}

// Reassign request
export interface ReassignEventRequest {
  eventIds: string[]
  driverId: string
}

// Vehicle type for dropdown
export interface Vehicle {
  id: string
  unit: string
}

// Driver type for reassign modal
export interface UnidentifiedDriver {
  id: string
  user: {
    firstName: string
    lastName: string
  }
}
