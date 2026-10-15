let retainedCoordinates = ''

function parseCoordinates(value: string) {
  const match = value
    .trim()
    .match(/^([+-]?\d*\.?\d+)\s*(?:,|;|\s)\s*([+-]?\d*\.?\d+)/)
  if (!match) return null

  const latitude = Number(match[1])
  const longitude = Number(match[2])
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null
  }

  return { latitude, longitude }
}

export async function copyCoordinates(latitude: number, longitude: number) {
  retainedCoordinates = `${latitude}, ${longitude}`
  try {
    await navigator.clipboard.writeText(retainedCoordinates)
  } catch {
    // The retained app buffer remains available when browser clipboard access is blocked.
  }
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
