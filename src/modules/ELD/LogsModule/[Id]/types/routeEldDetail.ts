export interface RouteEldClock {
  remainingMilliseconds: number
  limitMilliseconds: number
  accumulatedMilliseconds: number
}

export interface RouteEldHosStatus {
  driverId: string
  currentStatus: string
  connectionStatus: string
  vehicleUnitId: string | null
  latitude: number | null
  longitude: number | null
  location: string | null
  statusAt: string | null
  break: RouteEldClock | null
  drive: RouteEldClock | null
  shift: RouteEldClock | null
  cycle: RouteEldClock | null
  violationCount: number
}

export interface RouteEldProfileForm {
  id: string
  logDate: string
  timeZone: string | null
  driverName: string
  driverEmail: string | null
  driverLicense: string | null
  driverLicenseState: string | null
  isExempt: boolean
  coDriverName: string | null
  coDriverEmail: string | null
  trailers: string[]
  shippingDocuments: string[]
  companyName: string | null
  mainOffice: string | null
  dotNumber: string | null
  eldSerialNumber: string | null
  eldMacAddress: string | null
  hasDiagnosticIndicator: boolean
  hasMalfunctionIndicator: boolean
  signature: string | null
}

export interface RouteEldEvent {
  id: string
  sequenceId: string | null
  eventCode: string
  eventName: string
  eventCategory: 'OFF' | 'SB' | 'D' | 'ON' | 'OTHER'
  timestamp: number
  logDate: string
  timeZone: string | null
  recordOrigin: string | null
  recordStatus: string
  vehicleId: string | null
  vehicleName: string | null
  vehicleVin: string | null
  latitude: number | null
  longitude: number | null
  location: string | null
  odometerMiles: number | null
  engineHours: number | null
  notes: string | null
  eldSerialNumber: string | null
  eldMacAddress: string | null
  positioning: string | null
  driverLocationDescription: string | null
  dateToCertify: string | null
}

export interface RouteEldTrackingPoint {
  id: string
  timestamp: number
  latitude: number
  longitude: number
  speed: number | null
  odometer: number | null
  engineHours: number | null
  motionStatus: string
  engineEventCode: string | null
  stateCode: string | null
  source: string | null
  driverId: string | null
}

export interface RouteEldLogDetail {
  driverId: string
  externalDriverId: string
  driverName: string
  email: string | null
  phoneNumber: string | null
  companyName: string
  logDate: string
  timeZone: string | null
  profileForm: RouteEldProfileForm | null
  events: RouteEldEvent[]
  previousEvent: RouteEldEvent | null
  hos: RouteEldHosStatus | null
  trackingPoints: RouteEldTrackingPoint[]
}
