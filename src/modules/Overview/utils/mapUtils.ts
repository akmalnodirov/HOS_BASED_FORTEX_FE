export const makeValidCoordinate = ({
  latitude,
  longitude,
}: {
  latitude: number
  longitude: number
}) => {
  // Clamp latitude to -90..90
  const validLat = Math.max(-90, Math.min(90, latitude))

  // Normalize longitude to -180..180
  const validLng = ((((longitude + 180) % 360) + 360) % 360) - 180

  return { latitude: validLat, longitude: validLng }
}

export const isValidCoordinates = (lat: number | null, lng: number | null): boolean => {
  return (
    lat !== null &&
    lng !== null &&
    lat !== 0 &&
    lng !== 0 &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  )
}

export const calculateDistance = (point1: any, point2: any): number => {
  const R = 6371000 // Earth radius in meters
  // Handle different property names (lat/lng vs latitude/longitude)
  const p1Lat = point1.lat ?? point1.latitude
  const p1Lng = point1.lng ?? point1.longitude
  const p2Lat = point2.lat ?? point2.latitude
  const p2Lng = point2.lng ?? point2.longitude

  const dLat = ((p2Lat - p1Lat) * Math.PI) / 180
  const dLon = ((p2Lng - p1Lng) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1Lat * Math.PI) / 180) *
      Math.cos((p2Lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export const calculateBearing = (start: any, end: any): number => {
  // Handle different property names (lat/lng vs latitude/longitude)
  const p1Lat = start.lat ?? start.latitude
  const p1Lng = start.lng ?? start.longitude
  const p2Lat = end.lat ?? end.latitude
  const p2Lng = end.lng ?? end.longitude

  const startLat = (p1Lat * Math.PI) / 180
  const startLng = (p1Lng * Math.PI) / 180
  const endLat = (p2Lat * Math.PI) / 180
  const endLng = (p2Lng * Math.PI) / 180

  const dLng = endLng - startLng

  const y = Math.sin(dLng) * Math.cos(endLat)
  const x =
    Math.cos(startLat) * Math.sin(endLat) - Math.sin(startLat) * Math.cos(endLat) * Math.cos(dLng)

  const bearing = Math.atan2(y, x)
  return ((bearing * 180) / Math.PI + 360) % 360 // Convert to degrees
}
