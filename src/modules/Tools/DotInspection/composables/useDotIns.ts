import { computed, onMounted, ref, watch } from 'vue'
import { useApi } from '@/composables/useAxiosService'
import { ApiEndpoints } from '@/api/endpoints'
import type {
  CreateDotInspectionRequest,
  DotInspection,
  DotInspectionListResponse,
} from '@/modules/Tools/DotInspection/types'
import { usePagination } from '@/composables/usePagination'
import { useSorting } from '@/composables/useSorting'
import { useModalState } from '@/composables/useModalState'
import { useTimeZoneHelper } from '@/composables/useTimezone'
import { useAuthStore } from '@/modules/Auth/store/authStore'
import { useCarriersDrivers } from '@/composables/useCarriersDrivers'
import { getCarrierId } from '@/utils/carrier'
import { toast } from 'vue-sonner'

export type SortKey =
  | 'id'
  | 'providerName'
  | 'carrierName'
  | 'driverName'
  | 'startDate'
  | 'endDate'
  | 'dateTime'

export type SortOrder = 'asc' | 'desc'

export interface UseDotInspectionOptions {
  autoFetch?: boolean
}

export function useDotIns(options: UseDotInspectionOptions = {}) {
  const { autoFetch = true } = options
  const api = useApi()
  const authStore = useAuthStore()
  const { formatToUTC, getStartOf, getEndOf, acceptAsTimeZone } = useTimeZoneHelper()

  // State
  const dotInspections = ref<DotInspection[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const totalCount = ref(0)

  // Carriers and drivers from shared composable
  const { carriers, drivers, fetchCarriers, fetchDrivers } = useCarriersDrivers()

  // Filters
  const selectedCarrier = ref<string | null>(getCarrierId())
  const selectedDriver = ref<string | null>(null)
  const selectedTag = ref<'all' | 'enabled' | 'disabled'>('all')

  const isConfirmLoading = ref(false)
  const isSettingFilters = ref(false)

  // Modal state using composable
  const createModal = useModalState()
  const confirmModal = useModalState<{
    type: 'enable' | 'disable' | 'delete'
    dotId: string
    message: string
  }>()

  // Sorting using composable
  const sorting = useSorting<SortKey>({
    defaultKey: 'id',
    defaultOrder: 'asc',
  })

  // Setup pagination
  const pagination = usePagination(totalCount, {
    itemsPerPage: 10,
  })

  // Computed options for dropdowns
  const carrierOptions = computed(() => [...carriers.value])

  const driverOptions = computed(() => [...drivers.value])

  // Paginated dot inspections (data comes from server already paginated)
  const paginatedDotInspections = computed(() => dotInspections.value)

  // Fetch dot inspections
  const fetchDotInspections = async () => {
    isLoading.value = true
    error.value = null

    try {
      const params: Record<string, any> = {
        PageNumber: pagination.currentPage.value,
        PageSize: pagination.itemsPerPage.value,
      }

      // Add driver filter
      if (selectedDriver.value && selectedDriver.value !== 'all') {
        params.DriverId = selectedDriver.value
      }

      // Add carrier filter
      if (selectedCarrier.value && selectedCarrier.value !== 'all') {
        params.CarrierId = selectedCarrier.value
      } else {
        // Use current carrier from localStorage
        const carrierId = getCarrierId()
        if (carrierId) {
          params.CarrierId = carrierId
        }
      }

      // Add status filter
      if (selectedTag.value !== 'all') {
        params.Status = selectedTag.value === 'enabled' ? 0 : 1
      }

      const response = await api.get<DotInspectionListResponse>(ApiEndpoints.DOT_INSPECTIONS, {
        params,
      })

      if (response.data?.successResult) {
        if (Array.isArray(response.data.successResult)) {
          dotInspections.value = response.data.successResult
          totalCount.value = response.data.successResult.length
        } else {
          dotInspections.value = response.data.successResult.data || []
          totalCount.value = response.data.successResult.totalCount || dotInspections.value.length
        }
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message || 'Failed to fetch dot inspections'
      console.error('Error fetching dot inspections:', err)
    } finally {
      isLoading.value = false
    }
  }

  // Watch carrier change to reload drivers and dot inspections
  watch(selectedCarrier, async (newValue) => {
    if (isSettingFilters.value) return
    pagination.resetPage()
    selectedDriver.value = null
    if (newValue && newValue !== 'all') {
      await fetchDrivers(newValue)
      if (drivers.value.length > 0 && !selectedDriver.value) {
        selectedDriver.value = drivers.value[0].id
      }
    } else {
      drivers.value = []
    }
    await fetchDotInspections()
  })

  // Watch driver change
  watch(selectedDriver, async () => {
    if (isSettingFilters.value) return
    pagination.resetPage()
    await fetchDotInspections()
  })

  // Watch tag/status change
  watch(selectedTag, async () => {
    pagination.resetPage()
    await fetchDotInspections()
  })

  // Watch pagination changes
  watch(
    [() => pagination.currentPage.value, () => pagination.itemsPerPage.value],
    async ([newPage, newSize], [oldPage, oldSize]) => {
      if (newPage !== oldPage || newSize !== oldSize) {
        await fetchDotInspections()
      }
    }
  )

  // Create dot inspection
  const createDotInspection = async (data: CreateDotInspectionRequest) => {
    try {
      const payload = {
        ...data,
        startDate: formatToUTC(getStartOf(data.startDate)),
        endDate: formatToUTC(getEndOf(data.endDate)),
      }

      await api.post(ApiEndpoints.DOT_INSPECTIONS, payload, {
        _showSuccessToast: false,
      })

      toast.success('DOT inspection created successfully')
      createModal.close()

      // Update filter selects to show the newly created item
      isSettingFilters.value = true
      try {
        selectedCarrier.value = data.carrierId
        await fetchDrivers(data.carrierId)
        selectedDriver.value = data.driverId
        pagination.resetPage()
        await fetchDotInspections()
      } finally {
        isSettingFilters.value = false
      }
    } catch (err: any) {
      console.error('Error creating dot inspection:', err)
      toast.error(err.response?.data?.message || 'Failed to create DOT inspection')
      throw err
    }
  }

  // Open confirm modal
  const openConfirmModal = (type: 'enable' | 'disable' | 'delete', dotId: string) => {
    const messages = {
      enable: 'Do you really want to enable?',
      disable: 'Do you really want to disable?',
      delete: 'Do you really want to delete?',
    }

    confirmModal.open({
      type,
      dotId,
      message: messages[type],
    })
  }

  // Handle confirm action (enable/disable/delete)
  const handleConfirmAction = async () => {
    if (!confirmModal.selectedItem.value) return

    const { type, dotId } = confirmModal.selectedItem.value

    isConfirmLoading.value = true
    try {
      if (type === 'delete') {
        await api.delete(ApiEndpoints.DOT_INSPECTION_BY_ID(dotId), {
          _showSuccessToast: false,
        })
        toast.success('DOT inspection deleted successfully')
      } else {
        const status = type === 'enable' ? 0 : 1
        await api.put(
          ApiEndpoints.DOT_INSPECTION_STATUS(dotId),
          { status },
          {
            _showSuccessToast: false,
          }
        )
        toast.success(`DOT inspection ${type}d successfully`)
      }

      await fetchDotInspections()
      confirmModal.close()
    } catch (err: any) {
      console.error(`Error ${type}ing dot inspection:`, err)
      toast.error(err.response?.data?.message || `Failed to ${type} DOT inspection`)
      throw err
    } finally {
      isConfirmLoading.value = false
    }
  }

  // Status helpers
  const getStatusBadge = (status: number) => {
    return status === 0 ? 'Enabled' : 'Disabled'
  }

  const getStatusBadgeClass = (status: number) => {
    return status === 0
      ? 'bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900 dark:text-green-300'
      : 'bg-gray-100 text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300'
  }

  // Auto-fetch on mount
  if (autoFetch) {
    onMounted(async () => {
      await fetchCarriers()
      if (selectedCarrier.value) {
        await fetchDrivers(selectedCarrier.value)
        if (drivers.value.length > 0 && !selectedDriver.value) {
          selectedDriver.value = drivers.value[0].id
        }
      }
      await fetchDotInspections()
    })
  }

  return {
    // State
    dotInspections,
    isLoading,
    error,
    carriers,
    drivers,
    carrierOptions,
    driverOptions,

    // For backward compatibility with page
    systemOptions: carrierOptions,

    // Filters
    selectedCarrier,
    selectedDriver,
    selectedTag,

    // For backward compatibility
    selectedSystem: selectedCarrier,

    // Modal state
    isCreateModalOpen: createModal.isOpen,
    openCreateModal: createModal.open,
    closeCreateModal: createModal.close,
    isConfirmModalOpen: confirmModal.isOpen,
    isConfirmLoading,
    confirmModalConfig: confirmModal.selectedItem,
    openConfirmModal,
    closeConfirmModal: confirmModal.close,

    // Sorting
    sortKey: sorting.sortKey,
    sortOrder: sorting.sortOrder,
    handleSort: sorting.handleSort,

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
    paginatedDotInspections,

    // Functions
    fetchDotInspections,
    fetchCarriers,
    fetchDrivers,
    createDotInspection,
    handleConfirmAction,
    getStatusBadge,
    getStatusBadgeClass,
  }
}
