import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useApi } from '@/composables/useAxiosService'
import { ApiEndpoints } from '@/api/endpoints'
import { useCarriersDrivers } from '@/composables/useCarriersDrivers'
import { usePagination } from '@/composables/usePagination'
import { useDebounceSearch } from '@/composables/useDebounceSearch'
import { useTimeZoneHelper } from '@/composables/useTimezone'
import { useUnidentifiedStore } from '../store/unidentifiedStore'
import { getCarrierId } from '@/utils/carrier'
import { formatTime } from '@/utils/time'
import { formatDuration } from '@/utils/time'
import { events } from '@/utils/events'
import type { UnidentifiedTableRow, Vehicle } from '../types'

export function useUnidentified() {
  const route = useRoute()
  const router = useRouter()
  const api = useApi()
  const store = useUnidentifiedStore()
  const { convertToTimeZone, formatToUTC, acceptAsTimeZone, getStartOf } = useTimeZoneHelper()

  const { unidentifiedEvents, unidentifiedEventsTotal } = storeToRefs(store)

  // Loading
  const loading = ref(false)

  // Date range filter
  const startDate = ref<ReturnType<typeof convertToTimeZone> | null>(
    route.query?.startDate ? getStartOf(acceptAsTimeZone(route.query.startDate as string)) : null
  )
  const endDate = ref<ReturnType<typeof convertToTimeZone> | null>(
    route.query?.endDate ? getStartOf(acceptAsTimeZone(route.query.endDate as string)) : null
  )

  // Vehicle filter
  const selectedVehicle = ref<string | null>('all')
  const vehicles = ref<Vehicle[]>([])

  // Modals
  const reassignModal = ref(false)
  const statusModal = ref(false)
  const deleteModal = ref(false)

  // Status modal data
  const selectedEventCode = ref<number | null>(null)
  const selectedStatus = ref<string | null>(null)
  const selectedEventIds = ref<string[]>([])

  // Driver reassign
  const selectedDriver = ref<string | null>(null)
  const { drivers, fetchDrivers } = useCarriersDrivers()
  const driverListFiltered = ref(drivers.value)
  const { searchQuery: searchDriver, debouncedSearchQuery } = useDebounceSearch({ delay: 300 })

  // Pagination
  const pageSize = ref(parseInt(route.query?.pageSize as string) || 10)
  const pagination = usePagination(unidentifiedEventsTotal, {
    itemsPerPage: pageSize.value,
    initialPage: parseInt(route.query?.pageNumber as string) || 1,
  })

  // Row selection
  const selectedRows = ref<UnidentifiedTableRow[]>([])

  // Table rows mapped from API response
  const rows = computed<UnidentifiedTableRow[]>(() =>
    unidentifiedEvents.value?.map((event, ind) => ({
      ids: event.eventIds,
      count: ind + 1 + (pagination.currentPage.value - 1) * pageSize.value,
      driver:
        event.driver?.user?.firstName || event.driver?.user?.lastName
          ? `${event.driver?.user?.firstName ?? ''} ${event.driver?.user?.lastName ?? ''}`.trim()
          : 'N/A',
      vehicleUnit: event.vehicleUnit,
      distance: event.totalMiles,
      location: `${event.startedLocation || 'Location not specified'} -> ${event.endedLocation || 'Location not specified'}`,
      submitted: formatTime(event.dateTime, 'MMM D, hh:mm a'),
      odometer:
        event.totalVehicleMiles != null ? `${event.totalVehicleMiles} mi` : 'N/A',
      engineHours: event.totalEngineHours != null ? event.totalEngineHours : 'N/A',
      duration: formatDuration(event.durationInSeconds, true),
      eventType: event.eventType,
      eventCode: event.eventCode,
      event: { eventCode: event.eventCode, eventType: event.eventType },
    })) ?? []
  )

  // Filtered events for status modal based on current eventCode
  const filteredEvents = computed(() => {
    if (selectedEventCode.value === 4) {
      return events.filter((e) => e.key === 'off_duty' || e.key === 'sleeper' || e.key === 'on_duty')
    }
    if (selectedEventCode.value === 3) {
      return events.filter((e) => e.key === 'personal_use' || e.key === 'yard_moves' || e.key === 'driving')
    }
    return events
  })

  const disableReassign = computed(
    () =>
      !selectedRows.value.length ||
      selectedRows.value.some((r) => !r.event?.eventType || !r.event?.eventCode)
  )

  const selectedRowsCount = computed(() => selectedRows.value.length)

  // Data fetching
  async function fetchUnidentifiedEvents() {
    await store.getUnidentifiedEvents({
      startDate: startDate.value ? formatToUTC(startDate.value) : null,
      endDate: endDate.value ? formatToUTC(endDate.value) : null,
      vehicleId: selectedVehicle.value === 'all' ? null : selectedVehicle.value,
      carrierId: getCarrierId(),
      pageNumber: pagination.currentPage.value,
      pageSize: pageSize.value,
    })
  }


  async function fetchVehicles() {
    try {
      const response = await api.post<{ successResult: Vehicle[] | { data: Vehicle[] } }>(
        ApiEndpoints.VEHICLES_FILTER,
        { pageNumber: null, pageSize: null }
      )
      if (response.data?.successResult) {
        const vehiclesData = Array.isArray(response.data.successResult)
          ? response.data.successResult
          : response.data.successResult.data || []
        vehicles.value = vehiclesData
      }
    } catch (err) {
      console.error('Error fetching vehicles:', err)
    }
  }

  // Row selection
  function tableRowSelect(row: UnidentifiedTableRow) {
    const existingIndex = selectedRows.value.findIndex((r) =>
      r.ids.some((id) => row.ids.includes(id))
    )
    if (existingIndex !== -1) {
      selectedRows.value = selectedRows.value.filter((_, i) => i !== existingIndex)
    } else {
      selectedRows.value = [...selectedRows.value, row]
    }
  }

  function toggleSelectAll() {
    if (selectedRows.value.length === rows.value.length) {
      selectedRows.value = []
    } else {
      selectedRows.value = [...rows.value]
    }
  }

  // Reassign modal
  function selectReassignedDriver(driverId: string) {
    selectedDriver.value = driverId
  }

  async function submitReassignDriver() {
    if (loading.value || !selectedDriver.value) return
    loading.value = true
    try {
      const result = await store.reassignUnidentifiedEvents({
        eventIds: selectedRows.value[0]?.ids,
        driverId: selectedDriver.value,
      })
      if (result) {
        reassignModal.value = false
        selectedDriver.value = null
        selectedRows.value = []
        await fetchUnidentifiedEvents()
      }
    } catch (error) {
      console.error(error)
    } finally {
      loading.value = false
    }
  }

  // Status modal
  function openSelectDrivingStatus(eventCode: number, eventIds: string[], count: number) {
    selectedEventIds.value = eventIds
    const selectedRow = rows.value.find((row) => row.count === count)
    if (selectedRow) {
      const selectedEvent = events.find(
        (e) => e.eventType === selectedRow.event.eventType && e.eventCode === selectedRow.event.eventCode
      )
      selectedStatus.value = selectedEvent?.key ?? null
    }
    selectedEventCode.value = eventCode
    statusModal.value = true
  }

  async function submitSelectDrivingStatus() {
    if (loading.value) return
    loading.value = true

    const selectedEvent = events.find((e) => e.key === selectedStatus.value)
    try {
      const result = await store.selectUnidentifiedEvents({
        eventIds: selectedEventIds.value,
        eventType: selectedEvent?.eventType as number,
        eventCode: selectedEvent?.eventCode as number,
      })
      if (result) {
        selectedEventCode.value = null
        statusModal.value = false
        await fetchUnidentifiedEvents()
      }
    } catch (error) {
      console.error(error)
    } finally {
      loading.value = false
    }
  }

  // Delete
  async function deleteEvents() {
    if (loading.value) return
    loading.value = true
    try {
      const result = await store.deleteUnidentifiedEvents(
        selectedRows.value.flatMap((r) => r.ids)
      )
      if (result) {
        deleteModal.value = false
        selectedRows.value = []
        await fetchUnidentifiedEvents()
      }
    } catch (error) {
      console.error(error)
    } finally {
      loading.value = false
    }
  }

  // Watchers
  watch(debouncedSearchQuery, (query) => {
    if (!query) {
      driverListFiltered.value = drivers.value
    } else {
      driverListFiltered.value = drivers.value.filter((d) =>
        `${d.user?.firstName ?? ''} ${d.user?.lastName ?? ''}`.toLowerCase().includes(query.toLowerCase())
      )
    }
  })

  watch(
    () => pagination.currentPage.value,
    async () => {
      selectedRows.value = []
      if (pagination.currentPage.value <= 1) {
        router.replace({ query: { ...route.query, pageNumber: undefined, pageSize: undefined } })
      } else {
        router.replace({
          query: {
            ...route.query,
            pageNumber: pagination.currentPage.value.toString(),
            pageSize: pageSize.value.toString(),
          },
        })
      }
      await fetchUnidentifiedEvents()
    }
  )

  watch([startDate, endDate], () => {
    router.replace({
      query: {
        ...route.query,
        date: undefined,
        startDate: startDate.value ? formatTime(startDate.value, 'YYYY-MM-DD') : undefined,
        endDate: endDate.value ? formatTime(endDate.value, 'YYYY-MM-DD') : undefined,
      },
    })
  })

  watch([startDate, endDate, selectedVehicle], async () => {
    pagination.currentPage.value = 1
    await fetchUnidentifiedEvents()
  })

  // Initialize
  onMounted(async () => {
    await Promise.allSettled([
      fetchUnidentifiedEvents(),
      fetchDrivers().then(() => { driverListFiltered.value = drivers.value }),
      fetchVehicles(),
    ])
  })

  return {
    // State
    loading,
    startDate,
    endDate,
    selectedVehicle,
    selectedDriver,
    selectedEventCode,
    selectedStatus,

    // Modals
    reassignModal,
    statusModal,
    deleteModal,

    // Driver search
    searchDriver,
    driverListFiltered,

    // Data
    rows,
    vehicles,
    drivers,
    filteredEvents,

    // Selection
    selectedRows,
    selectedRowsCount,
    disableReassign,
    tableRowSelect,

    // Pagination
    currentPage: pagination.currentPage,
    itemsPerPage: pageSize,
    totalPages: pagination.totalPages,
    totalEntries: unidentifiedEventsTotal,
    pageNumbers: pagination.pageNumbers,
    goToPage: pagination.goToPage,
    nextPage: pagination.nextPage,
    previousPage: pagination.previousPage,

    // Actions
    selectReassignedDriver,
    submitReassignDriver,
    openSelectDrivingStatus,
    submitSelectDrivingStatus,
    deleteEvents,
    fetchUnidentifiedEvents,
    toggleSelectAll,
  }
}
