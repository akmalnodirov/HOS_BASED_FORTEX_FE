// src/composables/useDelMenu.ts
import { ref, computed, watch, onMounted } from 'vue'
import { useApi } from '@/composables/useAxiosService'
import { ApiEndpoints } from '@/api/endpoints'
import type {
  DeletionMenuListResponse,
  DeletionMenuItem,
  AssignTestDriverRequest,
} from '@/modules/Tools/DeletionMenu/types'
import { usePagination } from '@/composables/usePagination'
import { useAuthStore } from '@/modules/Auth/store/authStore'
import { toast } from 'vue-sonner'

export interface UseDeletionMenuOptions {
  autoFetch?: boolean
}

export function useDelMenu(options: UseDeletionMenuOptions = {}) {
  const { autoFetch = true } = options
  const api = useApi()
  const authStore = useAuthStore()

  // State
  const deletionMenuItems = ref<DeletionMenuItem[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const totalCount = ref(0)
  const search = ref('')

  // Setup pagination
  const pagination = usePagination(totalCount, {
    itemsPerPage: 10,
  })

  // Transform items to table rows
  const rows = computed(() =>
    deletionMenuItems.value.map((item, index) => ({
      counter: pagination.itemsPerPage.value * (pagination.currentPage.value - 1) + index + 1,
      id: item.id,
      system: item.clientName || 'N/A',
      company: item.name || 'N/A',
      drivers: item.drivers,
      testDriverId: item.drivers.find((driver) => driver.isTestDriver)?.driverId || null,
    }))
  )

  // Fetch deletion menu companies
  const fetchDeletionMenu = async () => {
    isLoading.value = true
    error.value = null

    try {
      const params: Record<string, any> = {
        PageNumber: pagination.currentPage.value,
        PageSize: pagination.itemsPerPage.value,
        ClientId: authStore.clientId,
        Search: search.value || undefined,
      }

      const response = await api.get<DeletionMenuListResponse>(
        ApiEndpoints.DELETION_MENU_COMPANIES,
        { params }
      )

      if (response.data?.successResult) {
        deletionMenuItems.value = response.data.successResult.data || []
        totalCount.value = response.data.successResult.totalCount || deletionMenuItems.value.length
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message || 'Failed to fetch deletion menu'
      console.error('Error fetching deletion menu:', err)
    } finally {
      isLoading.value = false
    }
  }

  // Assign test driver
  const assignDriver = async (driverId: string, companyId: string) => {
    try {
      const payload: AssignTestDriverRequest = {
        driverId,
        companyId,
        isTestDriver: true,
      }

      await api.post(ApiEndpoints.DELETION_MENU_ASSIGN_TEST_DRIVER, payload, {
        _showSuccessToast: false,
      })

      toast.success('Test driver assigned successfully')
      await fetchDeletionMenu()
    } catch (err: any) {
      console.error('Error assigning test driver:', err)
      toast.error(err.response?.data?.message || 'Failed to assign test driver')
    }
  }

  // Handle sync button
  const handleSync = async () => {
    await fetchDeletionMenu()
  }

  // Watch pagination changes
  watch(
    [() => pagination.currentPage.value, () => pagination.itemsPerPage.value],
    async ([newPage, newSize], [oldPage, oldSize]) => {
      if (newPage !== oldPage || newSize !== oldSize) {
        await fetchDeletionMenu()
      }
    }
  )

  // Watch search changes with debounce
  let searchTimeout: ReturnType<typeof setTimeout>
  watch(search, () => {
    clearTimeout(searchTimeout)
    searchTimeout = setTimeout(async () => {
      pagination.resetPage()
      await fetchDeletionMenu()
    }, 500)
  })

  // Auto-fetch on mount
  if (autoFetch) {
    onMounted(async () => {
      await fetchDeletionMenu()
    })
  }

  return {
    // State
    isLoading,
    error,

    // Table
    rows,
    search,

    // Pagination
    currentPage: pagination.currentPage,
    itemsPerPage: pagination.itemsPerPage,
    totalPages: pagination.totalPages,
    totalEntries: pagination.totalEntries,
    pageNumbers: pagination.pageNumbers,
    goToPage: pagination.goToPage,
    nextPage: pagination.nextPage,
    previousPage: pagination.previousPage,

    // Functions
    assignDriver,
    handleSync,
  }
}
