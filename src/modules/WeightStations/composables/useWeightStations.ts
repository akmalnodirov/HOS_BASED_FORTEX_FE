import { onBeforeUnmount, onMounted, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { ApiEndpoints } from '@/api/endpoints'
import { useApi } from '@/composables/useAxiosService'
import type {
  WeightStationCluster,
  WeightStationClusterFilters,
  WeightStationFilters,
  WeightStationPage,
} from '../types'

interface ApiEnvelope<T> {
  successResult: T
}

function unwrap<T>(value: T | ApiEnvelope<T>): T {
  if (value && typeof value === 'object' && 'successResult' in value) return value.successResult
  return value
}

export function useWeightStations(filters: MaybeRefOrGetter<WeightStationFilters>) {
  const api = useApi()
  const data = ref<WeightStationPage | null>(null)
  const isPending = ref(true)
  const isFetching = ref(false)
  const isError = ref(false)
  let requestVersion = 0

  async function refetch() {
    const version = ++requestVersion
    isFetching.value = true
    isError.value = false
    try {
      const response = await api.get<WeightStationPage | ApiEnvelope<WeightStationPage>>(
        ApiEndpoints.ROUTE_ELD_WEIGHT_STATIONS,
        { params: { ...toValue(filters) }, _skipErrorHandling: true }
      )
      if (version === requestVersion) data.value = unwrap(response.data)
    } catch {
      if (version === requestVersion) isError.value = true
    } finally {
      if (version === requestVersion) {
        isPending.value = false
        isFetching.value = false
      }
    }
  }

  watch(() => JSON.stringify(toValue(filters)), refetch)
  onMounted(refetch)

  return { data, isPending, isFetching, isError, refetch }
}

export function useWeightStationClusters(
  filters: MaybeRefOrGetter<WeightStationClusterFilters | null>
) {
  const api = useApi()
  const data = ref<WeightStationCluster[]>([])
  const isFetching = ref(false)
  const isError = ref(false)
  let requestVersion = 0
  let requestController: AbortController | null = null

  async function refetch() {
    const currentFilters = toValue(filters)
    const version = ++requestVersion
    requestController?.abort()
    if (!currentFilters) {
      requestController = null
      data.value = []
      isFetching.value = false
      isError.value = false
      return
    }

    const controller = new AbortController()
    requestController = controller
    isFetching.value = true
    isError.value = false
    try {
      const response = await api.get<WeightStationCluster[] | ApiEnvelope<WeightStationCluster[]>>(
        ApiEndpoints.ROUTE_ELD_WEIGHT_STATION_CLUSTERS,
        {
          params: { ...currentFilters },
          _skipErrorHandling: true,
          signal: controller.signal,
        }
      )
      if (version === requestVersion) data.value = unwrap(response.data)
    } catch (exception) {
      const cancellation = exception as { code?: string; name?: string }
      const wasCancelled =
        cancellation.code === 'ERR_CANCELED' || cancellation.name === 'CanceledError'
      if (version === requestVersion && !wasCancelled) isError.value = true
    } finally {
      if (version === requestVersion) {
        isFetching.value = false
        requestController = null
      }
    }
  }

  watch(() => JSON.stringify(toValue(filters)), refetch)
  onMounted(refetch)
  onBeforeUnmount(() => requestController?.abort())

  return { data, isFetching, isError, refetch }
}
