import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import dayjs, { type Dayjs } from 'dayjs'
import { ApiEndpoints } from '@/api/endpoints'
import { useApi } from '@/composables/useAxiosService'
import { useTimeZoneHelper } from '@/composables/useTimezone'
import { add, compareDates, formatTime, subtract } from '@/utils/time'
import type {
  DailyTrackingResponse,
  EveryTrackingResponse,
  TrackingResponse,
} from '@/types/tracking'
import type {
  DailySummaryResponse,
  GraphDuties,
  GraphResponse,
  WeeklyViolationResponse,
} from '../types/chart'
import type { DriverDailyFormResponse } from '../types/driverDailyForm'
import type {
  RouteEldClock,
  RouteEldEvent,
  RouteEldLogDetail,
  RouteEldTrackingPoint,
} from '../types/routeEldDetail'

const validDate = /^\d{4}-\d{2}-\d{2}$/
const dutyCategories = new Set(['OFF', 'SB', 'D', 'ON'])

export function useRouteEldLogDetail() {
  const route = useRoute()
  const router = useRouter()
  const api = useApi()
  const timeZoneHelper = useTimeZoneHelper()
  const driverId = computed(() => String(route.params.id ?? ''))
  const headerDate = ref(resolveDate(route.query.date))
  const detail = ref<RouteEldLogDetail | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const selectedEventId = ref<string | null>(null)
  const selectedEvent = ref<TrackingResponse | null>(null)
  const trackingTooltips = ref<Record<string, boolean>>({})
  const trackingCollapse = ref(true)
  const signatureImageUrl = ref<string | null>(null)
  const screenResolution = ref(1440)
  let controller: AbortController | null = null

  const events = computed(() =>
    [...(detail.value?.events ?? [])].sort((first, second) => first.timestamp - second.timestamp)
  )
  const visualRange = computed(() =>
    dayRange(headerDate.value.format('YYYY-MM-DD'), detail.value?.timeZone)
  )
  const dayEvents = computed(() =>
    events.value.filter(
      (event) =>
        event.timestamp >= visualRange.value.start && event.timestamp < visualRange.value.end
    )
  )
  const graphSegments = computed(() =>
    buildDutySegments(detail.value, visualRange.value.start, visualRange.value.end)
  )
  const chartData = computed<GraphResponse | null>(() =>
    detail.value
      ? buildGraph(
          graphSegments.value,
          screenResolution.value,
          headerDate.value,
          visualRange.value.start
        )
      : null
  )
  const dailySummary = computed<DailySummaryResponse | null>(() => {
    if (!detail.value) return null
    const totals = { OFF: 0, SB: 0, D: 0, ON: 0 }
    graphSegments.value.forEach((segment) => {
      totals[segment.category] += Math.max(0, (segment.end - segment.start) / 1000)
    })
    return {
      summaryDate: headerDate.value.format('YYYY-MM-DD'),
      dailyOffDuty: totals.OFF,
      dailySleeperBerth: totals.SB,
      dailyDriving: totals.D,
      dailyOnDuty: totals.ON,
    }
  })
  const dailyTimeRemainder = computed(() => ({
    breakDuration: clockSeconds(detail.value?.hos?.break),
    drivingDuration: clockSeconds(detail.value?.hos?.drive),
    shiftDuration: clockSeconds(detail.value?.hos?.shift),
    cycleDuration: clockSeconds(detail.value?.hos?.cycle),
  }))
  const dailyEvents = computed(() =>
    dayEvents.value.map((event, index) =>
      mapEvent(event, dayEvents.value[index + 1], visualRange.value.end, detail.value?.timeZone)
    )
  )
  const driverDailyForm = computed<DriverDailyFormResponse | null>(() =>
    mapProfileForm(detail.value)
  )
  const driverInfo = computed(() => {
    const latestDuty = [...events.value]
      .reverse()
      .find((event) => event.recordStatus === 'ACTIVE' && dutyCategories.has(event.eventCategory))
    const mapped = latestDuty
      ? eventDefinition(latestDuty.eventCode, latestDuty.eventCategory)
      : null
    return {
      driverId: driverId.value,
      firstName: detail.value?.driverName ?? '',
      lastName: '',
      name: detail.value?.driverName || 'Unknown Driver',
      email: detail.value?.email || 'N/A',
      phone: detail.value?.phoneNumber || 'N/A',
      vehicleUnit: detail.value?.hos?.vehicleUnitId || 'N/A',
      connectionStatus: detail.value?.hos?.connectionStatus ?? 'NOT_CONNECTED',
      status: true,
      workedDurationInSeconds:
        (dailySummary.value?.dailyDriving ?? 0) + (dailySummary.value?.dailyOnDuty ?? 0),
      signaturePath: driverDailyForm.value?.signaturePath || undefined,
      hasViolation: (detail.value?.hos?.violationCount ?? 0) > 0,
      lastEventCode: mapped?.code ?? null,
      lastEventType: mapped?.type ?? null,
    }
  })
  const weeklyViolations = computed<WeeklyViolationResponse[]>(() =>
    Array.from({ length: 8 }, (_, index) => {
      const date = headerDate.value.subtract(7 - index, 'day')
      return {
        dateOfViolations: date.format('YYYY-MM-DD'),
        violations:
          index === 7 && (detail.value?.hos?.violationCount ?? 0) > 0
            ? [{ startedAt: date.format(), description: { shortName: 'HOS' } }]
            : [],
      }
    })
  )
  const everyTrackings = computed<EveryTrackingResponse[]>(() =>
    (detail.value?.trackingPoints ?? []).map((point) => ({
      driverId: driverId.value,
      vehicleId: detail.value?.hos?.vehicleUnitId ?? '',
      latitude: point.latitude,
      longitude: point.longitude,
      status: point.motionStatus === 'MOVING' ? 1 : 0,
      locationType: 1,
      currentTime: new Date(point.timestamp).toISOString(),
    }))
  )
  const dailyTrackings = computed<DailyTrackingResponse | null>(() => {
    if (!detail.value) return null
    return {
      driverId: driverId.value,
      firstName: detail.value.driverName,
      lastName: '',
      email: detail.value.email ?? '',
      phoneNumber: detail.value.phoneNumber ?? '',
      trackingEventResponse: trackingEvents(detail.value, visualRange.value.end),
    }
  })
  const mapCenter = computed(() => trackingCenter(detail.value?.trackingPoints ?? []))
  const zoomMap = computed(() => trackingZoom(detail.value?.trackingPoints ?? []))

  async function fetchDetail() {
    if (!driverId.value) return
    controller?.abort()
    const requestController = new AbortController()
    controller = requestController
    loading.value = true
    error.value = null
    selectedEventId.value = null
    selectedEvent.value = null
    try {
      const response = await api.get<{ successResult: RouteEldLogDetail }>(
        ApiEndpoints.ROUTE_ELD_LOG_DETAIL(driverId.value),
        {
          params: { date: headerDate.value.format('YYYY-MM-DD') },
          signal: requestController.signal,
        }
      )
      if (controller !== requestController) return
      detail.value = response.data?.successResult ?? null
      if (!detail.value) error.value = 'No Route ELD log data was returned for this driver.'
      trackingTooltips.value = Object.fromEntries(
        (dailyTrackings.value?.trackingEventResponse ?? []).map((event) => [event.eventId, false])
      )
    } catch (exception: any) {
      if (exception?.name === 'CanceledError' || exception?.name === 'AbortError') return
      if (controller !== requestController) return
      detail.value = null
      error.value =
        exception?.response?.data?.message ?? 'Route ELD log details could not be loaded.'
    } finally {
      if (controller === requestController) loading.value = false
    }
  }

  async function fetchSignature(fileName?: string | null) {
    if (signatureImageUrl.value) URL.revokeObjectURL(signatureImageUrl.value)
    signatureImageUrl.value = null
    if (!driverId.value || !fileName) return
    try {
      const response = await api.get<Blob>(
        ApiEndpoints.ROUTE_ELD_DRIVER_SIGNATURE(driverId.value, fileName),
        { responseType: 'blob', _skipErrorHandling: true }
      )
      signatureImageUrl.value = URL.createObjectURL(response.data)
    } catch {
      signatureImageUrl.value = null
    }
  }

  async function updateHeaderDate(date?: Dayjs) {
    if (!date) return
    const value = date.format('YYYY-MM-DD')
    headerDate.value = dayjs(value).startOf('day')
    await router.replace({ query: { ...route.query, date: value } })
  }

  async function fetchWeeklyViolations(_startDate?: string, _endDate?: string) {
    return Promise.resolve()
  }

  function getChartWidth(width: number) {
    if (width > 0 && screenResolution.value <= 0) screenResolution.value = 1440
  }

  function getSelectedEvent(event: any) {
    const eventId = event?.eventId || event?.id || null
    selectedEventId.value = selectedEventId.value === eventId ? null : eventId
  }

  function selectEvent(event: TrackingResponse) {
    selectedEvent.value = selectedEvent.value?.eventId === event.eventId ? null : event
    Object.keys(trackingTooltips.value).forEach((key) => {
      trackingTooltips.value[key] = selectedEvent.value?.eventId === key
    })
  }

  function toggleTrackingCollapse() {
    trackingCollapse.value = !trackingCollapse.value
  }

  watch(
    () => route.query.date,
    (value) => {
      const next = resolveDate(value)
      if (next.format('YYYY-MM-DD') !== headerDate.value.format('YYYY-MM-DD'))
        headerDate.value = next
    }
  )
  watch([driverId, () => headerDate.value.format('YYYY-MM-DD')], fetchDetail, { immediate: true })
  watch(
    () => detail.value?.profileForm?.signature,
    (value) => void fetchSignature(value),
    { immediate: true }
  )
  onBeforeUnmount(() => {
    controller?.abort()
    if (signatureImageUrl.value) URL.revokeObjectURL(signatureImageUrl.value)
  })

  return {
    providerReadOnly: true,
    detail,
    error,
    chartData,
    dailySummary,
    dailyPixelViolations: computed(() => []),
    weeklyViolations,
    dailyTimeRemainder,
    dailyEvents,
    displayEvents: dailyEvents,
    selectedEventId,
    driverInfo,
    driverDailyForm,
    signatureImageUrl,
    isGraphLoading: loading,
    isDailyEventsLoading: loading,
    headerDate,
    editChartData: computed(() => null),
    driverVehicles: computed(() => []),
    editLoading: computed(() => false),
    chartError: computed(() => ''),
    dailyTrackings,
    everyTrackings,
    selectedEvent,
    trackingTooltips,
    trackingCollapse,
    mapCenter,
    zoomMap,
    directionsSegments: computed(() => []),
    renderRouteOnMap: undefined,
    getChartWidth,
    getSelectedEvent,
    updateHeaderDate,
    fetchDetail,
    fetchWeeklyViolations,
    fetchDriverDailyForm: fetchDetail,
    selectEvent,
    toggleTrackingCollapse,
    formatTime,
    compareDates,
    add,
    subtract,
    ...timeZoneHelper,
  }
}

interface DutySegment {
  event: RouteEldEvent
  nextEvent: RouteEldEvent | null
  category: 'OFF' | 'SB' | 'D' | 'ON'
  order: number
  nextOrder: number
  start: number
  end: number
}

function buildDutySegments(
  detail: RouteEldLogDetail | null,
  start: number,
  end: number
): DutySegment[] {
  if (!detail || end <= start) return []
  const dayEvents = detail.events
    .filter(
      (event) =>
        event.recordStatus === 'ACTIVE' &&
        dutyCategories.has(event.eventCategory) &&
        event.timestamp <= end
    )
    .sort((first, second) => first.timestamp - second.timestamp)
  const context =
    detail.previousEvent && dutyCategories.has(detail.previousEvent.eventCategory)
      ? detail.previousEvent
      : (dayEvents[0] ?? fallbackEvent(start, detail.timeZone))
  let current = context
  let cursor = start
  const segments: DutySegment[] = []

  for (const event of dayEvents) {
    if (event.timestamp <= start) {
      current = event
      continue
    }
    if (event.timestamp > cursor)
      segments.push(segment(current, event, cursor, Math.min(event.timestamp, end)))
    current = event
    cursor = Math.max(start, event.timestamp)
  }
  if (cursor < end) segments.push(segment(current, null, cursor, end))
  return segments.filter((value) => value.end > value.start)
}

function segment(
  event: RouteEldEvent,
  nextEvent: RouteEldEvent | null,
  start: number,
  end: number
): DutySegment {
  const definition = eventDefinition(event.eventCode, event.eventCategory)
  const nextDefinition = nextEvent
    ? eventDefinition(nextEvent.eventCode, nextEvent.eventCategory)
    : definition
  return {
    event,
    nextEvent,
    category: event.eventCategory as DutySegment['category'],
    order: definition?.order ?? 1,
    nextOrder: nextDefinition?.order ?? definition?.order ?? 1,
    start,
    end,
  }
}

function buildGraph(
  segments: DutySegment[],
  width: number,
  date: Dayjs,
  dayStart: number
): GraphResponse {
  const duties = { '1': [], '2': [], '3': [], '4': [], '5': [], '6': [] } as GraphResponse['duties']
  const verticalLines: GraphResponse['verticalLines'] = []
  const pixelsPerMillisecond = width / 86_400_000

  segments.forEach((value, index) => {
    const x1 = Math.max(0, (value.start - dayStart) * pixelsPerMillisecond)
    const x2 = Math.min(width, (value.end - dayStart) * pixelsPerMillisecond)
    const distance = Math.max(
      0,
      (value.nextEvent?.odometerMiles ?? value.event.odometerMiles ?? 0) -
        (value.event.odometerMiles ?? 0)
    )
    const duration = Math.max(0, (value.end - value.start) / 1000)
    const item: GraphDuties = {
      x1,
      x2,
      y1: 0,
      y2: 0,
      eventCode:
        eventDefinition(value.event.eventCode, value.event.eventCategory)?.code ?? value.order,
      eventType: eventDefinition(value.event.eventCode, value.event.eventCategory)?.type ?? 1,
      eventTime: timestampInZone(value.start, value.event.timeZone),
      duration,
      eventId: value.event.id,
      eventOrders: [value.order, value.nextOrder],
      recordStatus: recordStatus(value.event.recordStatus),
      recordOrigin: recordOrigin(value.event.recordOrigin),
      distanceMiles: distance,
      speedMph: duration > 0 ? distance / (duration / 3600) : 0,
    }
    duties[String(value.order) as keyof GraphResponse['duties']].push(item)
    const next = segments[index + 1]
    if (next && next.order !== value.order)
      verticalLines.push({ x1: x2, x2, y1: 0, y2: 0, eventOrders: [value.order, next.order] })
  })

  return {
    duties,
    verticalLines,
    days: 1,
    svgWidth: width,
    svgViewBox: width,
    dayNames: [date.format('MMM D')],
    dates: [date.format('YYYY-MM-DD')],
  }
}

function mapEvent(
  event: RouteEldEvent,
  next: RouteEldEvent | undefined,
  end: number,
  zone?: string | null
) {
  const definition = eventDefinition(event.eventCode, event.eventCategory)
  const duration = Math.max(0, (Math.min(next?.timestamp ?? end, end) - event.timestamp) / 1000)
  return {
    id: event.id,
    eventId: event.id,
    sequenceId: event.sequenceId,
    dateTime: timestampInZone(event.timestamp, event.timeZone || zone),
    eventType: definition?.type ?? 0,
    eventCode: definition?.code ?? 0,
    durationInSeconds: duration,
    calculatedLocation: event.location,
    manualLocation: event.driverLocationDescription,
    latitude: event.latitude,
    longitude: event.longitude,
    locationOrigin: event.positioning === 'AUTOMATIC' ? 1 : 2,
    totalVehicleMiles: event.odometerMiles,
    totalEngineHours: event.engineHours,
    recordOrigin: recordOrigin(event.recordOrigin),
    recordStatus: recordStatus(event.recordStatus),
    annotation: event.notes,
    vehicleUnit: event.vehicleName,
    vehicleVin: event.vehicleVin,
    eldSerialNumber: event.eldSerialNumber,
    eldMacAddress: event.eldMacAddress,
  }
}

function mapProfileForm(detail: RouteEldLogDetail | null): DriverDailyFormResponse | null {
  const profile = detail?.profileForm
  if (!detail || !profile) return null
  const driver = splitName(profile.driverName)
  const coDriver = profile.coDriverName ? splitName(profile.coDriverName) : null
  return {
    id: profile.id,
    driverId: detail.driverId,
    formDate: profile.logDate.replaceAll('/', '-'),
    certifiedDate: profile.logDate.replaceAll('/', '-'),
    driver: {
      id: detail.driverId,
      user: { firstName: driver.firstName, lastName: driver.lastName },
      mainOffice: profile.mainOffice ?? '',
    },
    carrier: {
      name: profile.companyName ?? detail.companyName,
      usdotNumber: profile.dotNumber ?? '',
    },
    coDriver: coDriver
      ? { id: profile.coDriverEmail ?? profile.coDriverName ?? '', user: coDriver }
      : undefined,
    trailers: profile.trailers,
    shippingDocuments: profile.shippingDocuments,
    signaturePath: signatureSource(profile.signature),
    signaturePaths: [],
    assignedVehicles: [],
  }
}

function trackingEvents(detail: RouteEldLogDetail, end: number): TrackingResponse[] {
  const located = detail.events
    .filter((event) => event.latitude != null && event.longitude != null)
    .sort((first, second) => first.timestamp - second.timestamp)
    .map((event, index, values) => {
      const definition = eventDefinition(event.eventCode, event.eventCategory)
      const eventEnd = Math.min(values[index + 1]?.timestamp ?? end, end)
      return {
        eventId: event.id,
        eventCode: definition?.code ?? 1,
        eventType: definition?.type ?? 1,
        calculatedLocation: event.location ?? '',
        manualLocation: event.driverLocationDescription ?? '',
        latitude: event.latitude!,
        longitude: event.longitude!,
        startTime: new Date(event.timestamp).toISOString(),
        endTime: new Date(eventEnd).toISOString(),
        duration: Math.max(0, (eventEnd - event.timestamp) / 1000),
        vehicleMiles: 0,
        vehicleSpeed: 0,
        vehicleUnit: event.vehicleName ?? '',
        annotation: event.notes ?? '',
      }
    })
  if (located.length) return located
  return trackingTransitions(detail.trackingPoints)
}

function trackingTransitions(points: RouteEldTrackingPoint[]): TrackingResponse[] {
  const transitions = points.filter(
    (point, index) => index === 0 || point.motionStatus !== points[index - 1].motionStatus
  )
  return transitions.map((point, index) => {
    const next = transitions[index + 1]
    const end = next?.timestamp ?? point.timestamp
    return {
      eventId: point.id,
      eventCode: point.motionStatus === 'MOVING' ? 3 : 1,
      eventType: 1,
      calculatedLocation: point.stateCode || 'Route ELD tracking point',
      manualLocation: '',
      latitude: point.latitude,
      longitude: point.longitude,
      startTime: new Date(point.timestamp).toISOString(),
      endTime: new Date(end).toISOString(),
      duration: Math.max(0, (end - point.timestamp) / 1000),
      vehicleMiles: Math.max(0, (next?.odometer ?? point.odometer ?? 0) - (point.odometer ?? 0)),
      vehicleSpeed: point.speed ?? 0,
      vehicleUnit: '',
      annotation: '',
    }
  })
}

function eventDefinition(code: string, category: string) {
  const values: Record<string, { type: number; code: number; order: number }> = {
    DS_OFF: { type: 1, code: 1, order: 1 },
    DS_WT: { type: 1, code: 1, order: 1 },
    DS_SB: { type: 1, code: 2, order: 2 },
    DS_D: { type: 1, code: 3, order: 3 },
    DS_ON: { type: 1, code: 4, order: 4 },
    DS_PC: { type: 3, code: 1, order: 6 },
    DR_IND_PC: { type: 3, code: 1, order: 6 },
    DS_YM: { type: 3, code: 2, order: 5 },
    DR_IND_YM: { type: 3, code: 2, order: 5 },
    ILC: { type: 2, code: 1, order: 3 },
    INTERMEDIATE_CLP: { type: 2, code: 1, order: 3 },
    LOG_NORMAL_PRECISION: { type: 2, code: 1, order: 3 },
    ILR: { type: 2, code: 2, order: 3 },
    INTERMEDIATE_RLP: { type: 2, code: 2, order: 3 },
    LOG_REDUCED_PRECISION: { type: 2, code: 2, order: 3 },
    LOGIN: { type: 5, code: 1, order: 1 },
    DR_LOGIN: { type: 5, code: 1, order: 1 },
    LOGOUT: { type: 5, code: 2, order: 1 },
    DR_LOGOUT: { type: 5, code: 2, order: 1 },
    EPU1: { type: 6, code: 1, order: 1 },
    ENGINE_POWER_UP_CLP: { type: 6, code: 1, order: 1 },
    ENG_UP_NORMAL: { type: 6, code: 1, order: 1 },
    EPU2: { type: 6, code: 2, order: 1 },
    ENGINE_POWER_UP_RLP: { type: 6, code: 2, order: 1 },
    ENG_UP_REDUCED: { type: 6, code: 2, order: 1 },
    ESD1: { type: 6, code: 3, order: 1 },
    ENGINE_SHUT_DOWN_CLP: { type: 6, code: 3, order: 1 },
    ENG_DOWN_NORMAL: { type: 6, code: 3, order: 1 },
    ESD2: { type: 6, code: 4, order: 1 },
    ENGINE_SHUT_DOWN_RLP: { type: 6, code: 4, order: 1 },
    ENG_DOWN_REDUCED: { type: 6, code: 4, order: 1 },
    MALF_LOGGED: { type: 7, code: 1, order: 1 },
    MALF_CLEARED: { type: 7, code: 2, order: 1 },
    DIAG_LOGGED: { type: 7, code: 3, order: 1 },
    DIAG_CLEARED: { type: 7, code: 4, order: 1 },
  }
  if (code.startsWith('CERT') || code.startsWith('DR_CERT_'))
    return { type: 4, code: Math.max(1, Number(code.match(/\d+/)?.[0] ?? 1)), order: 1 }
  return values[code] ?? values[`DS_${category}`] ?? null
}

function fallbackEvent(timestamp: number, timeZone?: string | null): RouteEldEvent {
  return {
    id: 'route-eld-day-start',
    sequenceId: null,
    eventCode: 'DS_OFF',
    eventName: 'Off Duty',
    eventCategory: 'OFF',
    timestamp,
    logDate: '',
    timeZone: timeZone ?? null,
    recordOrigin: null,
    recordStatus: 'ACTIVE',
    vehicleId: null,
    vehicleName: null,
    vehicleVin: null,
    latitude: null,
    longitude: null,
    location: null,
    odometerMiles: null,
    engineHours: null,
    notes: null,
    eldSerialNumber: null,
    eldMacAddress: null,
    positioning: null,
    driverLocationDescription: null,
    dateToCertify: null,
  }
}

function dayRange(date: string, code?: string | null) {
  const start = dayStartTimestamp(date, code)
  const next = new Date(`${date}T00:00:00Z`)
  next.setUTCDate(next.getUTCDate() + 1)
  const nextDate = next.toISOString().slice(0, 10)
  const dayEnd = dayStartTimestamp(nextDate, code)
  const now = Date.now()
  return { start, end: now > start && now < dayEnd ? now : dayEnd }
}

function dayStartTimestamp(date: string, code?: string | null) {
  const base = Date.parse(`${date}T00:00:00Z`)
  return base - zoneOffset(base, code)
}

function zoneOffset(timestamp: number, code?: string | null) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zoneName(code),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(timestamp)
  const part = (type: string) => Number(parts.find((item) => item.type === type)?.value ?? 0)
  return (
    Date.UTC(
      part('year'),
      part('month') - 1,
      part('day'),
      part('hour'),
      part('minute'),
      part('second')
    ) - timestamp
  )
}

function timestampInZone(timestamp: number, code?: string | null) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: zoneName(code),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(timestamp)
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '00'
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}:${part('second')}`
}

function zoneName(code?: string | null) {
  return (
    (
      {
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
      } as Record<string, string>
    )[code?.trim().toUpperCase() ?? ''] ?? 'America/Chicago'
  )
}

function resolveDate(value: unknown) {
  const candidate =
    typeof value === 'string' && validDate.test(value) ? value : localDate(new Date())
  return dayjs(candidate).startOf('day')
}

function localDate(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
}

function clockSeconds(clock?: RouteEldClock | null) {
  return Math.max(0, Math.floor((clock?.remainingMilliseconds ?? 0) / 1000))
}

function recordOrigin(value?: string | null) {
  const origin = value?.toUpperCase() ?? ''
  if (origin.includes('AUTO')) return 1
  if (origin.includes('OTHER') || origin.includes('EDIT')) return 3
  if (origin.includes('EXEMPT')) return 4
  return 2
}

function recordStatus(value?: string | null) {
  return value?.toUpperCase() === 'ACTIVE' ? 1 : 2
}

function splitName(value: string) {
  const parts = value.trim().split(/\s+/)
  return { firstName: parts.shift() ?? '', lastName: parts.join(' ') }
}

function signatureSource(value?: string | null) {
  const signature = value?.trim()
  if (!signature) return null
  if (
    signature.startsWith('data:') ||
    signature.startsWith('http://') ||
    signature.startsWith('https://')
  )
    return signature
  return `data:image/png;base64,${signature}`
}

function trackingCenter(points: RouteEldTrackingPoint[]) {
  if (!points.length) return { lat: 39.8283, lng: -98.5795 }
  return {
    lat: points.reduce((sum, point) => sum + point.latitude, 0) / points.length,
    lng: points.reduce((sum, point) => sum + point.longitude, 0) / points.length,
  }
}

function trackingZoom(points: RouteEldTrackingPoint[]) {
  if (!points.length) return 4
  if (points.length === 1) return 15
  const latitudeRange =
    Math.max(...points.map((point) => point.latitude)) -
    Math.min(...points.map((point) => point.latitude))
  const longitudeRange =
    Math.max(...points.map((point) => point.longitude)) -
    Math.min(...points.map((point) => point.longitude))
  const range = Math.max(latitudeRange, longitudeRange)
  if (range > 10) return 5
  if (range > 5) return 7
  if (range > 2) return 9
  if (range > 1) return 10
  if (range > 0.5) return 11
  if (range > 0.1) return 13
  return 15
}
