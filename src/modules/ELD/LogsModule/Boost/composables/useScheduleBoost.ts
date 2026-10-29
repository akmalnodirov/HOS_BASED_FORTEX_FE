import dayjs, { type Dayjs } from 'dayjs'
import { computed, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { getApiErrorMessage } from '@/composables/useAxiosService'
import { resolveRouteEldScheduleTimeZone } from '@/utils/routeEldTimeZone'
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
import type { DragColumnType } from './useDragDrop'

export { resolveRouteEldScheduleTimeZone } from '@/utils/routeEldTimeZone'

export interface BoostUiEventRow {
  eventId: string
  sequenceId: string
  driverFullName: string
  ownerDriverId?: string
  startTime: string
  duration: number | null
  eventType: number
  eventCode: number
  eventName?: string
  isFrozen?: boolean
  freezeSource?: string | null
  calculatedLocation?: string
  manualLocation?: string
  positioning?: string | null
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
  DS_PC: [3, 1],
  DS_YM: [3, 2],
  ILC: [2, 1],
  INTERMEDIATE_CLP: [2, 1],
  LOG_NORMAL_PRECISION: [2, 1],
  ILR: [2, 2],
  INTERMEDIATE_RLP: [2, 2],
  LOG_REDUCED_PRECISION: [2, 2],
  DR_IND_PC: [3, 1],
  DR_IND_YM: [3, 2],
  LOGIN: [5, 1],
  LOGOUT: [5, 2],
  DR_LOGIN: [5, 1],
  DR_LOGOUT: [5, 2],
  EPU1: [6, 1],
  ENGINE_POWER_UP_CLP: [6, 1],
  ENG_UP_NORMAL: [6, 1],
  EPU2: [6, 2],
  ENGINE_POWER_UP_RLP: [6, 2],
  ENG_UP_REDUCED: [6, 2],
  ESD1: [6, 3],
  ENGINE_SHUT_DOWN_CLP: [6, 3],
  ENG_DOWN_NORMAL: [6, 3],
  ESD2: [6, 4],
  ENGINE_SHUT_DOWN_RLP: [6, 4],
  ENG_DOWN_REDUCED: [6, 4],
  MALF_LOGGED: [7, 1],
  MALF_CLEARED: [7, 2],
  DIAG_LOGGED: [7, 3],
  DIAG_CLEARED: [7, 4],
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
  '7:1': 'MALF_LOGGED',
  '7:2': 'MALF_CLEARED',
  '7:3': 'DIAG_LOGGED',
  '7:4': 'DIAG_CLEARED',
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

function editableOrigin(value?: string | null) {
  const normalized = String(value || '').toUpperCase()
  if (normalized === 'ELD') return 1
  if (normalized === 'DRIVER') return 2
  if (normalized === 'OTHER_USER') return 3
  if (normalized === 'UNIDENTIFIED_DRIVER') return 4
  return null
}

function normalizedStatus(value?: string | null) {
  return String(value || 'ACTIVE')
    .trim()
    .toUpperCase()
}

function displayStatus(value?: string | null) {
  const status = normalizedStatus(value)
  return status === 'NONE' || status === 'UNKNOWN' || status === '' ? 'ACTIVE' : status
}

function asStatus(value?: string | null) {
  return displayStatus(value) === 'ACTIVE' ? 1 : 2
}

function numericEvent(event: RouteEldHosEvent): [number, number] {
  const certification = /^(?:DR_)?CERT_?(\d+)$/i.exec(event.eventCode)
  if (certification) return [4, Math.min(9, Number(certification[1]) || 1)]
  const mapped = EVENT_CODE_TO_NUMERIC[event.eventCode]
  if (mapped) return mapped
  const dutyCode = CATEGORY_TO_CODE[event.eventCategory]
  return dutyCode ? [1, dutyCode] : [0, 0]
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
  const store = useBoostWorkspaceStore()
  const chartStore = useChartStore()
  const {
    sessions,
    session,
    selectedDriverId,
    workspace,
    profileForms,
    schedule,
    responsibleUsers,
    coDrivers,
    activeTabId,
    isLoading,
    isMutating,
  } = storeToRefs(store)

  const driverId = computed(() => String(route.params.id || ''))
  const activeDriverId = computed(() => selectedDriverId.value || session.value?.driverId || '')
  const activeCalculations = computed(() =>
    workspace.value?.calculationsByDriver?.[activeDriverId.value] ??
    (activeDriverId.value === session.value?.driverId ? workspace.value?.calculations : undefined)
  )

  const screenResolution = ref(Math.max(900, document.documentElement.clientWidth - 90))
  const selectedEventId = ref('')
  const selectedRowIds = ref<string[]>([])
  const showCoDrivers = ref(false)
  watch(() => session.value?.id, () => {
    selectedDriverId.value = ''
    showCoDrivers.value = false
  })
  
  const coDriverRenderEnabled = computed(() => showCoDrivers.value && Boolean(session.value?.coDriverId))
  const dragDropEnabled = ref(false)
  const boostModalOpen = ref(false)
  const reassignModalOpen = ref(false)
  const multiUpdateModalOpen = ref(false)
  const showEditEventModal = ref(false)
  const showEditDailyFormModal = ref(false)
  const isActionLoading = ref(false)
  const deleteProgressOpen = ref(false)
  const deletingSelectedEvents = ref(false)
  const deleteProgress = ref({ total: 0, completed: 0, deleted: 0, skipped: 0, failed: 0 })
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
    [...(workspace.value?.events ?? [])]
      .filter((item) => (item.ownerDriverId || session.value?.driverId) === activeDriverId.value)
      .sort((a, b) => a.event.timestamp - b.event.timestamp)
  )
  const otherWorkspaceEvents = computed(() =>
    [...(workspace.value?.events ?? [])]
      .filter((item) => !item.isDeleted && (item.ownerDriverId || session.value?.driverId) !== activeDriverId.value)
      .sort((a, b) => a.event.timestamp - b.event.timestamp)
  )
  const latestPeriodCoDriver = computed(() => {
    if (!session.value?.coDriverId) return null
    return { id: session.value.coDriverId, name: session.value.coDriverName || 'Co-driver' }
  })
  const coDriverGraphEvents = computed(() =>
    otherWorkspaceEvents.value.map((item) => item.event)
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
    for (const issue of activeCalculations.value?.eventIssues ?? []) {
      const value = result.get(issue.eventId) ?? { errors: [], warnings: [] }
      if (String(issue.severity).toUpperCase() === 'ERROR') value.errors.push(issue.title)
      else value.warnings.push(issue.title)
      result.set(issue.eventId, value)
    }
    return result
  })

  const deliveryStatusFor = (workspaceEvent: RouteEldWorkspaceEvent): BoostUiEventRow['deliveryStatus'] => {
    const tabKind = store.activeTab?.kind
    if (!workspaceEvent.historyId || !['FINAL', 'ROLLBACK'].includes(tabKind ?? ''))
      return undefined
    if (tabKind === 'ROLLBACK')
      return workspaceEvent.isRolledBack
        ? 'ROLLED_BACK'
        : workspaceEvent.isSubmitted ? 'ROLLBACK_PENDING' : 'NOT_SUBMITTED'
    return workspaceEvent.isSubmitted ? 'SUBMITTED' : 'SUBMISSION_PENDING'
  }

  const eventRows = computed<BoostUiEventRow[]>(() =>
    rawEvents.value.map((workspaceEvent, index) => {
      const event = workspaceEvent.event
      const [eventType, eventCode] = numericEvent(event)
      const issues = issueMap.value.get(event.id)
      return {
        eventId: event.id,
        sequenceId: sequenceIdHexToDecimal(event.sequenceId),
        driverFullName: activeDriverId.value === session.value?.driverId
          ? session.value?.driverName ?? ''
          : session.value?.coDriverName ?? 'Co-driver',
        ownerDriverId: activeDriverId.value,
        startTime: asDateTime(event.timestamp, event.timeZone),
        duration:
          graphEventDurationById.value.get(event.id) == null
            ? null
            : Math.floor(graphEventDurationById.value.get(event.id)! / 1000),
        eventType,
        eventCode,
        eventName: event.eventName,
        isFrozen: event.isFrozen,
        freezeSource: event.freezeSource,
        calculatedLocation: event.location || undefined,
        manualLocation: event.driverLocationDescription || undefined,
        positioning: event.positioning,
        locationOrigin: event.driverLocationDescription ? 2 : 1,
        latitude: event.latitude,
        longitude: event.longitude,
        eventRecordOrigin: asOrigin(event.recordOrigin),
        vehicleMiles: event.odometerMiles ?? undefined,
        engineHours: event.engineHours ?? undefined,
        annotation: event.notes ?? undefined,
        eventRecordStatus: displayStatus(event.recordStatus),
        trailerNumber: workspaceEvent.trailers.join(', ') || undefined,
        shippingDocument: workspaceEvent.documents.join(', ') || undefined,
        actionState: workspaceEvent.isDeleted
          ? 4
          : event.isFrozen || !workspace.value?.canEdit || (session.value && !isRouteEldEventWithinSession(event, session.value))
            ? 8
            : 1,
        changeStatus: workspaceEvent.changeStatus,
        historyId: workspaceEvent.historyId,
        deliveryStatus: deliveryStatusFor(workspaceEvent),
        errorTitles: issues?.errors ?? [],
        warningTitles: issues?.warnings ?? [],
      }
    })
  )

  const coDriverRows = computed<BoostUiEventRow[]>(() =>
    otherWorkspaceEvents.value.map((workspaceEvent) => {
      const event = workspaceEvent.event
      const [eventType, eventCode] = numericEvent(event)
      return {
        eventId: event.id,
        sequenceId: sequenceIdHexToDecimal(event.sequenceId),
        driverFullName: workspaceEvent.ownerDriverId === session.value?.driverId
          ? session.value?.driverName ?? 'Driver'
          : session.value?.coDriverName ?? 'Co-driver',
        ownerDriverId: workspaceEvent.ownerDriverId || session.value?.driverId,
        startTime: asDateTime(event.timestamp, event.timeZone),
        duration: coDriverDurationById.value.has(event.id)
          ? Math.floor(coDriverDurationById.value.get(event.id)! / 1000)
          : null,
        eventType,
        eventCode,
        eventName: event.eventName,
        isFrozen: event.isFrozen,
        freezeSource: event.freezeSource,
        calculatedLocation: event.location || undefined,
        manualLocation: event.driverLocationDescription || undefined,
        positioning: event.positioning,
        locationOrigin: event.driverLocationDescription ? 2 : 1,
        latitude: event.latitude,
        longitude: event.longitude,
        eventRecordOrigin: asOrigin(event.recordOrigin),
        vehicleMiles: event.odometerMiles ?? undefined,
        engineHours: event.engineHours ?? undefined,
        annotation: event.notes ?? undefined,
        eventRecordStatus: displayStatus(event.recordStatus),
        trailerNumber: workspaceEvent.trailers.join(', ') || undefined,
        shippingDocument: workspaceEvent.documents.join(', ') || undefined,
        actionState: workspaceEvent.isDeleted ? 4 : 8,
        changeStatus: workspaceEvent.changeStatus,
        historyId: workspaceEvent.historyId,
        deliveryStatus: deliveryStatusFor(workspaceEvent),
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
        timestamp: rawEvents.value[index].event.timestamp,
      })),
      ...(session.value?.coDriverId ? coDriverRows.value : []).map((row, index) => ({
        row,
        date: normalizeDateKey(otherWorkspaceEvents.value[index].event.logDate),
        timestamp: otherWorkspaceEvents.value[index].event.timestamp,
      })),
    ].sort((a, b) => a.timestamp - b.timestamp || a.row.eventId.localeCompare(b.row.eventId))
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
      const form = profileForms.value.find((item) => normalizeDateKey(item.logDate) === date &&
        (item.ownerDriverId || session.value?.driverId) === activeDriverId.value)
      const dailyLog = activeDriverId.value === session.value?.driverId
        ? schedule.value?.dailyLogs.find((item) => normalizeDateKey(item.logDate) === date)
        : undefined
      return {
        date,
        events: values.map((value) => value.row),
        dailyForm:
          form || dailyLog
            ? {
                id: form?.logDate ?? dailyLog!.logDate,
                formDate: form?.logDate ?? dailyLog!.logDate,
                trailers: form ? form.trailers : (dailyLog?.trailers ?? []),
                shippingDocuments: form ? form.shippingDocuments : (dailyLog?.shippingDocuments ?? []),
                coDriver: form ? (form.coDriverName ?? null) : (dailyLog?.coDriverName ?? null),
                isCertified: form
                  ? Boolean(form.signatureFileName || form.signatureUrl)
                  : Boolean(dailyLog?.signature),
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
    const hos = activeCalculations.value?.hos
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
    return (activeCalculations.value?.violations ?? []).map((violation) => ({
      position: ((violation.startedAt - from) / 86400000) * screenResolution.value,
      startedAt: asDateTime(violation.startedAt, workspaceTimeZone.value),
      description: violation.title,
    }))
  })

  const displayedFreeTimes = computed(() =>
    (activeCalculations.value?.freeTimes ?? []).filter(
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
    (activeCalculations.value?.violations ?? []).map((value) => ({
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
    const initialEventCode = sourceEventValue?.eventCode ?? 'DS_OFF'
    const statusless = /^(?:DR_)?CERT_?\d+$/i.test(initialEventCode) ||
      ['DR_LOGIN', 'DR_LOGOUT', 'LOGIN', 'LOGOUT'].includes(initialEventCode)
    const driverOrigin = /^(?:DR_)?CERT_?\d+$/i.test(initialEventCode) ||
      ['DS_OFF', 'DS_WT', 'DS_SB', 'DS_ON', 'DR_IND_PC', 'DR_IND_YM', 'DS_PC', 'DS_YM'].includes(initialEventCode)
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
      eventCodeId: initialEventCode,
      origin: driverOrigin ? 2 : EVENT_CODE_TO_NUMERIC[initialEventCode] ? 1 :
        sourceEventValue ? asOrigin(sourceEventValue.recordOrigin) : 2,
      recordStatus: statusless ? 'NONE' : 'ACTIVE',
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

  async function openEditEvent(eventId: string, includeOtherDriver = false) {
    const source = sourceEvent(eventId) ??
      (includeOtherDriver ? otherWorkspaceEvents.value.find((item) => item.event.id === eventId) : null)
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
      originalEventCode: event.eventCode,
      originalIsEditable: event.isEditable,
      origin: editableOrigin(event.recordOrigin),
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
    const localDateTime = localDate.format('YYYY-MM-DDTHH:mm:ss')
    const eventCode =
      form.eventCodeId ??
      NUMERIC_TO_EVENT_CODE[`${form.event.eventType}:${form.event.eventCode}`] ??
      event?.eventCode ??
      'DS_OFF'
    const requestedRecordOrigin =
      form.origin === 1
        ? 'ELD'
        : form.origin === 2
          ? 'DRIVER'
          : form.origin === 3
            ? 'OTHER_USER'
            : form.origin === 4
              ? 'UNIDENTIFIED_DRIVER'
              : (event?.recordOrigin ?? null)
    return {
      sequenceId: sequenceIdDecimalToHex(form.sequenceId),
      timestamp: event && localDateTime === zonedDateTime(event.timestamp, event.timeZone)
        ? event.timestamp
        : timestampFromRouteEldZonedLocal(localDateTime, event?.timeZone ?? workspaceTimeZone.value),
      logDate: form.startDate.replaceAll('-', '/'),
      eventCode,
      recordOrigin: /^DR_CERT_/i.test(eventCode)
        ? null
        : event && !event.isEditable && eventCode !== event.eventCode && form.origin === 1
          ? 'OTHER_USER'
          : requestedRecordOrigin,
      recordStatus: form.recordStatus,
      vehicleId: form.vehicleId,
      odometerMiles: form.odometer,
      engineHours: form.engineHours,
      eldId: form.eldId,
      positioning: form.positioning,
      driverLocationDescription: form.locationNote?.trim() || null,
      notes: form.notes?.trim() || null,
      latitude: form.latitude == null || form.latitude === '' ? null : Number(form.latitude),
      longitude: form.longitude == null || form.longitude === '' ? null : Number(form.longitude),
      location: form.location?.trim() || null,
      dateToCertify: /^DR_CERT_/.test(eventCode) && form.certifiedDate
        ? form.certifiedDate.replaceAll('-', '/')
        : null,
      trailers: form.trailer ? form.trailer.split(',').map((item) => item.trim()).filter(Boolean) : [],
      documents: form.doc ? form.doc.split(',').map((item) => item.trim()).filter(Boolean) : [],
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
          driverId: activeDriverId.value,
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
      (item) => normalizeDateKey(item.logDate) === normalizedDate &&
        (item.ownerDriverId || session.value?.driverId) === activeDriverId.value
    )
    const dailyLog = (activeDriverId.value === session.value?.driverId
      ? schedule.value?.dailyLogs
      : undefined)?.find(
      (item) => normalizeDateKey(item.logDate) === normalizedDate
    )
    Object.assign(editDailyForm, {
      date: form?.logDate ?? date,
      dailyFormId: form?.isModified ? form.logDate : null,
      coDriver: form ? (form.coDriverId ?? null) : (dailyLog?.coDriverId ?? null),
      coDriverName: form ? (form.coDriverName ?? null) : (dailyLog?.coDriverName ?? null),
      coDrivers: coDrivers.value.map((driver) => {
        const parts = driver.name.split(' ')
        return {
          driverId: driver.id,
          firstName: parts[0] ?? driver.name,
          lastName: parts.slice(1).join(' '),
        }
      }),
      trailer: (form ? form.trailers : dailyLog?.trailers)?.join(', ') ?? null,
      shippingDocs: (form ? form.shippingDocuments : dailyLog?.shippingDocuments)?.join(', ') ?? null,
      signature: signatureFileName(form ? form.signatureFileName : dailyLog?.signature),
      signaturePaths: form
        ? (form.signatureFileName ? [signatureFileName(form.signatureFileName)!] : [])
        : (dailyLog?.signature ? [signatureFileName(dailyLog.signature)!] : []),
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
      (item) => normalizeDateKey(item.logDate) === normalizeDateKey(form.date) &&
        (item.ownerDriverId || session.value?.driverId) === activeDriverId.value
    )
    isActionLoading.value = true
    try {
      await store.updateProfileForm({
        ownerDriverId: activeDriverId.value,
        logDate: form.date,
        coDriverId: form.coDriver,
        coDriverName:
          coDrivers.value.find((item) => item.id === form.coDriver)?.name ??
          form.coDriverName ??
          null,
        trailers: form.trailer
          ? form.trailer
              .split(',')
              .map((value) => value.trim())
              .filter(Boolean)
          : [],
        shippingDocuments: form.shippingDocs
          ? form.shippingDocs
              .split(',')
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

  async function selectTab(tab: TabResponse) {
    try {
      await store.selectTab(tab.id)
      selectedRowIds.value = []
      selectedEventId.value = ''
      await router.replace({ query: { ...route.query, tabId: tab.id } })
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to load tab')
    }
  }

  async function addNewTab() {
    try {
      const value = await store.createTab()
      if (value) {
        selectedRowIds.value = []
        selectedEventId.value = ''
        await router.replace({ query: { ...route.query, tabId: value.tabId } })
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to create tab')
    }
  }

  async function removeTab(tabId: string) {
    try {
      const value = await store.deleteTab(tabId)
      if (value) {
        selectedRowIds.value = []
        selectedEventId.value = ''
        await router.replace({ query: { ...route.query, tabId: value.tabId } })
      }
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
    const item = sourceEvent(eventId)
    if (!item || !session.value || !workspace.value?.canEdit) return false
    if (!isRouteEldEventWithinSession(item.event, session.value)) {
      toast.error('Events outside the session period cannot be deleted')
      return false
    }
    if (item.event.isFrozen) {
      toast.error('DOT-inspected events cannot be deleted')
      return false
    }
    try {
      await store.deleteEvent(eventId)
      selectedRowIds.value = selectedRowIds.value.filter((id) => id !== eventId)
      toast.success('Event deleted')
      return true
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to delete event')
      return false
    }
  }

  async function deleteSelectedBoostEvents() {
    if (deletingSelectedEvents.value || !selectedRowIds.value.length) return
    const eventIds = [...new Set(selectedRowIds.value)]
    const availableIds = eventIds.filter((id) => {
      const item = sourceEvent(id)
      return item && !item.isDeleted && !item.event.isFrozen && session.value &&
        isRouteEldEventWithinSession(item.event, session.value)
    })
    const skipped = eventIds.length - availableIds.length
    deleteProgress.value = { total: eventIds.length, completed: skipped, deleted: 0, skipped, failed: 0 }
    deleteProgressOpen.value = true
    if (!availableIds.length) {
      selectedRowIds.value = []
      toast.info(`${skipped} unavailable event${skipped === 1 ? ' was' : 's were'} skipped`)
      return
    }
    deletingSelectedEvents.value = true
    try {
      await store.deleteEvents(availableIds)
      deleteProgress.value = {
        total: eventIds.length, completed: eventIds.length,
        deleted: availableIds.length, skipped, failed: 0,
      }
      selectedRowIds.value = []
      toast.success(`${availableIds.length} event${availableIds.length === 1 ? '' : 's'} marked for deletion`)
      if (skipped) toast.info(`${skipped} unavailable event${skipped === 1 ? ' was' : 's were'} skipped`)
    } catch (error: any) {
      deleteProgress.value = {
        total: eventIds.length, completed: eventIds.length,
        deleted: 0, skipped, failed: availableIds.length,
      }
      selectedRowIds.value = availableIds
      toast.error(error?.response?.data?.message || error?.message || 'Failed to delete events')
    } finally {
      deletingSelectedEvents.value = false
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
    const item = sourceEvent(eventId)
    if (!item || !session.value || !workspace.value?.canEdit) return
    if (!isRouteEldEventWithinSession(item.event, session.value)) {
      toast.error('Events outside the session period cannot be reverted')
      return
    }
    if (item.event.isFrozen) {
      toast.error('DOT-inspected events cannot be changed')
      return
    }
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
      selectedRowIds.value = []
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
      selectedRowIds.value = []
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
    trailers: string[] | null
    documents: string[] | null
    deltaSeconds: number | null
    odometerMiles: number | null
    odometerOffset: boolean
  }) {
    if (isActionLoading.value) return
    isActionLoading.value = true
    try {
      const currentSession = session.value
      const selectedEvents = selectedRowIds.value.map((id) => sourceEvent(id)?.event)
      if (!currentSession || !selectedEvents.length || selectedEvents.some((event) => !event)) {
        throw new Error('The selected events are not available in the active tab.')
      }
      if (selectedEvents.some((event) => event!.isFrozen || !isRouteEldEventWithinSession(event!, currentSession))) {
        throw new Error('Frozen events and events outside the session period cannot be updated.')
      }
      if (payload.deltaSeconds != null && selectedEvents.some((event) =>
        !isRouteEldTimestampWithinSession(event!.timestamp + payload.deltaSeconds! * 1000, event!.timeZone, currentSession)
      )) {
        throw new Error('The adjusted event times must remain within the session period.')
      }
      await store.updateEvents({
        eventIds: selectedRowIds.value,
        trailers: payload.trailers,
        documents: payload.documents,
        deltaSeconds: payload.deltaSeconds,
        odometerMiles: payload.odometerMiles,
        odometerOffset: payload.odometerOffset,
      })
      multiUpdateModalOpen.value = false
      selectedRowIds.value = []
      toast.success('Events updated')
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to update events')
    } finally {
      isActionLoading.value = false
    }
  }

  async function dropProperty(
    column: DragColumnType,
    targetEventId: string,
    sourceEventId: string
  ) {
    const source = sourceEvent(sourceEventId)
    const target = sourceEvent(targetEventId)
    if (!source || !target || source.isDeleted || target.isDeleted || sourceEventId === targetEventId) return false
    try {
      if (!session.value || !isRouteEldEventWithinSession(target.event, session.value) || target.event.isFrozen) {
        throw new Error('Frozen events and events outside the session period cannot be updated.')
      }
      const sourceValue = source.event
      const targetValue = target.event
      const payload = currentEventPayload(target)
      if (column === 'location') {
        const manual = sourceValue.positioning === 'MANUAL' || Boolean(sourceValue.driverLocationDescription?.trim())
        if (manual) {
          const description = sourceValue.driverLocationDescription?.trim() || sourceValue.location?.trim() || null
          if (!description) return false
          if (targetValue.positioning === 'MANUAL' && targetValue.driverLocationDescription === description) return false
          payload.positioning = 'MANUAL'
          payload.driverLocationDescription = description
        } else {
          if (!sourceValue.location?.trim() && sourceValue.latitude == null && sourceValue.longitude == null) return false
          if (
            targetValue.positioning === 'AUTOMATIC' &&
            !targetValue.driverLocationDescription &&
            targetValue.latitude === sourceValue.latitude &&
            targetValue.longitude === sourceValue.longitude &&
            targetValue.location === sourceValue.location
          ) return false
          payload.positioning = 'AUTOMATIC'
          payload.driverLocationDescription = null
          payload.latitude = sourceValue.latitude
          payload.longitude = sourceValue.longitude
          payload.location = sourceValue.location
        }
      } else if (column === 'odometer') {
        if (sourceValue.odometerMiles == null || sourceValue.odometerMiles === targetValue.odometerMiles) return false
        payload.odometerMiles = sourceValue.odometerMiles
      } else if (column === 'engine_hours') {
        if (sourceValue.engineHours == null || sourceValue.engineHours === targetValue.engineHours) return false
        payload.engineHours = sourceValue.engineHours
      } else return false

      await store.updateEvent(targetEventId, payload)
      toast.success(`${column === 'location' ? 'Location' : column === 'odometer' ? 'Odometer' : 'Engine hours'} copied to the selected event`)
      return true
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to copy event value')
      return false
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
      dragDropEnabled.value = false
    },
    { immediate: true }
  )

  watch(activeTabId, () => {
    selectedRowIds.value = []
    selectedEventId.value = ''
    dragDropEnabled.value = false
  })

  return {
    selectedDriverId,
    activeDriverId,
    activeCalculations,
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
    deleteProgressOpen,
    deletingSelectedEvents,
    deleteProgress,
    boostModalOpen,
    reassignModalOpen,
    multiUpdateModalOpen,
    showEditEventModal,
    showEditDailyFormModal,
    editEventForm,
    editDailyForm,
    isGraphLoading: isLoading,
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
