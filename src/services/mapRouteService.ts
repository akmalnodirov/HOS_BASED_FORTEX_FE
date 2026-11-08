import { isAxiosError } from 'axios'
import { ApiEndpoints } from '@/api/endpoints'
import { useApi } from '@/composables/useAxiosService'

export const MAP_ROUTE_MAX_POINTS = 200

export interface MapRoutePoint {
  latitude: number
  longitude: number
}

export interface MapRouteRequest {
  points: MapRoutePoint[]
  matchTrace: boolean
}

export interface MapRouteResponse {
  distanceMeters: number
  durationSeconds: number
  path: MapRoutePoint[]
}

const api = useApi()

export async function fetchMapRoute(
  points: MapRoutePoint[],
  matchTrace: boolean,
  signal?: AbortSignal
): Promise<MapRouteResponse> {
  const response = await api.post<MapRouteResponse, MapRouteRequest>(
    ApiEndpoints.MAPS_ROUTE,
    { points, matchTrace },
    { signal, _skipErrorHandling: true }
  )
  return response.data
}

export function isMapRouteNotFound(error: unknown) {
  return isAxiosError(error) && error.response?.status === 404
}
