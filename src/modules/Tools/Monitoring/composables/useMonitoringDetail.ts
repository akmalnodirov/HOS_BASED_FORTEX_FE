import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useApi } from '@/composables/useAxiosService'
import { ApiEndpoints } from '@/api/endpoints'
import { useAuthStore } from '@/modules/Auth/store/authStore'
import { useTimeZoneHelper } from '@/composables/useTimezone'
import { setCarrierId, setCarrierTimeZoneId } from '@/utils/carrier'
import { getEventLabel } from '@/utils/events'
import { formatTime, formatDuration } from '@/utils/time'
import { collectEventWarningAndErrors } from '@/services/normalize'
import type { MonitoringDriver, MonitoringDriverEvent } from '../types'
import type { PinTime } from '@/types/events'
import dayjs from 'dayjs'

type CarrierMonitoringResponse = {
  successResult: MonitoringDriver[] | { data: MonitoringDriver[]; totalCount: number }
}

type DriverSortKey =
  | 'lastEvent'
  | 'truck'
  | 'break'
  | 'drive'
  | 'shift'
  | 'cycle'
  | 'profile'
  | 'violation'
  | 'updated'

type EventSortKey = 'event' | 'error' | 'time' | 'message'

type EventRow = {
  id: string
  event: { eventCode: number; eventType: number }
  error: string
  time: string
  message: string
}

export function useMonitoringDetail() {
  const route = useRoute()
  const router = useRouter()
  const api = useApi()
  const authStore = useAuthStore()
  const { getStartOf, getEndOf, convertToTimeZone } = useTimeZoneHelper()

  const carrierId = computed(() => route.params.carrierId as string)

  // State
  const monitoringDrivers = ref<MonitoringDriver[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const carrierTimeZone = ref('')

  // Drivers list derived from monitoring data
  const drivers = ref<{ id: string; name: string }[]>([])

  // Multi-select — default 'all'
  const selectedDriverIds = ref<string[]>(['all'])
  let isUpdatingDriverIds = false

  // Per-driver pagination
  const pageStates = ref<Record<string, number>>({})

  // Driver list sorting (Table 1 headers)
  const driverSortKey = ref<DriverSortKey | null>(null)
  const driverSortOrder = ref<'asc' | 'desc'>('asc')

  function handleDriverSort(key: DriverSortKey) {
    if (driverSortKey.value === key) {
      driverSortOrder.value = driverSortOrder.value === 'asc' ? 'desc' : 'asc'
    } else {
      driverSortKey.value = key
      driverSortOrder.value = 'asc'
    }
  }

  // Events sorting (Table 2 headers)
  const eventSortKey = ref<EventSortKey | null>(null)
  const eventSortOrder = ref<'asc' | 'desc'>('asc')

  function handleEventSort(key: EventSortKey) {
    if (eventSortKey.value === key) {
      eventSortOrder.value = eventSortOrder.value === 'asc' ? 'desc' : 'asc'
    } else {
      eventSortKey.value = key
      eventSortOrder.value = 'asc'
    }
  }

  // Filtered monitoring based on selected drivers
  const filteredMonitoring = computed(() => {
    if (selectedDriverIds.value.includes('all') || selectedDriverIds.value.length === 0) {
      return monitoringDrivers.value
    }
    return monitoringDrivers.value.filter((m) => selectedDriverIds.value.includes(m.driverId))
  })

  // Driver objects for chip display in select trigger
  const selectedDriverObjects = computed(() =>
    selectedDriverIds.value.map((id) => {
      if (id === 'all') return { id, name: 'All Drivers' }
      const d = drivers.value.find((x) => x.id === id)
      return d ?? { id, name: id }
    })
  )

  function removeDriver(id: string) {
    selectedDriverIds.value = selectedDriverIds.value.filter((x) => x !== id)
    if (selectedDriverIds.value.length === 0) {
      selectedDriverIds.value = ['all']
    }
  }

  function toggleDriver(id: string) {
    if (isUpdatingDriverIds) return
    isUpdatingDriverIds = true

    if (id === 'all') {
      selectedDriverIds.value = ['all']
    } else {
      const withoutAll = selectedDriverIds.value.filter((x) => x !== 'all')
      const idx = withoutAll.indexOf(id)
      if (idx === -1) {
        selectedDriverIds.value = [...withoutAll, id]
      } else {
        const next = withoutAll.filter((x) => x !== id)
        selectedDriverIds.value = next.length === 0 ? ['all'] : next
      }
    }

    isUpdatingDriverIds = false
  }

  function isDriverSelected(id: string): boolean {
    return selectedDriverIds.value.includes(id)
  }

  // Watch: if all removed → reset to 'all'
  watch(selectedDriverIds, (newVal) => {
    if (isUpdatingDriverIds) return
    if (newVal.length === 0) {
      isUpdatingDriverIds = true
      selectedDriverIds.value = ['all']
      isUpdatingDriverIds = false
    }
  })

  // Paginated events per driver (with sorting)
  function getPaginatedEvents(driverId: string, events: EventRow[]) {
    let sorted = [...events]
    if (eventSortKey.value) {
      const key = eventSortKey.value
      sorted.sort((a, b) => {
        let aVal = ''
        let bVal = ''
        if (key === 'event') {
          aVal = getEventLabel(a.event.eventType, a.event.eventCode)
          bVal = getEventLabel(b.event.eventType, b.event.eventCode)
        } else if (key === 'error') {
          aVal = a.error
          bVal = b.error
        } else if (key === 'time') {
          aVal = a.time
          bVal = b.time
        } else if (key === 'message') {
          aVal = a.message
          bVal = b.message
        }
        const cmp = aVal.localeCompare(bVal)
        return eventSortOrder.value === 'asc' ? cmp : -cmp
      })
    }
    const page = pageStates.value[driverId] || 1
    const perPage = 10
    const start = (page - 1) * perPage
    return sorted.slice(start, start + perPage)
  }

  function getTotalPages(events: unknown[]) {
    return Math.max(1, Math.ceil(events.length / 10))
  }

  // Events that have errors or warnings
  function getDamagedEvents(events?: MonitoringDriverEvent[]) {
    if (!events?.length) return []
    return events.filter(
      (e) =>
        e.actionState !== 4 &&
        ((e.errorTitles?.length ?? 0) > 0 || (e.warningTitles?.length ?? 0) > 0)
    )
  }

  // Accordion rows
  const monitorings = computed(() => {
    const mapped = filteredMonitoring.value.map((driver, idx) => {
      const damagedEvents = getDamagedEvents(driver.events)

      let errorEvents = 0
      let warningEvents = 0
      const titleCount = new Map<string, number>()

      damagedEvents.forEach((event) => {
        if ((event.errorTitles?.length ?? 0) > 0) {
          errorEvents++
          event.errorTitles?.forEach((t) => titleCount.set(t, (titleCount.get(t) ?? 0) + 1))
        }
        if ((event.warningTitles?.length ?? 0) > 0) {
          warningEvents++
          event.warningTitles?.forEach((t) => titleCount.set(t, (titleCount.get(t) ?? 0) + 1))
        }
      })

      const mostCommon = [...titleCount.entries()].reduce(
        (a, b) => (b[1] > a[1] ? b : a),
        ['', 0]
      )[0]

      return {
        index: idx,
        driver: driver.driverName,
        driverId: driver.driverId,
        lastEvent: [
          {
            event: { eventCode: driver.eventCode, eventType: driver.eventType },
            truck: driver.vehicleUnit,
            break: driver.hosTimeRemainder.breakDuration,
            drive: driver.hosTimeRemainder.drivingDuration,
            shift: driver.hosTimeRemainder.shiftDuration,
            cycle: driver.hosTimeRemainder.cycleDuration,
            profile: driver.isCertified,
            violation: driver.hasViolation,
            updated: formatTime(driver.dateTime, 'MMM D, hh:mm A'),
          },
        ],
        events: damagedEvents.map((event) => ({
          id: event.id,
          event: { eventCode: event.eventCode, eventType: event.eventType },
          error: (event.errorTitles?.length ?? 0) > 0 ? 'error' : 'warning',
          time: formatTime(event.dateTime, 'MMM D, hh:mm A'),
          message: [...(event.errorTitles ?? []), ...(event.warningTitles ?? [])].join(', '),
        })) as EventRow[],
        errorEvents,
        warningEvents,
        mostCommon: mostCommon as string,
      }
    })

    if (!driverSortKey.value) return mapped

    return [...mapped].sort((a, b) => {
      const key = driverSortKey.value!
      const ra = a.lastEvent[0]
      const rb = b.lastEvent[0]
      let aVal: number | string = 0
      let bVal: number | string = 0

      if (key === 'lastEvent') {
        aVal = ra?.event.eventCode ?? 0
        bVal = rb?.event.eventCode ?? 0
      } else if (key === 'truck') {
        aVal = ra?.truck ?? ''
        bVal = rb?.truck ?? ''
      } else if (key === 'break') {
        aVal = ra?.break ?? 0
        bVal = rb?.break ?? 0
      } else if (key === 'drive') {
        aVal = ra?.drive ?? 0
        bVal = rb?.drive ?? 0
      } else if (key === 'shift') {
        aVal = ra?.shift ?? 0
        bVal = rb?.shift ?? 0
      } else if (key === 'cycle') {
        aVal = ra?.cycle ?? 0
        bVal = rb?.cycle ?? 0
      } else if (key === 'profile') {
        aVal = ra?.profile ? 1 : 0
        bVal = rb?.profile ? 1 : 0
      } else if (key === 'violation') {
        aVal = ra?.violation ? 1 : 0
        bVal = rb?.violation ? 1 : 0
      } else if (key === 'updated') {
        aVal = ra?.updated ?? ''
        bVal = rb?.updated ?? ''
      }

      const cmp = typeof aVal === 'number' ? aVal - (bVal as number) : String(aVal).localeCompare(String(bVal))
      return driverSortOrder.value === 'asc' ? cmp : -cmp
    })
  })

  // Fetch carrier monitoring data
  async function fetchCarrierMonitoring() {
    isLoading.value = true
    error.value = null

    try {
      const response = await api.get<CarrierMonitoringResponse>(ApiEndpoints.MONITORING_CARRIER, {
        params: {
          CarrierId: carrierId.value,
          PageNumber: 1,
          PageSize: 1000,
        },
      })

      if (response.data?.successResult) {
        const data: MonitoringDriver[] = Array.isArray(response.data.successResult)
          ? response.data.successResult
          : response.data.successResult.data || []

        // Run normalization on each driver's events to populate errorTitles/warningTitles
        data.forEach((driver: MonitoringDriver) => {
          if (driver.events?.length) {
            const eventsWithoutArchived = driver.events.filter((e) => e.actionState !== 4)
            if (eventsWithoutArchived.length) {
              collectEventWarningAndErrors(
                eventsWithoutArchived as any,
                (driver.resetPinTimes || []) as PinTime[]
              )
            }
          }
        })

        monitoringDrivers.value = data
        drivers.value = data.map((m) => ({ id: m.driverId, name: m.driverName }))

        if (data.length > 0 && data[0].timeZone) {
          carrierTimeZone.value = data[0].timeZone
        }
      }
    } catch (err: any) {
      console.error('Error fetching carrier monitoring:', err)
      error.value = err.response?.data?.message || 'Failed to load monitoring data'
    } finally {
      isLoading.value = false
    }
  }

  // Navigate to Boost page for a driver
  async function handleBoostClick(driverId: string) {
    setCarrierId(carrierId.value)
    if (carrierTimeZone.value) {
      setCarrierTimeZoneId(carrierTimeZone.value)
    }
    await authStore.fetchCurrentUser()

    const fromDate = getStartOf(convertToTimeZone(dayjs().subtract(2, 'week'))).format(
      'YYYY-MM-DDTHH:mm:ss'
    )
    const toDate = getEndOf(convertToTimeZone(dayjs())).format('YYYY-MM-DDTHH:mm:ss')

    await router.push({
      path: `/logs/${driverId}/boost`,
      query: { fromDate, toDate },
    })
  }

  function getEventText(eventType: number, eventCode: number) {
    return getEventLabel(eventType, eventCode)
  }

  onMounted(async () => {
    await fetchCarrierMonitoring()
  })

  return {
    // State
    isLoading,
    error,
    drivers,
    selectedDriverIds,
    selectedDriverObjects,
    monitorings,
    pageStates,

    // Driver select
    toggleDriver,
    removeDriver,
    isDriverSelected,

    // Events pagination
    getPaginatedEvents,
    getTotalPages,

    // Sorting
    driverSortKey,
    driverSortOrder,
    eventSortKey,
    eventSortOrder,
    handleDriverSort,
    handleEventSort,

    // Actions
    handleBoostClick,
    getEventText,
    formatDuration,
  }
}
