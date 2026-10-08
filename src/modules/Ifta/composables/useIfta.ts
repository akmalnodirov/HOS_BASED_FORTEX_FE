import { computed, onMounted, onUnmounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import { ApiEndpoints } from '@/api/endpoints'
import { useApi } from '@/composables/useAxiosService'
import type { IftaApiResponse, IftaGenerateRequest, VehicleOption } from '@/modules/Ifta/types'

interface IftaListResponse {
  successResult: IftaApiResponse[]
}

interface VehiclesResponse {
  successResult: VehicleOption[]
}

export interface UseIftaOptions {
  companyId: string
  autoFetch?: boolean
}

export function useIfta(options: UseIftaOptions) {
  const { companyId, autoFetch = true } = options
  const api = useApi()
  const reports = ref<IftaApiResponse[]>([])
  const vehicles = ref<VehicleOption[]>([])
  const isLoading = ref(false)
  const isRefreshing = ref(false)
  const isLoadingVehicles = ref(false)
  const isSubmitting = ref(false)
  const error = ref<string | null>(null)
  let refreshTimer: ReturnType<typeof setInterval> | undefined

  const hasPendingReports = computed(() =>
    reports.value.some((report) => ['PROCESSING', 'WAITING'].includes(report.status.toUpperCase()))
  )

  const updatePolling = () => {
    if (hasPendingReports.value && !refreshTimer)
      refreshTimer = setInterval(() => void fetchIfta(true), 5000)
    else if (!hasPendingReports.value && refreshTimer) {
      clearInterval(refreshTimer)
      refreshTimer = undefined
    }
  }

  const fetchIfta = async (silent = false) => {
    if (!companyId) {
      error.value = 'Select a company before opening IFTA.'
      return
    }
    if (silent) isRefreshing.value = true
    else isLoading.value = true
    error.value = null
    try {
      const response = await api.get<IftaListResponse>(ApiEndpoints.IFTA_FILTER, {
        params: { companyId },
      })
      reports.value = response.data?.successResult || []
      updatePolling()
    } catch (exception: any) {
      error.value =
        exception.response?.data?.message || exception.message || 'Failed to fetch IFTA reports'
    } finally {
      isLoading.value = false
      isRefreshing.value = false
    }
  }

  const fetchVehicles = async () => {
    if (!companyId) return
    isLoadingVehicles.value = true
    try {
      const response = await api.get<VehiclesResponse>(ApiEndpoints.IFTA_VEHICLES, {
        params: { companyId },
      })
      vehicles.value = response.data?.successResult || []
    } finally {
      isLoadingVehicles.value = false
    }
  }

  const generateIfta = async (data: {
    vehicleIds: string[]
    startDate: string
    endDate: string
    states: string[]
  }) => {
    if (!data.vehicleIds.length) {
      toast.error('Please select at least one vehicle')
      return false
    }

    isSubmitting.value = true
    try {
      const request: IftaGenerateRequest = {
        vehicleIds: data.vehicleIds,
        fromDate: data.startDate,
        toDate: data.endDate,
        timeZoneId: 'CT',
        companyId,
        states: data.states,
      }
      await api.post(ApiEndpoints.IFTA_GENERATE, request)
      toast.success('IFTA report generation requested')
      await fetchIfta(true)
      return true
    } finally {
      isSubmitting.value = false
    }
  }

  const fetchCsv = async (url: string) => {
    const response = await api.get<string>(ApiEndpoints.IFTA_FILE, {
      params: { companyId, url },
      responseType: 'text',
      _skipErrorHandling: true,
    })
    return response.data
  }

  if (autoFetch) {
    onMounted(async () => {
      await Promise.allSettled([fetchIfta(), fetchVehicles()])
    })
  }

  onUnmounted(() => {
    if (refreshTimer) clearInterval(refreshTimer)
  })

  return {
    reports,
    vehicles,
    isLoading,
    isRefreshing,
    isLoadingVehicles,
    isSubmitting,
    error,
    fetchIfta,
    fetchVehicles,
    generateIfta,
    fetchCsv,
  }
}
