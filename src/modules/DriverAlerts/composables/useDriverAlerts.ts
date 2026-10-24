import { computed, onMounted, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { useApi } from '@/composables/useAxiosService'
import { useDebounce } from '@/composables/useDebounce'
import { usePagination } from '@/composables/usePagination'
import { useSorting } from '@/composables/useSorting'
import { ApiEndpoints } from '@/api/endpoints'
import { getCompanyId } from '@/utils/company'
import { sortArray } from '@/utils/sort'
import type { RouteEldLiveDriver } from '@/modules/Overview/types'
import type {
  AlertDriver,
  AlertMusicType,
  DriverAlertRequest,
  DutyStatusKey,
  SortKey,
} from '@/modules/DriverAlerts/types'

const DUTY_STATUS_LABELS: Record<DutyStatusKey, string> = {
  sleep: 'Sleep',
  driving: 'Driving',
  off: 'Off duty (OFF)',
  pc: 'Off duty (PC)',
  on: 'On duty',
  ym: 'Off duty (YM)',
  unknown: 'Unknown',
}

export function resolveDutyStatus(value: string | null | undefined): DutyStatusKey {
  const normalized = (value || '')
    .toUpperCase()
    .replace(/[^A-Z]+/g, ' ')
    .trim()
  if (normalized.includes('SLEEP')) return 'sleep'
  if (normalized.includes('DRIVING')) return 'driving'
  if (normalized.includes('PERSONAL') || normalized === 'PC') return 'pc'
  if (normalized.includes('YARD') || normalized === 'YM') return 'ym'
  if (normalized.includes('OFF')) return 'off'
  if (normalized.includes('ON')) return 'on'
  return 'unknown'
}

const mapDriver = (driver: RouteEldLiveDriver): AlertDriver => {
  const status = resolveDutyStatus(driver.currentStatus)
  return {
    id: driver.driverId,
    name: driver.driverName,
    unit: driver.vehicleName || '',
    odometer: driver.latestPoint?.odometer ?? null,
    updatedAt: driver.latestPoint?.timestamp ?? null,
    status,
    statusLabel:
      status === 'unknown'
        ? driver.currentStatus || DUTY_STATUS_LABELS.unknown
        : DUTY_STATUS_LABELS[status],
  }
}

export function useDriverAlerts() {
  const api = useApi()

  const drivers = ref<AlertDriver[]>([])
  const isLoading = ref(false)
  const error = ref('')
  const searchQuery = ref('')
  const isSending = ref(false)

  const sorting = useSorting<SortKey>({ defaultKey: 'name', defaultOrder: 'asc' })
  const pagination = usePagination(
    computed(() => filteredDrivers.value.length),
    {
      itemsPerPage: 10,
    }
  )
  const debouncedSearch = useDebounce(searchQuery, 300, () => pagination.resetPage())

  const fetchDrivers = async () => {
    const companyId = getCompanyId()
    if (!companyId) {
      drivers.value = []
      error.value = 'Select a company to load drivers.'
      return
    }
    isLoading.value = true
    error.value = ''
    try {
      const response = await api.get<RouteEldLiveDriver[]>(
        ApiEndpoints.ROUTE_ELD_LIVE_TRACKING_DRIVERS,
        { params: { companyId } }
      )
      drivers.value = (response.data || []).map(mapDriver)
    } catch (exception: any) {
      drivers.value = []
      error.value =
        exception.response?.data?.message ||
        (typeof exception.response?.data === 'string' ? exception.response.data : '') ||
        'Drivers could not be loaded.'
    } finally {
      isLoading.value = false
    }
  }

  const sendAlert = async (driver: AlertDriver, musicType: AlertMusicType) => {
    if (isSending.value) return false
    isSending.value = true
    try {
      const request: DriverAlertRequest = {
        driverId: driver.id,
        dateTime: new Date().toISOString(),
        musicType,
      }
      await api.post(ApiEndpoints.DRIVER_ALERTS, request)
      toast.success(`Alert sent to ${driver.name}`)
      return true
    } catch (exception) {
      console.error('Error sending driver alert:', exception)
      return false
    } finally {
      isSending.value = false
    }
  }

  const filteredDrivers = computed(() => {
    const search = debouncedSearch.value.trim().toLowerCase()
    const filtered = search
      ? drivers.value.filter(
          (driver) =>
            driver.name.toLowerCase().includes(search) || driver.unit.toLowerCase().includes(search)
        )
      : [...drivers.value]
    return sortArray(filtered, sorting.sortKey.value, sorting.sortOrder.value, {
      name: (value: string) => value.toLowerCase(),
      unit: (value: string) => value.toLowerCase(),
      odometer: (value: number | null) => value ?? -1,
      updatedAt: (value: number | null) => value ?? -1,
    })
  })

  const paginatedDrivers = computed(() => pagination.paginateData(filteredDrivers.value))

  watch([sorting.sortKey, sorting.sortOrder, pagination.itemsPerPage], () => pagination.resetPage())

  onMounted(fetchDrivers)

  return {
    drivers,
    isLoading,
    isSending,
    error,
    searchQuery,
    sortKey: sorting.sortKey,
    sortOrder: sorting.sortOrder,
    handleSort: sorting.handleSort,
    currentPage: pagination.currentPage,
    itemsPerPage: pagination.itemsPerPage,
    totalPages: pagination.totalPages,
    totalEntries: pagination.totalEntries,
    pageNumbers: pagination.pageNumbers,
    goToPage: pagination.goToPage,
    paginatedDrivers,
    fetchDrivers,
    sendAlert,
  }
}
