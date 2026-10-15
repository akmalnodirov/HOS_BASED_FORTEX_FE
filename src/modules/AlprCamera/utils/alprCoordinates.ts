export interface AlprCoordinates {
  latitude: number
  longitude: number
}

export type AlprCoordinateInput =
  { kind: 'coordinates'; value: AlprCoordinates } | { kind: 'invalid' } | { kind: 'label' }

const decimalPattern = '[+-]?(?:\\d{1,3}(?:\\.\\d+)?|\\.\\d+)'
const coordinatePatterns = [
  new RegExp(`^\\s*(${decimalPattern})\\s*,\\s*(${decimalPattern})\\s*$`),
  new RegExp(`^\\s*(${decimalPattern})\\s+(${decimalPattern})\\s*$`),
]
const coordinateCharactersOnly = /^[+\-\d.,\s]+$/

export function parseAlprCoordinateInput(value: string): AlprCoordinateInput {
  const text = value.trim()
  if (!text) return { kind: 'label' }

  for (const pattern of coordinatePatterns) {
    const match = text.match(pattern)
    if (!match) continue

    const latitude = Number(match[1])
    const longitude = Number(match[2])
    return isValidCoordinates(latitude, longitude)
      ? { kind: 'coordinates', value: { latitude, longitude } }
      : { kind: 'invalid' }
  }

  if (coordinateCharactersOnly.test(text) && (text.includes(',') || hasCoordinatePairShape(text)))
    return { kind: 'invalid' }

  return { kind: 'label' }
}

export function formatAlprCoordinates({ latitude, longitude }: AlprCoordinates) {
  return `${latitude}, ${longitude}`
}

function hasCoordinatePairShape(value: string) {
  return /^\s*[+-]?(?:\d|\.)+\s+[+-]?(?:\d|\.)*\s*$/.test(value)
}

function isValidCoordinates(latitude: number, longitude: number) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  )
}
