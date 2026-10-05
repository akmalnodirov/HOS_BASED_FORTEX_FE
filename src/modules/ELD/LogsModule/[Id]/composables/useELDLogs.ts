import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-vue-next'
import { ApiEndpoints } from '@/api/endpoints'
import { useDebounce } from '@/composables/useDebounce'
import { usePagination } from '@/composables/usePagination'
import { useSorting } from '@/composables/useSorting'
import { useApi } from '@/composables/useAxiosService'
import { getCompanyId } from '@/utils/company'
import { commonTransformers, sortArray } from '@/utils/sort'

export interface RouteEldClock {
  remainingMilliseconds: number
  limitMilliseconds: number
  accumulatedMilliseconds: number
}

export interface RouteEldViolation {
  regulation: string
  startTime: string | null
}

export interface RouteEldDailyLog {
  id: string
  logDate: string
  timeZone: string | null
  isSigned: boolean
  hasForms: boolean
  timeDrivenMilliseconds: number
  timeOnDutyMilliseconds: number
  violationCount: number
  updatedAt: string | null
  violations: RouteEldViolation[]
}

export interface Log {
  driverId: string
  externalDriverId: string
  displayName: string
  email: string | null
  phoneNumber: string | null
  companyName: string
  hasVan: boolean
  trailers: string | null
  vehicleUnitName: string | null
  currentStatus: string
  connectionStatus: string
  latitude: number | null
  longitude: number | null
  location: string | null
  statusAt: string | null
  break: RouteEldClock | null
  drive: RouteEldClock | null
  shift: RouteEldClock | null
  cycle: RouteEldClock | null
  violationCount: number
  lastSyncError: string | null
}

interface LogsSummary {
  drivers: number
  connected: number
  locationsAvailable: number
  currentViolations: number
}

interface LogsOverview {
  summary: LogsSummary
  drivers: Log[]
}

export type SortKey = keyof Log

const emptySummary = (): LogsSummary => ({
  drivers: 0,
  connected: 0,
  locationsAvailable: 0,
  currentViolations: 0,
})

const normalizedFilterValue = (value: string) => value.toLowerCase().replaceAll(' ', '-')

export function useELDLogs() {
  const route = useRoute()
  const router = useRouter()
  const api = useApi()
  const loading = ref(false)
  const error = ref<string | null>(null)
  const driverLogs = ref<Log[]>([])
  const summary = ref<LogsSummary>(emptySummary())
  const expandedRows = ref<Set<string>>(new Set())
  const dailyLogsByDriver = ref<Record<string, RouteEldDailyLog[]>>({})
  const dailyLogsLoading = ref<Set<string>>(new Set())
  const dailyLogsErrors = ref<Record<string, string>>({})
  const searchQuery = ref('')
  const eventFilter = ref((route.query.event as string) || 'all')
  const violationFilter = ref(route.query.hasViolation === 'true')
  const statusFilter = ref((route.query.status as string) || 'all')

  const fetchLogs = async (forceRefresh = false) => {
    const companyId = getCompanyId()
    if (!companyId) {
      error.value = 'Select a company before opening logs.'
      driverLogs.value = []
      summary.value = emptySummary()
      return
    }

    try {
      loading.value = true
      error.value = null
      const response = await api.get<{ successResult: LogsOverview }>(ApiEndpoints.ROUTE_ELD_LOGS, {
        params: { companyId, refresh: forceRefresh },
      })
      const result = response.data?.successResult
      driverLogs.value = result?.drivers ?? []
      summary.value = result?.summary ?? emptySummary()
    } catch (exception) {
      error.value =
        exception instanceof Error ? exception.message : 'Failed to load Route ELD logs.'
      driverLogs.value = []
      summary.value = emptySummary()
    } finally {
      loading.value = false
    }
  }

  const fetchDailyLogs = async (driverId: string, forceRefresh = false) => {
    if (!forceRefresh && Object.hasOwn(dailyLogsByDriver.value, driverId)) return

    dailyLogsLoading.value = new Set(dailyLogsLoading.value).add(driverId)
    const errors = { ...dailyLogsErrors.value }
    delete errors[driverId]
    dailyLogsErrors.value = errors

    try {
      const response = await api.get<{ successResult: RouteEldDailyLog[] }>(
        ApiEndpoints.ROUTE_ELD_DRIVER_DAILY_LOGS(driverId)
      )
      dailyLogsByDriver.value = {
        ...dailyLogsByDriver.value,
        [driverId]: response.data?.successResult ?? [],
      }
    } catch (exception) {
      dailyLogsErrors.value = {
        ...dailyLogsErrors.value,
        [driverId]: exception instanceof Error ? exception.message : 'Failed to load daily logs.',
      }
    } finally {
      const loadingDrivers = new Set(dailyLogsLoading.value)
      loadingDrivers.delete(driverId)
      dailyLogsLoading.value = loadingDrivers
    }
  }

  const sorting = useSorting<SortKey>({
    defaultKey: 'displayName',
    defaultOrder: 'asc',
  })
  const debouncedSearch = useDebounce(searchQuery, 300)

  const filteredLogs = computed(() => {
    let filtered = [...driverLogs.value]
    const search = debouncedSearch.value.trim().toLowerCase()

    if (search) {
      filtered = filtered.filter((log) =>
        [
          log.displayName,
          log.email,
          log.phoneNumber,
          log.companyName,
          log.externalDriverId,
          log.vehicleUnitName,
          log.location,
        ].some((value) => value?.toLowerCase().includes(search))
      )
    }

    if (eventFilter.value !== 'all') {
      filtered = filtered.filter(
        (log) => normalizedFilterValue(log.currentStatus) === eventFilter.value
      )
    }

    if (violationFilter.value) {
      filtered = filtered.filter((log) => log.violationCount > 0)
    }

    if (statusFilter.value !== 'all') {
      filtered = filtered.filter(
        (log) =>
          normalizedFilterValue(log.connectionStatus.replaceAll('_', ' ')) === statusFilter.value
      )
    }

    return sortArray(filtered, sorting.sortKey.value, sorting.sortOrder.value, {
      displayName: commonTransformers.toLowerCase,
      companyName: commonTransformers.toLowerCase,
      currentStatus: commonTransformers.toLowerCase,
      connectionStatus: commonTransformers.toLowerCase,
      statusAt: commonTransformers.toDate,
      violationCount: commonTransformers.toNumber,
    })
  })

  const pagination = usePagination(
    computed(() => filteredLogs.value.length),
    {
      itemsPerPage: 10,
    }
  )
  const paginatedLogs = computed(() => pagination.paginateData(filteredLogs.value))

  const toggleRow = async (driverId: string) => {
    const rows = new Set(expandedRows.value)
    if (rows.has(driverId)) {
      rows.delete(driverId)
      expandedRows.value = rows
      return
    }

    rows.add(driverId)
    expandedRows.value = rows
    await fetchDailyLogs(driverId)
  }

  const isRowExpanded = (driverId: string) => expandedRows.value.has(driverId)
  const isDailyLogsLoading = (driverId: string) => dailyLogsLoading.value.has(driverId)
  const getDailyLogs = (driverId: string) => dailyLogsByDriver.value[driverId] ?? []
  const getDailyLogsError = (driverId: string) => dailyLogsErrors.value[driverId] ?? null
  const getSortIcon = (key: SortKey) => {
    if (sorting.sortKey.value !== key) return ArrowUpDown
    return sorting.sortOrder.value === 'asc' ? ArrowUp : ArrowDown
  }
  const getEventBadgeClass = (event: string) => {
    const styles: Record<string, string> = {
      'Sleeper Berth': 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
      Driving: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
      'Off Duty': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      'On Duty': 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
      'Yard Move': 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
      'Personal Conveyance':
        'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    }
    return styles[event] ?? 'bg-muted text-muted-foreground'
  }
  const getConnectionBadgeClass = (status: string) => {
    if (status === 'CONNECTED')
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
    if (status === 'DISCONNECTED')
      return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
    return 'bg-muted text-muted-foreground'
  }

  watch(debouncedSearch, () => pagination.resetPage())
  watch([eventFilter, violationFilter, statusFilter], async () => {
    pagination.resetPage()
    const query = { ...route.query }
    delete query.event
    delete query.hasViolation
    delete query.status
    if (eventFilter.value !== 'all') query.event = eventFilter.value
    if (violationFilter.value) query.hasViolation = 'true'
    if (statusFilter.value !== 'all') query.status = statusFilter.value
    await router.replace({ query })
  })
  watch(pagination.itemsPerPage, () => pagination.resetPage())

  onMounted(() => fetchLogs())

  return {
    loading,
    error,
    summary,
    searchQuery,
    eventFilter,
    violationFilter,
    statusFilter,
    paginatedLogs,
    expandedRows,
    currentPage: pagination.currentPage,
    itemsPerPage: pagination.itemsPerPage,
    totalPages: pagination.totalPages,
    totalEntries: pagination.totalEntries,
    pageNumbers: pagination.pageNumbers,
    goToPage: pagination.goToPage,
    nextPage: pagination.nextPage,
    previousPage: pagination.previousPage,
    sortKey: sorting.sortKey,
    sortOrder: sorting.sortOrder,
    handleSort: sorting.handleSort,
    getSortIcon,
    getEventBadgeClass,
    getConnectionBadgeClass,
    toggleRow,
    isRowExpanded,
    isDailyLogsLoading,
    getDailyLogs,
    getDailyLogsError,
    fetchDailyLogs,
    fetchLogs,
  }
}
