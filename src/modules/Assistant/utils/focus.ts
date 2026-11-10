import type { AssistantFocusRequest, AssistantNavigation, AssistantPage } from '../types'

const MAX_RANGE_DAYS = 61
const DATE = /^(\d{4})-(\d{2})-(\d{2})/

export interface AssistantFocusState {
  routeName: string | null
  driverId: string | null
  query: Record<string, unknown>
  companyId: string | null
  /** The draft open in the Boost workspace, if any; it can belong to another driver after a route change. */
  session: { id: string; driverId: string; fromDate: string; toDate: string } | null
  activeTabId: string | null
  selectedEvent: { sessionId: string; tabId: string; eventId: string } | null
}

const DRIVER_PAGES: Record<string, AssistantPage> = {
  ELDLogDetail: 'driverLog',
  ELDTracking: 'driverLog',
  ELDInsertInfoLog: 'driverLog',
  ELDBoost: 'boost',
  ELDAi: 'ai',
}

function dateOnly(value: unknown) {
  if (typeof value !== 'string') return null
  const match = DATE.exec(value)
  if (!match) return null
  const [, year, month, day] = match
  const time = Date.UTC(Number(year), Number(month) - 1, Number(day))
  return Number.isNaN(time) ? null : `${year}-${month}-${day}`
}

/** A valid range of at most 61 days, or none: the server rejects anything else. */
function range(from: unknown, to: unknown) {
  const fromDate = dateOnly(from)
  const toDate = dateOnly(to)
  if (!fromDate || !toDate || fromDate > toDate) return { fromDate: null, toDate: null }
  const days = (Date.parse(toDate) - Date.parse(fromDate)) / 86_400_000 + 1
  return days > MAX_RANGE_DAYS ? { fromDate: null, toDate: null } : { fromDate, toDate }
}

function sameId(left: string | null | undefined, right: string | null | undefined) {
  return Boolean(left && right && left.toLowerCase() === right.toLowerCase())
}

/**
 * The focus sent with a message, derived from the page. A draft is sent only on the Boost and AI pages and only when
 * it belongs to the page's driver; it then carries its own dates, since the server rejects other dates with a draft.
 */
export function assistantFocusFor(state: AssistantFocusState): AssistantFocusRequest {
  const companyId = state.companyId || null
  const none = {
    driverId: null,
    fromDate: null,
    toDate: null,
    sessionId: null,
    tabId: null,
    selectedEventId: null,
  }
  if (state.routeName === 'ELDLogs') return { page: 'logs', companyId, ...none }

  const page = state.routeName ? DRIVER_PAGES[state.routeName] : undefined
  if (!page || !state.driverId) return { page: 'other', companyId, ...none }

  const driverId = state.driverId
  const session = state.session
  if ((page === 'boost' || page === 'ai') && session && sameId(session.driverId, driverId)) {
    const tabId = state.activeTabId || null
    const selected = state.selectedEvent
    return {
      page,
      companyId,
      driverId,
      ...range(session.fromDate, session.toDate),
      sessionId: session.id,
      tabId,
      selectedEventId:
        selected && tabId && sameId(selected.sessionId, session.id) && sameId(selected.tabId, tabId)
          ? selected.eventId
          : null,
    }
  }

  const dates =
    page === 'driverLog'
      ? range(state.query.date, state.query.date)
      : range(state.query.fromDate, state.query.toDate)
  return { ...none, page, companyId, driverId, ...dates }
}

/** The route that opens a draft the assistant opened, on the driver's AI page. */
export function navigationRoute(navigation: AssistantNavigation) {
  return {
    name: 'ELDAi',
    params: { id: navigation.driverId },
    query: {
      fromDate: navigation.fromDate,
      toDate: navigation.toDate,
      sessionId: navigation.sessionId,
      tabId: navigation.tabId,
    },
  }
}
