import dayjs, { type Dayjs } from 'dayjs'
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { getApiErrorMessage, useApi } from '@/composables/useAxiosService'
import { ApiEndpoints } from '@/api/endpoints'
import type {
  BoostFreeTime,
  DailyDictionarySummaryResponse,
  DailySummaryResponse,
  GraphDuties,
  GraphResponse,
} from '@/modules/ELD/LogsModule/[Id]/types/chart'
import type {
  BoostEventEditProfile,
  BoostEventStatusForm,
  DailyFormListResponse,
  RouteEldEventSession,
  RouteEldEventTab,
  RouteEldHosEvent,
  RouteEldProfileForm,
  RouteEldWorkspaceEvent,
  TabResponse,
} from '../types/boost'
import { useBoostWorkspaceStore } from '../store/boostWorkspace'
import { useChartStore } from '@/modules/ELD/LogsModule/[Id]/store/chart'
import type { DragColumnType, LocationTransfer } from './useDragDrop'

export interface BoostUiEventRow {
  eventId: string
  sequenceId: string
  driverFullName: string
  startTime: string
  duration: number | null
  eventType: number
  eventCode: number
  eventName?: string
  calculatedLocation?: string
  manualLocation?: string
  locationOrigin?: number | null
  latitude?: number | null
  longitude?: number | null
  eventRecordOrigin: number
  vehicleMiles?: number
  engineHours?: number
  annotation?: string
  eventRecordStatus: string
  trailerNumber?: string
  shippingDocument?: string
  actionState: number
  changeStatus?: string
  historyId?: string | null
  deliveryStatus?:
    'SUBMITTED' | 'SUBMISSION_PENDING' | 'ROLLED_BACK' | 'ROLLBACK_PENDING' | 'NOT_SUBMITTED'
  errorTitles?: string[]
  warningTitles?: string[]
}

export interface BoostUiEventGroup {
  date: string
  events: BoostUiEventRow[]
  dailyForm?: DailyFormListResponse | null
}

const CATEGORY_TO_CODE: Record<string, number> = { OFF: 1, SB: 2, D: 3, ON: 4 }
const EVENT_CODE_TO_NUMERIC: Record<string, [number, number]> = {
  DS_OFF: [1, 1],
  DS_WT: [1, 1],
  DS_SB: [1, 2],
  DS_D: [1, 3],
  DS_ON: [1, 4],
  LOG_NORMAL_PRECISION: [2, 1],
  LOG_REDUCED_PRECISION: [2, 2],
  DR_IND_PC: [3, 1],
  DR_IND_YM: [3, 2],
  DR_LOGIN: [5, 1],
  DR_LOGOUT: [5, 2],
  ENG_UP_NORMAL: [6, 1],
  ENG_UP_REDUCED: [6, 2],
  ENG_DOWN_NORMAL: [6, 3],
  ENG_DOWN_REDUCED: [6, 4],
}
const NUMERIC_TO_EVENT_CODE: Record<string, string> = {
  '1:1': 'DS_OFF',
  '1:2': 'DS_SB',
  '1:3': 'DS_D',
  '1:4': 'DS_ON',
  '2:1': 'LOG_NORMAL_PRECISION',
  '2:2': 'LOG_REDUCED_PRECISION',
  '3:1': 'DR_IND_PC',
  '3:2': 'DR_IND_YM',
  '5:1': 'DR_LOGIN',
  '5:2': 'DR_LOGOUT',
  '6:1': 'ENG_UP_NORMAL',
  '6:2': 'ENG_UP_REDUCED',
  '6:3': 'ENG_DOWN_NORMAL',
  '6:4': 'ENG_DOWN_REDUCED',
}

const ROUTE_ELD_TIME_ZONES: Record<string, string> = {
  ET: 'America/New_York',
  CT: 'America/Chicago',
  MT: 'America/Denver',
  PT: 'America/Los_Angeles',
  AT: 'America/Halifax',
  NT: 'America/St_Johns',
  AKT: 'America/Anchorage',
  HT: 'Pacific/Honolulu',
  AZ: 'America/Phoenix',
  SK: 'America/Regina',
}

export function resolveRouteEldScheduleTimeZone(value?: string | null) {
  return (
    ROUTE_ELD_TIME_ZONES[
      String(value || '')
        .trim()
        .toUpperCase()
    ] ?? ROUTE_ELD_TIME_ZONES.CT
  )
}

export function routeEldSessionTimelineCutoff(
  sessionCreatedAt: string | null | undefined,
  currentTimestamp = Date.now()
) {
  if (!sessionCreatedAt) return currentTimestamp

  const value = sessionCreatedAt.trim()
  const absoluteValue = /(?:z|[+-]\d{2}:\d{2})$/i.test(value) ? value : `${value}Z`
  const sessionCreatedAtTimestamp = Date.parse(absoluteValue)
  return Number.isFinite(sessionCreatedAtTimestamp)
    ? Math.min(currentTimestamp, sessionCreatedAtTimestamp)
    : currentTimestamp
}

const ROUTE_ELD_DUTY_CATEGORIES = new Set(['OFF', 'SB', 'D', 'ON'])
const ROUTE_ELD_REST_CATEGORIES = new Set(['OFF', 'SB'])

export interface RouteEldRestCongestion {
  eventIds: string[]
  firstEventId: string
  lastEventId: string
  startedAt: number
  endedAt: number
  durationMs: number
}

export function isRouteEldTimestampWithinSession(
  timestamp: number,
  timeZone: string | null | undefined,
  session: RouteEldEventSession
) {
  if (!Number.isFinite(timestamp)) return false
  const date = zonedDateTime(timestamp, timeZone).slice(0, 10)
  return (
    date >= session.fromDate.replaceAll('/', '-') &&
    date <= session.toDate.replaceAll('/', '-')
  )
}

export function isRouteEldEventWithinSession(
  event: RouteEldHosEvent,
  session: RouteEldEventSession
) {
  return isRouteEldTimestampWithinSession(event.timestamp, event.timeZone, session)
}

export function buildRouteEldRestCongestions(
  events: RouteEldHosEvent[],
  eventDurationById: Map<string, number>
) {
  const dutyEvents = events
    .filter(
      (event) =>
        event.recordStatus.toUpperCase() === 'ACTIVE' &&
        ROUTE_ELD_DUTY_CATEGORIES.has(event.eventCategory)
    )
    .sort((left, right) => left.timestamp - right.timestamp || left.id.localeCompare(right.id))
  const congestions: RouteEldRestCongestion[] = []

  for (let index = 0; index < dutyEvents.length; index += 1) {
    if (!ROUTE_ELD_REST_CATEGORIES.has(dutyEvents[index].eventCategory)) continue

    const firstIndex = index
    while (
      index + 1 < dutyEvents.length &&
      ROUTE_ELD_REST_CATEGORIES.has(dutyEvents[index + 1].eventCategory)
    ) {
      index += 1
    }

    const congestionEvents = dutyEvents.slice(firstIndex, index + 1)
    const firstEvent = congestionEvents[0]
    const lastEvent = congestionEvents[congestionEvents.length - 1]
    const endedAt =
      dutyEvents[index + 1]?.timestamp ??
      lastEvent.timestamp + (eventDurationById.get(lastEvent.id) ?? 0)
    congestions.push({
      eventIds: congestionEvents.map((event) => event.id),
      firstEventId: firstEvent.id,
      lastEventId: lastEvent.id,
      startedAt: firstEvent.timestamp,
      endedAt: Math.max(firstEvent.timestamp, endedAt),
      durationMs: Math.max(0, endedAt - firstEvent.timestamp),
    })
  }

  return congestions
}

export function findRouteEldRestCongestion(
  events: RouteEldHosEvent[],
  eventDurationById: Map<string, number>,
  eventId: string
) {
  return (
    buildRouteEldRestCongestions(events, eventDurationById).find((congestion) =>
      congestion.eventIds.includes(eventId)
    ) ?? null
  )
}

function zonedDateTime(timestamp: number, timeZone?: string | null) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: resolveRouteEldScheduleTimeZone(timeZone),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(timestamp))
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '00'
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}:${part('second')}`
}

export function timestampFromRouteEldZonedLocal(value: string, timeZone?: string | null) {
  const [datePart, timePart] = value.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hour, minute, second = 0] = timePart.split(':').map(Number)
  const target = Date.UTC(year, month - 1, day, hour, minute, second)
  const zone = resolveRouteEldScheduleTimeZone(timeZone)
  let result = target
  for (let index = 0; index < 4; index += 1) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date(result))
    const part = (type: string) => Number(parts.find((item) => item.type === type)?.value ?? 0)
    const represented = Date.UTC(
      part('year'),
      part('month') - 1,
      part('day'),
      part('hour'),
      part('minute'),
      part('second')
    )
    const adjustment = target - represented
    if (adjustment === 0) return result
    result += adjustment
  }
  return result
}

function asDateTime(timestamp: number, timeZone?: string | null) {
  return zonedDateTime(timestamp, timeZone)
}

function normalizeDateKey(value: string) {
  const parts = value.trim().split(/[./-]/)
  if (parts.length >= 3) {
    if (parts[0].length === 4)
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].slice(0, 2).padStart(2, '0')}`
    if (parts[2].slice(0, 4).length === 4)
      return `${parts[2].slice(0, 4)}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
  }
  return value.replaceAll('/', '-').slice(0, 10)
}

function signatureFileName(value?: string | null) {
  if (!value) return null
  const clean = value.split(/[?#]/)[0]
  const name = clean.split(/[\\/]/).at(-1) ?? clean
  try {
    return decodeURIComponent(name)
  } catch {
    return name
  }
}

function asOrigin(value?: string | null) {
  const normalized = String(value || '').toUpperCase()
  if (normalized === 'ELD' || normalized === 'AUTOMATIC') return 1
  if (normalized === 'DRIVER') return 2
  if (normalized === 'USER' || normalized === 'DISPATCHER' || normalized === 'OTHER_USER') return 3
  if (normalized === 'UNIDENTIFIED_DRIVER') return 4
  return 4
}

function normalizedStatus(value?: string | null) {
  return String(value || 'ACTIVE')
    .trim()
    .toUpperCase()
}

function asStatus(value?: string | null) {
  return normalizedStatus(value) === 'ACTIVE' ? 1 : 2
}

function numericEvent(event: RouteEldHosEvent): [number, number] {
  const certification = /^DR_CERT_(\d+)$/.exec(event.eventCode)
  if (certification) return [4, Math.min(9, Number(certification[1]) || 1)]
  return EVENT_CODE_TO_NUMERIC[event.eventCode] ?? [1, CATEGORY_TO_CODE[event.eventCategory] ?? 1]
}

function sequenceIdHexToDecimal(value?: string | null) {
  const normalized = value?.trim().replace(/^0x/i, '') ?? ''
  if (!normalized || !/^[0-9a-f]+$/i.test(normalized)) return value?.trim() || '—'
  try {
    return BigInt(`0x${normalized}`).toString(10)
  } catch {
    return value?.trim() || '—'
  }
}

function sequenceIdDecimalToHex(value?: string | null) {
  const normalized = value?.trim() ?? ''
  if (!normalized || !/^\d+$/.test(normalized)) return value?.trim() || null
  try {
    return BigInt(normalized).toString(16).toUpperCase()
  } catch {
    return value?.trim() || null
  }
}

function groupByDate<T extends { date: string }>(values: T[]) {
  return values.reduce<Record<string, T[]>>((groups, value) => {
    ;(groups[value.date] ||= []).push(value)
    return groups
  }, {})
}

export function useScheduleBoost() {
  const route = useRoute()
  const router = useRouter()
  const api = useApi()
  const store = useBoostWorkspaceStore()
  const chartStore = useChartStore()
  const {
    sessions,
    session,
    workspace,
    profileForms,
    schedule,
    coDriverSchedule,
    coDriverScheduleLoading,
    responsibleUsers,
    coDrivers,
    activeTabId,
    isLoading,
    isMutating,
  } = storeToRefs(store)
  const driverId = computed(() => String(route.params.id || ''))
  const screenResolution = ref(Math.max(900, document.documentElement.clientWidth - 90))
  const selectedEventId = ref('')
  const selectedRowIds = ref<string[]>([])
  const showCoDrivers = ref(false)
  const coDriverRenderEnabled = ref(false)
  let hasRenderedCoDrivers = false
  let coDriverActivation = 0
  watch(showCoDrivers, async (visible) => {
    const version = ++coDriverActivation
    coDriverRenderEnabled.value = false
    if (!visible) return
    if (hasRenderedCoDrivers && coDriverSchedule.value && !coDriverScheduleLoading.value) {
      coDriverRenderEnabled.value = true
      return
    }
    await nextTick()
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
    if (version === coDriverActivation) {
      coDriverRenderEnabled.value = true
      hasRenderedCoDrivers = true
    }
  }, { flush: 'sync' })
  const dragDropEnabled = ref(false)
  const boostModalOpen = ref(false)
  const reassignModalOpen = ref(false)
  const multiUpdateModalOpen = ref(false)
  const showEditEventModal = ref(false)
  const showEditDailyFormModal = ref(false)
  const isActionLoading = ref(false)
  const headerDate = ref<[Dayjs, Dayjs]>([dayjs().subtract(9, 'day'), dayjs()])

  const tabs = computed<TabResponse[]>(() =>
    (session.value?.tabs ?? []).map((tab) => ({
      id: tab.id,
      name: tab.name,
      type: tab.kind === 'INITIAL' ? 0 : tab.kind === 'WORKING' ? 1 : 2,
      sessionId: session.value?.id ?? '',
    }))
  )
  const selectedTab = computed<TabResponse | null>(() => {
    const tab = tabs.value.find((item) => item.id === activeTabId.value)
    return tab ?? null
  })

  const rawEvents = computed(() =>
    [...(workspace.value?.events ?? [])].sort((a, b) => a.event.timestamp - b.event.timestamp)
  )
  const latestPeriodCoDriver = computed(() => {
    if (!session.value) return null
    return (
      [
        ...(schedule.value?.dailyLogs ?? []).map((log) => ({
          id: log.coDriverId?.trim() || log.coDriverEmail?.trim() || log.coDriverName?.trim() || '',
          name: log.coDriverName?.trim() || log.coDriverEmail?.trim() || 'Co-driver',
          date: normalizeDateKey(log.logDate),
          priority: 0,
        })),
        ...profileForms.value.map((form) => ({
          id: form.coDriverId?.trim() || form.coDriverName?.trim() || '',
          name: form.coDriverName?.trim() || 'Co-driver',
          date: normalizeDateKey(form.logDate),
          priority: 1,
        })),
      ]
        .filter(
          (item) =>
            item.id && item.date >= session.value!.fromDate && item.date <= session.value!.toDate
        )
        .sort(
          (first, second) =>
            first.date.localeCompare(second.date) || first.priority - second.priority
        )
        .at(-1) ?? null
    )
  })
  const coDriverGraphEvents = computed(() =>
    [...(coDriverSchedule.value?.events ?? [])].sort(
      (first, second) => first.timestamp - second.timestamp
    )
  )
  const workspaceTimeZone = computed(() => rawEvents.value[0]?.event.timeZone ?? 'CT')
  const periodStartMs = computed(() =>
    session.value
      ? timestampFromRouteEldZonedLocal(
          `${session.value.fromDate}T00:00:00`,
          workspaceTimeZone.value
        )
      : 0
  )
  const periodEndMs = computed(() =>
    session.value
      ? timestampFromRouteEldZonedLocal(
          `${dayjs(session.value.toDate).add(1, 'day').format('YYYY-MM-DD')}T00:00:00`,
          workspaceTimeZone.value
        )
      : 0
  )

  const timelineCutoffMs = computed(() => {
    return Math.min(
      routeEldSessionTimelineCutoff(session.value?.createdAt),
      periodEndMs.value
    )
  })

  const graphEventDurationById = computed(() => {
    const result = new Map<string, number>()
    const eligible = rawEvents.value
      .filter((item) => !item.isDeleted)
      .filter((item) => normalizedStatus(item.event.recordStatus) === 'ACTIVE')
      .filter((item) => item.event.eventCategory !== 'OTHER')
      .filter(
        (item) =>
          item.event.timestamp >= periodStartMs.value && item.event.timestamp < periodEndMs.value
      )
    eligible.forEach((item, index) => {
      const nextTimestamp = eligible[index + 1]?.event.timestamp ?? timelineCutoffMs.value
      result.set(item.event.id, Math.max(0, nextTimestamp - item.event.timestamp))
    })
    return result
  })

  const coDriverDurationById = computed(() => {
    const result = new Map<string, number>()
    const eligible = coDriverGraphEvents.value.filter(
      (event) =>
        normalizedStatus(event.recordStatus) === 'ACTIVE' && event.eventCategory !== 'OTHER'
    )
    eligible.forEach((event, index) => {
      result.set(
        event.id,
        Math.max(0, (eligible[index + 1]?.timestamp ?? timelineCutoffMs.value) - event.timestamp)
      )
    })
    return result
  })

  const eventDuration = (index: number) => {
    const eventId = rawEvents.value[index]?.event.id
    const milliseconds = eventId ? graphEventDurationById.value.get(eventId) : undefined
    return milliseconds == null ? 0 : Math.floor(milliseconds / 1000)
  }

  const issueMap = computed(() => {
    const result = new Map<string, { errors: string[]; warnings: string[] }>()
    for (const issue of workspace.value?.calculations.eventIssues ?? []) {
      const value = result.get(issue.eventId) ?? { errors: [], warnings: [] }
      if (String(issue.severity).toUpperCase() === 'ERROR') value.errors.push(issue.title)
      else value.warnings.push(issue.title)
      result.set(issue.eventId, value)
    }
    return result
  })

  const eventRows = computed<BoostUiEventRow[]>(() =>
    rawEvents.value.map((workspaceEvent, index) => {
      const event = workspaceEvent.event
      const [eventType, eventCode] = numericEvent(event)
      const issues = issueMap.value.get(event.id)
      const tabKind = store.activeTab?.kind
      const deliveryStatus = !workspaceEvent.historyId || !['FINAL', 'ROLLBACK'].includes(tabKind ?? '')
        ? undefined
        : tabKind === 'ROLLBACK'
          ? workspaceEvent.isRolledBack
            ? 'ROLLED_BACK'
            : workspaceEvent.isSubmitted
              ? 'ROLLBACK_PENDING'
              : 'NOT_SUBMITTED'
          : workspaceEvent.isSubmitted
            ? 'SUBMITTED'
            : 'SUBMISSION_PENDING'
      return {
        eventId: event.id,
        sequenceId: sequenceIdHexToDecimal(event.sequenceId),
        driverFullName: session.value?.driverName ?? '',
        startTime: asDateTime(event.timestamp, event.timeZone),
        duration:
          graphEventDurationById.value.get(event.id) == null
            ? null
            : Math.floor(graphEventDurationById.value.get(event.id)! / 1000),
        eventType,
        eventCode,
        eventName: event.eventName,
        calculatedLocation: event.location || undefined,
        manualLocation: event.driverLocationDescription || undefined,
        locationOrigin: event.driverLocationDescription ? 2 : 1,
        latitude: event.latitude,
        longitude: event.longitude,
        eventRecordOrigin: asOrigin(event.recordOrigin),
        vehicleMiles: event.odometerMiles ?? undefined,
        engineHours: event.engineHours ?? undefined,
        annotation: event.notes ?? undefined,
        eventRecordStatus: normalizedStatus(event.recordStatus),
        trailerNumber: workspaceEvent.trailers.join(', ') || undefined,
        shippingDocument: workspaceEvent.documents.join(', ') || undefined,
        actionState: workspaceEvent.isDeleted
          ? 4
          : event.isFrozen || !workspace.value?.canEdit
            ? 8
            : 1,
        changeStatus: workspaceEvent.changeStatus,
        historyId: workspaceEvent.historyId,
        deliveryStatus,
        errorTitles: issues?.errors ?? [],
        warningTitles: issues?.warnings ?? [],
      }
    })
  )

  const coDriverRows = computed<BoostUiEventRow[]>(() =>
    coDriverGraphEvents.value.map((event) => {
      const [eventType, eventCode] = numericEvent(event)
      return {
        eventId: event.id,
        sequenceId: sequenceIdHexToDecimal(event.sequenceId),
        driverFullName: latestPeriodCoDriver.value?.name ?? 'Co-driver',
        startTime: asDateTime(event.timestamp, event.timeZone),
        duration: coDriverDurationById.value.has(event.id)
          ? Math.floor(coDriverDurationById.value.get(event.id)! / 1000)
          : null,
        eventType,
        eventCode,
        eventName: event.eventName,
        calculatedLocation: event.location || undefined,
        manualLocation: event.driverLocationDescription || undefined,
        locationOrigin: event.driverLocationDescription ? 2 : 1,
        latitude: event.latitude,
        longitude: event.longitude,
        eventRecordOrigin: asOrigin(event.recordOrigin),
        vehicleMiles: event.odometerMiles ?? undefined,
        engineHours: event.engineHours ?? undefined,
        annotation: event.notes ?? undefined,
        eventRecordStatus: normalizedStatus(event.recordStatus),
        trailerNumber: event.trailers.join(', ') || undefined,
        shippingDocument: event.documents.join(', ') || undefined,
        actionState: 8,
        changeStatus: 'CO_DRIVER',
        errorTitles: [],
        warningTitles: [],
      }
    })
  )

  const dailyEvents = computed<BoostUiEventGroup[]>(() => {
    const rows = [
      ...eventRows.value.map((row, index) => ({
        row,
        date: normalizeDateKey(rawEvents.value[index].event.logDate),
      })),
      ...(coDriverRenderEnabled.value ? coDriverRows.value : []).map((row, index) => ({
        row,
        date: normalizeDateKey(coDriverGraphEvents.value[index].logDate),
      })),
    ]
    const grouped = groupByDate(rows)
    const dates: string[] = []
    if (session.value) {
      const end = dayjs(normalizeDateKey(session.value.toDate))
      let cursor = dayjs(normalizeDateKey(session.value.fromDate))
      while (cursor.isBefore(end) || cursor.isSame(end, 'day')) {
        dates.push(cursor.format('YYYY-MM-DD'))
        cursor = cursor.add(1, 'day')
      }
    } else {
      dates.push(...Object.keys(grouped).sort())
    }
    return dates.map((date) => {
      const values = grouped[date] ?? []
      const form = profileForms.value.find((item) => normalizeDateKey(item.logDate) === date)
      const dailyLog = schedule.value?.dailyLogs.find(
        (item) => normalizeDateKey(item.logDate) === date
      )
      return {
        date,
        events: values.map((value) => value.row),
        dailyForm:
          form || dailyLog
            ? {
                id: form?.logDate ?? dailyLog!.logDate,
                formDate: form?.logDate ?? dailyLog!.logDate,
                trailers: form?.trailers.length ? form.trailers : (dailyLog?.trailers ?? []),
                shippingDocuments: form?.shippingDocuments.length
                  ? form.shippingDocuments
                  : (dailyLog?.shippingDocuments ?? []),
                coDriver: form?.coDriverName ?? dailyLog?.coDriverName ?? null,
                isCertified: Boolean(
                  form?.signatureFileName || form?.signatureUrl || dailyLog?.signature
                ),
                isEdited: form?.isModified ?? false,
              }
            : null,
      }
    })
  })

  const chartData = computed<GraphResponse | null>(() => {
    if (!session.value) return null
    const from = periodStartMs.value
    const to = periodEndMs.value
    const days = dayjs(session.value.toDate).diff(dayjs(session.value.fromDate), 'day') + 1
    const pixelsPerDay = screenResolution.value
    const svgWidth = days * pixelsPerDay
    const duties: GraphResponse['duties'] = { '1': [], '2': [], '3': [], '4': [], '5': [], '6': [] }
    const verticalLines: GraphResponse['verticalLines'] = []
    const dutyEvents = rawEvents.value
      .filter((item) => CATEGORY_TO_CODE[item.event.eventCategory])
      .filter((item) => !item.isDeleted)
    dutyEvents.forEach((item, index) => {
      const event = item.event
      const next = dutyEvents[index + 1]?.event
      const duty = CATEGORY_TO_CODE[event.eventCategory]
      const nextTimestamp = Math.min(next?.timestamp ?? timelineCutoffMs.value, to)
      const startSeconds = Math.max(0, (event.timestamp - from) / 1000)
      const endSeconds = Math.max(startSeconds, (nextTimestamp - from) / 1000)
      const x1 = (startSeconds / 86400) * pixelsPerDay
      const x2 = (endSeconds / 86400) * pixelsPerDay
      const [eventType, eventCode] = numericEvent(event)
      const segment: GraphDuties = {
        x1,
        x2,
        y1: 0,
        y2: 0,
        eventCode,
        eventType,
        eventTime: asDateTime(event.timestamp, event.timeZone),
        duration: Math.max(0, Math.floor((nextTimestamp - event.timestamp) / 1000)),
        eventId: event.id,
        eventOrders: [duty],
        recordStatus: asStatus(event.recordStatus),
        recordOrigin: asOrigin(event.recordOrigin),
      }
      duties[String(duty) as keyof typeof duties].push(segment)
      if (next) {
        const nextDuty = CATEGORY_TO_CODE[next.eventCategory]
        if (nextDuty && nextDuty !== duty) {
          verticalLines.push({ x1: x2, x2, y1: 0, y2: 0, eventOrders: [duty, nextDuty] })
        }
      }
    })
    return {
      duties,
      verticalLines,
      days,
      svgWidth,
      svgViewBox: svgWidth,
      dayNames: Array.from({ length: days }, (_, index) =>
        dayjs(session.value!.fromDate).add(index, 'day').format('MMM D')
      ),
      dates: Array.from({ length: days }, (_, index) =>
        dayjs(session.value!.fromDate).add(index, 'day').format('YYYY-MM-DD')
      ),
    }
  })

  const dailySummary = computed<DailySummaryResponse | null>(() => {
    if (!session.value) return null
    const summaryDate = session.value.toDate
    const totals = { 1: 0, 2: 0, 3: 0, 4: 0 } as Record<number, number>
    rawEvents.value.forEach((item, index) => {
      if (item.event.logDate !== summaryDate || item.isDeleted) return
      const duty = CATEGORY_TO_CODE[item.event.eventCategory]
      if (duty) totals[duty] += eventDuration(index)
    })
    return {
      summaryDate,
      dailyOffDuty: totals[1],
      dailySleeperBerth: totals[2],
      dailyDriving: totals[3],
      dailyOnDuty: totals[4],
    }
  })

  const dailySummaries = computed<DailyDictionarySummaryResponse>(() => {
    if (!session.value) return {}
    const summaries: DailyDictionarySummaryResponse = {}
    const dutyEvents = rawEvents.value
      .filter((item) => CATEGORY_TO_CODE[item.event.eventCategory])
      .filter((item) => !item.isDeleted)
    const days = dayjs(session.value.toDate).diff(dayjs(session.value.fromDate), 'day') + 1

    for (let dayIndex = 0; dayIndex < days; dayIndex += 1) {
      const summaryDate = dayjs(session.value.fromDate).add(dayIndex, 'day').format('YYYY-MM-DD')
      const dayStart = timestampFromRouteEldZonedLocal(
        `${summaryDate}T00:00:00`,
        workspaceTimeZone.value
      )
      const nextDate = dayjs(summaryDate).add(1, 'day').format('YYYY-MM-DD')
      const dayEnd = timestampFromRouteEldZonedLocal(
        `${nextDate}T00:00:00`,
        workspaceTimeZone.value
      )
      const totals = { 1: 0, 2: 0, 3: 0, 4: 0 } as Record<number, number>

      dutyEvents.forEach((item, index) => {
        const duty = CATEGORY_TO_CODE[item.event.eventCategory]
        if (!duty) return
        const segmentStart = Math.max(item.event.timestamp, dayStart, periodStartMs.value)
        const segmentEnd = Math.min(
          dutyEvents[index + 1]?.event.timestamp ?? timelineCutoffMs.value,
          dayEnd,
          periodEndMs.value
        )
        if (segmentEnd > segmentStart) {
          totals[duty] += Math.floor((segmentEnd - segmentStart) / 1000)
        }
      })

      summaries[`${summaryDate}T00:00:00`] = {
        summaryDate,
        dailyOffDuty: totals[1],
        dailySleeperBerth: totals[2],
        dailyDriving: totals[3],
        dailyOnDuty: totals[4],
      }
    }

    return summaries
  })

  const dailyTimeRemainder = computed(() => {
    const hos = workspace.value?.calculations.hos
    if (!hos) return null
    return {
      breakDuration: Math.floor(hos.break.remainingMs / 1000),
      drivingDuration: Math.floor(hos.drive.remainingMs / 1000),
      shiftDuration: Math.floor(hos.shift.remainingMs / 1000),
      cycleDuration: Math.floor(hos.cycle.remainingMs / 1000),
    }
  })

  const dailyPixelViolations = computed(() => {
    if (!session.value) return []
    const from = periodStartMs.value
    return (workspace.value?.calculations.violations ?? []).map((violation) => ({
      position: ((violation.startedAt - from) / 86400000) * screenResolution.value,
      startedAt: asDateTime(violation.startedAt, workspaceTimeZone.value),
      description: violation.title,
    }))
  })

  const displayedFreeTimes = computed(() =>
    (workspace.value?.calculations.freeTimes ?? []).filter(
      (value) => value.freeDurationMs >= 60 * 60_000
    )
  )

  const boostFreeTimes = computed<BoostFreeTime[]>(() => {
    if (!session.value) return []
    const from = periodStartMs.value
    return displayedFreeTimes.value.map((value) => {
      const row = eventRows.value.find((event) => event.eventId === value.eventId)
      return {
        eventId: value.eventId,
        eventType: row?.eventType ?? 1,
        eventCode: row?.eventCode ?? 1,
        eventDateTime: asDateTime(value.eventTimestamp, workspaceTimeZone.value),
        startedFreeTime: asDateTime(value.startedAt, workspaceTimeZone.value),
        endedFreeTime: asDateTime(value.endedAt, workspaceTimeZone.value),
        freeDurationInSeconds: Math.floor(value.freeDurationMs / 1000),
        eventDurationInSeconds: Math.floor(value.eventDurationMs / 1000),
        startPosition: ((value.startedAt - from) / 86400000) * screenResolution.value,
        endPosition: ((value.endedAt - from) / 86400000) * screenResolution.value,
      }
    })
  })

  const violations = computed(() =>
    (workspace.value?.calculations.violations ?? []).map((value) => ({
      type: value.type,
      startedAt: asDateTime(value.startedAt, workspaceTimeZone.value),
      violationDateTime: asDateTime(value.startedAt, workspaceTimeZone.value),
      violationEventId: value.eventId,
      description: { shortName: value.type, description: value.title },
    }))
  )
  const errorWarningRows = computed(() =>
    eventRows.value.flatMap((event, index) => {
      const shared = {
        id: event.eventId,
        no: event.sequenceId || String(index + 1),
        event: event.eventName || `${event.eventType}-${event.eventCode}`,
        time: dayjs(event.startTime).format('MMM D, hh:mm A'),
      }
      return [
        ...(event.errorTitles ?? []).map((message) => ({
          ...shared,
          severity: 'ERROR' as const,
          message,
        })),
        ...(event.warningTitles ?? []).map((message) => ({
          ...shared,
          severity: 'WARNING' as const,
          message,
        })),
      ]
    })
  )
  const errorCount = computed(
    () => errorWarningRows.value.filter((row) => row.severity === 'ERROR').length
  )
  const warningCount = computed(
    () => errorWarningRows.value.filter((row) => row.severity === 'WARNING').length
  )
  const hasErrorWarning = computed(() => errorWarningRows.value.length > 0)
  const pinTimes = computed(() => [])
  const selectedEventsForUpdate = computed(() =>
    eventRows.value.filter((event) => selectedRowIds.value.includes(event.eventId))
  )
  const selectedMoveEventsCount = computed(() => selectedRowIds.value.length)
  const isBoostEventsSubmitted = computed(() => session.value?.status === 'SUBMITTED')

  const defaultEditForm = (): BoostEventStatusForm => ({
    responsibleUserId: '',
    id: 0,
    eventId: '',
    sequenceId: null,
    event: { eventCode: null, eventType: null },
    eventCodeId: null,
    origin: null,
    recordStatus: null,
    vehicleId: null,
    vehicleUnit: null,
    eldId: null,
    positioning: null,
    odometer: null,
    engineHours: null,
    trailer: null,
    doc: null,
    locationOrigin: null,
    latitude: null,
    longitude: null,
    location: null,
    locationNote: null,
    notes: null,
    startDate: dayjs().format('YYYY-MM-DD'),
    time: { hours: 0, minutes: 0, seconds: 0 },
    certifiedDate: null,
    certifiedTime: { hours: 0, minutes: 0, seconds: 0 },
  })
  const editEventForm = ref(defaultEditForm())

  function sourceEvent(eventId: string) {
    return rawEvents.value.find((item) => item.event.id === eventId) ?? null
  }

  function updateEditEventForm(value: BoostEventStatusForm) {
    editEventForm.value = value
  }

  async function prepareInsertEvent(sourceId?: string) {
    if (!responsibleUsers.value.length) await store.fetchDriverOptions(driverId.value)
    const source = sourceId ? sourceEvent(sourceId) : null
    const sourceEventValue = source?.event
    if (
      sourceEventValue &&
      (sourceEventValue.timestamp < periodStartMs.value ||
        sourceEventValue.timestamp >= periodEndMs.value)
    ) {
      throw new Error('Events outside the session period cannot be copied')
    }
    if (sourceEventValue?.isFrozen) throw new Error('DOT-inspected events cannot be copied')
    const localDate = sourceEventValue
      ? dayjs(zonedDateTime(sourceEventValue.timestamp, sourceEventValue.timeZone))
      : dayjs(session.value?.toDate ?? dayjs().format('YYYY-MM-DD'))
    const [eventType, eventCode] = sourceEventValue
      ? numericEvent(sourceEventValue)
      : EVENT_CODE_TO_NUMERIC.DS_OFF
    const maxSequence = rawEvents.value.reduce((maximum, item) => {
      const decimal = Number(sequenceIdHexToDecimal(item.event.sequenceId))
      return Number.isFinite(decimal) ? Math.max(maximum, decimal) : maximum
    }, 0)
    editEventForm.value = {
      ...defaultEditForm(),
      responsibleUserId:
        responsibleUsers.value.find((user) => user.active)?.id ??
        responsibleUsers.value[0]?.id ??
        '',
      sequenceId: String(maxSequence + 1),
      event: { eventType, eventCode },
      eventCodeId: sourceEventValue?.eventCode ?? 'DS_OFF',
      origin: sourceEventValue ? asOrigin(sourceEventValue.recordOrigin) : 2,
      recordStatus: 'ACTIVE',
      vehicleId: sourceEventValue?.vehicleId ?? null,
      vehicleUnit: sourceEventValue?.vehicleName ?? null,
      eldId: sourceEventValue?.eldId ?? null,
      positioning:
        sourceEventValue?.positioning === 'MANUAL' || sourceEventValue?.positioning === 'AUTOMATIC'
          ? sourceEventValue.positioning
          : null,
      odometer: sourceEventValue?.odometerMiles ?? null,
      engineHours: sourceEventValue?.engineHours ?? null,
      trailer: source?.trailers.join(', ') || null,
      doc: source?.documents.join(', ') || null,
      locationOrigin: sourceEventValue?.driverLocationDescription ? 2 : 1,
      latitude: sourceEventValue?.latitude ?? null,
      longitude: sourceEventValue?.longitude ?? null,
      location: sourceEventValue?.location ?? null,
      locationNote: sourceEventValue?.driverLocationDescription ?? null,
      notes: sourceEventValue?.notes ?? null,
      startDate: localDate.format('YYYY-MM-DD'),
      time: {
        hours: localDate.hour(),
        minutes: localDate.minute(),
        seconds: sourceEventValue ? localDate.second() : 0,
      },
      certifiedDate: sourceEventValue?.dateToCertify ?? null,
      certifiedTime: {
        hours: localDate.hour(),
        minutes: localDate.minute(),
        seconds: localDate.second(),
      },
    }
    showEditEventModal.value = true
  }

  async function openEditEvent(eventId: string) {
    const source = sourceEvent(eventId)
    if (!source) return
    const event = source.event
    const localDate = zonedDateTime(event.timestamp, event.timeZone)
    const date = dayjs(localDate)
    const [eventType, eventCode] = numericEvent(event)
    editEventForm.value = {
      id: Number(sequenceIdHexToDecimal(event.sequenceId)) || 0,
      eventId: event.id,
      sequenceId: sequenceIdHexToDecimal(event.sequenceId),
      event: { eventType, eventCode },
      eventCodeId: event.eventCode,
      origin: asOrigin(event.recordOrigin),
      recordStatus: event.recordStatus,
      vehicleId: event.vehicleId ?? null,
      vehicleUnit: event.vehicleName ?? null,
      eldId: event.eldId ?? null,
      positioning: event.driverLocationDescription
        ? 'MANUAL'
        : event.positioning === 'MANUAL' || event.positioning === 'AUTOMATIC'
          ? event.positioning
          : event.latitude != null && event.longitude != null
            ? 'AUTOMATIC'
            : null,
      odometer: event.odometerMiles ?? null,
      engineHours: event.engineHours ?? null,
      trailer: source.trailers.join(', ') || null,
      doc: source.documents.join(', ') || null,
      locationOrigin: event.driverLocationDescription ? 2 : 1,
      latitude: event.latitude ?? null,
      longitude: event.longitude ?? null,
      location: event.location ?? null,
      locationNote: event.driverLocationDescription ?? null,
      notes: event.notes ?? null,
      startDate: date.format('YYYY-MM-DD'),
      time: { hours: date.hour(), minutes: date.minute(), seconds: date.second() },
      certifiedDate: event.dateToCertify ?? null,
      certifiedTime: { hours: date.hour(), minutes: date.minute(), seconds: date.second() },
    }
    showEditEventModal.value = true
  }

  function eventPayload(form: BoostEventStatusForm, source?: RouteEldWorkspaceEvent | null) {
    const event = source?.event
    const localDate = dayjs(
      `${form.startDate}T${String(form.time.hours).padStart(2, '0')}:${String(form.time.minutes).padStart(2, '0')}:${String(form.time.seconds).padStart(2, '0')}`
    )
    return {
      sequenceId: sequenceIdDecimalToHex(form.sequenceId),
      timestamp: timestampFromRouteEldZonedLocal(
        localDate.format('YYYY-MM-DDTHH:mm:ss'),
        event?.timeZone ?? workspaceTimeZone.value
      ),
      logDate: form.startDate,
      eventCode:
        form.eventCodeId ??
        NUMERIC_TO_EVENT_CODE[`${form.event.eventType}:${form.event.eventCode}`] ??
        event?.eventCode ??
        'DS_OFF',
      recordOrigin:
        form.origin === 1
          ? 'ELD'
          : form.origin === 2
            ? 'DRIVER'
            : form.origin === 3
              ? 'OTHER_USER'
              : form.origin === 4
                ? 'UNIDENTIFIED_DRIVER'
                : (event?.recordOrigin ?? 'OTHER_USER'),
      recordStatus: form.recordStatus,
      vehicleId: form.vehicleId,
      odometerMiles: form.odometer,
      engineHours: form.engineHours,
      eldId: form.eldId,
      positioning: form.positioning,
      driverLocationDescription: form.locationNote,
      notes: form.notes,
      latitude: form.latitude === '' ? null : Number(form.latitude),
      longitude: form.longitude === '' ? null : Number(form.longitude),
      location: form.location,
      dateToCertify: form.certifiedDate,
      trailers: form.trailer ? form.trailer.split(/[,\s]+/).filter(Boolean) : [],
      documents: form.doc ? form.doc.split(/[,\s]+/).filter(Boolean) : [],
    }
  }

  function currentEventPayload(source: RouteEldWorkspaceEvent) {
    const event = source.event
    return {
      sequenceId: event.sequenceId,
      timestamp: event.timestamp,
      logDate: event.logDate,
      eventCode: event.eventCode,
      recordOrigin: event.recordOrigin,
      recordStatus: event.recordStatus,
      vehicleId: event.vehicleId,
      odometerMiles: event.odometerMiles,
      engineHours: event.engineHours,
      eldId: event.eldId,
      positioning: event.positioning,
      driverLocationDescription: event.driverLocationDescription,
      notes: event.notes,
      latitude: event.latitude,
      longitude: event.longitude,
      location: event.location,
      dateToCertify: event.dateToCertify,
      trailers: source.trailers,
      documents: source.documents,
    }
  }

  async function submitEditEvent(form: BoostEventStatusForm) {
    const source = sourceEvent(form.eventId)
    isActionLoading.value = true
    try {
      if (source) {
        await store.updateEvent(form.eventId, eventPayload(form, source))
      } else {
        if (!form.responsibleUserId) throw new Error('Select a responsible user')
        await store.insertEvent({
          responsibleUserId: form.responsibleUserId,
          event: eventPayload(form),
        })
      }
      showEditEventModal.value = false
      toast.success(source ? 'Event updated' : 'Event inserted')
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to update event')
    } finally {
      isActionLoading.value = false
    }
  }

  const defaultDailyForm = (): BoostEventEditProfile => ({
    date: '',
    dailyFormId: null,
    coDriver: null,
    coDriverName: null,
    coDrivers: [],
    trailer: null,
    shippingDocs: null,
    signature: null,
    signaturePaths: [],
    assignedVehicleIds: [],
  })
  const editDailyForm = reactive(defaultDailyForm())

  function updateEditDailyForm(value: Partial<BoostEventEditProfile>) {
    Object.assign(editDailyForm, value)
  }

  async function openEditDailyForm(date: string) {
    if (session.value?.status !== 'DRAFT' || !workspace.value?.canEdit || store.activeTab?.kind !== 'WORKING') return
    const normalizedDate = normalizeDateKey(date)
    const form = profileForms.value.find(
      (item) => normalizeDateKey(item.logDate) === normalizedDate
    )
    const dailyLog = schedule.value?.dailyLogs.find(
      (item) => normalizeDateKey(item.logDate) === normalizedDate
    )
    Object.assign(editDailyForm, {
      date: form?.logDate ?? date,
      dailyFormId: form?.isModified ? form.logDate : null,
      coDriver: form?.coDriverId ?? dailyLog?.coDriverId ?? null,
      coDriverName: form?.coDriverName ?? dailyLog?.coDriverName ?? null,
      coDrivers: coDrivers.value.map((driver) => {
        const parts = driver.name.split(' ')
        return {
          driverId: driver.id,
          firstName: parts[0] ?? driver.name,
          lastName: parts.slice(1).join(' '),
        }
      }),
      trailer: (form?.trailers.length ? form.trailers : dailyLog?.trailers)?.join(', ') ?? null,
      shippingDocs:
        (form?.shippingDocuments.length
          ? form.shippingDocuments
          : dailyLog?.shippingDocuments
        )?.join(', ') ?? null,
      signature: signatureFileName(form?.signatureFileName ?? dailyLog?.signature),
      signaturePaths:
        form?.signatureFileName || dailyLog?.signature
          ? [signatureFileName(form?.signatureFileName ?? dailyLog!.signature!)!]
          : [],
      assignedVehicleIds: [],
    })
    showEditDailyFormModal.value = true
    if (!coDrivers.value.length) {
      try {
        await store.fetchDriverOptions(driverId.value)
        editDailyForm.coDrivers = coDrivers.value.map((driver) => {
          const parts = driver.name.split(' ')
          return {
            driverId: driver.id,
            firstName: parts[0] ?? driver.name,
            lastName: parts.slice(1).join(' '),
          }
        })
        const coDriverMatch = coDrivers.value.find(
          (driver) =>
            driver.id === editDailyForm.coDriver ||
            driver.name.trim().toLocaleLowerCase() ===
              editDailyForm.coDriverName?.trim().toLocaleLowerCase()
        )
        if (coDriverMatch) editDailyForm.coDriver = coDriverMatch.id
      } catch {
        editDailyForm.coDrivers = []
      }
    }
  }

  async function submitDailyForm(form: BoostEventEditProfile) {
    if (session.value?.status !== 'DRAFT' || !workspace.value?.canEdit || store.activeTab?.kind !== 'WORKING') return
    const current = profileForms.value.find(
      (item) => normalizeDateKey(item.logDate) === normalizeDateKey(form.date)
    )
    isActionLoading.value = true
    try {
      await store.updateProfileForm({
        logDate: form.date,
        coDriverId: form.coDriver,
        coDriverName:
          coDrivers.value.find((item) => item.id === form.coDriver)?.name ??
          form.coDriverName ??
          null,
        trailers: form.trailer
          ? form.trailer
              .split(/[,\s]+/)
              .map((value) => value.trim())
              .filter(Boolean)
          : [],
        shippingDocuments: form.shippingDocs
          ? form.shippingDocs
              .split(/[,\s]+/)
              .map((value) => value.trim())
              .filter(Boolean)
          : [],
        signatureFileName: form.signature,
        signatureUrl: current?.signatureUrl,
        isModified: true,
        isSubmitted: current?.isSubmitted ?? false,
        isRolledBack: false,
      })
      showEditDailyFormModal.value = false
      toast.success('Profile form updated')
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || error?.message || 'Failed to update profile form'
      )
    } finally {
      isActionLoading.value = false
    }
  }

  async function revertDailyForm() {
    if (!session.value || !editDailyForm.date) return
    if (session.value.status !== 'DRAFT' || !workspace.value?.canEdit || store.activeTab?.kind !== 'WORKING') return
    isActionLoading.value = true
    try {
      await api.post(
        `${ApiEndpoints.ROUTE_ELD_EVENT_SESSION(session.value.id)}/rollback/profile-form`,
        null,
        { params: { logDate: editDailyForm.date } }
      )
      await store.fetchProfileForms(session.value.id, activeTabId.value)
      showEditDailyFormModal.value = false
      toast.success('Profile form reverted')
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || error?.message || 'Failed to revert profile form'
      )
    } finally {
      isActionLoading.value = false
    }
  }

  async function selectTab(tab: TabResponse) {
    await store.selectTab(tab.id)
    selectedRowIds.value = []
    await router.replace({ query: { ...route.query, tabId: tab.id } })
  }

  async function addNewTab() {
    try {
      const value = await store.createTab()
      if (value) await router.replace({ query: { ...route.query, tabId: value.tabId } })
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to create tab')
    }
  }

  async function removeTab(tabId: string) {
    try {
      const value = await store.deleteTab(tabId)
      if (value) await router.replace({ query: { ...route.query, tabId: value.tabId } })
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to delete tab')
    }
  }

  async function submitBoostEvents() {
    const wasSubmitted = isBoostEventsSubmitted.value
    try {
      await store.submitOrRollback()
      toast.success(wasSubmitted ? 'Session rolled back' : 'Session submitted')
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Session operation failed')
    }
  }

  async function deleteBoostEvent(eventId: string) {
    try {
      await store.deleteEvents([eventId])
      selectedRowIds.value = selectedRowIds.value.filter((id) => id !== eventId)
      toast.success('Event deleted')
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to delete event')
    }
  }

  async function deleteSelectedBoostEvents() {
    if (!selectedRowIds.value.length) return
    try {
      await store.deleteEvents(selectedRowIds.value)
      selectedRowIds.value = []
      toast.success('Selected events deleted')
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to delete events')
    }
  }

  async function copyBoostEvent(eventId: string) {
    try {
      await prepareInsertEvent(eventId)
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || error?.message || 'Failed to prepare event copy'
      )
    }
  }

  async function revertBoostEvent(eventId: string) {
    try {
      await store.revertEvent(eventId)
      toast.success('Event change reverted')
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to revert event')
    }
  }

  function getEventDetails(eventId: string) {
    return sourceEvent(eventId)
  }

  async function submitMoveTimeBoost(payload: {
    hours: number
    minutes: number
    seconds: number
    reversed: boolean
  }) {
    const seconds = payload.hours * 3600 + payload.minutes * 60 + payload.seconds
    try {
      await store.boostEvents(selectedRowIds.value, payload.reversed ? -seconds : seconds)
      boostModalOpen.value = false
      toast.success('Events boosted')
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to boost events')
    }
  }

  async function submitDurationBoost(payload: {
    durationSeconds: number
    mode: 'expand' | 'reduce'
    ensurePti: boolean
  }) {
    const eventId = selectedRowIds.value[0]
    if (!eventId) return
    try {
      await store.boostEventDuration(
        eventId,
        payload.durationSeconds,
        payload.mode,
        payload.ensurePti
      )
      toast.success('Event duration updated')
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, 'Failed to update event duration'))
      throw error
    }
  }

  async function submitReassignSelectedEvents(payload: {
    toDriverId: string
    actionType: 'reassign' | 'replicate'
  }) {
    try {
      await store.reassignEvents(
        selectedRowIds.value,
        payload.toDriverId,
        payload.actionType.toUpperCase()
      )
      reassignModalOpen.value = false
      selectedRowIds.value = []
      toast.success(payload.actionType === 'reassign' ? 'Events reassigned' : 'Events replicated')
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to reassign events')
    }
  }

  async function submitMultiUpdateEvents(payload: {
    trailer: string | null
    doc: string | null
    shiftedTimes: number | null
  }) {
    try {
      await store.updateEvents({
        eventIds: selectedRowIds.value,
        trailers: payload.trailer ? [payload.trailer] : null,
        documents: payload.doc ? [payload.doc] : null,
        deltaSeconds: payload.shiftedTimes,
        odometerMiles: null,
        odometerOffset: false,
      })
      multiUpdateModalOpen.value = false
      toast.success('Events updated')
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to update events')
    }
  }

  async function dropProperty(
    column: DragColumnType,
    targetEventId: string,
    data: string | number | null | LocationTransfer
  ) {
    const source = sourceEvent(targetEventId)
    if (!source) return
    if (column === 'trailer' || column === 'doc' || column === 'odometer') {
      await store.updateEvents({
        eventIds: [targetEventId],
        trailers: column === 'trailer' ? (data ? [String(data)] : []) : null,
        documents: column === 'doc' ? (data ? [String(data)] : []) : null,
        deltaSeconds: null,
        odometerMiles: column === 'odometer' ? Number(data) : null,
        odometerOffset: false,
      })
      return
    }
    if (column === 'engine_hours') {
      await store.updateEvent(targetEventId, {
        ...currentEventPayload(source),
        engineHours: data == null ? null : Number(data),
      })
      return
    }
    if (column === 'location' && typeof data === 'object' && data) {
      const manual = data.positioning === 'MANUAL' || Boolean(data.manualLocation?.trim())
      await store.updateEvent(targetEventId, {
        ...currentEventPayload(source),
        positioning: manual ? 'MANUAL' : 'AUTOMATIC',
        latitude: manual ? (source.event.latitude ?? null) : (data.latitude ?? null),
        longitude: manual ? (source.event.longitude ?? null) : (data.longitude ?? null),
        location: manual ? (source.event.location ?? null) : (data.calculatedLocation ?? null),
        driverLocationDescription: manual
          ? data.manualLocation?.trim() || data.calculatedLocation?.trim() || null
          : null,
      })
    }
  }

  function getChartWidth(width: number) {
    const normalizedWidth = Math.max(900, Math.floor(width))
    screenResolution.value = normalizedWidth
    chartStore.screenResolution = normalizedWidth
  }

  function getSelectedEvent(value: any) {
    selectedEventId.value =
      typeof value === 'string' ? value : String(value?.eventId || value?.id || '')
  }

  function onSelectedMoveEvents(events: GraphDuties[]) {
    selectedRowIds.value = events.map((event) => String(event.eventId))
  }

  watch(
    () => session.value?.id,
    async () => {
      if (session.value) {
        headerDate.value = [dayjs(session.value.fromDate), dayjs(session.value.toDate)]
        if (!responsibleUsers.value.length || !coDrivers.value.length) {
          try {
            await store.fetchDriverOptions(driverId.value)
          } catch (error) {
            void error
          }
        }
      }
      selectedRowIds.value = []
    },
    { immediate: true }
  )

  let coDriverRequestVersion = 0
  watch(
    () =>
      [
        session.value?.id,
        schedule.value?.driverId,
        latestPeriodCoDriver.value?.id,
        session.value?.fromDate,
        session.value?.toDate,
      ] as const,
    async ([sessionId, scheduleDriverId, coDriverId, fromDate, toDate]) => {
      const version = ++coDriverRequestVersion
      if (!sessionId || !scheduleDriverId || !coDriverId || !fromDate || !toDate) {
        store.clearCoDriverSchedule()
        return
      }
      try {
        await store.fetchCoDriverSchedule(scheduleDriverId, coDriverId, fromDate, toDate)
      } catch {
        if (version === coDriverRequestVersion) store.clearCoDriverSchedule()
      }
    },
    { immediate: true }
  )

  return {
    store,
    sessions,
    session,
    workspace,
    profileForms,
    schedule,
    responsibleUsers,
    coDrivers,
    workspaceTimeZone,
    driverId,
    headerDate,
    tabs,
    selectedTab,
    dailySummary,
    dailySummaries,
    dailyTimeRemainder,
    chartData,
    dailyEvents,
    coDriverGraphEvents,
    showCoDrivers,
    coDriverRenderEnabled,
    latestPeriodCoDriver,
    graphEventDurationById,
    dailyPixelViolations,
    pinTimes,
    displayedFreeTimes,
    boostFreeTimes,
    violations,
    errorWarningRows,
    errorCount,
    warningCount,
    hasErrorWarning,
    selectedEventId,
    selectedRowIds,
    selectedEventsForUpdate,
    selectedMoveEventsCount,
    dragDropEnabled,
    boostModalOpen,
    reassignModalOpen,
    multiUpdateModalOpen,
    showEditEventModal,
    showEditDailyFormModal,
    editEventForm,
    editDailyForm,
    isGraphLoading: isLoading,
    isCoDriverLoading: coDriverScheduleLoading,
    isDailyEventsLoading: isLoading,
    isEditEventLoading: isActionLoading,
    isEditDailyFormLoading: isActionLoading,
    isMultiUpdateLoading: isActionLoading,
    isBoostSubmitting: isMutating,
    isReassigning: isMutating,
    isSubmitLoading: isMutating,
    isBoostEventsSubmitted,
    updateEditEventForm,
    openEditEvent,
    prepareInsertEvent,
    submitEditEvent,
    updateEditDailyForm,
    openEditDailyForm,
    submitDailyForm,
    revertDailyForm,
    selectTab,
    addNewTab,
    removeTab,
    submitBoostEvents,
    deleteBoostEvent,
    deleteSelectedBoostEvents,
    copyBoostEvent,
    revertBoostEvent,
    getEventDetails,
    submitMoveTimeBoost,
    submitDurationBoost,
    submitReassignSelectedEvents,
    submitMultiUpdateEvents,
    dropProperty,
    getChartWidth,
    getSelectedEvent,
    onSelectedMoveEvents,
  }
}
