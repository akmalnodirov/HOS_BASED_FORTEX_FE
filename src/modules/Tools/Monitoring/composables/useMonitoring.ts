// src/composables/useMonitoring.ts
import { ref, computed, onMounted } from 'vue'
import { useApi } from '@/composables/useAxiosService'
import { ApiEndpoints } from '@/api/endpoints'
import type {
  MonitoringResponse,
  MonitoringCompany,
  MonitoringStats,
} from '@/modules/Tools/Monitoring/types'

export interface UseMonitoringOptions {
  autoFetch?: boolean
  clientId: string
}

export function useMonitoring(options: UseMonitoringOptions) {
  const { autoFetch = true, clientId } = options
  const api = useApi()

  // State
  const companies = ref<MonitoringCompany[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Filters
  const selectedCompany = ref<string | null>(null)

  // Mock companies for dropdown
  const companyOptions = ref([{ id: 'all', name: 'All companies' }])

  // Calculate stats for each company
  const getCompanyStats = (company: MonitoringCompany): MonitoringStats => {
    let warnings = 0
    let errors = 0
    const errorMessages: Record<string, number> = {}

    company.monitoringDrivers.forEach((driver) => {
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
      const response = await api.get<MonitoringResponse>(ApiEndpoints.MONITORING_CLIENT, {
        params: {
          ClientId: clientId,
          PageNumber: 1,
          PageSize: 10,
        },
      })

      if (response.data?.successResult?.data) {
        companies.value = response.data.successResult.data

        // Populate company options
        companyOptions.value = [
          { id: 'all', name: 'All companies' },
          ...companies.value.map((c) => ({ id: c.companyId, name: c.companyName })),
        ]
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message || 'Failed to fetch monitoring data'
      console.error('Error fetching monitoring:', err)
    } finally {
      isLoading.value = false
    }
  }

  // Filtered companies
  const filteredCompanies = computed(() => {
    if (!selectedCompany.value || selectedCompany.value === 'all') {
      return companies.value
    }
    return companies.value.filter((c) => c.companyId === selectedCompany.value)
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
    companies,
    isLoading,
    error,
    companyOptions,

    // Filters
    selectedCompany,

    // Computed
    filteredCompanies,
    getProgressSegments,

    // Functions
    fetchMonitoring,
    getCompanyStats,
    getEventName,
    getEventBadgeClass,
    formatDuration,
    handleSync,
  }
}
