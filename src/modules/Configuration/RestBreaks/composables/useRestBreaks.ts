/**
 * Composable for managing RestBreaks
 * Handles data fetching, pagination, sorting, and CRUD operations
 */

import { ref, computed, watch, onMounted } from 'vue'
import { useDebounce } from '@/composables/useDebounce'
import { sortArray, commonTransformers } from '@/utils/sort'
import { usePagination } from '@/composables/usePagination'
import { useSorting } from '@/composables/useSorting'
import { restBreakService } from '../services/restBreakService'
import type {
  RestBreakResponse,
  SortKey,
  SortOrder,
  RestBreak,
  RestBreakFormData,
} from '../types'

export function useRestBreaks() {
  // State
  const restBreaks = ref<RestBreakResponse[]>([])
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
    fetchRestBreaks()
  })

  /**
   * Fetch rest breaks from API with pagination, search, and sorting
   */
  const fetchRestBreaks = async () => {
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

      const response = await restBreakService.getRestBreaks(params)

      if (response.successResult) {
        restBreaks.value = response.successResult.data || []
        totalItems.value = response.successResult.totalCount || 0
      } else {
        restBreaks.value = []
        totalItems.value = 0
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message || 'Failed to fetch rest breaks'
      console.error('Error fetching rest breaks:', err)
    } finally {
      isLoading.value = false
    }
  }

  // Transform backend data for table display
  // Backend handles filtering, sorting, and pagination
  const paginatedRestBreaks = computed(() => {
    const startIndex = (pagination.currentPage.value - 1) * pagination.itemsPerPage.value

    return restBreaks.value.map((restBreak, index) => ({
      id: restBreak.id,
      no: startIndex + index + 1,
      name: restBreak.name,
    })) as RestBreak[]
  })

  // Methods
  const addRestBreak = async (data: RestBreakFormData) => {
    try {
      await restBreakService.createRestBreak({
        name: data.name,
      })

      await fetchRestBreaks()
    } catch (err: any) {
      console.error('Error adding rest break:', err)
      throw err
    }
  }

  const updateRestBreak = async (id: string | number, data: RestBreakFormData) => {
    try {
      await restBreakService.updateRestBreak(String(id), {
        name: data.name,
      })

      await fetchRestBreaks()
    } catch (err: any) {
      console.error('Error updating rest break:', err)
      throw err
    }
  }

  const deleteRestBreak = async (id: string | number) => {
    try {
      await restBreakService.deleteRestBreak(String(id))
      await fetchRestBreaks()
    } catch (err: any) {
      console.error('Error deleting rest break:', err)
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
      fetchRestBreaks()
    }
  )

  // Auto-fetch on mount
  onMounted(async () => {
    await fetchRestBreaks()
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
    paginatedRestBreaks,

    // Methods
    handleSort: sorting.handleSort,
    addRestBreak,
    updateRestBreak,
    deleteRestBreak,
    fetchRestBreaks,
  }
}
