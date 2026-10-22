export type RouteEldAlertType = 'station' | 'alpr' | 'violation' | 'speed'

export interface RouteEldGenericAlertMessage {
  companyId: string
  notificationKey: string
  message: string
  alertId?: string | null
}

export interface RouteEldAlertCompany {
  id: string
  name: string
  dotNumber: string | null
  isActive: boolean
}

export interface StationAlert {
  companyId: string
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

export interface AlprCameraAlert {
  companyId: string
  id: string
  driverId: string
  driverName: string
  cameraId: number
  cameraName: string
  cameraLatitude: number
  cameraLongitude: number
  bearingConfidence: string | null
  brand: string | null
  operator: string | null
  driverLatitude: number
  driverLongitude: number
  driverLocation: string | null
  distanceMiles: number
  occurredAt: string
  resolvedAt: string | null
  isRead: boolean
}

export interface RouteEldWeighStationApproachMessage {
  companyId: string | null
  alertId: string
  driverId: string
  driverName: string
  weightStationId: string
  stationName: string
  location: string | null
  direction: string | null
  marker: string | null
  stationType: string | null
  distanceMiles: number
  latitude: number
  longitude: number
  driverLatitude: number
  driverLongitude: number
  driverLocation: string | null
  occurredAt: string
}

export interface RouteEldAlprCameraApproachMessage {
  companyId: string | null
  alertId: string
  driverId: string
  driverName: string
  cameraId: number
  cameraName: string
  distanceMiles: number
  latitude: number
  longitude: number
  bearingConfidence: string | null
  brand: string | null
  operator: string | null
  driverLatitude: number
  driverLongitude: number
  driverLocation: string | null
  occurredAt: string
}

export interface SpeedAlert {
  companyId: string | null
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
  companyId: string | null
  id: string
  driverName: string
  logDate: string
  violationCount: number
  note: string | null
  timeZone: string | null
  occurredAt: string
  isRead: boolean
  fixedAt: string | null
  driverLatitude: number | null
  driverLongitude: number | null
  driverLocation: string | null
}
