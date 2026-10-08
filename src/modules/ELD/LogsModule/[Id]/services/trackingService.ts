import { useApi } from '@/composables/useAxiosService.ts'
import { ApiEndpoints } from '@/api/endpoints.ts'
import type {
  DailyTrackingResponse,
  EveryTrackingResponse,
  DriverLogsDailyEventsRequest,
} from '@/types/tracking'
import { capitalizeKeys } from '@/utils/object.ts'

export class TrackingService {
  private api = useApi()

  async getDriverDailyTrackings(
    model: DriverLogsDailyEventsRequest,
    signal?: AbortSignal
  ): Promise<DailyTrackingResponse | null> {
    try {
      const response = await this.api.get<{ successResult: DailyTrackingResponse }>(
        ApiEndpoints.TRACKING_DRIVER_DAILY_EVENTS,
        {
          params: capitalizeKeys(model),
          signal,
        }
      )

      const result = response.data?.successResult
      if (result && result.trackingEventResponse && Array.isArray(result.trackingEventResponse)) {
        result.trackingEventResponse.reverse()
      } else if (result) {
        result.trackingEventResponse = []
      }

      return result || null
    } catch (error) {
      console.error('Error fetching daily trackings:', error)
      throw error
    }
  }

  async getDriverEveryTrackings(
    model: DriverLogsDailyEventsRequest,
    signal?: AbortSignal
  ): Promise<EveryTrackingResponse[]> {
    try {
      const response = await this.api.get<{
        successResult: {
          trackingEvents: EveryTrackingResponse[]
          lastEventStatus?: string
          lastEventTime?: string
          lastLocation?: { latitude: number; longitude: number }
          lastEventType?: number
          lastEventCode?: number
          firstName?: string
          lastName?: string
        }
      }>(ApiEndpoints.TRACKING_DRIVERS_EVERY, {
        params: capitalizeKeys(model),
        signal,
      })

      const trackingEvents = response.data?.successResult?.trackingEvents
      return Array.isArray(trackingEvents) ? trackingEvents : []
    } catch (error) {
      console.error('Error fetching every trackings:', error)
      throw error
    }
  }

  isValidCoordinates(latitude: number | null, longitude: number | null): boolean {
    if (latitude === null || longitude === null) return false
    if (isNaN(latitude) || isNaN(longitude)) return false
    if (latitude === 0 && longitude === 0) return false
    if (latitude < -90 || latitude > 90) return false
    if (longitude < -180 || longitude > 180) return false
    return true
  }

  filterValidCoordinates<T extends { latitude: number | null; longitude: number | null }>(
    trackings: T[]
  ): T[] {
    if (!Array.isArray(trackings)) {
      console.warn('Tracking data is not an array:', trackings)
      return []
    }
    return trackings.filter((tracking) =>
      this.isValidCoordinates(tracking.latitude, tracking.longitude)
    )
  }
}

export const trackingService = new TrackingService()
