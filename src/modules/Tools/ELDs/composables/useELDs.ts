import { ref, watch, onMounted } from 'vue'
import { useApi } from '@/composables/useAxiosService'
import { usePagination } from '@/composables/usePagination'
import { useModalState } from '@/composables/useModalState'
import type { EldInfo, EldsListResponse, UpdateEldFileRequest } from '../types'

export type ConnectionFilter = 'all' | 'active' | 'inactive'

export interface UseELDsOptions {
  carrierId: string
  autoFetch?: boolean
}

export function useELDs(options: UseELDsOptions) {
  const { carrierId, autoFetch = false } = options
  const api = useApi()

  // State
  const elds = ref<EldInfo[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const connectionFilter = ref<ConnectionFilter>('all')

  // Modal State
  const updateModal = useModalState<EldInfo>()

  // Pagination
  const totalItems = ref(0)
  const pagination = usePagination(totalItems, {
    itemsPerPage: 10,
  })

  // Fetch ELDs
  const fetchELDs = async () => {
    isLoading.value = true
    error.value = null

    try {
      const params: Record<string, any> = {
        CarrierId: carrierId,
        pageNumber: pagination.currentPage.value,
        pageSize: pagination.itemsPerPage.value,
      }

      // Add connection status filter
      if (connectionFilter.value === 'active') {
        params.IsConnected = true
      } else if (connectionFilter.value === 'inactive') {
        params.IsConnected = false
      }
      // 'all' → don't send IsConnected (returns all)

      const response = await api.get<EldsListResponse>('/api/eld-infos/filter', { params })

      if (response.data?.successResult) {
        elds.value = response.data.successResult.data || []
        totalItems.value = response.data.successResult.totalCount || 0
      } else {
        elds.value = []
        totalItems.value = 0
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message || 'Failed to fetch ELDs'
      console.error('Error fetching ELDs:', err)
    } finally {
      isLoading.value = false
    }
  }

  // Update ELD File
  const updateEldFile = async (data: UpdateEldFileRequest) => {
    try {
      await api.post('/api/eld-infos/set-update-file', data)
      await fetchELDs() // Refresh list after update
      updateModal.close()
    } catch (err: any) {
      console.error('Error updating ELD file:', err)
      throw err // Re-throw to be handled by component if needed
    }
  }

  // Watchers
  watch([() => pagination.currentPage.value, () => pagination.itemsPerPage.value], async () => {
    await fetchELDs()
  })

  // Watch connection filter changes
  watch(connectionFilter, async () => {
    pagination.resetPage()
    await fetchELDs()
  })

  // Auto-fetch
  if (autoFetch) {
    onMounted(async () => {
      await fetchELDs()
    })
  }

  return {
    elds,
    isLoading,
    error,
    connectionFilter,
    
    // Pagination
    currentPage: pagination.currentPage,
    itemsPerPage: pagination.itemsPerPage,
    totalPages: pagination.totalPages,
    totalEntries: pagination.totalEntries,
    pageNumbers: pagination.pageNumbers,
    goToPage: pagination.goToPage,
    nextPage: pagination.nextPage,
    previousPage: pagination.previousPage,

    // Modal
    isUpdateModalOpen: updateModal.isOpen,
    selectedEld: updateModal.selectedItem,
    openUpdateModal: updateModal.open,
    closeUpdateModal: updateModal.close,

    // Actions
    fetchELDs,
    updateEldFile,
  }
}
