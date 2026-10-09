import { ref } from 'vue'
import { ApiEndpoints } from '@/api/endpoints'
import { useApi } from '@/composables/useAxiosService'
import { getCompanyId } from '@/utils/company'
import type { RouteEldCompaniesResponse } from '@/types/company'
import type { RouteEldAlertType, SpeedAlert, StationAlert, ViolationAlert } from '../types'

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
  const isLoading = ref(false)
  const isRefreshing = ref(false)
  const markingReadId = ref<string | null>(null)
  const error = ref<string | null>(null)
  const externalCompanyId = ref<string | null>(null)
  const loadedTypes = new Set<RouteEldAlertType>()
  let requestVersion = 0

  async function resolveSelectedCompany() {
    const companyId = getCompanyId()
    if (!companyId) throw new Error('Select a company before opening alerts.')
    const response = await api.get<RouteEldCompaniesResponse>(ApiEndpoints.ROUTE_ELD_COMPANIES)
    externalCompanyId.value =
      response.data.successResult.find(
        (company) => company.id.toLowerCase() === companyId.toLowerCase()
      )?.externalCompanyId ?? null
    if (!externalCompanyId.value) throw new Error('The selected company could not be resolved.')
  }

  async function fetchAlerts(type: RouteEldAlertType, silent = false) {
    const version = ++requestVersion
    if (silent) isRefreshing.value = true
    else isLoading.value = true
    error.value = null
    try {
      if (!externalCompanyId.value) await resolveSelectedCompany()
      const params = { companyId: externalCompanyId.value }
      if (type === 'station') {
        const response = await api.get<StationAlert[] | ApiEnvelope<StationAlert[]>>(
          ApiEndpoints.ROUTE_ELD_STATION_ALERTS,
          { params: { ...params, limit: 500 } }
        )
        stationAlerts.value = unwrap(response.data)
      } else if (type === 'speed') {
        const response = await api.get<SpeedAlert[] | ApiEnvelope<SpeedAlert[]>>(
          ApiEndpoints.ROUTE_ELD_SPEED_ALERTS,
          { params }
        )
        speedAlerts.value = unwrap(response.data)
      } else {
        const response = await api.get<ViolationAlert[] | ApiEnvelope<ViolationAlert[]>>(
          ApiEndpoints.ROUTE_ELD_VIOLATION_ALERTS,
          { params }
        )
        violationAlerts.value = unwrap(response.data)
      }
      loadedTypes.add(type)
    } catch (exception) {
      error.value = errorMessage(exception, 'Failed to load Route ELD alerts')
    } finally {
      if (version === requestVersion) {
        isLoading.value = false
        isRefreshing.value = false
      }
    }
  }

  async function ensureAlerts(type: RouteEldAlertType) {
    if (!loadedTypes.has(type)) await fetchAlerts(type)
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
    isLoading,
    isRefreshing,
    markingReadId,
    error,
    fetchAlerts,
    ensureAlerts,
    markStationRead,
  }
}
