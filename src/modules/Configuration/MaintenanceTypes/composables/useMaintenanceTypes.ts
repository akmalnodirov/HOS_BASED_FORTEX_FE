/**
 * Composable for managing Maintenance Types
 * Handles data fetching, pagination, sorting, and CRUD operations
 * Fixed memory leaks: proper cleanup of watchers and async operations
 */

import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useDebounce } from '@/composables/useDebounce'
import { sortArray, commonTransformers } from '@/utils/sort'
import { usePagination } from '@/composables/usePagination'
import { useSorting } from '@/composables/useSorting'
import { maintenanceTypeService } from '../services/maintenanceTypeService'
import type {
  MaintenanceTypeResponse,
  SortKey,
  SortOrder,
  MaintenanceType,
  MaintenanceTypeFormData,
} from '../types'

export function useMaintenanceTypes() {
  // State
  const maintenanceTypes = ref<MaintenanceTypeResponse[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const searchQuery = ref('')
  const isMounted = ref(true) // Track component mount state to prevent memory leaks

  // Sorting using composable
  const sorting = useSorting<SortKey>({
    defaultKey: 'name',
    defaultOrder: 'asc',
  })

  // Pagination setup
  const totalItems = ref(0)
  const pagination = usePagination(totalItems, { itemsPerPage: 10 })

  // Debounce search - triggers API refetch
  const debouncedSearch = useDebounce(searchQuery, 300, () => {
    if (isMounted.value) {
      pagination.resetPage()
      fetchMaintenanceTypes()
    }
  })

  /**
   * Fetch maintenance types from API with pagination, search, and sorting
   * Fixed: Checks isMounted before updating state to prevent memory leaks
   */
  const fetchMaintenanceTypes = async () => {
    if (!isMounted.value) return

    isLoading.value = true
    error.value = null

    try {
      const params = {
        pageNumber: pagination.currentPage.value,
        pageSize: pagination.itemsPerPage.value,
        search: debouncedSearch.value || undefined,
        sortKey: sorting.sortKey.value || undefined,
        sortOrder: sorting.sortOrder.value || undefined,
      }

      const response = await maintenanceTypeService.getMaintenanceTypes(params)

      // Check if still mounted before updating state
      if (!isMounted.value) return

      if (response.successResult) {
        maintenanceTypes.value = response.successResult.data || []
        totalItems.value = response.successResult.totalCount || 0
      } else {
        maintenanceTypes.value = []
        totalItems.value = 0
      }
    } catch (err: any) {
      // Only update error if still mounted
      if (isMounted.value) {
        error.value = err.response?.data?.message || err.message || 'Failed to fetch maintenance types'
        console.error('Error fetching maintenance types:', err)
      }
    } finally {
      if (isMounted.value) {
        isLoading.value = false
      }
    }
  }

  // Transform backend data for table display
  // Backend handles filtering, sorting, and pagination
  const paginatedMaintenanceTypes = computed(() => {
    const startIndex = (pagination.currentPage.value - 1) * pagination.itemsPerPage.value

    return maintenanceTypes.value.map((type, index) => ({
      id: type.id,
      no: startIndex + index + 1,
      name: type.name,
    })) as MaintenanceType[]
  })

  // Methods
  const addMaintenanceType = async (data: MaintenanceTypeFormData) => {
    if (!isMounted.value) return

    try {
      await maintenanceTypeService.createMaintenanceType({
        name: data.name,
      })

      if (isMounted.value) {
        await fetchMaintenanceTypes()
      }
    } catch (err: any) {
      if (isMounted.value) {
        console.error('Error adding maintenance type:', err)
        throw err
      }
    }
  }

  const updateMaintenanceType = async (id: string | number, data: MaintenanceTypeFormData) => {
    if (!isMounted.value) return

    try {
      await maintenanceTypeService.updateMaintenanceType(String(id), {
        name: data.name,
      })

      if (isMounted.value) {
        await fetchMaintenanceTypes()
      }
    } catch (err: any) {
      if (isMounted.value) {
        console.error('Error updating maintenance type:', err)
        throw err
      }
    }
  }

  const deleteMaintenanceType = async (id: string | number) => {
    if (!isMounted.value) return

    try {
      await maintenanceTypeService.deleteMaintenanceType(String(id))

      if (isMounted.value) {
        await fetchMaintenanceTypes()
      }
    } catch (err: any) {
      if (isMounted.value) {
        console.error('Error deleting maintenance type:', err)
        throw err
      }
    }
  }

  // Watchers - refetch when pagination or sorting changes
  const stopPaginationWatcher = watch(
    [
      () => pagination.currentPage.value,
      () => pagination.itemsPerPage.value,
      () => sorting.sortKey.value,
      () => sorting.sortOrder.value,
    ],
    () => {
      if (isMounted.value) {
        fetchMaintenanceTypes()
      }
    }
  )

  // Auto-fetch on mount
  onMounted(async () => {
    isMounted.value = true
    await fetchMaintenanceTypes()
  })

  // Cleanup on unmount to prevent memory leaks
  onUnmounted(() => {
    isMounted.value = false
    stopPaginationWatcher() // Stop pagination watcher
  })

  return {
    // State
    searchQuery,
    debouncedSearch,
    sortKey: sorting.sortKey,
    sortOrder: sorting.sortOrder,
    isLoading,
    error,

    // Pagination
    currentPage: pagination.currentPage,
    itemsPerPage: pagination.itemsPerPage,
    totalPages: pagination.totalPages,
    totalEntries: pagination.totalEntries,
    pageNumbers: pagination.pageNumbers,
    goToPage: pagination.goToPage,

    // Computed
    paginatedMaintenanceTypes,

    // Methods
    handleSort: sorting.handleSort,
    addMaintenanceType,
    updateMaintenanceType,
    deleteMaintenanceType,
    fetchMaintenanceTypes,
  }
}
