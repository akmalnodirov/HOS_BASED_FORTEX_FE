import { ref } from 'vue'
import { ApiEndpoints } from '@/api/endpoints'
import { useApi } from '@/composables/useAxiosService'
import type {
  FullVehicleReportResponse,
  VehicleReportResponse,
} from '@/modules/VehicleReports/types'

interface ApiEnvelope<T> {
  successResult: T
}

function unwrap<T>(value: T | ApiEnvelope<T>): T {
  if (value && typeof value === 'object' && 'successResult' in value) {
    return value.successResult
  }
  return value
}

function errorMessage(error: unknown, fallback: string): string {
  const value = error as {
    response?: { data?: string | { message?: string; errors?: { message?: string }[] } }
    message?: string
  }
  const data = value.response?.data
  if (typeof data === 'string' && data) return data
  if (data && typeof data === 'object') {
    return data.message ?? data.errors?.[0]?.message ?? value.message ?? fallback
  }
  return value.message ?? fallback
}

export function useVehicleReports() {
  const api = useApi()
  const report = ref<VehicleReportResponse | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  let requestVersion = 0

  async function fetchReport(companyId: string, year: number, month: number) {
    if (!companyId) {
      report.value = null
      error.value = 'Select a company before opening vehicle reports.'
      return
    }

    const version = ++requestVersion
    isLoading.value = true
    error.value = null

    try {
      const response = await api.get<VehicleReportResponse | ApiEnvelope<VehicleReportResponse>>(
        ApiEndpoints.ROUTE_ELD_VEHICLE_REPORT,
        { params: { companyId, year, month }, _skipErrorHandling: true }
      )
      if (version === requestVersion) report.value = unwrap(response.data)
    } catch (exception) {
      if (version === requestVersion) {
        report.value = null
        error.value = errorMessage(exception, 'Vehicle report could not be loaded.')
      }
    } finally {
      if (version === requestVersion) {
        isLoading.value = false
      }
    }
  }

  function resetReport() {
    requestVersion++
    report.value = null
    error.value = null
    isLoading.value = false
  }

  async function fetchFullReport(year: number, month: number) {
    const response = await api.get<
      FullVehicleReportResponse | ApiEnvelope<FullVehicleReportResponse>
    >(ApiEndpoints.ROUTE_ELD_FULL_VEHICLE_REPORT, {
      params: { year, month },
      _skipErrorHandling: true,
    })
    return unwrap(response.data)
  }

  return {
    report,
    isLoading,
    error,
    fetchReport,
    fetchFullReport,
    resetReport,
  }
}
