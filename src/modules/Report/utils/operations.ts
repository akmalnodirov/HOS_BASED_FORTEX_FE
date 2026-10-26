import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import type { ReportOperationUser } from '@/modules/Report/types'

dayjs.extend(utc)
dayjs.extend(timezone)

const routeReportTimeZone = 'America/New_York'

export const routeTaskStatuses = [
  { value: 0, label: 'Hold' },
  { value: 1, label: 'Working' },
  { value: 2, label: 'Completed' },
  { value: 3, label: 'Hold Assistant' },
  { value: 4, label: 'Working Assistant' },
  { value: 5, label: 'Completed Assistant' },
]

export const checkerStatuses = routeTaskStatuses.slice(0, 3)

export const activityStatuses = [
  'Checked',
  'Off Duty',
  'Inactive',
  'Accident',
  'Tow',
  'DOT',
  'Disconnected',
  'Not Connected',
  'Profile / BOL',
  'Unknown',
]

const statusClasses = [
  'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  'bg-orange-500/15 text-orange-700 dark:text-orange-300',
  'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  'bg-teal-500/15 text-teal-700 dark:text-teal-300',
  'bg-red-500/15 text-red-700 dark:text-red-300',
  'bg-slate-500/15 text-slate-700 dark:text-slate-300',
  'bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300',
  'bg-gray-500/15 text-gray-700 dark:text-gray-300',
]

export function operationUserName(user?: ReportOperationUser): string {
  if (!user) return '—'
  return `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.userName || '—'
}

export function operationDate(value?: string): string {
  return value ? dayjs(value).tz(routeReportTimeZone).format('MM/DD/YYYY HH:mm') : '—'
}

export function operationDay(value: string): string {
  return dayjs(value).tz(routeReportTimeZone).format('MM/DD/YYYY')
}

export function operationRangeStart(value: string): string {
  return dayjs.tz(value, routeReportTimeZone).startOf('day').utc().format()
}

export function operationRangeEnd(value: string): string {
  return dayjs.tz(value, routeReportTimeZone).endOf('day').utc().format()
}

export function operationStatusLabel(value: number, checker = false): string {
  return (
    (checker ? checkerStatuses : routeTaskStatuses).find((item) => item.value === value)?.label ??
    'Unknown'
  )
}

export function operationStatusClass(value?: number): string {
  return statusClasses[value ?? statusClasses.length - 1] ?? statusClasses[statusClasses.length - 1]
}

