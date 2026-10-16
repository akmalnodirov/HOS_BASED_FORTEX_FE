import { computed, ref, watch } from 'vue'
import { ApiEndpoints } from '@/api/endpoints'
import { useApi } from '@/composables/useAxiosService'
import type { RouteEldCompaniesResponse } from '@/types/company'
import { getCompanyId } from '@/utils/company'
import { useAuthStore } from '@/modules/Auth/store/authStore'
import type {
  StationAlert,
  AlprCameraAlert,
  SpeedAlert,
  ViolationAlert,
} from '@/modules/RouteEldAlerts/types'
import type { NotificationItem, NotificationType } from '../types'

type Envelope<T> = T | { successResult: T }
const unwrap = <T>(value: Envelope<T>): T =>
  value && typeof value === 'object' && 'successResult' in value ? value.successResult : value

function message(error: unknown): string {
  const value = error as { response?: { data?: { message?: string } }; message?: string }
  return value.response?.data?.message || value.message || 'Unable to load notifications.'
}

function validCoordinate(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export function useNotifications() {
  const api = useApi()
  const authStore = useAuthStore()
  const notifications = ref<NotificationItem[]>([])
  const isLoading = ref(false)
  const isRefreshing = ref(false)
  const markingReadId = ref<string | null>(null)
  const error = ref<string | null>(null)
  const search = ref('')
  const typeFilter = ref<NotificationType | 'all'>('all')
  const statusFilter = ref<'all' | 'unread' | 'active' | 'resolved'>('all')
  const page = ref(1)
  const pageSize = ref(25)
  const sortKey = ref<'occurredAt' | 'driverName' | 'type'>('occurredAt')
  const sortDirection = ref<'asc' | 'desc'>('desc')
  let requestId = 0

  const filtered = computed(() => {
    const query = search.value.trim().toLowerCase()
    return notifications.value
      .filter((item) => typeFilter.value === 'all' || item.type === typeFilter.value)
      .filter(
        (item) =>
          statusFilter.value === 'all' ||
          (statusFilter.value === 'unread' && !item.isRead) ||
          (statusFilter.value === 'active' &&
            (item.type === 'station' || item.type === 'alpr') &&
            !item.resolvedAt) ||
          (statusFilter.value === 'resolved' && !!item.resolvedAt)
      )
      .filter(
        (item) =>
          !query ||
          [item.driverName, item.title, item.detail, item.location || ''].some((value) =>
            value.toLowerCase().includes(query)
          )
      )
      .sort((left, right) => {
        const result = left[sortKey.value].localeCompare(right[sortKey.value])
        return sortDirection.value === 'asc' ? result : -result
      })
  })
  const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))
  const visible = computed(() =>
    filtered.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value)
  )
  const unreadCount = computed(() => notifications.value.filter((item) => !item.isRead).length)
  const activeCount = computed(
    () =>
      notifications.value.filter(
        (item) => (item.type === 'station' || item.type === 'alpr') && !item.resolvedAt
      ).length
  )

  watch([search, typeFilter, statusFilter, pageSize], () => {
    page.value = 1
  })
  watch(pageCount, (count) => {
    if (page.value > count) page.value = count
  })

  function sortBy(key: typeof sortKey.value) {
    if (sortKey.value === key) sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
    else {
      sortKey.value = key
      sortDirection.value = 'asc'
    }
  }

  async function load(silent = false) {
    const currentRequest = ++requestId
    if (silent) isRefreshing.value = true
    else {
      isLoading.value = true
      notifications.value = []
    }
    error.value = null
    try {
      const selectedId = authStore.companyId ?? getCompanyId()
      if (!selectedId) throw new Error('Select a company to view notifications.')
      const companyResponse = await api.get<RouteEldCompaniesResponse>(
        ApiEndpoints.ROUTE_ELD_COMPANIES
      )
      const company = companyResponse.data.successResult.find(
        (company) => company.id.toLowerCase() === selectedId.toLowerCase()
      )
      const companyId = company?.externalCompanyId
      if (!companyId) throw new Error('The selected company could not be resolved.')
      const params = { companyId, limit: 500 }
      const results = await Promise.allSettled([
        api.get<Envelope<StationAlert[]>>(ApiEndpoints.ROUTE_ELD_STATION_ALERTS, { params }),
        api.get<Envelope<AlprCameraAlert[]>>(ApiEndpoints.ROUTE_ELD_ALPR_CAMERA_ALERTS, { params }),
        api.get<Envelope<ViolationAlert[]>>(ApiEndpoints.ROUTE_ELD_VIOLATION_ALERTS, { params }),
        api.get<Envelope<SpeedAlert[]>>(ApiEndpoints.ROUTE_ELD_SPEED_ALERTS, { params }),
      ])
      if (currentRequest !== requestId) return
      const values = results.map((result) =>
        result.status === 'fulfilled' ? unwrap(result.value.data) : []
      )
      const stations = values[0] as StationAlert[]
      const cameras = values[1] as AlprCameraAlert[]
      const violations = values[2] as ViolationAlert[]
      const speeds = values[3] as SpeedAlert[]
      notifications.value = [
        ...stations.map((item): NotificationItem => ({
          id: item.id,
          type: 'station',
          driverName: item.driverName,
          companyName: company?.name ?? null,
          title: item.stationName,
          detail: [
            item.direction,
            item.distanceMiles != null ? `${item.distanceMiles.toFixed(2)} mi away` : null,
          ]
            .filter(Boolean)
            .join(' · '),
          location: item.driverLocation || item.location,
          occurredAt: item.occurredAt,
          resolvedAt: item.resolvedAt,
          isRead: item.isRead,
          latitude: validCoordinate(item.driverLatitude),
          longitude: validCoordinate(item.driverLongitude),
          targetLatitude: validCoordinate(item.stationLatitude),
          targetLongitude: validCoordinate(item.stationLongitude),
          targetLocation: item.location,
          targetRows: [
            { label: 'Direction', value: item.direction },
            { label: 'Type', value: item.stationType },
            { label: 'Distance', value: `${item.distanceMiles.toFixed(2)} mi` },
          ],
        })),
        ...cameras.map((item): NotificationItem => ({
          id: item.id,
          type: 'alpr',
          driverName: item.driverName,
          companyName: company?.name ?? null,
          title: item.cameraName,
          detail: [
            item.brand,
            item.operator,
            item.distanceMiles != null ? `${item.distanceMiles.toFixed(2)} mi away` : null,
          ]
            .filter(Boolean)
            .join(' · '),
          location: item.driverLocation,
          occurredAt: item.occurredAt,
          resolvedAt: item.resolvedAt,
          isRead: item.isRead,
          latitude: validCoordinate(item.driverLatitude),
          longitude: validCoordinate(item.driverLongitude),
          targetLatitude: validCoordinate(item.cameraLatitude),
          targetLongitude: validCoordinate(item.cameraLongitude),
          targetLocation: `${item.cameraLatitude.toFixed(5)}, ${item.cameraLongitude.toFixed(5)}`,
          targetRows: [
            { label: 'Brand', value: item.brand },
            { label: 'Operator', value: item.operator },
            { label: 'Bearing', value: item.bearingConfidence },
            { label: 'Distance', value: `${item.distanceMiles.toFixed(2)} mi` },
          ],
        })),
        ...violations.map((item): NotificationItem => ({
          id: item.id,
          type: 'violation',
          driverName: item.driverName,
          companyName: company?.name ?? null,
          title: `${item.violationCount} ${item.violationCount === 1 ? 'violation' : 'violations'}`,
          detail: [item.note, item.logDate].filter(Boolean).join(' · '),
          location: item.driverLocation,
          occurredAt: item.occurredAt,
          resolvedAt: null,
          isRead: item.isRead,
          latitude: validCoordinate(item.driverLatitude),
          longitude: validCoordinate(item.driverLongitude),
          targetLatitude: null,
          targetLongitude: null,
          targetLocation: null,
          targetRows: [],
        })),
        ...speeds.map((item): NotificationItem => ({
          id: item.id,
          type: 'speed',
          driverName: item.driverName,
          companyName: company?.name ?? null,
          title: `${item.speed} mph in ${item.speedLimit} mph zone`,
          detail: item.stateCode || '',
          location: item.location,
          occurredAt: item.occurredAt,
          resolvedAt: null,
          isRead: item.isRead,
          latitude: validCoordinate(item.latitude),
          longitude: validCoordinate(item.longitude),
          targetLatitude: null,
          targetLongitude: null,
          targetLocation: null,
          targetRows: [],
        })),
      ]
      const failed = results.filter((result) => result.status === 'rejected')
      if (failed.length)
        error.value = `${failed.length} notification ${failed.length === 1 ? 'source' : 'sources'} could not be loaded. Showing available data.`
    } catch (exception) {
      if (currentRequest === requestId) {
        notifications.value = []
        error.value = message(exception)
      }
    } finally {
      if (currentRequest === requestId) {
        isLoading.value = false
        isRefreshing.value = false
      }
    }
  }

  async function markRead(item: NotificationItem) {
    if (item.isRead || (item.type !== 'station' && item.type !== 'alpr')) return
    markingReadId.value = item.id
    try {
      const endpoint =
        item.type === 'station'
          ? ApiEndpoints.ROUTE_ELD_STATION_ALERT_READ(item.id)
          : ApiEndpoints.ROUTE_ELD_ALPR_CAMERA_ALERT_READ(item.id)
      await api.patch(endpoint, null)
      item.isRead = true
    } catch (exception) {
      error.value = message(exception)
    } finally {
      markingReadId.value = null
    }
  }

  return {
    notifications,
    isLoading,
    isRefreshing,
    markingReadId,
    error,
    search,
    typeFilter,
    statusFilter,
    page,
    pageSize,
    sortKey,
    sortDirection,
    filtered,
    visible,
    pageCount,
    unreadCount,
    activeCount,
    sortBy,
    load,
    markRead,
  }
}
