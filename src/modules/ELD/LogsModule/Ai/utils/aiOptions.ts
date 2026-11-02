import { formatRouteEldEventTime } from '@/utils/routeEldTimeZone'
import {
  RouteEldAssistantItemKind,
  type RouteEldAssistantItem,
  type RouteEldAssistantRepairOptions,
} from '@/modules/ELD/LogsModule/Boost/types/assistant'
import type { RouteEldRepairOption } from '@/modules/ELD/LogsModule/Boost/types/boost'

export type AiOptionBadge = 'Pending' | 'In Progress' | 'Completed' | 'Invalid'

export interface AiChangeRow {
  no: number
  event: string
  date: string
  before: string
  after: string
  changeMinutes: number | null
}

const APPLY_MARKER = /\s*\[\[apply repair=[^\s\]]+ option=[^\s\]]+\]\]\s*$/

/** The newest generated options set for this exact session and draft tab, or null. */
export function latestRepairOptions(
  items: RouteEldAssistantItem[],
  sessionId: string,
  tabId: string
): RouteEldAssistantRepairOptions | null {
  for (let index = items.length - 1; index >= 0; index--) {
    const options = items[index].repairOptions
    if (
      items[index].kind === RouteEldAssistantItemKind.RepairOptions &&
      options?.sessionId === sessionId &&
      options.tabId === tabId
    )
      return options
  }
  return null
}

/** The chat message a "Use this option" click sends; the marker pins the exact repair and option. */
export function applyOptionMessage(rank: number, title: string, repairId: string, optionId: string) {
  return `Apply option ${rank}: ${title} [[apply repair=${repairId} option=${optionId}]]`
}

export function stripApplyMarker(text: string) {
  return text.replace(APPLY_MARKER, '')
}

export function optionBadge(
  status: RouteEldRepairOption['status'] | undefined,
  inProgress: boolean
): AiOptionBadge {
  if (status === 'Applied') return 'Completed'
  if (status === 'Stale' || status === 'Superseded') return 'Invalid'
  return inProgress ? 'In Progress' : 'Pending'
}

/** One row per operation, in the draft's home-terminal time zone. */
export function changeRows(option: Pick<RouteEldRepairOption, 'operations'>, timeZone: string): AiChangeRow[] {
  const time = (value?: number | null) =>
    value == null
      ? '—'
      : formatRouteEldEventTime(value, timeZone, {
          month: undefined,
          day: undefined,
          year: undefined,
          second: undefined,
          hour12: false,
        })
  return [...option.operations]
    .sort((left, right) => left.order - right.order)
    .map((operation, index) => {
      const before = operation.beforeEventCode ?? operation.type
      const after = operation.afterEventCode ?? before
      const moved =
        operation.type === 'ShiftTimestamp' && operation.beforeTimestamp != null && operation.afterTimestamp != null
          ? Math.round((operation.afterTimestamp - operation.beforeTimestamp) / 60_000)
          : null
      return {
        no: index + 1,
        event: operation.type === 'DeleteEvent' || after === before ? before : `${before} → ${after}`,
        date:
          operation.beforeTimestamp == null
            ? '—'
            : formatRouteEldEventTime(operation.beforeTimestamp, timeZone, {
                hour: undefined,
                minute: undefined,
                second: undefined,
              }),
        before: time(operation.beforeTimestamp),
        after: operation.type === 'DeleteEvent' ? 'Deleted' : time(operation.afterTimestamp ?? operation.beforeTimestamp),
        changeMinutes: moved,
      }
    })
}
