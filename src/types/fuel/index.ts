export interface NearbyCheapestFuelStationsRequest {
  lat: number
  lon: number
  radius: number
  kind: number
  take?: number
}

export interface FuelStationResponse {
  stationId: string
  storeNumber: string
  price: {
    amount: number
    currency: string
  }
  asOfUtc: string
  distanceMeters: number
  fuelSourceType: number
  lat: number
  lon: number
}