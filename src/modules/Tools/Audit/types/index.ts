import type { Dayjs } from 'dayjs'

export interface LocationField {
  id: string
  location: string
  latitude: string
  longitude: string
}

export interface TripLocation {
  latitude: number
  longitude: number
  address: string
  locationType: number
  afterDelivery?: boolean
}

export interface Trip {
  bolNumber: string
  trailerNumber: string
  odometer: number
  engineHours: number
  dailyDistanceInMile: number
  from: TripLocation
  to: TripLocation
  fuelLocations: TripLocation[]
}

export interface AuditRequest {
  carrierId: string
  driverId: string
  trips: Trip[]
  startDate: Dayjs | string
  endDate: Dayjs | string
  startTime: TimeValue | string
  endTime: TimeValue | string
}

export interface TimeValue {
  hours: number
  minutes: number
  seconds: number
}

export interface AuditTripForm {
  carrier: string
  driver: string
  bolNumber: string
  trailerNumber: string
  startDateTime: {
    date: Dayjs
    time: TimeValue
  }
  endDateTime: {
    date: Dayjs
    time: TimeValue
  }
  insertInfo: {
    odometer: number
    engHours: number
    dailyDistance: number
  }
  from: {
    location: string
    latitude: number
    longitude: number
  }
  to: {
    location: string
    latitude: number
    longitude: number
  }
  fuel: {
    location: string
    latitude: number
    longitude: number
  }
  fuelLocations: FuelLocationItem[]
}

export interface FuelLocationItem {
  id: number
  latitude: number
  longitude: number
  location: string
  afterDelivery: boolean
}

export interface AuditCarrier {
  id: string
  name: string
  timeZoneInfo?: { ianaId: string }
}

export interface AuditDriver {
  id: string
  name: string
  user?: {
    firstName: string
    lastName: string
  }
}

