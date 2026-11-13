import { computed, ref, watch } from 'vue'
import { createGlobalState } from '@vueuse/core'
import { ApiEndpoints } from '@/api/endpoints'
import { useApi } from '@/composables/useAxiosService'
import { useAuthStore } from '@/modules/Auth/store/authStore'
import { hasPermission } from '@/router/permissions'
import type { RouteEldCompaniesResponse } from '@/types/company'
import type { AlprCameraAlert, DotAlert, RedStateAlert, RouteEldAlertType, SpeedAlert, StationAlert, ViolationAlert } from '../types'

const storageKey = 'route-eld-notification-types'
export const alertTypes: RouteEldAlertType[] = ['station', 'alpr', 'red_state', 'dot', 'violation', 'speed']
export const alertLabels: Record<RouteEldAlertType, string> = {
  station: 'Station alerts', alpr: 'ALPR camera alerts', red_state: 'Red state alerts', dot: 'DOT alerts', violation: 'Violation alerts', speed: 'Speed alerts',
}

export interface UnreadAlert {
  id: string
  type: RouteEldAlertType
  companyId: string
  title: string
  detail: string
  occurredAt: string
}

function unwrap<T>(data: T | { successResult: T }): T {
  return data && typeof data === 'object' && 'successResult' in data ? data.successResult : data
}

function dotLocation(alert: DotAlert) {
  if (alert.driverLocation) return alert.driverLocation
  if (alert.driverLatitude !== null && alert.driverLongitude !== null)
    return `${alert.driverLatitude.toFixed(5)}, ${alert.driverLongitude.toFixed(5)}`
  return 'Location unavailable'
}

function storedTypes(userId: string): RouteEldAlertType[] {
  try {
    const saved = JSON.parse(localStorage.getItem(`${storageKey}:${userId}`) ?? 'null')
    if (Array.isArray(saved)) {
      const migrationKey = `${storageKey}:red-state:${userId}`
      if (!localStorage.getItem(migrationKey)) {
        saved.push('red_state')
        localStorage.setItem(migrationKey, '1')
      }
      const dotKey = `${storageKey}:dot:${userId}`
      if (!localStorage.getItem(dotKey)) {
        saved.push('dot')
        localStorage.setItem(dotKey, '1')
      }
      return alertTypes.filter((type) => saved.includes(type))
    }
  } catch { /* Use all types when stored preferences are invalid. */ }
  return [...alertTypes]
}

export const useRouteEldNotificationCenter = createGlobalState(() => {
  const api = useApi()
  const authStore = useAuthStore()
  const userId = computed(() => authStore.user?.id ?? null)
  const selectedTypes = ref<RouteEldAlertType[]>([...alertTypes])
  const availableTypes = computed(() => alertTypes.filter((type) =>
    hasPermission(authStore.token, `route_eld.alerts.${type === 'dot' ? 'red_state' : type}`)))
  const enabledTypes = computed(() => availableTypes.value.filter((type) => selectedTypes.value.includes(type)))
  const alerts = ref<UnreadAlert[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const companyNames = ref<Record<string, string>>({})
  let companyNamesRequest: Promise<void> | null = null
  let requestVersion = 0

  function loadCompanyNames() {
    if (!companyNamesRequest) companyNamesRequest = api.get<RouteEldCompaniesResponse>(ApiEndpoints.ROUTE_ELD_COMPANIES)
      .then((response) => {
        companyNames.value = Object.fromEntries(response.data.successResult.flatMap((company) => [
          [company.id.toLowerCase(), company.name],
          [company.externalCompanyId.toLowerCase(), company.name],
        ]))
      })
      .catch(() => { companyNamesRequest = null })
    return companyNamesRequest
  }

  watch(userId, (id) => {
    requestVersion++
    alerts.value = []
    selectedTypes.value = id ? storedTypes(id) : [...alertTypes]
  }, { immediate: true, flush: 'sync' })

  watch(selectedTypes, (value) => {
    if (userId.value) localStorage.setItem(`${storageKey}:${userId.value}`, JSON.stringify(value))
  })

  function setType(type: RouteEldAlertType, checked: boolean) {
    selectedTypes.value = checked
      ? alertTypes.filter((candidate) => candidate === type || selectedTypes.value.includes(candidate))
      : selectedTypes.value.filter((candidate) => candidate !== type)
  }

  async function refresh() {
    const version = ++requestVersion
    if (!authStore.loggedIn || !enabledTypes.value.length) {
      alerts.value = []
      loading.value = false
      error.value = null
      return
    }
    loading.value = true
    error.value = null
    try {
      void loadCompanyNames()
      const queries = enabledTypes.value.map(async (type): Promise<UnreadAlert[]> => {
        if (type === 'station') {
          const response = await api.get<StationAlert[] | { successResult: StationAlert[] }>(ApiEndpoints.ROUTE_ELD_STATION_ALERTS, { params: { limit: 100 } })
          return unwrap(response.data).filter((a) => !a.isRead && !!a.companyId).map((a) => ({ id: a.id, type, companyId: a.companyId, title: `${a.driverName} is approaching ${a.stationName}`, detail: a.location || 'Weigh station', occurredAt: a.occurredAt }))
        }
        if (type === 'alpr') {
          const response = await api.get<AlprCameraAlert[] | { successResult: AlprCameraAlert[] }>(ApiEndpoints.ROUTE_ELD_ALPR_CAMERA_ALERTS, { params: { limit: 100 } })
          return unwrap(response.data).filter((a) => !a.isRead && !!a.companyId).map((a) => ({ id: a.id, type, companyId: a.companyId, title: `${a.driverName} is approaching an ALPR camera`, detail: a.brand || a.cameraName, occurredAt: a.occurredAt }))
        }
        if (type === 'red_state') {
          const response = await api.get<RedStateAlert[] | { successResult: RedStateAlert[] }>(ApiEndpoints.ROUTE_ELD_RED_STATE_ALERTS, { params: { limit: 100 } })
          return unwrap(response.data).filter((a) => !a.isRead && !!a.companyId).map((a) => ({ id: a.id, type, companyId: a.companyId, title: `${a.driverName} is approaching ${a.stateCode}`, detail: `${a.distanceMiles.toFixed(1)} mi to state border`, occurredAt: a.occurredAt }))
        }
        if (type === 'dot') {
          const response = await api.get<DotAlert[] | { successResult: DotAlert[] }>(ApiEndpoints.ROUTE_ELD_DOT_ALERTS, { params: { limit: 100 } })
          return unwrap(response.data).filter((a) => !a.isRead && !!a.companyId).map((a) => ({
            id: a.id, type, companyId: a.companyId,
            title: `${a.driverName} submitted DOT logs`,
            detail: `Truck ${a.truckNumber} · ID ${a.externalDriverId} · ${dotLocation(a)} · ${new Date(a.periodStart).toLocaleString()} – ${new Date(a.periodEnd).toLocaleString()}`,
            occurredAt: a.submittedAt,
          }))
        }
        if (type === 'speed') {
          const response = await api.get<SpeedAlert[] | { successResult: SpeedAlert[] }>(ApiEndpoints.ROUTE_ELD_SPEED_ALERTS)
          return unwrap(response.data).filter((a) => !a.isRead && !!a.companyId).map((a) => ({ id: a.id, type, companyId: a.companyId!, title: `${a.driverName} exceeded the speed limit`, detail: `${Math.round(a.speed)} mph · ${a.location || a.stateCode || 'Location unavailable'}`, occurredAt: a.occurredAt }))
        }
        const response = await api.get<ViolationAlert[] | { successResult: ViolationAlert[] }>(ApiEndpoints.ROUTE_ELD_VIOLATION_ALERTS)
        return unwrap(response.data).filter((a) => !a.isRead && !!a.companyId).map((a) => ({ id: a.id, type, companyId: a.companyId!, title: `${a.driverName} has ${a.violationCount} violation${a.violationCount === 1 ? '' : 's'}`, detail: a.note || a.logDate, occurredAt: a.occurredAt }))
      })
      const results = await Promise.allSettled(queries)
      if (version !== requestVersion) return
      alerts.value = results.flatMap((result) => result.status === 'fulfilled' ? result.value : [])
        .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt)).slice(0, 50)
      if (results.some((result) => result.status === 'rejected')) error.value = 'Some alerts could not be loaded.'
    } finally {
      if (version === requestVersion) loading.value = false
    }
  }

  async function markRead(alert: Pick<UnreadAlert, 'id' | 'type'>) {
    const endpoint = {
      station: ApiEndpoints.ROUTE_ELD_STATION_ALERT_READ,
      alpr: ApiEndpoints.ROUTE_ELD_ALPR_CAMERA_ALERT_READ,
      red_state: ApiEndpoints.ROUTE_ELD_RED_STATE_ALERT_READ,
      dot: ApiEndpoints.ROUTE_ELD_DOT_ALERT_READ,
      speed: ApiEndpoints.ROUTE_ELD_SPEED_ALERT_READ,
      violation: ApiEndpoints.ROUTE_ELD_VIOLATION_ALERT_READ,
    }[alert.type]
    await api.patch(endpoint(alert.id), null)
    requestVersion++
    loading.value = false
    alerts.value = alerts.value.filter((item) => !(item.id === alert.id && item.type === alert.type))
  }

  async function markAllRead() {
    const endpoints = {
      station: ApiEndpoints.ROUTE_ELD_STATION_ALERTS_READ_ALL,
      alpr: ApiEndpoints.ROUTE_ELD_ALPR_CAMERA_ALERTS_READ_ALL,
      red_state: ApiEndpoints.ROUTE_ELD_RED_STATE_ALERTS_READ_ALL,
      dot: ApiEndpoints.ROUTE_ELD_DOT_ALERTS_READ_ALL,
      speed: ApiEndpoints.ROUTE_ELD_SPEED_ALERTS_READ_ALL,
      violation: ApiEndpoints.ROUTE_ELD_VIOLATION_ALERTS_READ_ALL,
    }
    const results = await Promise.allSettled(enabledTypes.value.map((type) => api.patch(endpoints[type], null)))
    await refresh()
    if (results.some((result) => result.status === 'rejected')) throw new Error('Some alerts could not be marked as read.')
  }

  return { selectedTypes, availableTypes, enabledTypes, alerts, loading, error, companyNames, setType, refresh, markRead, markAllRead }
})
