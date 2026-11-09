import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import type { ReportOperationUser } from '@/modules/Report/types'

dayjs.extend(utc)
dayjs.extend(timezone)

const routeReportTimeZone = 'America/New_York'

export function reportToday(): string {
  return dayjs().tz(routeReportTimeZone).format('YYYY-MM-DD')
}

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
  'bg-[#9d0208] text-white',
  'bg-[#3e5c76] text-white',
  'bg-[#2c6e49] text-white',
  'bg-[#F59E0B] text-white',
  'bg-[#4F46E5] text-white',
  'bg-[#10B981] text-white',
]

const activityStatusClasses = [
  'bg-[#198754] text-white',
  'bg-[#0D6EFD] text-white',
  'bg-[#6C757D] text-white',
  'bg-[#DC3545] text-white',
  'bg-[#670D2F] text-white',
  'bg-[#CB0404] text-white',
  'bg-[#FE5D26] text-white',
  'bg-[#FE5D26] text-white',
  'bg-[#C99906] text-white',
  'bg-red-600 text-white',
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

export function operationStatusClass(value?: number, activity = false): string {
  const classes = activity ? activityStatusClasses : statusClasses
  return classes[value ?? classes.length - 1] ?? classes[classes.length - 1]
}

