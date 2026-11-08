import { computed, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'
import { ApiEndpoints } from '@/api/endpoints'
import { useApi } from '@/composables/useAxiosService'
import { getCompanyId } from '@/utils/company'
import type {
  RouteEldDriverTracking,
  RouteEldLiveDriver,
  RouteEldLiveShareResponse,
  RouteEldLiveShareTracking,
} from '../types'

export function useRouteEldOverviewDrivers() {
  const api = useApi()
  const drivers = ref<RouteEldLiveDriver[]>([])
  const isLoading = ref(false)
  const isRefreshing = ref(false)
  const error = ref('')
  let timer: ReturnType<typeof setInterval> | null = null
  let pending: Promise<void> | null = null

  const load = async (initial = false) => {
    if (pending) return pending
    const companyId = getCompanyId()
    if (!companyId) {
      error.value = 'Select a company to load live tracking.'
      return
    }
    if (initial) isLoading.value = true
    else isRefreshing.value = true
    error.value = ''
    pending = api
      .get<RouteEldLiveDriver[]>(ApiEndpoints.ROUTE_ELD_LIVE_TRACKING_DRIVERS, {
        params: { companyId },
      })
      .then((response) => {
        drivers.value = preserveLiveBearings(response.data, drivers.value)
      })
      .catch((exception: any) => {
        error.value =
          exception.response?.data?.message ||
          exception.response?.data ||
          'Live drivers could not be loaded.'
      })
      .finally(() => {
        isLoading.value = false
        isRefreshing.value = false
        pending = null
      })
    return pending
  }

  onMounted(() => {
    void load(true)
    timer = setInterval(() => void load(), 30_000)
  })

  onBeforeUnmount(() => {
    if (timer) clearInterval(timer)
  })

  return { drivers, isLoading, isRefreshing, error, load }
}

export function useRouteEldDriverTracking(
  driverId: Ref<string>,
  selectedDate: Ref<string>,
  includeSpeedChart: Ref<boolean>
) {
  const api = useApi()
  const tracking = ref<RouteEldDriverTracking | null>(null)
  const isLoading = ref(false)
  const isRefreshing = ref(false)
  const error = ref('')
  let timer: ReturnType<typeof setInterval> | null = null
  let requestSequence = 0

  const isToday = computed(() => selectedDate.value === localDateKey(new Date()))

  const range = computed(() => {
    const start = new Date(`${selectedDate.value}T00:00:00`)
    const end = new Date(`${selectedDate.value}T23:59:59.999`)
    return {
      fromTimestamp: start.getTime(),
      toTimestamp: isToday.value ? Date.now() : end.getTime(),
    }
  })

  const load = async (initial = false) => {
    const companyId = getCompanyId()
    if (!companyId || !driverId.value) return
    const sequence = ++requestSequence
    if (initial || !tracking.value) isLoading.value = true
    else isRefreshing.value = true
    error.value = ''
    try {
      const latestTimestamp = tracking.value?.points.at(-1)?.timestamp
      const requestRange =
        !initial && isToday.value && latestTimestamp != null
          ? {
              fromTimestamp: Math.max(range.value.fromTimestamp, latestTimestamp),
              toTimestamp: Date.now(),
            }
          : range.value
      const response = await api.get<RouteEldDriverTracking>(
        includeSpeedChart.value
          ? ApiEndpoints.ROUTE_ELD_LIVE_TRACKING_DRIVER_POINTS_WITH_SPEED_CHART(driverId.value)
          : ApiEndpoints.ROUTE_ELD_LIVE_TRACKING_DRIVER_POINTS(driverId.value),
        { params: { companyId, ...requestRange } }
      )
      if (sequence === requestSequence) {
        if (!tracking.value || initial || !isToday.value) {
          tracking.value = {
            ...response.data,
            points: deduplicateTrackingPoints(response.data.points),
            speedChart: deduplicateSpeedChartPoints(response.data.speedChart ?? []),
          }
        } else {
          tracking.value = {
            ...tracking.value,
            driver: response.data.driver,
            toTimestamp: response.data.toTimestamp,
            points: deduplicateTrackingPoints([...tracking.value.points, ...response.data.points]),
            speedChart: deduplicateSpeedChartPoints([
              ...(tracking.value.speedChart ?? []),
              ...(response.data.speedChart ?? []),
            ]),
          }
        }
      }
    } catch (exception: any) {
      if (sequence === requestSequence) {
        error.value =
          exception.response?.data?.message ||
          exception.response?.data ||
          'Driver tracking could not be loaded.'
      }
    } finally {
      if (sequence === requestSequence) {
        isLoading.value = false
        isRefreshing.value = false
      }
    }
  }

  const restartPolling = () => {
    if (timer) clearInterval(timer)
    timer = null
    if (isToday.value) timer = setInterval(() => void load(), 15_000)
  }

  watch(
    [driverId, selectedDate, includeSpeedChart],
    () => {
      tracking.value = null
      void load(true)
      restartPolling()
    },
    { immediate: true }
  )

  onBeforeUnmount(() => {
    requestSequence += 1
    if (timer) clearInterval(timer)
  })

  return { tracking, isLoading, isRefreshing, isToday, error, load }
}

function preserveLiveBearings(next: RouteEldLiveDriver[], previous: RouteEldLiveDriver[]) {
  const previousById = new Map(previous.map((driver) => [driver.driverId, driver]))
  return next.map((driver) => {
    const point = driver.latestPoint
    if (!point) return driver
    const previousPoint = previousById.get(driver.driverId)?.latestPoint
    const providerBearing = normalizeBearing(point.bearing)
    const movementBearing = previousPoint ? bearingBetween(previousPoint, point) : null
    const bearing = movementBearing ?? providerBearing ?? normalizeBearing(previousPoint?.bearing)
    return bearing == null ? driver : { ...driver, latestPoint: { ...point, bearing } }
  })
}

function bearingBetween(
  from: RouteEldLiveDriver['latestPoint'],
  to: RouteEldLiveDriver['latestPoint']
) {
  if (!from || !to) return null
  if (distanceMeters(from, to) < MIN_MOVEMENT_METERS) return null
  const fromLatitude = (from.latitude * Math.PI) / 180
  const toLatitude = (to.latitude * Math.PI) / 180
  const longitudeDelta = ((to.longitude - from.longitude) * Math.PI) / 180
  const y = Math.sin(longitudeDelta) * Math.cos(toLatitude)
  const x =
    Math.cos(fromLatitude) * Math.sin(toLatitude) -
    Math.sin(fromLatitude) * Math.cos(toLatitude) * Math.cos(longitudeDelta)
  return normalizeBearing((Math.atan2(y, x) * 180) / Math.PI)
}

const MIN_MOVEMENT_METERS = 25

function distanceMeters(
  from: NonNullable<RouteEldLiveDriver['latestPoint']>,
  to: NonNullable<RouteEldLiveDriver['latestPoint']>
) {
  const latitude = (((from.latitude + to.latitude) / 2) * Math.PI) / 180
  const x = (((to.longitude - from.longitude) * Math.PI) / 180) * Math.cos(latitude)
  const y = ((to.latitude - from.latitude) * Math.PI) / 180
  return Math.sqrt(x * x + y * y) * 6371000
}

function normalizeBearing(value: number | null | undefined) {
  return value != null && Number.isFinite(value) ? ((value % 360) + 360) % 360 : null
}

function deduplicateTrackingPoints(points: RouteEldDriverTracking['points']) {
  return [...new Map(points.map((point) => [point.id, point])).values()].sort(
    (left, right) => left.timestamp - right.timestamp
  )
}

function deduplicateSpeedChartPoints(points: NonNullable<RouteEldDriverTracking['speedChart']>) {
  return [...new Map(points.map((point) => [point.timestamp, point])).values()].sort(
    (left, right) => left.timestamp - right.timestamp
  )
}

export async function createRouteEldLiveShare(payload: {
  companyId: string
  vehicleId: string
  expiresAt: string
  recipientEmails: string[]
  recipientTelegrams: string[]
}) {
  const response = await useApi().post<RouteEldLiveShareResponse>(
    ApiEndpoints.ROUTE_ELD_LIVE_SHARE,
    payload
  )
  return response.data
}

export async function getPublicRouteEldTracking(
  token: string,
  fromTimestamp: number,
  toTimestamp: number
) {
  const response = await useApi().get<RouteEldLiveShareTracking>(
    ApiEndpoints.ROUTE_ELD_LIVE_SHARE_TRACKING(token),
    {
      params: { fromTimestamp, toTimestamp },
      _skipErrorHandling: true,
    } as any
  )
  return response.data
}

export function localDateKey(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
