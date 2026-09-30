/**
 * Composable for Tracking management
 * Follows SOLID principles:
 * - Single Responsibility: Manages only tracking state and operations
 * - Dependency Inversion: Depends on service abstraction
 */

import { ref, computed, watch, type Ref } from 'vue'
import type { Dayjs } from 'dayjs'
import { trackingService } from '../services/trackingService.ts'
import type {
  DailyTrackingResponse,
  EveryTrackingResponse,
  TrackingResponse,
} from '@/types/tracking'
import type { DriverLogsDailyEventsRequest } from '@/types/tracking'
import { useDirection } from '@/modules/Overview/composables/useDirection.ts'

export function useTracking() {
  // Direction composable for route drawing
  const {
    testDirectionsAPI,
    renderDirections,
    cleanUpRenderers,
  } = useDirection()

  // State
  const dailyTrackings: Ref<DailyTrackingResponse | null> = ref(null)
  const everyTrackings: Ref<EveryTrackingResponse[]> = ref([])
  const loading = ref(false)
  const selectedEvent: Ref<TrackingResponse | null> = ref(null)
  const trackingTooltips: Ref<Record<string, boolean>> = ref({})
  const trackingCollapse = ref(true)

  // Direction segments for route drawing
  const directionsSegments = ref<any[]>([])

  // Map state
  const mapCenter = ref<{ lat: number; lng: number }>({ lat: 42.775572, lng: -95.968509 })
  const zoomMap = ref<number>(8)
  const mapInstance = ref<any>(null)

  /**
   * Computed: Selected tracking events for drive events
   */
  const selectedTrackingEvents = computed(() => {
    if (
      !selectedEvent.value ||
      selectedEvent.value.eventCode !== 3 ||
      selectedEvent.value.eventType !== 1
    ) {
      return []
    }

    const startTime = selectedEvent.value.startTime
    const endTime = selectedEvent.value.endTime

    return everyTrackings.value.filter((tracking) => {
      const eventTime = tracking.currentTime
      // Compare times (assuming they're Dayjs or string)
      const eventTimeStr = typeof eventTime === 'string' ? eventTime : eventTime.toString()
      const startTimeStr = typeof startTime === 'string' ? startTime : startTime.toString()
      const endTimeStr = typeof endTime === 'string' ? endTime : endTime.toString()

      return eventTimeStr >= startTimeStr && eventTimeStr <= endTimeStr
    })
  })

  /**
   * Fetch daily trackings
   */
  const fetchDailyTrackings = async (
    model: DriverLogsDailyEventsRequest,
    signal?: AbortSignal
  ) => {
    try {
      loading.value = true
      const result = await trackingService.getDriverDailyTrackings(model, signal)

      if (result) {
        // Filter valid coordinates
        result.trackingEventResponse = trackingService.filterValidCoordinates(
          result.trackingEventResponse
        )

        // Initialize tooltips
        result.trackingEventResponse.forEach((tracking) => {
          trackingTooltips.value[tracking.eventId] = false
        })
      }

      dailyTrackings.value = result
      return result
    } catch (error) {
      console.error('Error fetching daily trackings:', error)
      dailyTrackings.value = null
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch every trackings (detailed points)
   */
  const fetchEveryTrackings = async (
    model: DriverLogsDailyEventsRequest,
    signal?: AbortSignal
  ) => {
    try {
      const result = await trackingService.getDriverEveryTrackings(model, signal)

      // Filter valid coordinates
      everyTrackings.value = trackingService.filterValidCoordinates(result)

      return everyTrackings.value
    } catch (error) {
      console.error('Error fetching every trackings:', error)
      everyTrackings.value = []
      throw error
    }
  }

  /**
   * Generate route directions from tracking points
   */
  const generateRouteDirections = async () => {
    try {
      // Filter valid tracking points
      const validPoints = everyTrackings.value.filter(
        (tracking) => tracking && tracking.latitude && tracking.longitude
      )

      if (validPoints.length < 2) {
        directionsSegments.value = []
        return
      }

      const segments = await testDirectionsAPI(validPoints)

      if (segments && segments.length > 0) {
        directionsSegments.value = segments
      } else {
        directionsSegments.value = []
      }
    } catch (error) {
      console.error('Error generating route:', error)
      directionsSegments.value = []
    }
  }

  /**
   * Render route on map
   * @param mapWrapper - Object containing the map instance (e.g., { map: googleMapInstance })
   */
  const renderRouteOnMap = async (mapWrapper: any) => {
    if (!mapWrapper || directionsSegments.value.length === 0) {
      return
    }
    await renderDirections(mapWrapper, directionsSegments.value)
  }

  /**
   * Fetch both daily and every trackings and generate routes
   */
  const fetchTrackings = async (
    model: DriverLogsDailyEventsRequest,
    signal?: AbortSignal
  ) => {
    await Promise.allSettled([
      fetchDailyTrackings(model, signal),
      fetchEveryTrackings(model, signal),
    ])

    // Generate route directions after fetching trackings
    await generateRouteDirections()

    // Calculate map center
    calculateMapCenter()
  }

  /**
   * Select tracking event
   */
  const selectEvent = (event: TrackingResponse) => {
    if (selectedEvent.value?.eventId === event.eventId) {
      selectedEvent.value = null
      // Close all tooltips
      Object.keys(trackingTooltips.value).forEach(
        (key) => (trackingTooltips.value[key] = false)
      )
    } else {
      selectedEvent.value = event

      // Handle drive events differently
      if (event.eventCode === 3 && event.eventType === 1) {
        // For drive events, we use selectedTrackingEvents computed
        // Close all tooltips
        Object.keys(trackingTooltips.value).forEach(
          (key) => (trackingTooltips.value[key] = false)
        )
      } else {
        // Toggle tooltip for this event
        Object.keys(trackingTooltips.value).forEach(
          (key) => (trackingTooltips.value[key] = false)
        )
        trackingTooltips.value[event.eventId] = true
      }
    }
  }

  /**
   * Calculate map center from trackings
   */
  const calculateMapCenter = () => {
    const valid = everyTrackings.value.filter((t) =>
      trackingService.isValidCoordinates(t.latitude, t.longitude)
    )

    if (!valid.length) {
      mapCenter.value = { lat: 42.775572, lng: -95.968509 }
      zoomMap.value = 8
      return
    }

    // Calculate center
    const lat = valid.reduce((acc, p) => acc + (p.latitude || 0), 0) / valid.length
    const lng = valid.reduce((acc, p) => acc + (p.longitude || 0), 0) / valid.length
    mapCenter.value = { lat, lng }

    // Calculate zoom based on bounds
    const latDiff =
      Math.max(...valid.map((p) => p.latitude || 0)) -
      Math.min(...valid.map((p) => p.latitude || 0))
    const lngDiff =
      Math.max(...valid.map((p) => p.longitude || 0)) -
      Math.min(...valid.map((p) => p.longitude || 0))
    const maxDiff = Math.max(latDiff, lngDiff)

    // Set zoom based on bounds
    if (maxDiff === 0) {
      zoomMap.value = 15
    } else if (maxDiff > 10) {
      zoomMap.value = 5
    } else if (maxDiff > 5) {
      zoomMap.value = 7
    } else if (maxDiff > 2) {
      zoomMap.value = 9
    } else if (maxDiff > 1) {
      zoomMap.value = 10
    } else if (maxDiff > 0.5) {
      zoomMap.value = 11
    } else if (maxDiff > 0.1) {
      zoomMap.value = 13
    } else {
      zoomMap.value = 15
    }
  }

  /**
   * Toggle tracking collapse
   */
  const toggleTrackingCollapse = () => {
    trackingCollapse.value = !trackingCollapse.value
  }

  return {
    // State
    dailyTrackings,
    everyTrackings,
    loading,
    selectedEvent,
    trackingTooltips,
    trackingCollapse,
    mapCenter,
    zoomMap,
    mapInstance,
    directionsSegments,

    // Computed
    selectedTrackingEvents,

    // Methods
    fetchTrackings,
    fetchDailyTrackings,
    fetchEveryTrackings,
    selectEvent,
    calculateMapCenter,
    toggleTrackingCollapse,
    generateRouteDirections,
    renderRouteOnMap,
    cleanUpRenderers,
  }
}
