import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import dayjs, { type Dayjs } from 'dayjs'
import { useApi } from '@/composables/useAxiosService'
import { ApiEndpoints } from '@/api/endpoints'
import { useCompaniesDrivers } from '@/composables/useCompaniesDrivers'
import { useTimeZoneHelper } from '@/composables/useTimezone'
import { useAuditStore } from '../store/auditStore'
import { useDriverDailyForm } from '@/modules/ELD/LogsModule/[Id]/composables/useDriverDailyForm'
import { useChartStore } from '@/modules/ELD/LogsModule/[Id]/store/chart'
import { useDirection } from '@/modules/Overview/composables/useDirection'
import { calculateBearing, makeValidCoordinate } from '@/modules/Overview/utils/mapUtils'
import { removeDuplicatePoints } from '@/modules/Overview/utils/routeUtils'
import { capitalizeKeys } from '@/utils/object'
import { getEventLabel } from '@/utils/events'
import { add, compareDates, formatDuration, formatTime, subtract } from '@/utils/time'
import type { AuditEventTableRow } from '../types'

export function useAuditDetail() {
  const route = useRoute()
  const router = useRouter()
  const api = useApi()
  const auditStore = useAuditStore()
  const chartStore = useChartStore()
  const { formatToUTC, convertToTimeZone, getStartOf, getEndOf, acceptAsTimeZone } =
    useTimeZoneHelper()

  // Driver daily form composable
  const driverDailyFormComposable = useDriverDailyForm()

  // Direction composable for map
  const { testDirectionsAPI, renderDirections, cleanUpRenderers } = useDirection()

  // Store refs
  const {
    auditChartData,
    auditDailyEvents,
    auditDailySummary,
    auditWeeklyViolations,
    // auditWeightStations,
    auditTrackings,
  } = storeToRefs(auditStore)

  // Route params
  const driverId = computed(() => route.params.driverId as string)
  const auditId = computed(() => route.params.auditId as string)

  // State
  const loading = ref(false)
  const screenResolution = ref(0)
  const tracking = ref(false)
  const headerDate = ref<Dayjs>(
    route.query?.date ? acceptAsTimeZone(route.query.date as string) : convertToTimeZone()
  )
  const selectedRow = ref<any[]>([])
  const mapInstance = ref<any>(null)
  const directionsSegments = ref<any[]>([])
  const driverTimeZoneShortName = ref('')

  // Trip numbers from localStorage
  const tripNumbers = ref<number[]>(JSON.parse(localStorage.getItem('tripNumbers') || '[]'))

  // Drivers (for edit profile modal)
  const { drivers, fetchDrivers } = useCompaniesDrivers()

  // Edit profile modal
  const editProfileModal = ref(false)

  // Tooltip management for tracking map
  const activeTooltips = ref<Record<string, boolean>>({})
  const tooltipPositions = ref<Record<string, any>>({})

  // Table columns
  const columns = computed(() => [
    { key: 'sequence', label: '#' },
    {
      key: 'time',
      label: `Time${driverTimeZoneShortName.value ? ` (${driverTimeZoneShortName.value})` : ''}`,
    },
    { key: 'event', label: 'Event' },
    { key: 'duration', label: 'Duration' },
    { key: 'location', label: 'Location' },
    { key: 'odometer', label: 'Odometer' },
    { key: 'hours', label: 'Engine Hours' },
    { key: 'recordOrigin', label: 'Record Origin' },
    { key: 'recordStatus', label: 'Record Status' },
    { key: 'notes', label: 'Notes' },
  ])

  // Map daily events to table rows
  const detailList = computed<AuditEventTableRow[]>(() => {
    const events = auditDailyEvents.value
    if (!events || events.length === 0) return []

    return events.map((event) => ({
      sequence: event.sequenceId,
      time: acceptAsTimeZone(event.dateTime)?.format('MMM D, hh:mm:ss A') || '',
      event: getEventLabel(event.eventType, event.eventCode),
      eventType: event.eventType,
      eventCode: event.eventCode,
      eventId: event.id,
      certifiedDate: event.certifiedDate,
      duration: [1, 3].includes(event.eventType)
        ? formatDuration(event.durationInSeconds ?? 0)
        : '',
      location: event.calculatedLocation ?? event.manualLocation ?? '',
      odometer: event.totalVehicleMiles,
      hours: event.totalEngineHours,
      recordOrigin: event.recordOrigin ?? 1,
      recordStatus: event.recordStatus ?? 1,
      notes: event.annotation ?? '',
    }))
  })

  // Computed pixel violations (placeholder)
  const dailyPixelViolations = ref<any[]>([])

  // Data fetching methods
  async function fetchDriverDailyForm() {
    await driverDailyFormComposable.fetchDriverDailyForm(
      driverId.value,
      formatToUTC(headerDate.value)
    )
  }

  async function fetchDailyEvents() {
    const model = {
      driverId: driverId.value,
      startDate: formatToUTC(getStartOf(headerDate.value)),
      endDate: formatToUTC(getEndOf(headerDate.value)),
    }
    await auditStore.getAuditEvents(model)
  }

  async function fetchDailySummary() {
    const model = {
      driverId: driverId.value,
      startDate: formatToUTC(getStartOf(headerDate.value)),
      endDate: formatToUTC(getEndOf(headerDate.value)),
    }
    await auditStore.getAuditSummary(model)
  }

  async function fetchChart() {
    const model = {
      driverId: driverId.value,
      startDate: formatToUTC(getStartOf(headerDate.value)),
      endDate: formatToUTC(getEndOf(headerDate.value)),
      screenResolution: screenResolution.value,
    }
    await auditStore.getAuditGraph(model)
  }

  async function fetchPixelViolations() {
    // Uses driver-logs endpoint for pixel violations
    try {
      const model = {
        startDate: formatToUTC(getStartOf(headerDate.value)),
        endDate: formatToUTC(getEndOf(headerDate.value)),
        driverId: driverId.value,
        screenResolution: screenResolution.value,
      }
      const response = await api.get<{ successResult: any[] }>(
        ApiEndpoints.DRIVER_LOGS_DAILY_PIXEL_VIOLATIONS,
        { params: capitalizeKeys(model) }
      )
      if (response.data?.successResult) {
        dailyPixelViolations.value = response.data.successResult
      }
    } catch (err) {
      console.error('Error fetching pixel violations:', err)
    }
  }

  const weeklyViolationsModel = reactive({
    startDate: formatToUTC(getStartOf(subtract(headerDate.value, 1, 'week'))),
    endDate: formatToUTC(getEndOf(headerDate.value)),
    driverId: '' as string,
  })

  async function fetchWeeklyViolations() {
    weeklyViolationsModel.driverId = driverId.value
    await auditStore.getAuditViolations(weeklyViolationsModel)
  }

  async function fetchDriverTimeZone() {
    try {
      const response = await api.get<{ successResult: { shortName: string } }>(
        ApiEndpoints.DRIVER_INFOS_TIME_ZONE(driverId.value)
      )
      if (response.data?.successResult) {
        driverTimeZoneShortName.value = response.data.successResult.shortName || ''
      }
    } catch (err) {
      console.error('Error fetching driver timezone:', err)
    }
  }

  async function fetchTrackings() {
    const model = {
      driverId: driverId.value,
      auditId: auditId.value,
      tripNumber: tripNumbers.value,
    }
    await auditStore.getAuditTracking(model)
    await fetchTrackingSegments()
  }

  async function fetchTrackingSegments() {
    const validTrackings = (auditTrackings.value || []).filter(
      (t) => t?.latitude && t?.longitude && !isNaN(t.latitude) && !isNaN(t.longitude)
    )

    let points = validTrackings.map((t) => ({
      latitude: t.latitude,
      longitude: t.longitude,
    }))

    points = removeDuplicatePoints(points)
    points = points.map(makeValidCoordinate)

    directionsSegments.value = await testDirectionsAPI(points)
  }

  // async function fetchWeightStations() {
  //   await auditStore.getAuditWeightStations()
  // }

  // Chart width handler
  async function getChartWidth(width: number) {
    screenResolution.value = width
    chartStore.screenResolution = width
    await Promise.allSettled([fetchChart(), fetchPixelViolations()])
  }

  // Edit profile form modal
  function openEditProfileModal() {
    fetchDrivers()
    driverDailyFormComposable.initializeEditForm()
    editProfileModal.value = true
  }

  async function submitEditDriverDailyForm() {
    try {
      loading.value = true
      await driverDailyFormComposable.updateDriverDailyForm(
        driverId.value,
        formatToUTC(headerDate.value),
        formatToUTC(convertToTimeZone())
      )
    } catch (error) {
      console.error(error)
    } finally {
      loading.value = false
      await fetchDriverDailyForm()
      editProfileModal.value = false
    }
  }

  // Tooltip methods for tracking map
  function toggleTooltip(eventId: string, event: MouseEvent) {
    const rect = (event.target as HTMLElement).getBoundingClientRect()
    tooltipPositions.value[eventId] = {
      top: `${rect.top - 75}px`,
      left: `${rect.left - 75}px`,
      transform: 'translateX(-50%)',
    }
    activeTooltips.value = { [eventId]: true }
  }

  function closeTooltip(eventId: string) {
    delete activeTooltips.value[eventId]
    delete tooltipPositions.value[eventId]
  }

  function openGoogleMaps(lat: number, lng: number) {
    window.open(`https://maps.google.com/maps?q=${lat},${lng}`, '_blank')
  }

  // Watch tracking toggle
  watch(tracking, async () => {
    await Promise.allSettled([fetchTrackings()])
  })

  // Watch header date changes
  watch(headerDate, async (newValue) => {
    const violations = auditWeeklyViolations.value

    if (compareDates(violations?.at(0)?.dateOfViolations as Dayjs, newValue)) {
      weeklyViolationsModel.startDate = formatToUTC(getStartOf(subtract(newValue, 1, 'day')))
      weeklyViolationsModel.endDate = formatToUTC(getEndOf(add(newValue, 6, 'day')))
      await fetchWeeklyViolations()
    } else if (
      compareDates(violations?.at(-1)?.dateOfViolations as Dayjs, newValue) &&
      dayjs(newValue).isBefore(convertToTimeZone(), 'day')
    ) {
      weeklyViolationsModel.startDate = formatToUTC(getStartOf(subtract(newValue, 6, 'day')))
      weeklyViolationsModel.endDate = formatToUTC(getEndOf(add(newValue, 1, 'day')))
      await fetchWeeklyViolations()
    } else if (!violations?.some((v) => compareDates(v.dateOfViolations as Dayjs, newValue))) {
      weeklyViolationsModel.startDate = formatToUTC(getStartOf(subtract(newValue, 6, 'day')))
      weeklyViolationsModel.endDate = formatToUTC(getEndOf(add(newValue, 1, 'day')))
      await fetchWeeklyViolations()
    }

    router.replace({ query: { ...route.query, date: formatTime(newValue, 'YYYY-MM-DD') } })

    await Promise.allSettled([
      fetchPixelViolations(),
      fetchChart(),
      fetchDailyEvents(),
      fetchDailySummary(),
      fetchDriverDailyForm(),
    ])
  })

  // Watch direction segments for map rendering — only render when .map (raw google map) is available
  watch(directionsSegments, (newSegments) => {
    if (mapInstance.value?.map) {
      if (newSegments.length) {
        renderDirections(mapInstance.value, newSegments)
      } else {
        cleanUpRenderers()
      }
    }
  })

  // Watch for raw google.maps.Map becoming available (mapInstance.value.map)
  // This fires when Google Maps JS API finishes loading inside the GoogleMap component
  watch(
    () => mapInstance.value?.map,
    (rawMap) => {
      if (rawMap && directionsSegments.value?.length > 0) {
        renderDirections(mapInstance.value, directionsSegments.value)
      }
    }
  )

  // Close tooltips on outside click
  function handleOutsideClick(e: MouseEvent) {
    const target = e.target as HTMLElement
    if (!target.closest('.fixed') && !target.closest('svg')) {
      activeTooltips.value = {}
      tooltipPositions.value = {}
    }
  }

  // Initialize
  onMounted(async () => {
    screenResolution.value = document.documentElement.clientWidth - 244
    chartStore.screenResolution = screenResolution.value

    if (!route.query?.date) {
      router.replace({ query: { date: formatTime(headerDate.value, 'YYYY-MM-DD') } })
    }

    document.addEventListener('click', handleOutsideClick)

    await Promise.allSettled([
      fetchDrivers(),
      fetchDailyEvents(),
      fetchDailySummary(),
      fetchDriverTimeZone(),
      fetchDriverDailyForm(),
      fetchWeeklyViolations(),
    ])
  })

  return {
    // State
    loading,
    tracking,
    headerDate,
    selectedRow,
    mapInstance,
    editProfileModal,
    tripNumbers,
    activeTooltips,
    tooltipPositions,

    // Store refs
    auditChartData,
    auditDailySummary,
    auditWeeklyViolations,
    // auditWeightStations,
    auditTrackings,
    dailyPixelViolations,

    // Driver daily form
    driverDailyForm: driverDailyFormComposable.driverDailyForm,
    editForm: driverDailyFormComposable.editForm,
    disableEditDailyForm: driverDailyFormComposable.disableEditDailyForm,
    drivers,

    // Computed
    columns,
    detailList,

    // Methods
    getChartWidth,
    openEditProfileModal,
    submitEditDriverDailyForm,
    toggleTooltip,
    closeTooltip,
    openGoogleMaps,

    // Timezone helpers
    acceptAsTimeZone,
    convertToTimeZone,
    formatTime,
    compareDates,
    add,
    subtract,

    // Map
    calculateBearing,
  }
}
