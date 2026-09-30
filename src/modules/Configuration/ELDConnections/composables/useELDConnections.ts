/**
 * Composable for managing ELD Connections
 * Handles data fetching, pagination, sorting, and CRUD operations
 * Fixed memory leaks: proper cleanup of watchers and async operations
 */

import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useDebounce } from '@/composables/useDebounce'
import { sortArray, commonTransformers } from '@/utils/sort'
import { usePagination } from '@/composables/usePagination'
import { useSorting } from '@/composables/useSorting'
import { eldConnectionService } from '../services/eldConnectionService'
import type {
  ELDConnectionResponse,
  SortKey,
  SortOrder,
  ELDConnection,
  ELDConnectionFormData,
} from '../types'

export function useELDConnections() {
  // State
  const eldConnections = ref<ELDConnectionResponse[]>([])
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
      fetchELDConnections()
    }
  })

  /**
   * Fetch ELD connections from API with pagination, search, and sorting
   * Fixed: Checks isMounted before updating state to prevent memory leaks
   */
  const fetchELDConnections = async () => {
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

      const response = await eldConnectionService.getELDConnections(params)

      // Check if still mounted before updating state
      if (!isMounted.value) return

      if (response.successResult) {
        eldConnections.value = response.successResult.data || []
        totalItems.value = response.successResult.totalCount || 0
      } else {
        eldConnections.value = []
        totalItems.value = 0
      }
    } catch (err: any) {
      // Only update error if still mounted
      if (isMounted.value) {
        error.value = err.response?.data?.message || err.message || 'Failed to fetch ELD connections'
        console.error('Error fetching ELD connections:', err)
      }
    } finally {
      if (isMounted.value) {
        isLoading.value = false
      }
    }
  }

  // Transform backend data for table display
  // Backend handles filtering, sorting, and pagination
  const paginatedELDConnections = computed(() => {
    const startIndex = (pagination.currentPage.value - 1) * pagination.itemsPerPage.value

    return eldConnections.value.map((connection, index) => ({
      id: connection.id,
      no: startIndex + index + 1,
      name: connection.name,
    })) as ELDConnection[]
  })

  // Methods
  const addELDConnection = async (data: ELDConnectionFormData) => {
    if (!isMounted.value) return

    try {
      await eldConnectionService.createELDConnection({
        name: data.name,
      })

      if (isMounted.value) {
        await fetchELDConnections()
      }
    } catch (err: any) {
      if (isMounted.value) {
        console.error('Error adding ELD connection:', err)
        throw err
      }
    }
  }

  const updateELDConnection = async (id: string | number, data: ELDConnectionFormData) => {
    if (!isMounted.value) return

    try {
      await eldConnectionService.updateELDConnection(String(id), {
        name: data.name,
      })

      if (isMounted.value) {
        await fetchELDConnections()
      }
    } catch (err: any) {
      if (isMounted.value) {
        console.error('Error updating ELD connection:', err)
        throw err
      }
    }
  }

  const deleteELDConnection = async (id: string | number) => {
    if (!isMounted.value) return

    try {
      await eldConnectionService.deleteELDConnection(String(id))

      if (isMounted.value) {
        await fetchELDConnections()
      }
    } catch (err: any) {
      if (isMounted.value) {
        console.error('Error deleting ELD connection:', err)
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
        fetchELDConnections()
      }
    }
  )

  // Auto-fetch on mount
  onMounted(async () => {
    isMounted.value = true
    await fetchELDConnections()
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
    paginatedELDConnections,

    // Methods
    handleSort: sorting.handleSort,
    addELDConnection,
    updateELDConnection,
    deleteELDConnection,
    fetchELDConnections,
  }
}
