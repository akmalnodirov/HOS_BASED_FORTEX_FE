/**
 * Composable for managing Restarts
 * Handles data fetching, pagination, sorting, and CRUD operations
 */

import { ref, computed, watch, onMounted } from 'vue'
import { useDebounce } from '@/composables/useDebounce'
import { sortArray, commonTransformers } from '@/utils/sort'
import { usePagination } from '@/composables/usePagination'
import { useSorting } from '@/composables/useSorting'
import { restartService } from '../services/restartService'
import type {
  RestartResponse,
  SortKey,
  SortOrder,
  Restart,
  RestartFormData,
} from '../types'

export function useRestarts() {
  // State
  const restarts = ref<RestartResponse[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const searchQuery = ref('')

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
    pagination.resetPage()
    fetchRestarts()
  })

  /**
   * Fetch restarts from API with pagination, search, and sorting
   */
  const fetchRestarts = async () => {
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

      const response = await restartService.getRestarts(params)

      if (response.successResult) {
        restarts.value = response.successResult.data || []
        totalItems.value = response.successResult.totalCount || 0
      } else {
        restarts.value = []
        totalItems.value = 0
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message || 'Failed to fetch restarts'
      console.error('Error fetching restarts:', err)
    } finally {
      isLoading.value = false
    }
  }

  // Transform backend data for table display
  // Backend handles filtering, sorting, and pagination
  const paginatedRestarts = computed(() => {
    const startIndex = (pagination.currentPage.value - 1) * pagination.itemsPerPage.value

    return restarts.value.map((restart, index) => ({
      id: restart.id,
      no: startIndex + index + 1,
      name: restart.name,
    })) as Restart[]
  })

  // Methods
  const addRestart = async (data: RestartFormData) => {
    try {
      await restartService.createRestart({
        name: data.name,
      })

      await fetchRestarts()
    } catch (err: any) {
      console.error('Error adding restart:', err)
      throw err
    }
  }

  const updateRestart = async (id: string | number, data: RestartFormData) => {
    try {
      await restartService.updateRestart(String(id), {
        name: data.name,
      })

      await fetchRestarts()
    } catch (err: any) {
      console.error('Error updating restart:', err)
      throw err
    }
  }

  const deleteRestart = async (id: string | number) => {
    try {
      await restartService.deleteRestart(String(id))
      await fetchRestarts()
    } catch (err: any) {
      console.error('Error deleting restart:', err)
      throw err
    }
  }

  // Watchers - refetch when pagination or sorting changes
  watch(
    [
      () => pagination.currentPage.value,
      () => pagination.itemsPerPage.value,
      () => sorting.sortKey.value,
      () => sorting.sortOrder.value,
    ],
    () => {
      fetchRestarts()
    }
  )

  // Auto-fetch on mount
  onMounted(async () => {
    await fetchRestarts()
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
    paginatedRestarts,

    // Methods
    handleSort: sorting.handleSort,
    addRestart,
    updateRestart,
    deleteRestart,
    fetchRestarts,
  }
}
