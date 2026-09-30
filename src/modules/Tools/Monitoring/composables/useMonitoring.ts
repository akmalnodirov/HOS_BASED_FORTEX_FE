// src/composables/useMonitoring.ts
import { ref, computed, onMounted } from 'vue'
import { useApi } from '@/composables/useAxiosService'
import { ApiEndpoints } from '@/api/endpoints'
import type {
  MonitoringResponse,
  MonitoringCarrier,
  MonitoringStats,
} from '@/modules/Tools/Monitoring/types'

export interface UseMonitoringOptions {
  autoFetch?: boolean
  providerId: string
}

export function useMonitoring(options: UseMonitoringOptions) {
  const { autoFetch = true, providerId } = options
  const api = useApi()

  // State
  const carriers = ref<MonitoringCarrier[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Filters
  const selectedCarrier = ref<string | null>(null)

  // Mock carriers for dropdown
  const carrierOptions = ref([{ id: 'all', name: 'All carriers' }])

  // Calculate stats for each carrier
  const getCarrierStats = (carrier: MonitoringCarrier): MonitoringStats => {
    let warnings = 0
    let errors = 0
    const errorMessages: Record<string, number> = {}

    carrier.monitoringDrivers.forEach((driver) => {
      if (driver.hasViolation) {
        errors++
      }

      driver.hosRecords.forEach((record) => {
        if (record.hasViolation) {
          warnings++
        }
      })

      // Mock error message counting
      const errorMsg = 'Engine hours error'
      errorMessages[errorMsg] = (errorMessages[errorMsg] || 0) + 1
    })

    const mostCommon = Object.entries(errorMessages).sort((a, b) => b[1] - a[1])[0]

    return {
      warnings,
      errors: errors || 123, // Mock data
      mostCommonError: mostCommon ? mostCommon[0] : 'Engine hours error',
    }
  }

  // Progress bar segments
  const getProgressSegments = computed(() => {
    const total = 120
    const completed = 94
    const problems = Math.floor(Math.random() * 20) + 10 // Mock
    const clear = completed - problems
    const remaining = total - completed

    return {
      problems: (problems / total) * 100,
      clear: (clear / total) * 100,
      remaining: (remaining / total) * 100,
    }
  })

  // Event code to name mapping
  const getEventName = (eventCode: number): string => {
    const eventMap: Record<number, string> = {
      1: 'Off duty',
      2: 'Sleeper',
      3: 'Driving',
      4: 'On duty',
    }
    return eventMap[eventCode] || 'Unknown'
  }

  // Event code to badge color mapping
  const getEventBadgeClass = (eventCode: number): string => {
    const colorMap: Record<number, string> = {
      1: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      2: 'bg-[#EBF0FF] text-[#6082E0] dark:bg-purple-900 dark:text-purple-300',
      3: 'bg-[#FBF4EC] text-[#D28E3D] dark:bg-orange-900 dark:text-orange-300',
      4: 'bg-[#EBF5EE] text-[#589E67] dark:bg-blue-900 dark:text-blue-300',
    }
    return colorMap[eventCode] || 'bg-gray-100 text-gray-700'
  }

  // Format duration from seconds to "Xh"
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    return `${hours}h`
  }

  // Fetch monitoring data
  const fetchMonitoring = async () => {
    isLoading.value = true
    error.value = null

    try {
      const response = await api.get<MonitoringResponse>(ApiEndpoints.MONITORING_PROVIDER, {
        params: {
          ProviderId: providerId,
          PageNumber: 1,
          PageSize: 10,
        },
      })

      if (response.data?.successResult?.data) {
        carriers.value = response.data.successResult.data

        // Populate carrier options
        carrierOptions.value = [
          { id: 'all', name: 'All carriers' },
          ...carriers.value.map((c) => ({ id: c.carrierId, name: c.carrierName })),
        ]
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message || 'Failed to fetch monitoring data'
      console.error('Error fetching monitoring:', err)
    } finally {
      isLoading.value = false
    }
  }

  // Filtered carriers
  const filteredCarriers = computed(() => {
    if (!selectedCarrier.value || selectedCarrier.value === 'all') {
      return carriers.value
    }
    return carriers.value.filter((c) => c.carrierId === selectedCarrier.value)
  })

  // Sync action
  const handleSync = () => {
    fetchMonitoring()
  }

  // Auto-fetch on mount
  if (autoFetch) {
    onMounted(async () => {
      await fetchMonitoring()
    })
  }

  return {
    // State
    carriers,
    isLoading,
    error,
    carrierOptions,

    // Filters
    selectedCarrier,

    // Computed
    filteredCarriers,
    getProgressSegments,

    // Functions
    fetchMonitoring,
    getCarrierStats,
    getEventName,
    getEventBadgeClass,
    formatDuration,
    handleSync,
  }
}
