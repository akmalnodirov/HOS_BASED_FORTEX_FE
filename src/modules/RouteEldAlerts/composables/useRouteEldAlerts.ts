import { ref } from 'vue'
import { ApiEndpoints } from '@/api/endpoints'
import { useApi } from '@/composables/useAxiosService'
import type {
  RouteEldAlertCompany,
  RouteEldAlertType,
  SpeedAlert,
  StationAlert,
  ViolationAlert,
} from '../types'

interface ApiEnvelope<T> {
  successResult: T
}

function unwrap<T>(value: T | ApiEnvelope<T>): T {
  if (value && typeof value === 'object' && 'successResult' in value) {
    return value.successResult
  }
  return value
}

function errorMessage(error: unknown, fallback: string) {
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

export function useRouteEldAlerts() {
  const api = useApi()
  const stationAlerts = ref<StationAlert[]>([])
  const speedAlerts = ref<SpeedAlert[]>([])
  const violationAlerts = ref<ViolationAlert[]>([])
  const companies = ref<RouteEldAlertCompany[]>([])
  const companiesLoading = ref(false)
  const companiesError = ref<string | null>(null)
  const isLoading = ref(false)
  const isRefreshing = ref(false)
  const markingReadId = ref<string | null>(null)
  const error = ref<string | null>(null)
  const loadedTypes = new Set<RouteEldAlertType>()
  let requestVersion = 0

  async function fetchCompanies() {
    companiesLoading.value = true
    companiesError.value = null
    try {
      const response = await api.get<RouteEldAlertCompany[] | ApiEnvelope<RouteEldAlertCompany[]>>(
        ApiEndpoints.ROUTE_ELD_SOURCE_COMPANIES,
        { _skipErrorHandling: true }
      )
      companies.value = unwrap(response.data).sort((left, right) =>
        left.name.localeCompare(right.name)
      )
    } catch (exception) {
      companies.value = []
      companiesError.value = errorMessage(exception, 'Failed to load Route ELD companies')
    } finally {
      companiesLoading.value = false
    }
  }

  async function fetchAlerts(type: RouteEldAlertType, companyId: string | null, silent = false) {
    const version = ++requestVersion
    if (silent) isRefreshing.value = true
    else isLoading.value = true
    error.value = null
    try {
      const params = companyId ? { companyId } : {}
      if (type === 'station') {
        const response = await api.get<StationAlert[] | ApiEnvelope<StationAlert[]>>(
          ApiEndpoints.ROUTE_ELD_STATION_ALERTS,
          { params: { ...params, limit: 500 } }
        )
        if (version === requestVersion) stationAlerts.value = unwrap(response.data)
      } else if (type === 'speed') {
        const response = await api.get<SpeedAlert[] | ApiEnvelope<SpeedAlert[]>>(
          ApiEndpoints.ROUTE_ELD_SPEED_ALERTS,
          { params }
        )
        if (version === requestVersion) speedAlerts.value = unwrap(response.data)
      } else {
        const response = await api.get<ViolationAlert[] | ApiEnvelope<ViolationAlert[]>>(
          ApiEndpoints.ROUTE_ELD_VIOLATION_ALERTS,
          { params }
        )
        if (version === requestVersion) violationAlerts.value = unwrap(response.data)
      }
      if (version === requestVersion) loadedTypes.add(type)
    } catch (exception) {
      if (version === requestVersion) {
        error.value = errorMessage(exception, 'Failed to load Route ELD alerts')
      }
    } finally {
      if (version === requestVersion) {
        isLoading.value = false
        isRefreshing.value = false
      }
    }
  }

  async function ensureAlerts(type: RouteEldAlertType, companyId: string | null) {
    if (!loadedTypes.has(type)) await fetchAlerts(type, companyId)
  }

  function resetAlerts() {
    requestVersion++
    loadedTypes.clear()
    stationAlerts.value = []
    speedAlerts.value = []
    violationAlerts.value = []
    error.value = null
    isLoading.value = false
    isRefreshing.value = false
  }

  async function markStationRead(id: string) {
    markingReadId.value = id
    try {
      await api.patch(ApiEndpoints.ROUTE_ELD_STATION_ALERT_READ(id), null)
      const alert = stationAlerts.value.find((item) => item.id === id)
      if (alert) alert.isRead = true
    } finally {
      markingReadId.value = null
    }
  }

  return {
    stationAlerts,
    speedAlerts,
    violationAlerts,
    companies,
    companiesLoading,
    companiesError,
    isLoading,
    isRefreshing,
    markingReadId,
    error,
    fetchCompanies,
    fetchAlerts,
    ensureAlerts,
    resetAlerts,
    markStationRead,
  }
}
