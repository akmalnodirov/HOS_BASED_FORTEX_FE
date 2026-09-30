/**
 * Manages detailed driver log view with chart visualization, events, tracking, and editing.
 * Follows Single Responsibility: orchestrates sub-composables for specific features.
 */

import { ref, computed, reactive, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import dayjs, { type Dayjs } from 'dayjs'
import { toast } from 'vue-sonner'

// Helpers
import { useTimeZoneHelper } from '@/composables/useTimezone.ts'

// Stores
import { storeToRefs } from 'pinia'
import { useSidebarStore } from '@/modules/ELD/LogsModule/[Id]/store/sidebar.ts'
import { useChartStore } from '@/modules/ELD/LogsModule/[Id]/store/chart.ts'

// Composables
import { useDriverDailyForm } from './useDriverDailyForm.ts'
import { useTracking } from './useTracking.ts'
import { useHistory } from './useHistory.ts'

// Utils
import { formatTime, compareDates, add, subtract, convertToSeconds } from '@/utils/time.ts'
import { capitalizeKeys } from '@/utils/object.ts'
import { useApi } from '@/composables/useAxiosService.ts'
import { ApiEndpoints } from '@/api/endpoints.ts'

// Types
import type {
  DailySummaryResponse,
  ViolationPixelResponse,
  WeeklyViolationResponse,
  GraphResponse,
} from '@/modules/ELD/LogsModule/[Id]/types/chart.ts'

export function useELDLogDetail() {
  const route = useRoute()
  const router = useRouter()
  const api = useApi()

  // Helpers
  const { getStartOf, getEndOf, formatToUTC, convertToTimeZone, acceptAsTimeZone } =
    useTimeZoneHelper()

  // Stores
  const sidebarStore = useSidebarStore()
  const chartStore = useChartStore()
  const { sidebar } = storeToRefs(sidebarStore)
  const { chartData, isGraphLoading, screenResolution } = storeToRefs(chartStore)

  // Core state
  const driverId = (route.params.id as string) || ''
  const yesterday = dayjs().subtract(1, 'day').startOf('day')
  const rawHeaderDate = route.query?.date
    ? acceptAsTimeZone(route.query.date as string)
    : convertToTimeZone()
  const headerDate = ref<Dayjs>(
    rawHeaderDate.startOf('day').isAfter(yesterday) ? acceptAsTimeZone(yesterday) : rawHeaderDate
  )
  const isDailyEventsLoading = ref(false)
  const currentAbortController = ref<AbortController | null>(null)
  let cleanupSidebarListener: (() => void) | null = null

  // Data state
  const dailySummary = ref<DailySummaryResponse | null>(null)
  const dailyPixelViolations = ref<ViolationPixelResponse[][]>([])
  const weeklyViolations = ref<WeeklyViolationResponse[]>([])
  const dailyTimeRemainder = ref<{
    breakDuration: number
    drivingDuration: number
    shiftDuration: number
    cycleDuration: number
  } | null>(null)
  const dailyEvents = ref<any[]>([])
  const selectedEventId = ref<string | null>(null)
  const driverInfo = ref<any>(null)

  // Edit event state
  const editChartData = ref<GraphResponse | null>(null)
  const driverVehicles = ref<any[]>([])
  const editLoading = ref(false)
  const chartError = ref('')
  const editScreenResolution = ref(0)

  // Sub-composables
  const driverDailyFormComposable = useDriverDailyForm()
  const trackingComposable = useTracking()

  // History composable - initialized with required options
  const history = useHistory({
    driverId,
    getHeaderDate: () => headerDate.value,
    screenResolution: screenResolution.value,
    formatToUTC,
    getStartOf,
    getEndOf,
    acceptAsTimeZone,
    compareDates,
    onDataRefresh: async () => {
      await fetchAllData()
    },
  })

  // Default screen resolution for initial API calls
  const defaultScreenResolution =
    typeof window !== 'undefined' ? Math.max(320, document.documentElement.clientWidth - 320) : 1200

  // API Models
  const apiModels = reactive({
    modelChart: {
      startDate: formatToUTC(getStartOf(headerDate.value, true)),
      endDate: formatToUTC(getEndOf(headerDate.value, true)),
      driverId,
      screenResolution: defaultScreenResolution,
    },
    editModelChart: {
      startDate: formatToUTC(getStartOf(headerDate.value, true)),
      endDate: formatToUTC(getEndOf(headerDate.value, true)),
      driverId,
      screenResolution: defaultScreenResolution,
    },
    modelDailyEvents: {
      startDate: formatToUTC(getStartOf(headerDate.value, true)),
      endDate: formatToUTC(getEndOf(headerDate.value, true)),
      driverId,
    },
    modelWeeklyViolations: {
      startDate: formatToUTC(getStartOf(subtract(headerDate.value, 7, 'day'), true)),
      endDate: formatToUTC(getEndOf(headerDate.value, true)),
      driverId,
    },
  })

  // Computed: Display events based on history mode
  const displayEvents = computed(() => {
    // When in history mode, always return history events (even if empty)
    if (history.isActive.value) {
      return history.originalDailyEvents.value
    }
    return dailyEvents.value
  })

  // Update chart resolution without triggering a re-fetch (used by pages with
  // different container sizes before they call fetchChart themselves)
  function setChartResolution(width: number): void {
    screenResolution.value = width
    apiModels.modelChart.screenResolution = width
    previousChartWidth = width
  }

  // Controller management
  function cleanupController(): void {
    currentAbortController.value?.abort()
    currentAbortController.value = null
  }

  function createNewController(): AbortSignal {
    cleanupController()
    currentAbortController.value = new AbortController()
    return currentAbortController.value.signal
  }

  // Update API models when date changes
  function updateApiModels(date: Dayjs): void {
    apiModels.modelChart.startDate = formatToUTC(getStartOf(date, true))
    apiModels.modelChart.endDate = formatToUTC(getEndOf(date, true))
    apiModels.editModelChart.startDate = formatToUTC(getStartOf(date, true))
    apiModels.editModelChart.endDate = formatToUTC(getEndOf(date, true))
    apiModels.modelDailyEvents.startDate = formatToUTC(getStartOf(date, true))
    apiModels.modelDailyEvents.endDate = formatToUTC(getEndOf(date, true))
    apiModels.modelWeeklyViolations.startDate = formatToUTC(
      getStartOf(subtract(date, 7, 'day'), true)
    )
    apiModels.modelWeeklyViolations.endDate = formatToUTC(getEndOf(date, true))
  }

  // Data fetching functions
  async function fetchChart(isEdit = false, signal?: AbortSignal): Promise<void> {
    await chartStore.getChart(apiModels.modelChart, isEdit, signal)
  }

  async function fetchDailySummary(signal?: AbortSignal): Promise<void> {
    try {
      const response = await api.get<{ successResult: DailySummaryResponse }>(
        ApiEndpoints.DRIVER_LOGS_DAILY_SUMMARY,
        { params: capitalizeKeys(apiModels.modelDailyEvents), signal }
      )
      dailySummary.value = response.data?.successResult ?? null
    } catch (error) {
      console.error('Error fetching daily summary:', error)
    }
  }

  async function fetchDailyPixelViolations(signal?: AbortSignal): Promise<void> {
    try {
      const response = await api.get<{ successResult: ViolationPixelResponse[][] }>(
        ApiEndpoints.DRIVER_LOGS_DAILY_PIXEL_VIOLATIONS,
        { params: capitalizeKeys(apiModels.modelChart), signal }
      )
      dailyPixelViolations.value = response.data?.successResult ?? []
    } catch (error) {
      console.error('Error fetching daily pixel violations:', error)
    }
  }

  async function fetchWeeklyViolations(startDate?: string, endDate?: string): Promise<void> {
    try {
      const params = {
        startDate: startDate || apiModels.modelWeeklyViolations.startDate,
        endDate: endDate || apiModels.modelWeeklyViolations.endDate,
        driverId: apiModels.modelWeeklyViolations.driverId,
      }
      const response = await api.get<{ successResult: WeeklyViolationResponse[] }>(
        ApiEndpoints.DRIVER_LOGS_WEEKLY_VIOLATIONS,
        { params: capitalizeKeys(params) }
      )
      weeklyViolations.value = response.data?.successResult ?? []
    } catch (error) {
      console.error('Error fetching weekly violations:', error)
    }
  }

  async function fetchDailyTimeRemainder(signal?: AbortSignal): Promise<void> {
    try {
      const response = await api.get<{ successResult: typeof dailyTimeRemainder.value }>(
        ApiEndpoints.DRIVER_LOGS_DAILY_TIME_REMAINDER,
        { params: capitalizeKeys(apiModels.modelDailyEvents), signal }
      )
      dailyTimeRemainder.value = response.data?.successResult ?? null
    } catch (error) {
      console.error('Error fetching daily time remainder:', error)
      dailyTimeRemainder.value = null
    }
  }

  async function fetchDriverInfo(signal?: AbortSignal): Promise<void> {
    try {
      const model = { driverId, dateTime: formatToUTC(headerDate.value) }
      const response = await api.get<{ successResult: any }>(ApiEndpoints.DRIVER_INFOS, {
        params: capitalizeKeys(model),
        signal,
      })
      if (response.data?.successResult) {
        const info = response.data.successResult
        driverInfo.value = {
          driverId: info.driverId,
          firstName: info.firstName,
          lastName: info.lastName,
          name: `${info.firstName || ''} ${info.lastName || ''}`.trim() || 'Unknown Driver',
          email: info.email || 'N/A',
          phone: info.phoneNumber || 'N/A',
          vehicleUnit: info.vehicleUnit || 'N/A',
          isConnected: info.isConnected ?? true,
          status: info.status ?? true,
          workedDurationInSeconds: info.workedDurationInSeconds || 0,
          signaturePath: info.signaturePath || null,
          lastEventCode: info.lastEventCode ?? null,
          lastEventType: info.lastEventType ?? null,
        }
      }
    } catch (error) {
      console.error('Error fetching driver info:', error)
      driverInfo.value = null
    }
  }

  async function fetchDailyEvents(signal?: AbortSignal): Promise<void> {
    try {
      isDailyEventsLoading.value = true
      const response = await api.get<{ successResult: any[] }>(
        ApiEndpoints.DRIVER_LOGS_DAILY_EVENTS,
        { params: capitalizeKeys(apiModels.modelDailyEvents), signal }
      )
      dailyEvents.value = response.data?.successResult ?? []
    } catch (error) {
      console.error('Error fetching daily events:', error)
      dailyEvents.value = []
    } finally {
      isDailyEventsLoading.value = false
    }
  }

  async function fetchAllData(signal?: AbortSignal): Promise<void> {
    console.log('[fetchAllData] called - this fetches LOGS data')
    console.log('[fetchAllData] current tab:', route.query?.tab)
    await Promise.allSettled([
      fetchChart(false, signal),
      fetchDailySummary(signal),
      fetchDailyPixelViolations(signal),
      fetchDriverInfo(signal),
      fetchDailyTimeRemainder(signal),
      fetchDailyEvents(signal),
      fetchDriverVehicles(signal),
      driverDailyFormComposable.fetchDriverDailyForm(
        driverId,
        formatToUTC(headerDate.value),
        signal
      ),
      trackingComposable.fetchTrackings(
        {
          startDate: formatToUTC(getStartOf(headerDate.value, true)),
          endDate: formatToUTC(getEndOf(headerDate.value, true)),
          driverId,
        },
        signal
      ),
    ])
  }

  // Fetch driver vehicles
  async function fetchDriverVehicles(signal?: AbortSignal): Promise<void> {
    try {
      const response = await api.get<{ successResult: any }>(
        `${ApiEndpoints.DRIVERS}/${driverId}`,
        { signal }
      )
      driverVehicles.value = response.data?.successResult?.vehicles ?? []
    } catch (error) {
      console.error('Error fetching driver vehicles:', error)
      driverVehicles.value = []
    }
  }

  // Fetch edit chart data
  async function fetchEditChart(signal?: AbortSignal): Promise<void> {
    if (editScreenResolution.value <= 0) return

    try {
      apiModels.editModelChart.screenResolution = editScreenResolution.value
      const response = await api.get<{ successResult: GraphResponse }>(
        ApiEndpoints.DRIVER_LOGS_DAILY_GRAPH,
        { params: capitalizeKeys(apiModels.editModelChart), signal }
      )
      editChartData.value = response.data?.successResult ?? null
    } catch (error) {
      console.error('Error fetching edit chart:', error)
    }
  }

  // Handle chart edit width updates
  async function getChartEditWidth(width: number): Promise<void> {
    if (width > 0) {
      editScreenResolution.value = width
      apiModels.editModelChart.screenResolution = width
      await fetchEditChart()
    }
  }

  // Submit event status (edit or add)
  async function submitEventStatus(submitData: any): Promise<boolean> {
    editLoading.value = true
    chartError.value = ''

    try {
      const { eventStart, eventEnd, eventId, ...formData } = submitData

      // Calculate start and end times
      const startSeconds = convertToSeconds(
        `${eventStart.hours}:${eventStart.minutes}:${eventStart.seconds}`
      )
      const endSeconds = convertToSeconds(
        `${eventEnd.hours}:${eventEnd.minutes}:${eventEnd.seconds}`
      )

      const payload = {
        driverId,
        eventType: formData.eventType,
        eventCode: formData.eventCode,
        startTime: formatToUTC(getStartOf(headerDate.value, true).add(startSeconds, 'seconds')),
        endTime: formatToUTC(getStartOf(headerDate.value, true).add(endSeconds, 'seconds')),
        locationOrigin: formData.locationOrigin ?? null,
        latitude: formData.latitude ?? null,
        longitude: formData.longitude ?? null,
        calculatedLocation: formData.calculatedLocation || null,
        manualLocation: formData.manualLocation || null,
        annotation: formData.annotation || null,
        totalVehicleMiles: Math.round(formData.totalVehicleMiles ?? 0),
        totalEngineHours: formData.totalEngineHours ?? 0,
        trailer: formData.trailer ?? null,
        doc: formData.doc ?? null,
        vehicleId: formData.vehicleId || null,
      }

      if (eventId) {
        // Update existing event
        await api.put(ApiEndpoints.EVENT_BY_OTHERS_UPDATE(eventId), payload)
        toast.success('Event updated successfully')
      } else {
        // Add new event
        await api.post(ApiEndpoints.EVENT_BY_OTHERS_ADD, payload)
        toast.success('Event added successfully')
      }

      // Refresh data after successful save
      await fetchDailyEvents()
      await fetchChart()

      return true
    } catch (error: any) {
      console.error('Error submitting event:', error)
      chartError.value = error?.response?.data?.message || 'Failed to save event'
      toast.error(chartError.value)
      return false
    } finally {
      editLoading.value = false
    }
  }

  // Chart width handling
  let previousChartWidth = 0
  let widthChangeController: AbortController | null = null

  async function getChartWidth(width: number): Promise<void> {
    const widthDiff = Math.abs(width - previousChartWidth)

    if (widthDiff > 50 && previousChartWidth !== 0) {
      console.log(
        '[getChartWidth] Width changed significantly, fetching chart. History mode:',
        route.query?.tab === 'history'
      )

      // Don't fetch logs chart when in history mode
      if (route.query?.tab === 'history') {
        console.log('[getChartWidth] In history mode, skipping logs chart fetch')
        screenResolution.value = width
        apiModels.modelChart.screenResolution = width
        previousChartWidth = width
        return
      }

      screenResolution.value = width
      apiModels.modelChart.screenResolution = width
      previousChartWidth = width

      widthChangeController?.abort()
      widthChangeController = new AbortController()

      await Promise.allSettled([
        fetchChart(false, widthChangeController.signal),
        fetchDailyPixelViolations(widthChangeController.signal),
      ])
    } else {
      screenResolution.value = width
      apiModels.modelChart.screenResolution = width
      previousChartWidth = width
    }
  }

  function getSelectedEvent(event: any): void {
    if (!event) return

    // In history mode, search in history events; otherwise search in regular events
    const eventsToSearch = history.isActive.value
      ? history.originalDailyEvents.value
      : dailyEvents.value

    // Try to find match by eventId or id
    const eventIdFromEvent = event.eventId || event.id
    if (!eventIdFromEvent) return

    // Search for match - try multiple ways to find the event
    let match = eventsToSearch.find(
      (e: any) =>
        e.eventId === eventIdFromEvent ||
        e.id === eventIdFromEvent ||
        String(e.eventId) === String(eventIdFromEvent) ||
        String(e.id) === String(eventIdFromEvent)
    )

    // If not found by ID, try to find by eventTime (for first event or when IDs don't match)
    if (!match && event.eventTime) {
      const eventTime = typeof event.eventTime === 'string' ? event.eventTime : event.eventTime
      match = eventsToSearch.find((e: any) => {
        const eTime = e.eventTime || e.dateTime || e.startedAt || e.createdAt
        if (!eTime) return false
        // Compare times (allow small difference for precision)
        const timeDiff = Math.abs(new Date(eTime).getTime() - new Date(eventTime).getTime())
        return timeDiff < 1000 // Within 1 second
      })
    }

    const finalEventId = match?.id || match?.eventId || eventIdFromEvent
    selectedEventId.value = finalEventId

    // In history mode, also check the checkbox by adding to selectedRows
    // Single selection: clear previous selections and select only this event
    if (history.isActive.value) {
      if (match) {
        // Clear all previous selections and select only this event
        history.selectedRows.value = [match]
      } else if (event && eventIdFromEvent) {
        // If match not found but we have event data, use the event itself
        // This handles the case when events array is not yet loaded or structure differs
        const eventToSelect = {
          ...event,
          id: eventIdFromEvent,
          eventId: eventIdFromEvent,
        }
        history.selectedRows.value = [eventToSelect]
      }
    }
  }

  async function updateHeaderDate(date?: Dayjs): Promise<void> {
    if (!date) return
    headerDate.value = acceptAsTimeZone(date)
    await router.push({
      query: { ...route.query, date: date.format('YYYY-MM-DD') },
    })
  }

  // Handle history mode activation
  async function handleHistoryTab(tab: string | null, signal?: AbortSignal): Promise<void> {
    console.log('[handleHistoryTab] called with tab:', tab)

    if (tab === 'history') {
      console.log('[handleHistoryTab] Entering history mode')
      // Clear old data before loading history to avoid showing stale logs data
      chartData.value = null
      dailySummary.value = null

      await history.activate()
      console.log(
        '[handleHistoryTab] history.activate() completed, sessionId:',
        history.sessionId.value,
        'selectedTab:',
        history.selectedTab.value?.id
      )

      // Fetch history-specific data + driver info + stats for header
      const [historyChart, historySummary] = await Promise.all([
        history.fetchHistoryChart(screenResolution.value),
        history.fetchHistorySummary(),
        fetchDriverInfo(signal),
        fetchDailyTimeRemainder(signal),
      ])
      console.log('[handleHistoryTab] historyChart:', historyChart)
      console.log('[handleHistoryTab] historySummary:', historySummary)

      if (historyChart) {
        chartData.value = historyChart
        console.log('[handleHistoryTab] chartData set with history chart')
      } else {
        console.log('[handleHistoryTab] historyChart is null/undefined, chartData not updated')
      }
      if (historySummary) {
        dailySummary.value = historySummary
      }
      // Don't call fetchAllData - history data is already loaded via activate()
    } else {
      console.log('[handleHistoryTab] Exiting history mode, calling fetchAllData')
      history.deactivate()
      // Only fetch regular data when NOT in history mode
      await fetchAllData(signal)
    }
  }

  // Watchers
  watch(
    () => route.query.tab,
    async (newTab) => {
      const signal = createNewController()
      await handleHistoryTab(newTab as string, signal)
    },
    { immediate: true }
  )

  watch(headerDate, async (newValue) => {
    updateApiModels(newValue)

    // Stay in history mode - create new session with new date
    if (route.query?.tab === 'history') {
      // Clear old data before loading new history data
      chartData.value = null
      dailySummary.value = null

      await history.refreshWithNewDate(newValue)
      // Fetch history chart, summary, driver info and stats for new date
      const [historyChart, historySummary] = await Promise.all([
        history.fetchHistoryChart(screenResolution.value),
        history.fetchHistorySummary(),
        fetchDriverInfo(),
        fetchDailyTimeRemainder(),
      ])
      if (historyChart) {
        chartData.value = historyChart
      }
      if (historySummary) {
        dailySummary.value = historySummary
      }
      return
    }

    // Normal mode - fetch regular data
    const signal = createNewController()
    await fetchAllData(signal)
    await nextTick(() => trackingComposable.calculateMapCenter())
  })

  // Lifecycle
  onMounted(async () => {
    cleanupSidebarListener = sidebarStore.setupStorageListener()

    if (typeof window !== 'undefined') {
      const sidebarWidth = sidebar.value === 'open' ? 248 : 0
      screenResolution.value = document.documentElement.clientWidth - sidebarWidth - 72
      apiModels.modelChart.screenResolution = screenResolution.value
      previousChartWidth = screenResolution.value
    }

    // If route date was in the future or today, correct the URL to yesterday
    if (rawHeaderDate.startOf('day').isAfter(yesterday)) {
      await router.replace({
        query: { ...route.query, date: headerDate.value.format('YYYY-MM-DD') },
      })
    }

    // fetchWeeklyViolations still needs to be called on mount
    await fetchWeeklyViolations()
  })

  onUnmounted(() => {
    cleanupController()
    widthChangeController?.abort()
    cleanupSidebarListener?.()
  })

  return {
    // Core state
    chartData,
    dailySummary,
    dailyPixelViolations,
    weeklyViolations,
    dailyTimeRemainder,
    dailyEvents,
    displayEvents,
    selectedEventId,
    driverInfo,
    isGraphLoading,
    isDailyEventsLoading,
    headerDate,

    // Edit event state
    editChartData,
    driverVehicles,
    editLoading,
    chartError,

    // Core functions
    getChartWidth,
    setChartResolution,
    getSelectedEvent,
    updateHeaderDate,
    fetchChart,
    fetchDailySummary,
    fetchDailyPixelViolations,
    fetchWeeklyViolations,
    fetchDailyEvents,
    fetchDriverInfo,
    fetchDailyTimeRemainder,

    // Edit event functions
    getChartEditWidth,
    submitEventStatus,

    // Helpers
    acceptAsTimeZone,
    convertToTimeZone,
    compareDates,
    formatTime,
    formatToUTC,
    getStartOf,
    getEndOf,
    subtract,
    add,

    // Driver Daily Form (spread from composable)
    ...driverDailyFormComposable,

    // Tracking (spread from composable)
    ...trackingComposable,

    // History (exposed as object for cleaner API)
    history,
  }
}
