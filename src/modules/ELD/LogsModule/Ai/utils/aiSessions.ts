import type { RouteEldEventSessionListItem } from '@/modules/ELD/LogsModule/Boost/types/boost'

/** Drafts with exactly these dates, newest first: the AI tab reuses one before creating another. */
export function reusableDrafts(
  sessions: RouteEldEventSessionListItem[],
  fromDate: string,
  toDate: string
): RouteEldEventSessionListItem[] {
  return sessions
    .filter((item) => item.status === 'DRAFT' && item.fromDate === fromDate && item.toDate === toDate)
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
}

const WORKSPACE_ROUTES = ['ELDBoost', 'ELDAi']
const WORKSPACE_KEYS = ['sessionId', 'tabId', 'fromDate', 'toDate'] as const

/**
 * Query for the Boost or AI tab. Moving between the two keeps the open draft; from any other tab
 * only the log date travels, as before.
 */
export function workspaceSwitchQuery(
  currentRouteName: unknown,
  query: Record<string, unknown>,
  dateParam: string | undefined
): Record<string, string> | undefined {
  if (WORKSPACE_ROUTES.includes(String(currentRouteName)) && query.sessionId) {
    const carried: Record<string, string> = {}
    for (const key of WORKSPACE_KEYS) if (query[key]) carried[key] = String(query[key])
    return carried
  }
  return dateParam ? { date: dateParam } : undefined
}
