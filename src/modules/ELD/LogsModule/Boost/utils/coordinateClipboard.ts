import { parseDecimal } from './decimalInput'

let retainedCoordinates = ''

export const LATITUDE_LIMIT = 90
export const LONGITUDE_LIMIT = 180

export function parseCoordinate(text: string, limit: number): number | null {
  const coordinate = parseDecimal(text)
  return coordinate !== null && Math.abs(coordinate) <= limit ? coordinate : null
}

export function isCoordinateDraft(text: string) {
  return /^[+-]?\.?$/.test(text.trim())
}

function parseCoordinates(value: string) {
  const match = value
    .trim()
    .match(/^([+-]?\d*[.,]?\d+)\s*(?:,|;|\s)\s*([+-]?\d*[.,]?\d+)/)
  if (!match) return null

  const latitude = parseCoordinate(match[1], LATITUDE_LIMIT)
  const longitude = parseCoordinate(match[2], LONGITUDE_LIMIT)
  return latitude === null || longitude === null ? null : { latitude, longitude }
}

export async function copyCoordinates(latitude: number, longitude: number) {
  if (!(Math.abs(latitude) <= LATITUDE_LIMIT && Math.abs(longitude) <= LONGITUDE_LIMIT))
    return false
  retainedCoordinates = `${latitude}, ${longitude}`
  try {
    await navigator.clipboard.writeText(retainedCoordinates)
  } catch {
    // The retained app buffer remains available when browser clipboard access is blocked.
  }
  return true
}

export async function readCoordinates() {
  let value = retainedCoordinates
  try {
    const clipboardValue = await navigator.clipboard.readText()
    if (clipboardValue.trim()) value = clipboardValue
  } catch {
    // Fall back to the app buffer. Reading does not consume or clear it.
  }

  const coordinates = parseCoordinates(value)
  if (coordinates) retainedCoordinates = `${coordinates.latitude}, ${coordinates.longitude}`
  return coordinates
}
