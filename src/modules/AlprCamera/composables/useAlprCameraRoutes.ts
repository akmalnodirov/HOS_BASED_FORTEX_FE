import { onMounted, ref, watch, type Ref } from 'vue'
import { ApiEndpoints } from '@/api/endpoints'
import { useApi } from '@/composables/useAxiosService'
import type {
  AlprCameraRouteAnalysisResponse,
  AlprCameraRouteCandidate,
  AlprCameraRouteHistoryDetail,
  AlprCameraRouteHistoryItem,
  AlprCameraRouteRequest,
  AlprSavedReport,
  AlprSavedRouteCandidate,
} from '../types'

type MutationCallbacks<T> = {
  onSuccess?: (data: T) => void
  onError?: (error: unknown) => void
}

function mapSavedCandidate(candidate: AlprSavedRouteCandidate): AlprCameraRouteCandidate {
  return {
    ...candidate,
    cameras: candidate.hits.map((camera) => ({
      id: camera.cameraId,
      longitude: camera.longitude,
      latitude: camera.latitude,
      bearings: camera.bearings ?? [],
      bearingConfidence: camera.bearingConfidence,
      chainageMetres: camera.chainageMetres,
      name: camera.name,
      brand: camera.brand,
      operator: camera.operator,
      attempted: camera.attempted,
    })),
  }
}

function mapSavedReport(report: AlprSavedReport): AlprCameraRouteHistoryDetail {
  return {
    id: report.id,
    name: report.name,
    createdAt: report.createdAt,
    originLabel: report.originLabel,
    originLongitude: report.originLongitude,
    originLatitude: report.originLatitude,
    destinationLabel: report.destinationLabel,
    destinationLongitude: report.destinationLongitude,
    destinationLatitude: report.destinationLatitude,
    stops: report.stops,
    warnings: report.warnings,
    routes: report.candidates.map(mapSavedCandidate),
  }
}

export function useAnalyzeAlprCameraRoute() {
  const api = useApi()
  const isPending = ref(false)

  async function mutate(
    payload: AlprCameraRouteRequest,
    callbacks: MutationCallbacks<AlprCameraRouteAnalysisResponse> = {}
  ) {
    if (isPending.value) return

    isPending.value = true
    try {
      const response = await api.post<AlprCameraRouteAnalysisResponse>(
        ApiEndpoints.ALPR_ROUTES_ANALYZE,
        payload
      )
      callbacks.onSuccess?.(response.data)
    } catch (error) {
      callbacks.onError?.(error)
    } finally {
      isPending.value = false
    }
  }

  return { isPending, mutate }
}

export function useAlprCameraHistory() {
  const api = useApi()
  const data = ref<AlprCameraRouteHistoryItem[]>([])
  const isPending = ref(true)
  const isFetching = ref(false)
  const isError = ref(false)

  async function refetch() {
    isFetching.value = true
    isError.value = false
    try {
      const response = await api.get<AlprCameraRouteHistoryItem[]>(ApiEndpoints.ALPR_REPORTS, {
        params: { limit: 100, offset: 0 },
      })
      data.value = response.data
    } catch {
      isError.value = true
    } finally {
      isPending.value = false
      isFetching.value = false
    }
  }

  onMounted(refetch)

  return { data, isPending, isFetching, isError, refetch }
}

export function useAlprCameraHistoryDetail(id: Ref<string | null>) {
  const api = useApi()
  const data = ref<AlprCameraRouteHistoryDetail | null>(null)
  const isPending = ref(false)
  let requestVersion = 0

  watch(
    id,
    async (currentId) => {
      const version = ++requestVersion
      data.value = null
      if (!currentId) {
        isPending.value = false
        return
      }

      isPending.value = true
      try {
        const response = await api.get<AlprSavedReport>(ApiEndpoints.ALPR_REPORT_BY_ID(currentId))
        if (version === requestVersion) data.value = mapSavedReport(response.data)
      } catch {
        if (version === requestVersion) data.value = null
      } finally {
        if (version === requestVersion) isPending.value = false
      }
    },
    { immediate: true }
  )

  return { data, isPending }
}
