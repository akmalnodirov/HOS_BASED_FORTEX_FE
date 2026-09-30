/**
 * Composable for managing HOSRules
 * Handles data fetching, pagination, sorting, and CRUD operations
 */

import { ref, computed, watch, onMounted } from 'vue'
import { useDebounce } from '@/composables/useDebounce'
import { sortArray, commonTransformers } from '@/utils/sort'
import { usePagination } from '@/composables/usePagination'
import { useSorting } from '@/composables/useSorting'
import { hosRuleService } from '../services/hosRuleService'
import type {
  HOSRuleResponse,
  SortKey,
  SortOrder,
  HOSRule,
  HOSRuleFormData,
} from '../types'

export function useHOSRules() {
  // State
  const hosRules = ref<HOSRuleResponse[]>([])
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
    fetchHOSRules()
  })

  /**
   * Fetch HOS rules from API with pagination, search, and sorting
   */
  const fetchHOSRules = async () => {
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

      const response = await hosRuleService.getHOSRules(params)

      if (response.successResult) {
        hosRules.value = response.successResult.data || []
        totalItems.value = response.successResult.totalCount || 0
      } else {
        hosRules.value = []
        totalItems.value = 0
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message || 'Failed to fetch HOS rules'
      console.error('Error fetching HOS rules:', err)
    } finally {
      isLoading.value = false
    }
  }

  // Transform backend data for table display
  // Backend handles filtering, sorting, and pagination
  const paginatedHOSRules = computed(() => {
    const startIndex = (pagination.currentPage.value - 1) * pagination.itemsPerPage.value

    return hosRules.value.map((rule, index) => ({
      id: rule.id,
      no: startIndex + index + 1,
      name: rule.name,
    })) as HOSRule[]
  })

  // Methods
  const addHOSRule = async (data: HOSRuleFormData) => {
    try {
      await hosRuleService.createHOSRule({
        name: data.name,
      })

      await fetchHOSRules()
    } catch (err: any) {
      console.error('Error adding HOS rule:', err)
      throw err
    }
  }

  const updateHOSRule = async (id: string | number, data: HOSRuleFormData) => {
    try {
      await hosRuleService.updateHOSRule(String(id), {
        name: data.name,
      })

      await fetchHOSRules()
    } catch (err: any) {
      console.error('Error updating HOS rule:', err)
      throw err
    }
  }

  const deleteHOSRule = async (id: string | number) => {
    try {
      await hosRuleService.deleteHOSRule(String(id))
      await fetchHOSRules()
    } catch (err: any) {
      console.error('Error deleting HOS rule:', err)
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
      fetchHOSRules()
    }
  )

  // Auto-fetch on mount
  onMounted(async () => {
    await fetchHOSRules()
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
    paginatedHOSRules,

    // Methods
    handleSort: sorting.handleSort,
    addHOSRule,
    updateHOSRule,
    deleteHOSRule,
    fetchHOSRules,
  }
}
