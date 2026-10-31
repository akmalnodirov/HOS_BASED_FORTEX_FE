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

export function resolveRouteEldScheduleTimeZone(value?: string | null) {
  return routeEldTimeZones[String(value || '').trim().toUpperCase()] ?? routeEldTimeZones.CT
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
