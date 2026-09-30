import dayjs, { type Dayjs } from 'dayjs'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { useApi } from '@/composables/useAxiosService.ts'
import { useTimeZoneHelper } from '@/composables/useTimezone.ts'
import { ApiEndpoints } from '@/api/endpoints.ts'
import { capitalizeKeys } from '@/utils/object.ts'
import { TabTypes } from '../constants.ts'
import { useBoostSessionsStore } from '../store/boostSessions.ts'
import { useBoostTabsStore } from '../store/boostTabs.ts'
import { useBoostEventsStore } from '../store/boostEvents.ts'
import { useBoostMetaStore } from '../store/boostMeta.ts'
import { useBoostOptimizeStore } from '../store/boostOptimize.ts'
import { useBoostDailyFormStore } from '../store/boostDailyForm.ts'
import type {
  DailySummaryResponse,
  GraphDuties,
} from '@/modules/ELD/LogsModule/[Id]/types/chart.ts'
import type {
  BoostEventResponse,
  BoostEventAddUpdateRequest,
  BoostEventStatusForm,
  BoostEventEditProfile,
  BoostEventsMultiUpdateRequest,
  DailyFormListResponse,
  SessionRequest,
  TabRequest,
  TabResponse,
} from '../types/boost.ts'
import type { DragColumnType, LocationTransfer } from './useDragDrop.ts'

interface DriverInfo {
  name?: string
  email?: string
  phone?: string
  vehicleUnit?: string
  currentEvent?: string
  hasViolation?: boolean
  isConnected?: boolean
  workedDurationInSeconds?: number
}

export interface BoostUiEventRow {
  eventId: string
  sequenceId: number
  driverFullName: string
  startTime: string
  duration: number
  eventType: number
  eventCode: number
  calculatedLocation?: string
  manualLocation?: string
  locationOrigin?: number | null
  latitude?: number | null
  longitude?: number | null
  eventRecordOrigin: number
  vehicleMiles?: number
  engineHours?: number
  annotation?: string
  eventRecordStatus: number
  trailerNumber?: string
  shippingDocument?: string
  actionState: number
  errorTitles?: string[]
  warningTitles?: string[]
}

export interface BoostUiEventGroup {
  date: string
  events: BoostUiEventRow[]
  dailyForm?: DailyFormListResponse | null
}

export const useBoost = () => {
  const route = useRoute()
  const router = useRouter()
  const api = useApi()
  const sessionsStore = useBoostSessionsStore()
  const tabsStore = useBoostTabsStore()
  const eventsStore = useBoostEventsStore()
  const metaStore = useBoostMetaStore()
  const optimizeStore = useBoostOptimizeStore()
  const dailyFormStore = useBoostDailyFormStore()

  const { acceptAsTimeZone, convertToTimeZone, getStartOf, getEndOf, formatToUTC } =
    useTimeZoneHelper()

  const driverId = computed(() => String(route.params.id || ''))

  const screenResolution = ref<number>(Math.max(320, document.documentElement.clientWidth))

  const headerDate = ref<[Dayjs, Dayjs]>([
    route.query.fromDate
      ? acceptAsTimeZone(String(route.query.fromDate))
      : convertToTimeZone(dayjs().subtract(9, 'day')),
    route.query.toDate ? acceptAsTimeZone(String(route.query.toDate)) : convertToTimeZone(dayjs()),
  ])

  const isDriverInfoLoading = ref(false)
  const driverInfo = ref<DriverInfo | null>(null)

  const isBoostLoading = computed(
    () => eventsStore.isBoostEventsLoading || eventsStore.isBoostGraphLoading
  )

  const selectedEventId = ref<string>('')
  const dragDropEnabled = ref(false)
  const boostModalOpen = ref(false)
  const isBoostSubmitting = ref(false)
  const reassignModalOpen = ref(false)
  const isReassigning = ref(false)
  const isBoostEventsSubmitted = ref(false)
  const isSubmitLoading = ref(false)

  const chartData = computed(() => eventsStore.boostGraph)
  const dailyPixelViolations = computed(() => metaStore.boostPixelViolations)
  const boostFreeTimes = computed(() => metaStore.boostFreeTimes)
  const dailyTimeRemainder = computed(() => metaStore.boostTimeRemainder)
  const violations = computed(() => metaStore.boostViolations)

  const dailySummary = computed<DailySummaryResponse | null>(() => {
    const dateKey = convertToTimeZone().format('YYYY-MM-DD')
    const fromMap = (metaStore.boostSummaries as any)?.[dateKey] as DailySummaryResponse | undefined
    return fromMap ?? null
  })

  const dailyEvents = computed<BoostUiEventGroup[]>(() => {
    const groups = eventsStore.boostEvents || []
    return (groups ?? []).map((group) => ({
      date: group.date,
      dailyForm: dailyFormStore.dailyFormsMap.get(dayjs(group.date).format('YYYY-MM-DD')) ?? null,
      events: (group.events ?? []).map((ev) => ({
        eventId: ev.id,
        sequenceId: ev.sequenceId,
        driverFullName: driverInfo.value?.name ?? '',
        startTime: ev.dateTime,
        duration: ev.durationInSeconds,
        eventType: ev.eventType,
        eventCode: ev.eventCode,
        calculatedLocation: ev.calculatedLocation,
        manualLocation: ev.manualLocation,
        eventRecordOrigin: ev.recordOrigin,
        vehicleMiles: ev.totalVehicleMiles,
        engineHours: ev.totalEngineHours,
        annotation: ev.annotation,
        eventRecordStatus: ev.recordStatus,
        locationOrigin: ev.locationOrigin ?? null,
        latitude: ev.latitude,
        longitude: ev.longitude,
        trailerNumber: ev.trailer ?? undefined,
        shippingDocument: ev.doc ?? undefined,
        actionState: ev.actionState,
        errorTitles: ev.errorTitles ?? (ev as any).ErrorTitles ?? [],
        warningTitles: ev.warningTitles ?? (ev as any).WarningTitles ?? [],
      })),
    }))
  })

  const selectedRowIds = ref<string[]>([])

  // ─── Edit Event ─────────────────────────────────────────────────────────────
  const showEditEventModal = ref(false)
  const isEditEventLoading = ref(false)

  const defaultEditForm = (): BoostEventStatusForm => ({
    id: 0,
    eventId: '',
    event: { eventCode: null, eventType: null },
    origin: null,
    vehicleId: null,
    vehicleUnit: null,
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

  const editEventForm = ref<BoostEventStatusForm>(defaultEditForm())

  function updateEditEventForm(updated: BoostEventStatusForm) {
    editEventForm.value = updated
  }

  function findEventInStore(eventId: string): BoostEventResponse | null {
    const allEvents = eventsStore.boostEvents?.flatMap((g) => g.events) ?? []
    return allEvents.find((e) => e.id === eventId) ?? null
  }

  async function openEditEvent(eventId: string) {
    isEditEventLoading.value = true
    showEditEventModal.value = true

    let ev: BoostEventResponse | null | undefined
    try {
      ev = await eventsStore.getBoostEvent(eventId)
    } catch {
      // GET failed — will try local store fallback below
    } finally {
      isEditEventLoading.value = false
    }

    // Fallback: find in local store (handles session-edited events where GET returns null)
    if (!ev) {
      const allEvents = eventsStore.boostEvents?.flatMap((g) => g.events) ?? []
      ev = allEvents.find((e) => e.id === eventId) ?? null
    }

    if (!ev) {
      toast.error('Failed to load event data')
      showEditEventModal.value = false
      return
    }

    const dt = acceptAsTimeZone(ev.dateTime)
    const certDt = ev.certifiedDate ? acceptAsTimeZone(ev.certifiedDate) : convertToTimeZone()

    editEventForm.value = {
      id: ev.sequenceId,
      eventId: ev.id,
      event: { eventCode: ev.eventCode, eventType: ev.eventType },
      origin: ev.recordOrigin,
      vehicleId: ev.driver?.vehicleId ?? null,
      vehicleUnit: ev.driver?.vehicleUnit ?? null,
      odometer: Math.round(ev.totalVehicleMiles),
      engineHours: ev.totalEngineHours,
      trailer: ev.trailer ?? null,
      doc: ev.doc ?? null,
      locationOrigin: ev.locationOrigin ?? null,
      latitude: ev.latitude ?? null,
      longitude: ev.longitude ?? null,
      location: ev.calculatedLocation ?? null,
      locationNote: ev.manualLocation ?? null,
      notes: ev.annotation ?? null,
      startDate: dt.format('YYYY-MM-DD'),
      time: { hours: dt.hour(), minutes: dt.minute(), seconds: dt.second() },
      certifiedDate: certDt.format('YYYY-MM-DD'),
      certifiedTime: { hours: certDt.hour(), minutes: certDt.minute(), seconds: certDt.second() },
    }
  }

  async function submitEditEvent(form: BoostEventStatusForm) {
    const tabId = tabsStore.selectedTab?.id
    const sessionId = sessionsStore.sessionId
    if (!tabId || !sessionId) return

    const { formatToUTC, acceptAsTimeZone } = useTimeZoneHelper()

    // merge date + time fields into ISO datetime
    const dateTimeStr = `${form.startDate}T${String(form.time.hours).padStart(2, '0')}:${String(form.time.minutes).padStart(2, '0')}:${String(form.time.seconds).padStart(2, '0')}`
    const certDateTimeStr = form.certifiedDate
      ? `${form.certifiedDate}T${String(form.certifiedTime.hours).padStart(2, '0')}:${String(form.certifiedTime.minutes).padStart(2, '0')}:${String(form.certifiedTime.seconds).padStart(2, '0')}`
      : null

    isEditEventLoading.value = true
    try {
      await eventsStore.updateBoostEvent(form.eventId, {
        tabId,
        sessionId,
        driverId: driverId.value,
        vehicleId: form.vehicleId ?? '',
        sequenceId: form.id,
        recordStatus: 1,
        recordOrigin: form.origin ?? 1,
        eventType: form.event.eventType ?? 1,
        eventCode: form.event.eventCode ?? 1,
        dateTime: formatToUTC(acceptAsTimeZone(dateTimeStr)),
        totalVehicleMiles: form.odometer ?? 0,
        totalEngineHours: form.engineHours ?? 0,
        locationOrigin: form.locationOrigin,
        latitude: typeof form.latitude === 'string' ? parseFloat(form.latitude) : form.latitude,
        longitude: typeof form.longitude === 'string' ? parseFloat(form.longitude) : form.longitude,
        calculatedLocation: form.location,
        manualLocation: form.locationNote,
        annotation: form.notes,
        trailer: form.trailer,
        doc: form.doc,
        certifiedDate: certDateTimeStr ? formatToUTC(acceptAsTimeZone(certDateTimeStr)) : null,
      })
      showEditEventModal.value = false
      await getBoostActions()
    } finally {
      isEditEventLoading.value = false
    }
  }
  // ─── Edit Daily Form ─────────────────────────────────────────────────────────
  const showEditDailyFormModal = ref(false)
  const isEditDailyFormLoading = ref(false)

  const defaultDailyForm = (): BoostEventEditProfile => ({
    date: dayjs().format('YYYY-MM-DD'),
    dailyFormId: null,
    coDriver: null,
    coDrivers: [],
    trailer: null,
    shippingDocs: null,
    signature: null,
    signaturePaths: [],
    assignedVehicleIds: [],
  })

  const editDailyForm = reactive<BoostEventEditProfile>(defaultDailyForm())

  function updateEditDailyForm(updated: BoostEventEditProfile) {
    Object.assign(editDailyForm, updated)
  }

  async function openEditDailyForm(date: string) {
    const tabId = tabsStore.selectedTab?.id
    const sessionId = sessionsStore.sessionId
    if (!tabId || !sessionId) return

    const dateStr = getStartOf(acceptAsTimeZone(date)).format('YYYY-MM-DD')
    Object.assign(editDailyForm, defaultDailyForm())
    editDailyForm.date = dateStr

    await dailyFormStore.getEditDriverDailyForm({
      tabId,
      sessionId,
      dateTime: formatToUTC(acceptAsTimeZone(dateStr)),
    })

    const data = dailyFormStore.dailyFormByDate
    editDailyForm.coDrivers = data?.coDrivers ?? []
    editDailyForm.coDriver =
      data?.coDrivers?.find((d) => d.driverId === data?.driverDailyForm?.coDriver?.id)?.driverId ??
      null
    editDailyForm.trailer = data?.driverDailyForm?.trailers?.join(',') ?? null
    editDailyForm.shippingDocs = data?.driverDailyForm?.shippingDocuments?.join(',') ?? null
    editDailyForm.signature = data?.driverDailyForm?.signaturePath ?? data?.signaturePath ?? null
    editDailyForm.signaturePaths = data?.signaturePaths ?? []
    editDailyForm.dailyFormId = data?.driverDailyForm?.id ?? null
    editDailyForm.assignedVehicleIds =
      data?.driverDailyForm?.assignedVehicles?.map((v) => v.id) ?? []

    showEditDailyFormModal.value = true
  }

  async function submitDailyForm(form: BoostEventEditProfile) {
    const tabId = tabsStore.selectedTab?.id
    const sessionId = sessionsStore.sessionId
    if (!tabId || !sessionId) return

    isEditDailyFormLoading.value = true
    try {
      const model = {
        driverId: driverId.value,
        assignedVehicleIds: form.assignedVehicleIds,
        trailers: form.trailer
          ? form.trailer
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
        shippingDocuments: form.shippingDocs
          ? form.shippingDocs
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
        coDriverId: form.coDriver ?? null,
        formDate: formatToUTC(acceptAsTimeZone(form.date)),
        certifiedDate: formatToUTC(convertToTimeZone()),
        signaturePath: form.signature ?? null,
        tabId,
        sessionId,
      }

      if (!form.dailyFormId) {
        await dailyFormStore.addEditDriverDailyForm(model)
      } else {
        await dailyFormStore.updateEditDriverDailyForm(form.dailyFormId, model)
      }

      showEditDailyFormModal.value = false
      await getBoostActions()
    } finally {
      isEditDailyFormLoading.value = false
    }
  }

  async function revertDailyForm(form: BoostEventEditProfile) {
    const tabId = tabsStore.selectedTab?.id
    const sessionId = sessionsStore.sessionId
    if (!tabId || !sessionId || !form.dailyFormId) return

    isEditDailyFormLoading.value = true
    try {
      await dailyFormStore.revertEditDriverDailyForm({
        formId: form.dailyFormId,
        sessionId,
        tabId,
      })
      showEditDailyFormModal.value = false
      await getBoostActions()
    } finally {
      isEditDailyFormLoading.value = false
    }
  }
  // ─── DOT Inspection Alert ────────────────────────────────────────────────────
  const dotInspectionAlert = computed(() => {
    const all = (eventsStore.boostEvents ?? []).flatMap((g) => g.events ?? [])
    return all.some((ev: any) => ev.isDOTInspected || ev.IsDOTInspected)
  })

  const dotInspectionEventId = computed<string | null>(() => {
    const all = (eventsStore.boostEvents ?? []).flatMap((g) => g.events ?? [])
    const found = all.find((ev: any) => ev.isDOTInspected || ev.IsDOTInspected) as any
    return found?.dotInspectionId ?? found?.DotInspectionId ?? null
  })

  const showDotInspectionDetails = ref(false)
  const dotInspectionData = ref<any | null>(null)
  const isDotInspectionLoading = ref(false)

  async function fetchDotInspection() {
    const id = dotInspectionEventId.value
    if (!id) return
    isDotInspectionLoading.value = true
    try {
      const res = await api.get<{ successResult: any }>(ApiEndpoints.DOT_INSPECTION_BY_ID(id))
      dotInspectionData.value = res.data?.successResult ?? null
      showDotInspectionDetails.value = true
    } finally {
      isDotInspectionLoading.value = false
    }
  }
  // ─────────────────────────────────────────────────────────────────────────────

  // ─── Multi Update Events ─────────────────────────────────────────────────────
  const multiUpdateModalOpen = ref(false)
  const isMultiUpdateLoading = ref(false)

  const selectedEventsForUpdate = computed<BoostUiEventRow[]>(() => {
    if (!selectedRowIds.value.length) return []
    const ids = new Set(selectedRowIds.value)
    return dailyEvents.value.flatMap((g) => g.events).filter((e) => ids.has(e.eventId))
  })

  async function submitMultiUpdateEvents(payload: {
    trailer: string | null
    doc: string | null
    coDriverId: string | null
    shiftedTimes: number | null
  }) {
    const tabId = tabsStore.selectedTab?.id
    const sessionId = sessionsStore.sessionId
    if (!tabId || !sessionId) return
    if (!selectedRowIds.value.length) return

    isMultiUpdateLoading.value = true
    try {
      const model: BoostEventsMultiUpdateRequest = {
        eventIds: [...new Set(selectedRowIds.value)],
        trailer: payload.trailer,
        doc: payload.doc,
        coDriverId: payload.coDriverId,
        shiftedTimes: payload.shiftedTimes,
        sessionId,
        tabId,
      }
      await eventsStore.multiUpdateBoostEvents(model)
      toast.success('Events updated successfully')
      selectedRowIds.value = []
      multiUpdateModalOpen.value = false
      await getBoostActions()
    } catch (error) {
      console.error('Error updating events:', error)
      toast.error('Failed to update events')
    } finally {
      isMultiUpdateLoading.value = false
    }
  }
  // ─────────────────────────────────────────────────────────────────────────────

  const selectedMoveEventsCount = computed(() => {
    const tabId = tabsStore.selectedTab?.id
    if (!tabId) return 0
    return eventsStore.selectedMoveEvents?.[tabId]?.length ?? 0
  })

  const errorWarningRows = computed(() => {
    const all = (eventsStore.boostEvents ?? []).flatMap((g) => g.events ?? [])
    const filtered = all.filter((ev: any) => {
      const errors = ev.errorTitles ?? ev.ErrorTitles ?? []
      const warnings = ev.warningTitles ?? ev.WarningTitles ?? []
      return errors.length > 0 || warnings.length > 0
    })
    return filtered.map((ev: any, idx) => {
      const errors = ev.errorTitles ?? ev.ErrorTitles ?? []
      const warnings = ev.warningTitles ?? ev.WarningTitles ?? []
      return {
        id: ev.id ?? ev.Id,
        no: ev.sequenceId ?? ev.SequenceId ?? idx + 1,
        event:
          ev.eventTypeDescription ??
          ev.EventTypeDescription ??
          ev.eventCodeDescription ??
          ev.EventCodeDescription ??
          'Event',
        time: ev.dateTime ?? ev.DateTime,
        error: [...errors, ...warnings].join(' | '),
        badge: undefined,
      }
    })
  })

  const hasErrorWarning = computed(() => errorWarningRows.value.length > 0)

  const tabs = computed(() => tabsStore.tabs)
  const selectedTab = computed(() => tabsStore.selectedTab)

  async function selectTab(tab: TabResponse) {
    if (tabsStore.selectedTab?.id === tab.id) return
    if (tabsStore.currentAbortController) {
      tabsStore.currentAbortController.abort()
      tabsStore.currentAbortController = null
    }
    selectedRowIds.value = []
    tabsStore.selectedTab = tab
    await getBoostActions(tab.type)
  }

  async function removeTab(tabId: string) {
    const sessionId = sessionsStore.sessionId
    if (!sessionId) return
    await tabsStore.deleteTab(tabId)
    await tabsStore.getTabs(sessionId)
    const lastTab = tabsStore.tabs.at(-1) ?? null
    tabsStore.selectedTab = lastTab
    selectedRowIds.value = []
    if (lastTab) await getBoostActions(lastTab.type)
  }

  const getChartWidth = (width: number) => {
    // backend expects screenResolution for graph normalization
    screenResolution.value = Math.max(320, Math.floor(width || screenResolution.value))
  }

  const getSelectedEvent = (event: any) => {
    if (typeof event === 'string') {
      selectedEventId.value = event
      return
    }
    if (event?.eventId) selectedEventId.value = String(event.eventId)
    if (event?.id) selectedEventId.value = String(event.id)
  }

  const onSelectedMoveEvents = (events: GraphDuties[], durations: number[]) => {
    const tabId = tabsStore.selectedTab?.id
    if (!tabId) return
    eventsStore.selectedMoveEvents[tabId] = events
    eventsStore.selectedMoveEventsDurations = durations
  }

  async function submitMoveTimeBoost(payload: {
    hours: number
    minutes: number
    seconds: number
    reversed: boolean
  }) {
    const tabId = tabsStore.selectedTab?.id
    const sessionId = sessionsStore.sessionId
    if (!tabId || !sessionId) return

    const events = eventsStore.selectedMoveEvents?.[tabId] ?? []
    if (events.length < 2) return

    const totalSeconds =
      Math.max(0, payload.hours) * 3600 +
      Math.max(0, payload.minutes) * 60 +
      Math.max(0, payload.seconds)
    if (totalSeconds <= 0) return

    isBoostSubmitting.value = true
    try {
      await eventsStore.moveTimeBoostEvents({
        moveEventTimeType: 0,
        timeAmount: payload.reversed ? -totalSeconds : totalSeconds,
        eventIds: events.map((e) => e.eventId),
        sessionId,
        tabId,
        eventsDurations: eventsStore.selectedMoveEventsDurations ?? [],
      })

      // clear selections after move
      eventsStore.selectedMoveEvents[tabId] = []
      eventsStore.selectedMoveEventsDurations = []

      boostModalOpen.value = false
      await getBoostActions(3)
    } finally {
      isBoostSubmitting.value = false
    }
  }

  async function fetchDriverInfo() {
    try {
      isDriverInfoLoading.value = true
      const model = {
        driverId: driverId.value,
        dateTime: formatToUTC(convertToTimeZone()),
      }
      const response = await api.get<{ successResult: any }>(ApiEndpoints.DRIVER_INFOS, {
        params: capitalizeKeys(model),
      })
      const info = response.data?.successResult
      driverInfo.value = info
        ? {
            name: `${info.firstName || ''} ${info.lastName || ''}`.trim() || 'Unknown Driver',
            email: info.email || 'N/A',
            phone: info.phoneNumber || 'N/A',
            vehicleUnit: info.vehicleUnit || 'N/A',
            currentEvent: info.currentEvent,
            hasViolation: info.hasViolation || false,
            isConnected: info.isConnected !== undefined ? info.isConnected : true,
            workedDurationInSeconds: info.workedDurationInSeconds || 0,
          }
        : null
    } finally {
      isDriverInfoLoading.value = false
    }
  }

  async function getBoostActions(tabType?: number) {
    if (tabsStore.currentAbortController) {
      tabsStore.currentAbortController.abort()
    }
    tabsStore.currentAbortController = new AbortController()
    const signal = tabsStore.currentAbortController.signal

    const tabId = tabsStore.selectedTab?.id
    const sessionId = sessionsStore.sessionId

    if (!tabId || !sessionId) return

    await Promise.all([
      eventsStore.getHistoryBoostGraph(
        { tabId, sessionId, screenResolution: screenResolution.value },
        signal
      ),
      eventsStore.getHistoryBoostEvents({ tabId, sessionId }, signal),
      eventsStore.getHistoryBoostResetPinTimes(
        { tabId, sessionId, screenResolution: screenResolution.value },
        signal
      ),
      metaStore.getHistoryBoostSummaries({ tabId, sessionId }, signal),
      metaStore.getHistoryBoostViolations({ tabId, sessionId }, signal),
      metaStore.getBoostPixelViolations(
        { tabId, sessionId, screenResolution: screenResolution.value },
        signal
      ),
      metaStore.getHistoryBoostTimeRemainder({ tabId, sessionId }, signal),
      metaStore.getHistoryFreeTimes(
        { tabId, sessionId, screenResolution: screenResolution.value },
        signal
      ),
      dailyFormStore.getEditDriverDailyForms({ tabId, sessionId }, signal),
    ])

    // keep tab type synced (like RouteApp)
    if (
      typeof tabType === 'number' &&
      tabsStore.selectedTab &&
      tabsStore.selectedTab.type !== tabType
    ) {
      const m: TabRequest = {
        sessionId,
        name: TabTypes[tabType] ?? `Tab ${tabType}`,
        type: tabType,
      }
      await tabsStore.updateTab(tabsStore.selectedTab.id, m)
      await tabsStore.getTabs(sessionId)
      tabsStore.selectedTab = tabsStore.tabs.at(-1) ?? null
    }
  }

  async function loadBoostEvents(isSessionCreated = false) {
    metaStore.clearSelection()
    selectedRowIds.value = []

    if (!driverId.value) return

    if (!isSessionCreated) {
      const m: SessionRequest = {
        driverId: driverId.value,
        type: 1, // Boost
        startDate: formatToUTC(getStartOf(headerDate.value[0])),
        endDate: formatToUTC(getEndOf(headerDate.value[1])),
        status: 0,
      }
      await sessionsStore.addSession(m)
    }

    if (!sessionsStore.sessionId) return

    // Fetch full session to read isSubmitted state from backend
    await sessionsStore.getSession(sessionsStore.sessionId)
    isBoostEventsSubmitted.value = sessionsStore.session?.isSubmitted ?? false

    await tabsStore.getTabs(sessionsStore.sessionId)
    tabsStore.selectedTab = tabsStore.tabs.at(-1) ?? null

    await getBoostActions(!isSessionCreated ? 1 : tabsStore.selectedTab?.type)
  }

  async function submitBoostEvents() {
    if (!sessionsStore.sessionId) return

    isSubmitLoading.value = true
    try {
      if (isBoostEventsSubmitted.value) {
        // Rollback
        await eventsStore.rollbackBoostEvents(sessionsStore.sessionId)
        isBoostEventsSubmitted.value = false
      } else {
        // Confirm if DOT inspection is active
        if (dotInspectionAlert.value) {
          const ok = window.confirm('Are you sure you want to submit this DOT events?')
          if (!ok) return
        }
        await eventsStore.submitBoostEvents(sessionsStore.sessionId)
        isBoostEventsSubmitted.value = true
      }
      await loadBoostEvents(true)
    } catch {
      toast.error('Operation failed. Please try again.')
    } finally {
      isSubmitLoading.value = false
    }
  }

  async function copyBoostEvent(eventId: string) {
    const tabId = tabsStore.selectedTab?.id
    const sessionId = sessionsStore.sessionId
    if (!tabId || !sessionId) return
    await eventsStore.copyBoostEvent({ tabId, sessionId, eventId })
    await getBoostActions()
    toast.success('Event copied')
  }

  async function deleteBoostEvent(eventId: string) {
    const tabId = tabsStore.selectedTab?.id
    const sessionId = sessionsStore.sessionId
    if (!tabId || !sessionId) return
    await eventsStore.deleteBoostEvent({ tabId, sessionId, eventId })
    await getBoostActions()
  }

  async function dropProperty(
    column: DragColumnType,
    targetEventId: string,
    data: LocationTransfer | number | string | null
  ) {
    const tabId = tabsStore.selectedTab?.id
    const sessionId = sessionsStore.sessionId
    if (!tabId || !sessionId) return

    // Try local store first, fallback to API
    let ev: BoostEventResponse | null | undefined = findEventInStore(targetEventId)
    if (!ev) {
      try {
        ev = await eventsStore.getBoostEvent(targetEventId)
      } catch {
        return
      }
    }
    if (!ev || ev.actionState === 4 || ev.actionState === 8) return

    const model: BoostEventAddUpdateRequest = {
      tabId,
      sessionId,
      driverId: driverId.value,
      vehicleId: ev.driver?.vehicleId ?? '',
      sequenceId: ev.sequenceId,
      recordStatus: ev.recordStatus,
      recordOrigin: ev.recordOrigin,
      eventType: ev.eventType,
      eventCode: ev.eventCode,
      dateTime: formatToUTC(acceptAsTimeZone(ev.dateTime)),
      totalVehicleMiles: ev.totalVehicleMiles,
      totalEngineHours: ev.totalEngineHours,
      locationOrigin: ev.locationOrigin ?? null,
      latitude: ev.latitude,
      longitude: ev.longitude,
      calculatedLocation: ev.calculatedLocation ?? null,
      manualLocation: ev.manualLocation ?? null,
      annotation: ev.annotation ?? null,
      trailer: ev.trailer ?? null,
      doc: ev.doc ?? null,
      certifiedDate: ev.certifiedDate ? formatToUTC(acceptAsTimeZone(ev.certifiedDate)) : null,
    }

    if (column === 'location') {
      const loc = data as LocationTransfer
      model.locationOrigin = loc.locationOrigin ?? null
      model.latitude = loc.latitude ?? null
      model.longitude = loc.longitude ?? null
      model.calculatedLocation = loc.calculatedLocation ?? null
      model.manualLocation = loc.manualLocation ?? null
    } else if (column === 'odometer') {
      model.totalVehicleMiles = data as number
    } else if (column === 'engine_hours') {
      model.totalEngineHours = data as number
    } else if (column === 'trailer') {
      model.trailer = (data as string) || null
    } else if (column === 'doc') {
      model.doc = (data as string) || null
    }

    try {
      await eventsStore.updateBoostEvent(targetEventId, model)
      await getBoostActions()
    } catch {
      toast.error('Failed to update event')
    }
  }

  async function deleteSelectedBoostEvents() {
    const tabId = tabsStore.selectedTab?.id
    const sessionId = sessionsStore.sessionId
    if (!tabId || !sessionId) return
    if (selectedRowIds.value.length === 0) return
    await eventsStore.multiDeleteBoostEvents({
      tabId,
      sessionId,
      eventIds: [...new Set(selectedRowIds.value)],
    })
    selectedRowIds.value = []
    await getBoostActions()
  }

  async function submitReassignSelectedEvents(payload: {
    toDriverId: string
    actionType?: 'reassign' | 'replicate'
  }) {
    const tabId = tabsStore.selectedTab?.id
    const sessionId = sessionsStore.sessionId
    if (!tabId || !sessionId) return
    const toDriverId = payload.toDriverId?.trim()
    if (!toDriverId) return
    if (selectedRowIds.value.length === 0) return

    isReassigning.value = true
    try {
      const model = {
        tabId,
        sessionId,
        eventIds: [...new Set(selectedRowIds.value)],
        toDriverId,
      }

      if (payload.actionType === 'replicate') {
        await eventsStore.replicateBoostEvents(model)
      } else {
        await eventsStore.reassignBoostEvents(model)
      }

      selectedRowIds.value = []
      reassignModalOpen.value = false
      await getBoostActions(7)
    } finally {
      isReassigning.value = false
    }
  }

  async function optimizeSelectedCategories(selectedCategoryIds: string[]) {
    const tabId = tabsStore.selectedTab?.id
    const sessionId = sessionsStore.sessionId
    if (!tabId || !sessionId) return
    const cats = optimizeStore.optimizeCategories.filter((c) => selectedCategoryIds.includes(c.id))
    await optimizeStore.optimizeSelectedCategories({
      sessionId,
      tabId,
      eventCategoryInfos: cats,
    })
    await getBoostActions(4)
  }

  async function setTabType(tabType: number) {
    if (!tabsStore.selectedTab) return
    await getBoostActions(tabType)
  }

  async function addNewTab() {
    const sessionId = sessionsStore.sessionId
    if (!sessionId) return
    const created = await tabsStore.addTab({
      sessionId,
      name: TabTypes[1],
      type: 1,
    })
    await tabsStore.getTabs(sessionId)
    tabsStore.selectedTab = created
      ? (tabsStore.tabs.find((t) => t.id === created.id) ?? tabsStore.tabs.at(-1) ?? null)
      : (tabsStore.tabs.at(-1) ?? null)
    await getBoostActions(1)
  }

  onMounted(async () => {
    // URL da fromDate/toDate yo'q bo'lsa, initial qiymatlarni darhol yozib qo'yamiz
    if (!route.query.fromDate || !route.query.toDate) {
      await router.replace({
        query: {
          ...route.query,
          fromDate: getStartOf(headerDate.value[0]).format('YYYY-MM-DDTHH:mm:ss'),
          toDate: getEndOf(headerDate.value[1]).format('YYYY-MM-DDTHH:mm:ss'),
        },
      })
    }

    await optimizeStore.getOptimizeCategories()
    await fetchDriverInfo()

    if (route.query.sessionId) {
      const ok = await sessionsStore.getSession(String(route.query.sessionId))
      if (ok && sessionsStore.session) {
        headerDate.value = [
          acceptAsTimeZone(sessionsStore.session.startDate),
          acceptAsTimeZone(sessionsStore.session.endDate),
        ]
        await loadBoostEvents(true)
      } else {
        await loadBoostEvents(false)
      }
    } else {
      await loadBoostEvents(false)
    }

    // ─── Register URL sync watcher after init to avoid double-load ───────────
    watch(headerDate, async (newVal) => {
      const [from, to] = newVal
      await router.replace({
        query: {
          ...route.query,
          fromDate: getStartOf(from).format('YYYY-MM-DDTHH:mm:ss'),
          toDate: getEndOf(to).format('YYYY-MM-DDTHH:mm:ss'),
        },
      })
      await loadBoostEvents()
    })
  })

  return {
    driverId,
    headerDate,
    screenResolution,

    // state
    driverInfo,
    dailySummary,
    dailyTimeRemainder,
    chartData,
    dailyEvents,
    dailyPixelViolations,
    boostFreeTimes,
    violations,
    errorWarningRows,
    selectedEventId,
    selectedRowIds,
    selectedMoveEventsCount,
    dragDropEnabled,
    boostModalOpen,
    isBoostSubmitting,
    reassignModalOpen,
    isReassigning,
    isBoostEventsSubmitted,
    isSubmitLoading,

    // edit event
    showEditEventModal,
    isEditEventLoading,
    editEventForm,
    updateEditEventForm,
    openEditEvent,
    submitEditEvent,

    // edit daily form
    showEditDailyFormModal,
    isEditDailyFormLoading,
    editDailyForm,
    updateEditDailyForm,
    openEditDailyForm,
    submitDailyForm,
    revertDailyForm,

    // dot inspection
    dotInspectionAlert,
    dotInspectionData,
    showDotInspectionDetails,
    isDotInspectionLoading,
    fetchDotInspection,

    // multi-update
    multiUpdateModalOpen,
    isMultiUpdateLoading,
    selectedEventsForUpdate,
    submitMultiUpdateEvents,

    // loading
    isBoostLoading,
    isDriverInfoLoading,
    isGraphLoading: computed(() => eventsStore.isBoostGraphLoading),
    isDailyEventsLoading: computed(() => eventsStore.isBoostEventsLoading),

    // pin times (reset points) – used by CBoostGraph to compute violation block widths
    pinTimes: computed(() => eventsStore.pinTimes),

    // optimize
    optimizeCategories: computed(() => optimizeStore.optimizeCategories),

    // methods
    getChartWidth,
    getSelectedEvent,
    onSelectedMoveEvents,
    submitMoveTimeBoost,
    submitReassignSelectedEvents,
    loadBoostEvents,
    submitBoostEvents,
    copyBoostEvent,
    deleteBoostEvent,
    deleteSelectedBoostEvents,
    dropProperty,
    optimizeSelectedCategories,
    setTabType,
    addNewTab,

    // tabs
    tabs,
    selectedTab,
    hasErrorWarning,
    selectTab,
    removeTab,
  }
}
