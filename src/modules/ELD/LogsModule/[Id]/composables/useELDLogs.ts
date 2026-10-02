import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-vue-next'
import { useDebounce } from '@/composables/useDebounce.ts'
import { sortArray, commonTransformers, type SortOrder } from '@/utils/sort.ts'
import { usePagination } from '@/composables/usePagination.ts'
import { useSorting } from '@/composables/useSorting.ts'
import { useApi } from '@/composables/useAxiosService.ts'
import { ApiEndpoints } from '@/api/endpoints.ts'
import { getCompanyId } from '@/utils/company.ts'
import { capitalizeKeys } from '@/utils/object.ts'
import { formatTime, formatDuration } from '@/utils/time.ts'

const formatCycleDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
}

export interface Log {
  id: number
  driverId: string
  name: string
  unit: string
  event: string
  uploadTime: string
  location: string
  break: string
  driving: string
  shift: string
  cycle: string
  violation: string
  eld: string
  records?: any[]
}

export type SortKey = keyof Log

interface MonitoringDriver {
  driverId: string
  driverName: string
  vehicleUnit: string
  eventCode: number
  eventType: number
  dateTime: string
  hasViolation: boolean
  isConnected?: boolean
  hosTimeRemainder?: {
    breakDuration: number
    drivingDuration: number
    shiftDuration: number
    cycleDuration: number
  }
  hosRecords?: Array<{
    dateTime: string
    dailyDriving: number
    dailyOnDuty: number
    hasDriverDailyForm: boolean
    hasViolation: boolean
  }>
  calculatedLocation?: string | null
  manualLocation?: string | null
}

export function useELDLogs() {
  const route = useRoute()
  const router = useRouter()
  const api = useApi()

  // Loading state
  const loading = ref(false)

  // API data
  const driverLogs = ref<MonitoringDriver[]>([])
  const totalCount = ref(0)

  // Accordion state - track expanded rows
  const expandedRows = ref<Set<number>>(new Set())

  // Filters - initialized from route query
  const searchQuery = ref('')
  const eventFilter = ref((route.query.event as string) || 'all')
  const violationFilter = ref(route.query.hasViolation === 'true' || false)
  const statusFilter = ref(
    route.query.status === 'true' ? 'online' : route.query.status === 'false' ? 'offline' : 'all'
  )

  // Fetch driver logs from API
  const fetchLogs = async () => {
    try {
      loading.value = true
      const companyId = getCompanyId()
      if (!companyId) {
        console.error('Company ID not found')
        return
      }

      // Get pagination params from route query
      const pageNumber = parseInt((route.query.pageNumber as string) || '1')
      const pageSize = parseInt((route.query.pageSize as string) || '10')
      
      const model = {
        companyId,
        startDate: null,
        endDate: null,
        hasViolation: violationFilter.value ? true : null,
        isConnected: statusFilter.value === 'online' ? true : statusFilter.value === 'offline' ? false : null,
        pageNumber,
        pageSize,
      }

      const response = await api.get<{
        successResult: {
          data: Array<{ monitoringDrivers: MonitoringDriver[] }>
        }
      }>(ApiEndpoints.DRIVER_LOGS_PROCESSING_EVENTS_NEW, {
        params: capitalizeKeys(model),
      })

      if (response.data?.successResult) {
        const responseData = response.data.successResult
        // Extract monitoringDrivers from the first element of data array
        if (responseData.data && responseData.data.length > 0 && responseData.data[0].monitoringDrivers) {
          driverLogs.value = responseData.data[0].monitoringDrivers
          totalCount.value = responseData.data[0].monitoringDrivers.length
        } else {
          driverLogs.value = []
          totalCount.value = 0
        }
      }
    } catch (error) {
      console.error('Error fetching driver logs:', error)
      driverLogs.value = []
      totalCount.value = 0
    } finally {
      loading.value = false
    }
  }

  // Helper function to get event name from eventCode and eventType
  const getEventName = (eventCode: number, eventType: number): string => {
    const eventMap: Record<number, string> = {
      1: eventType === 1 ? 'Off duty (YM)' : 'Off duty (PC)',
      2: 'Sleep',
      3: 'Driving',
      4: 'On duty',
    }
    return eventMap[eventCode] || 'Unknown'
  }

  // Transform API data to Log format
  const allLogs = computed<Log[]>(() => {
    if (!driverLogs.value || !Array.isArray(driverLogs.value)) return []

    return driverLogs.value.map((log, index) => ({
      id: index + 1,
      driverId: log.driverId,
      name: log.driverName || 'Unknown Driver',
      unit: log.vehicleUnit || 'N/A',
      event: getEventName(log.eventCode || 0, log.eventType || 0),
      uploadTime: log.dateTime ? formatTime(log.dateTime, 'MMM D, hh:mm A') : 'N/A',
      location: log.calculatedLocation || log.manualLocation || 'N/A',
      break: log.hosTimeRemainder ? formatDuration(log.hosTimeRemainder.breakDuration) : '0h 0m',
      driving: log.hosTimeRemainder ? formatDuration(log.hosTimeRemainder.drivingDuration) : '0h 0m',
      shift: log.hosTimeRemainder ? formatDuration(log.hosTimeRemainder.shiftDuration) : '0h 0m',
      cycle: log.hosTimeRemainder ? formatCycleDuration(log.hosTimeRemainder.cycleDuration) : '0h',
      violation: log.hasViolation ? 'Has Violations' : 'N/A',
      eld: log.isConnected ? 'Online' : 'Offline',
      records:
        log.hosRecords?.map((record) => ({
          date: record.dateTime,
          dateFormatted: record.dateTime ? formatTime(record.dateTime, 'MMM D, dddd') : 'N/A',
          driven: record.dailyDriving || 0,
          duty: record.dailyOnDuty || 0,
          profile: record.hasDriverDailyForm || false,
          violation: record.hasViolation || false,
        })) || [],
    }))
  })


  // Sorting using composable
  const sorting = useSorting<SortKey>({
    defaultKey: 'id',
    defaultOrder: 'asc',
  })

  // Setup pagination
  const pagination = usePagination(computed(() => filteredLogs.value.length), { itemsPerPage: 10 })

  // Debounced search - using useDebounce composable
  const debouncedSearch = useDebounce(searchQuery, 300, () => {
    pagination.resetPage()
  })

  // Event badge styles
  const getEventBadgeClass = (event: string) => {
    const eventMap: Record<string, string> = {
      Sleep:
        'bg-purple-100 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/40 dark:text-purple-400 border-none',
      Driving:
        'bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/40 dark:text-green-400 border-none',
      'Off duty (OFF)':
        'bg-gray-100 text-gray-700 hover:bg-gray-100 dark:bg-muted dark:text-muted-foreground border-none',
      'On duty':
        'bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/40 dark:text-blue-400 border-none',
      'Off duty (YM)':
        'bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/40 dark:text-red-400 border-none',
      'Off duty (PC)':
        'bg-orange-100 text-orange-700 hover:bg-orange-100 dark:bg-orange-900/40 dark:text-orange-400 border-none',
    }
    return eventMap[event] || 'bg-gray-100 text-gray-700 dark:bg-muted dark:text-muted-foreground'
  }

  // ELD status styles
  const getEldBadgeClass = (eld: string) => {
    return eld === 'Online'
      ? 'bg-blue-50 text-blue-600 hover:bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400 border-none'
      : 'bg-muted/50 text-muted-foreground hover:bg-muted/50 dark:bg-muted dark:text-muted-foreground border-none'
  }

  // Filtered logs
  const filteredLogs = computed(() => {
    let filtered = allLogs.value

    // Search filter
    if (debouncedSearch.value) {
      filtered = filtered.filter(
        (log) =>
          log.name.toLowerCase().includes(debouncedSearch.value.toLowerCase()) ||
          log.unit.toLowerCase().includes(debouncedSearch.value.toLowerCase()) ||
          log.location.toLowerCase().includes(debouncedSearch.value.toLowerCase())
      )
    }

    // Event filter
    if (eventFilter.value !== 'all') {
      const eventMap: Record<string, string> = {
        sleep: 'Sleep',
        driving: 'Driving',
        'off-duty-off': 'Off duty (OFF)',
        'on-duty': 'On duty',
        'off-duty-ym': 'Off duty (YM)',
        'off-duty-pc': 'Off duty (PC)',
      }
      filtered = filtered.filter((log) => log.event === eventMap[eventFilter.value])
    }

    // Violation filter (checkbox - when true, show only violations)
    if (violationFilter.value === true) {
      filtered = filtered.filter((log) => log.violation !== 'N/A' && log.violation !== 'No Violations')
    }

    // Status filter
    if (statusFilter.value !== 'all') {
      filtered = filtered.filter(
        (log) => log.eld.toLowerCase() === statusFilter.value.toLowerCase()
      )
    }

    // Sort using generic utility
    sortArray(filtered, sorting.sortKey.value, sorting.sortOrder.value, {
      id: commonTransformers.toNumber,
    })

    return filtered
  })

  // Paginated logs
  const paginatedLogs = computed(() => pagination.paginateData(filteredLogs.value))

  // Functions
  const getSortIcon = (key: SortKey) => {
    if (sorting.sortKey.value !== key) return ArrowUpDown
    return sorting.sortOrder.value === 'asc' ? ArrowUp : ArrowDown
  }

  // Handle date click - navigate to logs/[id] with selected date
  const handleDateClick = (driverId: string, date: string) => {
    router.push({
      path: `/logs/${driverId}`,
      query: {
        date: formatTime(date, 'YYYY-MM-DD'),
      },
    })
  }

  // Handle driver row click - navigate to logs/[id] with last date from records
  const handleDriverClick = (log: Log) => {
    // Get the first date from records (most recent date)
    if (log.records && log.records.length > 0) {
      const firstRecord = log.records[0] // Assuming records are already sorted, first is most recent
      handleDateClick(log.driverId, firstRecord.date)
    } else {
      // If no records, navigate to detail page without date
      router.push(`/logs/${log.driverId}`)
    }
  }

  // Inner table columns (daily records shown in accordion)
  const innerColumns = [
    { label: 'Date', key: 'date' },
    { label: 'Time Driving', key: 'driven' },
    { label: 'Time on Duty', key: 'duty' },
    { label: 'Has Profile Forms', key: 'profile' },
    { label: 'Violation', key: 'violation' },
  ]

  // Toggle accordion for a row
  const toggleRow = (rowId: number) => {
    if (expandedRows.value.has(rowId)) {
      expandedRows.value.delete(rowId)
    } else {
      expandedRows.value.add(rowId)
    }
  }

  // Check if row is expanded
  const isRowExpanded = (rowId: number) => {
    return expandedRows.value.has(rowId)
  }

  // Watch filter changes and update route query
  watch([violationFilter, statusFilter, eventFilter], async () => {
    pagination.resetPage()

    const query: Record<string, string | undefined> = {}
    // Preserve existing query params except the ones we're changing
    Object.keys(route.query).forEach((key) => {
      if (key !== 'hasViolation' && key !== 'status' && key !== 'event') {
        const value = route.query[key]
        if (value !== null && value !== undefined) {
          query[key] = Array.isArray(value) ? (value[0] as string) : (value as string)
        }
      }
    })

    if (violationFilter.value) {
      query.hasViolation = 'true'
    }

    if (statusFilter.value === 'online') {
      query.status = 'true'
    } else if (statusFilter.value === 'offline') {
      query.status = 'false'
    }

    if (eventFilter.value !== 'all') {
      query.event = eventFilter.value
    }

    await router.push({ query })
    await fetchLogs()
  })

  // Initialize on mount
  onMounted(async () => {
    await fetchLogs()
  })

  return {
    // State
    loading,
    totalCount,
    // Filters
    searchQuery,
    eventFilter,
    violationFilter,
    statusFilter,

    // Accordion
    expandedRows,
    innerColumns,
    toggleRow,
    isRowExpanded,

    // Pagination (from usePagination)
    currentPage: pagination.currentPage,
    itemsPerPage: pagination.itemsPerPage,
    totalPages: pagination.totalPages,
    totalEntries: pagination.totalEntries,
    pageNumbers: pagination.pageNumbers,
    goToPage: pagination.goToPage,
    nextPage: pagination.nextPage,
    previousPage: pagination.previousPage,

    // Sorting
    sortKey: sorting.sortKey,
    sortOrder: sorting.sortOrder,

    // Computed
    paginatedLogs,

    // Functions
    handleSort: sorting.handleSort,
    getSortIcon,
    getEventBadgeClass,
    getEldBadgeClass,
    handleDriverClick,
    handleDateClick,
    fetchLogs,
  }
}
