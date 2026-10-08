import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useApi } from '@/composables/useAxiosService'
import { ApiEndpoints } from '@/api/endpoints'
import type {
  ActivityListResponse,
  ActivityRecord,
  ActivityRequest,
  ActivityTableItem,
} from '../types'
import { usePagination } from '@/composables/usePagination'
import { useSorting } from '@/composables/useSorting'
import { useTimeZoneHelper } from '@/composables/useTimezone'
import { useAuthStore } from '@/modules/Auth/store/authStore'
import { useCompaniesDrivers } from '@/composables/useCompaniesDrivers'
import { toast } from 'vue-sonner'
import dayjs, { type Dayjs } from 'dayjs'

export type SortKey =
  | 'no'
  | 'name'
  | 'tool'
  | 'company'
  | 'driver'
  | 'period'
  | 'shiftRepair'
  | 'created'
export type SortOrder = 'asc' | 'desc'

// Session status enum
export const SessionStatus: Record<number, string> = {
  1: 'Pending',
  2: 'Completed',
  3: 'Failed',
  4: 'Rolled Back',
}

// Session type enum
export const SessionType: Record<number, string> = {
  1: 'Booster',
  2: 'Optimize',
  3: 'AI',
  4: 'History',
}

export interface UseActivityOptions {
  autoFetch?: boolean
}

export function useActivity(options: UseActivityOptions = {}) {
  const { autoFetch = false } = options
  const api = useApi()
  const router = useRouter()
  const authStore = useAuthStore()
  const { formatToUTC, acceptAsTimeZone, getStartOf, getEndOf, convertToTimeZone } =
    useTimeZoneHelper()

  // State
  const activities = ref<ActivityRecord[]>([])
  const isLoading = ref(false)
  const hasLoaded = ref(false)
  const error = ref<string | null>(null)

  // Rollback state
  const rollbackLoading = ref(false)
  const selectedRollbackId = ref<string | null>(null)

  // Filters
  const companySearch = ref<string | null>(null)
  const driverSearch = ref<string | null>(null)
  const dateRange = ref<[Dayjs, Dayjs]>([
    getStartOf(dayjs().subtract(7, 'days')),
    getEndOf(dayjs()),
  ])
  const selectedTag = ref<'all' | 'ai' | 'booster' | 'audit'>('all')

  // Sorting using composable
  const sorting = useSorting<SortKey>({
    defaultKey: 'no',
    defaultOrder: 'asc',
  })

  // Carriers and drivers from shared composable
  const { companies, drivers, fetchCompanies, fetchDrivers } = useCompaniesDrivers()

  // Transform activities to table items
  const tableItems = computed<ActivityTableItem[]>(() => {
    const pageOffset = (pagination.currentPage.value - 1) * pagination.itemsPerPage.value

    return activities.value.map((activity: ActivityRecord, index: number) => {
      // Parse changes for display
      const changesDisplay = activity.changes
        ? activity.changes
            .split(',')
            .map((c) => c.trim())
            .filter((c) => c)
            .join(' ')
        : 'No changes'

      return {
        id: activity.id,
        no: pageOffset + index + 1,
        name: `${activity.operator.firstName} ${activity.operator.lastName}`,
        tool: SessionType[activity.type] || 'Unknown',
        toolType: activity.type,
        company: activity.companyName,
        companyId: activity.companyId,
        driver: activity.driverName,
        driverId: activity.driverId,
        period: `${acceptAsTimeZone(activity.startDate).format('YYYY-MM-DD')} -> ${acceptAsTimeZone(activity.endDate).format('YYYY-MM-DD')}`,
        shiftRepair: changesDisplay,
        created: acceptAsTimeZone(activity.currentTime).format('YYYY-MM-DD HH:mm'),
        startDate: activity.startDate,
        endDate: activity.endDate,
        status: activity.status,
        isSubmitted: activity.isSubmitted,
      }
    })
  })

  // Setup pagination
  const totalCount = ref(0)
  const pagination = usePagination(totalCount, {
    itemsPerPage: 10,
  })

  // Paginated items - directly from backend (no client-side pagination)
  const paginatedItems = computed(() => tableItems.value)

  // Fetch activities
  const fetchActivities = async () => {
    isLoading.value = true
    error.value = null

    try {
      const params: ActivityRequest = {
        OperatorId: authStore.user?.id || undefined,
        StartDate: formatToUTC(dateRange.value[0]),
        EndDate: formatToUTC(dateRange.value[1]),
        pageNumber: pagination.currentPage.value,
        pageSize: pagination.itemsPerPage.value,
      }

      // Add carrier filter
      if (companySearch.value) {
        params.CompanyId = companySearch.value
      }

      // Add driver filter
      if (driverSearch.value) {
        params.DriverId = driverSearch.value
      }

      // Add type filter based on tag
      if (selectedTag.value === 'ai') {
        params.type = 3
      } else if (selectedTag.value === 'booster') {
        params.type = 1
      } else if (selectedTag.value === 'audit') {
        params.type = 4
      }

      const response = await api.get<ActivityListResponse>(ApiEndpoints.SESSIONS_FILTER, { params })

      if (response.data?.successResult) {
        // Handle both array and paginated response structures
        if (Array.isArray(response.data.successResult)) {
          activities.value = response.data.successResult
          totalCount.value = response.data.successResult.length
        } else {
          activities.value = response.data.successResult.data || []
          totalCount.value = response.data.successResult.totalCount || activities.value.length
        }
        hasLoaded.value = true
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message || 'Failed to fetch activities'
      console.error('Error fetching activities:', err)
    } finally {
      isLoading.value = false
    }
  }

  // Rollback session
  const rollbackSession = async (item: ActivityTableItem) => {
    try {
      rollbackLoading.value = true
      selectedRollbackId.value = item.id

      const response = await api.post(
        ApiEndpoints.BOOST_EVENTS_ROLLBACK(item.id),
        {},
        {
          _showSuccessToast: false,
        }
      )

      if (response.data) {
        toast.success('Session rolled back successfully')
        await fetchActivities()
      } else {
        toast.error('Session rollback failed')
      }
    } catch (err: any) {
      console.error('Rollback failed:', err)
      toast.error(err.response?.data?.message || 'Rollback failed')
    } finally {
      rollbackLoading.value = false
      selectedRollbackId.value = null
    }
  }

  // Check if rollback is allowed (only completed sessions that are submitted can be rolled back)
  const canRollback = (item: ActivityTableItem): boolean => {
    return item.status === 2 && item.isSubmitted && !rollbackLoading.value
  }

  // Row select - navigate to logs page
  const rowSelect = async (item: ActivityTableItem) => {
    // Set carrier in localStorage if found
    const company = companies.value.find((itemCompany) => itemCompany.id === item.companyId)
    if (company) {
      localStorage.setItem('companyId', company.id)
      localStorage.setItem('companyName', company.name)
      if (company.timeZoneInfo?.ianaId) {
        localStorage.setItem('companyTimeZoneId', company.timeZoneInfo.ianaId)
      }
      if (company.client?.name) {
        localStorage.setItem('companyGroupName', company.client.name)
      }
    }

    // Determine path based on tool type
    let toolPath = ''
    if (item.toolType === 1) {
      toolPath = '/boost'
    } else if (item.toolType === 3) {
      toolPath = '/ai'
    }

    const basePath = `/logs/${item.driverId}${toolPath}`

    const queryParams = {
      fromDate: acceptAsTimeZone(item.startDate).format('YYYY-MM-DDTHH:mm:ss'),
      toDate: acceptAsTimeZone(item.endDate).format('YYYY-MM-DDTHH:mm:ss'),
      sessionId: item.id,
      activity: 'true',
      companyId: item.companyId,
      driverId: item.driverId,
    }

    await router.push({
      path: basePath,
      query: queryParams,
    })
  }

  // Handle load button
  const handleLoad = async () => {
    pagination.resetPage()
    await fetchActivities()
  }

  // Handle refresh (rollback)
  const handleRefresh = async (id: string) => {
    const item = tableItems.value.find((i) => i.id === id)
    if (item && canRollback(item)) {
      await rollbackSession(item)
    }
  }

  // Watch carrier change to reload drivers
  watch(companySearch, async (newValue) => {
    driverSearch.value = null
    if (newValue) {
      await fetchDrivers(newValue)
    } else {
      drivers.value = []
    }
  })

  // Watch page change to refetch data from backend
  watch(
    () => pagination.currentPage.value,
    async (newPage, oldPage) => {
      if (hasLoaded.value && newPage !== oldPage) {
        await fetchActivities()
      }
    }
  )

  // Watch selectedTag change to refetch data from backend
  watch(selectedTag, async () => {
    if (hasLoaded.value) {
      pagination.resetPage()
      await fetchActivities()
    }
  })

  // Watch items per page change - reset to page 1 (page change watcher will handle refetch)
  watch(
    () => pagination.itemsPerPage.value,
    async (newSize, oldSize) => {
      if (hasLoaded.value && newSize !== oldSize) {
        // If already on page 1, manually fetch since page won't change
        if (pagination.currentPage.value === 1) {
          await fetchActivities()
        } else {
          pagination.resetPage() // This triggers currentPage watcher which fetches
        }
      }
    }
  )

  // Initialize on mount
  onMounted(async () => {
    await fetchCompanies()
  })

  return {
    // State
    activities,
    isLoading,
    hasLoaded,
    error,
    companies,
    drivers,
    rollbackLoading,
    selectedRollbackId,

    // Filters
    companySearch,
    driverSearch,
    dateRange,
    selectedTag,

    // Sorting
    sortKey: sorting.sortKey,
    sortOrder: sorting.sortOrder,

    // Pagination
    currentPage: pagination.currentPage,
    itemsPerPage: pagination.itemsPerPage,
    totalPages: pagination.totalPages,
    totalEntries: pagination.totalEntries,
    pageNumbers: pagination.pageNumbers,
    goToPage: pagination.goToPage,
    nextPage: pagination.nextPage,
    previousPage: pagination.previousPage,

    // Computed
    tableItems,
    paginatedItems,

    // Functions
    fetchActivities,
    fetchCompanies,
    fetchDrivers,
    handleSort: sorting.handleSort,
    handleLoad,
    handleRefresh,
    rollbackSession,
    canRollback,
    rowSelect,

    // Enums
    SessionStatus,
    SessionType,
  }
}
