export type RouteEldAlertType = 'station' | 'violation' | 'speed'

export interface StationAlert {
  id: string
  driverId: string
  driverName: string
  weightStationId: string
  stationName: string
  stateCode: string | null
  location: string | null
  direction: string | null
  marker: string | null
  stationType: string | null
  stationLatitude: number
  stationLongitude: number
  driverLatitude: number
  driverLongitude: number
  driverLocation: string | null
  distanceMiles: number
  occurredAt: string
  resolvedAt: string | null
  isRead: boolean
}

export interface SpeedAlert {
  id: string
  driverName: string
  speed: number
  speedLimit: number
  stateCode: string | null
  location: string | null
  latitude: number
  longitude: number
  occurredAt: string
  isRead: boolean
}

export interface ViolationAlert {
  id: string
  driverName: string
  logDate: string
  violationCount: number
  note: string | null
  timeZone: string | null
  occurredAt: string
  isRead: boolean
}
