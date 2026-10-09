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
        drivers.value = response.data
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

export function useRouteEldDriverTracking(driverId: Ref<string>, selectedDate: Ref<string>) {
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
        ApiEndpoints.ROUTE_ELD_LIVE_TRACKING_DRIVER_POINTS(driverId.value),
        { params: { companyId, ...requestRange } }
      )
      if (sequence === requestSequence) {
        if (!tracking.value || initial || !isToday.value) {
          tracking.value = {
            ...response.data,
            points: deduplicateTrackingPoints(response.data.points),
          }
        } else {
          tracking.value = {
            ...tracking.value,
            driver: response.data.driver,
            toTimestamp: response.data.toTimestamp,
            points: deduplicateTrackingPoints([...tracking.value.points, ...response.data.points]),
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
    [driverId, selectedDate],
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

function deduplicateTrackingPoints(points: RouteEldDriverTracking['points']) {
  return [...new Map(points.map((point) => [point.id, point])).values()].sort(
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
