/**
 * Composable for managing IssuerStates
 * Handles data fetching, pagination, sorting, and CRUD operations
 * Uses backend pagination for efficient data loading
 */

import { ref, computed, watch, onMounted } from 'vue'
import { useDebounce } from '@/composables/useDebounce'
import { usePagination } from '@/composables/usePagination'
import { useSorting } from '@/composables/useSorting'
import { issuerStateService } from '../services/issuerStateService'
import { getIssuerStateName } from '../utils/issuerStateHelpers'
import type { IssuerStateResponse, SortKey, IssuerState, IssuerStateFormData } from '../types'

export function useIssuerStates() {
  // State
  const issuerStates = ref<IssuerStateResponse[]>([])
  const parentIssuerStates = ref<IssuerStateResponse[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const searchQuery = ref('')

  // Sorting using composable
  const sorting = useSorting<SortKey>({
    defaultKey: 'name',
    defaultOrder: 'asc',
  })

  // Pagination setup - totalItems updated from API response
  const totalItems = ref(0)
  const pagination = usePagination(totalItems, { itemsPerPage: 10 })

  // Debounce search - triggers API refetch
  const debouncedSearch = useDebounce(searchQuery, 300, async () => {
    pagination.resetPage()
    await fetchIssuerStates()
  })

  /**
   * Fetch issuer states from API with pagination, search, and sorting
   */
  const fetchIssuerStates = async () => {
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

      const response = await issuerStateService.getIssuerStates(params)

      if (response.successResult) {
        issuerStates.value = response.successResult.data || []
        totalItems.value = response.successResult.totalCount || 0
      } else {
        issuerStates.value = []
        totalItems.value = 0
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message || 'Failed to fetch issuer states'
      console.error('Error fetching issuer states:', err)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Fetch parent issuer states (for dropdown)
   */
  const fetchParentIssuerStates = async () => {
    try {
      const response = await issuerStateService.getParentIssuerStates()
      if (response.successResult) {
        parentIssuerStates.value = response.successResult
      }
    } catch (err: any) {
      console.error('Error fetching parent issuer states:', err)
    }
  }

  // Transform backend data for table display
  // Backend handles filtering, sorting, and pagination
  const paginatedIssuerStates = computed(() => {
    const startIndex = (pagination.currentPage.value - 1) * pagination.itemsPerPage.value

    return issuerStates.value.map((state, index) => ({
      id: state.id,
      no: startIndex + index + 1,
      name: state.name,
      parent: getIssuerStateName(state.parentId, parentIssuerStates.value) || 'N/A',
      stateCode: state.stateCode,
      parentId: state.parentId,
    })) as IssuerState[]
  })

  // Methods
  const addIssuerState = async (data: IssuerStateFormData) => {
    try {
      // Find parent ID from parent name
      const parent = parentIssuerStates.value.find((p) => p.name === data.parent)
      if (!parent) {
        throw new Error('Parent issuer state not found')
      }

      await issuerStateService.createIssuerState({
        name: data.name,
        stateCode: data.stateCode,
        parentId: parent.id,
      })

      await fetchIssuerStates()
    } catch (err: any) {
      console.error('Error adding issuer state:', err)
      throw err
    }
  }

  const updateIssuerState = async (id: string | number, data: IssuerStateFormData) => {
    try {
      // Find parent ID from parent name
      const parent = parentIssuerStates.value.find((p) => p.name === data.parent)
      if (!parent) {
        throw new Error('Parent issuer state not found')
      }

      await issuerStateService.updateIssuerState(String(id), {
        name: data.name,
        stateCode: data.stateCode,
        parentId: parent.id,
      })

      await fetchIssuerStates()
    } catch (err: any) {
      console.error('Error updating issuer state:', err)
      throw err
    }
  }

  const deleteIssuerState = async (id: string | number) => {
    try {
      await issuerStateService.deleteIssuerState(String(id))
      await fetchIssuerStates()
    } catch (err: any) {
      console.error('Error deleting issuer state:', err)
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
      fetchIssuerStates()
    }
  )

  // Auto-fetch on mount
  onMounted(async () => {
    await Promise.all([fetchIssuerStates(), fetchParentIssuerStates()])
  })

  return {
    // State
    searchQuery,
    debouncedSearch,
    sortKey: sorting.sortKey,
    sortOrder: sorting.sortOrder,
    isLoading,
    error,
    parentIssuerStates: computed(() => parentIssuerStates.value),

    // Pagination
    currentPage: pagination.currentPage,
    itemsPerPage: pagination.itemsPerPage,
    totalPages: pagination.totalPages,
    totalEntries: pagination.totalEntries,
    pageNumbers: pagination.pageNumbers,
    goToPage: pagination.goToPage,

    // Computed
    paginatedIssuerStates,

    // Methods
    handleSort: sorting.handleSort,
    addIssuerState,
    updateIssuerState,
    deleteIssuerState,
    fetchIssuerStates,
    fetchParentIssuerStates,
  }
}
