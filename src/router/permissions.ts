const pagePermissions: { pattern: RegExp; any: string[] }[] = [
  { pattern: /^\/report\/inspection\/violation(?:\/|$)/, any: ['report.inspection.violation.view'] },
  { pattern: /^\/report\/inspection\/no-violation(?:\/|$)/, any: ['report.inspection.no_violation.view'] },
  { pattern: /^\/report\/manage\/drivers(?:\/|$)/, any: ['report.drivers.view'] },
  { pattern: /^\/report\/manage\/companies(?:\/|$)/, any: ['report.companies.view'] },
  { pattern: /^\/report\/levels(?:\/|$)/, any: ['report.levels.view'] },
  { pattern: /^\/report\/tasks(?:\/|$)/, any: ['report.tasks.view', 'report.view', 'report.manage'] },
  { pattern: /^\/report\/activity(?:\/|$)/, any: ['report.activity.view', 'report.view', 'report.manage'] },
  { pattern: /^\/report\/checker(?:\/|$)/, any: ['report.checker.view', 'report.view', 'report.manage'] },
  { pattern: /^\/report\/assistant(?:\/|$)/, any: ['report.assistant.view', 'report.view', 'report.manage'] },
  { pattern: /^\/initial\/clients(?:\/|$)/, any: ['clients.manage'] },
  { pattern: /^\/overview(?:\/|$)/, any: ['route_eld.live_tracking'] },
  { pattern: /^\/eld\/logs(?:\/|$)/, any: ['route_eld.logs.view'] },
  { pattern: /^\/logs(?:\/|$)/, any: ['route_eld.log_details.view'] },
  { pattern: /^\/eld\/event-sessions(?:\/|$)/, any: ['route_eld.event_sessions', 'route_eld.log_details.view'] },
  { pattern: /^\/alpr-camera\/route(?:\/|$)/, any: ['route_eld.alpr_route'] },
  { pattern: /^\/alpr-camera\/history(?:\/|$)/, any: ['route_eld.alpr_history'] },
  { pattern: /^\/vehicles(?:\/|$)/, any: ['vehicle.manage'] },
  { pattern: /^\/drivers(?:\/|$)/, any: ['route_eld.drivers'] },
  { pattern: /^\/driver-alerts(?:\/|$)/, any: ['route_eld.live_tracking'] },
  { pattern: /^\/notifications(?:\/|$)/, any: ['route_eld.alerts.station', 'route_eld.alerts.alpr', 'route_eld.alerts.speed', 'route_eld.alerts.violation'] },
  { pattern: /^\/chat(?:\/|$)/, any: ['chat.manage'] },
  { pattern: /^\/ifta(?:\/|$)/, any: ['route_eld.ifta_reports'] },
  { pattern: /^\/eld\/weight-stations(?:\/|$)/, any: ['route_eld.weight_stations'] },
  { pattern: /^\/vehicle-reports(?:\/|$)/, any: ['route_eld.vehicle_reports'] },
  { pattern: /^\/route-eld-alerts(?:\/|$)/, any: ['route_eld.alerts.station', 'route_eld.alerts.alpr', 'route_eld.alerts.speed', 'route_eld.alerts.violation'] },
  { pattern: /^\/dvir(?:\/|$)/, any: ['route_eld.alerts.station', 'route_eld.alerts.alpr', 'route_eld.alerts.speed', 'route_eld.alerts.violation'] },
  { pattern: /^\/company(?:\/|$)/, any: ['company.manage'] },
  { pattern: /^\/users\/roles(?:\/|$)/, any: ['roles.manage'] },
  { pattern: /^\/users\/permissions(?:\/|$)/, any: ['permissions.manage'] },
  { pattern: /^\/users(?:\/|$)/, any: ['portal_users.manage'] },
  { pattern: /^\/tools\/monitoring(?:\/|$)/, any: ['monitoring.manage'] },
  { pattern: /^\/tools\/dot-inspection(?:\/|$)/, any: ['route_eld.dot_inspections'] },
  { pattern: /^\/tools\/statistic-admin(?:\/|$)/, any: ['statistic_admin.manage'] },
  { pattern: /^\/tools\/statistic-company(?:\/|$)/, any: ['statistic_company.manage'] },
]

export interface TokenPermissions {
  systemAdmin: boolean
  codes: Set<string>
}

export function readTokenPermissions(token: string | null): TokenPermissions {
  if (!token) return { systemAdmin: false, codes: new Set() }
  try {
    const part = token.split('.')[1]
    if (!part) throw new Error('Invalid token')
    const payload = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/'))) as Record<string, unknown>
    const raw = payload.perm
    const codes = Array.isArray(raw) ? raw.filter((value): value is string => typeof value === 'string') : typeof raw === 'string' ? [raw] : []
    return { systemAdmin: payload.is_system_admin === 'true' || payload.is_system_admin === true, codes: new Set(codes) }
  } catch {
    return { systemAdmin: false, codes: new Set() }
  }
}

export function hasPermission(token: string | null, code: string): boolean {
  const permissions = readTokenPermissions(token)
  return permissions.systemAdmin || permissions.codes.has(code)
}

export function canAccessPath(path: string, token: string | null): boolean {
  const rule = pagePermissions.find((item) => item.pattern.test(path))
  if (!rule) return true
  const permissions = readTokenPermissions(token)
  return permissions.systemAdmin || rule.any.some((code) => permissions.codes.has(code))
}
