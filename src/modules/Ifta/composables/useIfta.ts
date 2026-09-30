import { ref, computed, watch, onMounted } from 'vue'
import { useApi } from '@/composables/useAxiosService'
import { toast } from 'vue-sonner'
import { usePagination } from '@/composables/usePagination'
import { useModalState } from '@/composables/useModalState'
import { ApiEndpoints } from '@/api/endpoints'
import { getCarrierId } from '@/utils/carrier'
import { useTimeZoneHelper } from '@/composables/useTimezone'
import dayjs from 'dayjs'
import type {
  IftaApiResponse,
  IftaRecord,
  IftaGenerateRequest,
  VehicleOption,
} from '@/modules/Ifta/types'

interface IftaListResponse {
  successResult: {
    data: IftaApiResponse[]
    totalCount: number
  }
}

interface VehiclesResponse {
  successResult: {
    data: VehicleOption[]
    totalCount: number
  }
}

export interface UseIftaOptions {
  carrierId: string
  autoFetch?: boolean
}

export function useIfta(options: UseIftaOptions) {
  const { carrierId, autoFetch = true } = options
  const api = useApi()
  const { formatToUTC, getStartOf, getEndOf } = useTimeZoneHelper()

  // State
  const iftaRecords = ref<IftaRecord[]>([])
  const vehicles = ref<VehicleOption[]>([])
  const isLoading = ref(false)
  const isLoadingVehicles = ref(false)
  const isSubmitting = ref(false)
  const error = ref<string | null>(null)

  // Pagination
  const totalCount = ref(0)
  const pagination = usePagination(totalCount, { itemsPerPage: 10 })

  // Modal
  const addModal = useModalState()

  // Form state for generating IFTA report
  const selectedVehicleIds = ref<string[]>([])
  const dateRange = ref<[string, string]>([
    dayjs().subtract(30, 'days').format('YYYY-MM-DD'),
    dayjs().format('YYYY-MM-DD'),
  ])

  // Transform API response to UI shape
  const mapApiToRecord = (item: IftaApiResponse, index: number): IftaRecord => ({
    id: item.id,
    submitted: dayjs(item.dateTime).format('MMM D, hh:mm A'),
    from: dayjs(item.startDate).format('YYYY/MM/DD'),
    to: dayjs(item.endDate).format('YYYY/MM/DD'),
    vehicleId: item.vehicle?.unit || 'N/A',
    status: 'ready',
    pdfPath: item.pdfPath || '',
    csvPath: item.csvPath || '',
  })

  // Fetch IFTA records
  const fetchIfta = async () => {
    isLoading.value = true
    error.value = null
    try {
      const response = await api.get<IftaListResponse>(ApiEndpoints.IFTA_FILTER, {
        params: {
          carrierId,
          pageNumber: pagination.currentPage.value,
          pageSize: pagination.itemsPerPage.value,
        },
      })

      if (response.data?.successResult) {
        const apiData = response.data.successResult.data || []
        totalCount.value = response.data.successResult.totalCount || 0
        iftaRecords.value = apiData.map((item, i) => mapApiToRecord(item, i))
      } else {
        iftaRecords.value = []
        totalCount.value = 0
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message || 'Failed to fetch IFTA reports'
      console.error('Error fetching IFTA:', err)
    } finally {
      isLoading.value = false
    }
  }

  // Fetch vehicles for selection
  const fetchVehicles = async () => {
    isLoadingVehicles.value = true
    try {
      const response = await api.post<VehiclesResponse>(ApiEndpoints.VEHICLES_FILTER, {
        carrierId,
      })
      if (response.data?.successResult?.data) {
        vehicles.value = response.data.successResult.data
      }
    } catch (err: any) {
      console.error('Error fetching vehicles:', err)
    } finally {
      isLoadingVehicles.value = false
    }
  }

  // Generate IFTA report
  const generateIfta = async () => {
    if (!selectedVehicleIds.value.length) {
      toast.error('Please select at least one vehicle')
      return
    }

    isSubmitting.value = true
    try {
      const request: IftaGenerateRequest = {
        vehicleIds: selectedVehicleIds.value,
        startDate: formatToUTC(getStartOf(dayjs(dateRange.value[0]))),
        endDate: formatToUTC(getEndOf(dayjs(dateRange.value[1]))),
        carrierId,
      }

      await api.post(ApiEndpoints.IFTA_GENERATE, request)
      toast.success('IFTA report generated successfully')
      addModal.close()
      selectedVehicleIds.value = []
      await fetchIfta()
    } catch (err: any) {
      console.error('Error generating IFTA:', err)
    } finally {
      isSubmitting.value = false
    }
  }

  // Download report
  const downloadReport = (path: string) => {
    if (!path) return
    const fileName = path.split('/').pop() || path
    window.open(`https://dev-new.routeeld.uz/IftaReports/${fileName}`, '_blank')
  }

  // Validation
  const isGenerateDisabled = computed(
    () => isSubmitting.value || selectedVehicleIds.value.length === 0
  )

  // Watch pagination
  watch(
    [() => pagination.currentPage.value, () => pagination.itemsPerPage.value],
    async () => {
      await fetchIfta()
    }
  )

  // Auto-fetch
  if (autoFetch) {
    onMounted(async () => {
      await Promise.allSettled([fetchIfta(), fetchVehicles()])
    })
  }

  return {
    // State
    iftaRecords,
    vehicles,
    isLoading,
    isLoadingVehicles,
    isSubmitting,
    error,

    // Form
    selectedVehicleIds,
    dateRange,

    // Modal
    isAddModalOpen: addModal.isOpen,
    openAddModal: addModal.open,
    closeAddModal: addModal.close,

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
    isGenerateDisabled,

    // Actions
    fetchIfta,
    fetchVehicles,
    generateIfta,
    downloadReport,
  }
}
