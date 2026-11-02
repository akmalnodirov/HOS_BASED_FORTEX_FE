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
