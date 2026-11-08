const routeEldTimeZones: Record<string, string> = {
  ET: 'America/New_York',
  CT: 'America/Chicago',
  MT: 'America/Denver',
  PT: 'America/Los_Angeles',
  AT: 'America/Halifax',
  NT: 'America/St_Johns',
  AKT: 'America/Anchorage',
  HT: 'Pacific/Honolulu',
  AZ: 'America/Phoenix',
  MST: 'America/Phoenix',
  SK: 'America/Regina',
}

export function resolveRouteEldScheduleTimeZone(
  value?: string | null,
  fallback = routeEldTimeZones.CT
) {
  const code = String(value || '').trim()
  const known = routeEldTimeZones[code.toUpperCase()]
  if (known) return known
  if (code.includes('/')) {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: code })
      return code
    } catch {
      return fallback
    }
  }
  return fallback
}

export function routeEldTimeZoneLabel(value?: string | null) {
  const zone = String(value || '').trim()
  if (!zone) return 'CT'
  const code = Object.entries(routeEldTimeZones).find(([, id]) =>
    id.toLowerCase() === zone.toLowerCase()
  )?.[0]
  return code || (zone.includes('/') ? zone : zone.toUpperCase())
}

export function formatRouteEldEventTime(
  timestamp: number,
  timeZone?: string | null,
  options: Intl.DateTimeFormatOptions = {}
) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: resolveRouteEldScheduleTimeZone(timeZone),
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    ...options,
  }).format(timestamp)
}
