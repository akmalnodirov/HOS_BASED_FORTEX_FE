import type { RouteEldAlertType } from './types'

export const routeEldAlertPages: { type: RouteEldAlertType; path: string; label: string; permission: string }[] = [
  { type: 'station', path: '/route-eld-alerts/station', label: 'Station alerts', permission: 'route_eld.alerts.station' },
  { type: 'alpr', path: '/route-eld-alerts/alpr', label: 'ALPR camera alerts', permission: 'route_eld.alerts.alpr' },
  { type: 'red_state', path: '/route-eld-alerts/red-state', label: 'Red state alerts', permission: 'route_eld.alerts.red_state' },
  { type: 'dot', path: '/route-eld-alerts/dot', label: 'DOT alerts', permission: 'route_eld.alerts.red_state' },
  { type: 'violation', path: '/route-eld-alerts/violation', label: 'Violation alerts', permission: 'route_eld.alerts.violation' },
  { type: 'speed', path: '/route-eld-alerts/speed', label: 'Speed alerts', permission: 'route_eld.alerts.speed' },
]

export function routeEldAlertPath(type: RouteEldAlertType) {
  return routeEldAlertPages.find((page) => page.type === type)!.path
}
