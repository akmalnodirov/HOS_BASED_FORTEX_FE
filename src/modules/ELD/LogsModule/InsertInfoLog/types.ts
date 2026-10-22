export interface InsertInfoLogRequest {
  timestamp: number
  timeZone: string
  eventCode: string
  recordOrigin: 'DRIVER' | 'OTHER_USER'
  responsibleUserId: string
  vehicleId: string | null
  latitude: number | null
  longitude: number | null
  calculatedLocation: string | null
  odometerMiles: number | null
  engineHours: number | null
  notes: string | null
}

export interface InsertInfoOption {
  id: string
  name: string
  active?: boolean
}
