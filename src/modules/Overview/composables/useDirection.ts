/**
 * Google Maps Directions, Routes, Geocoding, and Route Rendering Utilities
 */

// 1. IMPORTS
import { mapColors } from '@/utils/constants'
import { ref } from 'vue'
import { chunkArray } from '../utils/routeUtils'

// 2. TYPES & INTERFACES
// (No specific types exported or used locally that aren't 'any' right now, keeping as is)

export const useDirection = () => {
  // 3. VARIABLES (Refs, Reactive)
  const directionsRenderers = ref<any[]>([])
  const outOfRouteRenderers = ref<any[]>([])
  const fallbackPolylines = ref<any[]>([])
  const liveDirectionsRenderer = ref<any>(null)
  const directionMarkers = ref<any[]>([])
  const etaInfoWindow = ref<any>(null)

  // 4. COMPUTED PROPERTIES
  // (None)

  // 5. FUNCTIONS
  /**
   * Helper function to wait for Google Maps API to load
   */
  const waitForGoogleMaps = async (maxWait = 10000): Promise<boolean> => {
    const startTime = Date.now()
    return new Promise((resolve) => {
      const checkGoogle = () => {
        if ((window as any)?.google?.maps?.DirectionsService) {
          resolve(true)
          return
        }
        if (Date.now() - startTime > maxWait) {
          console.error('Google Maps API loading timeout')
          resolve(false)
          return
        }
        setTimeout(checkGoogle, 100)
      }
      checkGoogle()
    })
  }

  /**
   * Decode polyline to lat/lng coordinates
   */
  async function decodePolyline(
    encodedPolyline: string
  ): Promise<{ latitude: number; longitude: number }[]> {
    if (!encodedPolyline) return []

    try {
      const isGoogleReady = await waitForGoogleMaps()
      if (!isGoogleReady) throw new Error('Google Maps API not available')

      const google = (window as any).google
      const path = google.maps.geometry.encoding.decodePath(encodedPolyline)

      return path.map((latLng: any) => ({
        latitude: latLng.lat(),
        longitude: latLng.lng(),
      }))
    } catch (error) {
      console.error('Error decoding polyline:', error)
      return []
    }
  }

  /**
   * Create fallback result for direct line between two points
   */
  const createFallbackResult = (origin: any, destination: any) => {
    return {
      isFallback: true,
      origin: { lat: Number(origin.latitude), lng: Number(origin.longitude) },
      destination: { lat: Number(destination.latitude), lng: Number(destination.longitude) },
    }
  }

  /**
   * Get directions for a single segment
   */
  const getDirectionsForSegment = async (
    directionsService: any,
    origin: any,
    waypoints: any[],
    destination: any
  ): Promise<any> => {
    return new Promise((resolve, reject) => {
      const request = {
        origin: { lat: Number(origin.latitude), lng: Number(origin.longitude) },
        destination: { lat: Number(destination.latitude), lng: Number(destination.longitude) },
        waypoints: waypoints.map((wp) => ({
          location: { lat: Number(wp.latitude), lng: Number(wp.longitude) },
          stopover: true,
        })),
        travelMode: (window as any).google.maps.TravelMode.DRIVING,
      }

      directionsService.route(request, (result: any, status: any) => {
        if (status === (window as any).google.maps.DirectionsStatus.OK) {
          resolve(result)
        } else {
          reject(new Error(`Directions request failed: ${status}`))
        }
      })
    })
  }

  /**
   * Create arrow icon SVG
   */
  const createArrowIcon = (rotation: number, color: string = mapColors.ARROW_COLOR): string => {
    return `data:image/svg+xml,${encodeURIComponent(`
            <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <g transform="rotate(${rotation} 12 12)">
                    <path d="M12 2 L12 18 M12 18 L6 12 M12 18 L18 12" 
                        stroke="${color}" 
                        stroke-width="2.5" 
                        fill="none" 
                        stroke-linecap="round" 
                        stroke-linejoin="round"/>
                </g>
            </svg>
        `)}`
  }

  /**
   * Test Directions API and get route segments
   * Splits multi-point routes into chunks under 23 waypoints and fetches all segments
   * Falls back to direct lines if API fails
   */
  const testDirectionsAPI = async (allPoints: any) => {
    try {
      const isGoogleReady = await waitForGoogleMaps()
      if (!isGoogleReady) {
        return createFallbackSegments(allPoints)
      }

      const google = (window as any).google
      const directionsService = new google.maps.DirectionsService()

      // Handle case with only 2 points
      if (allPoints.length === 2) {
        const [origin, destination] = allPoints
        try {
          const result = await getDirectionsForSegment(directionsService, origin, [], destination)
          return [result]
        } catch (error) {
          return [createFallbackResult(origin, destination)]
        }
      }

      // Handle multiple points with chunking (overlapping like old project)
      const maxWaypoints = 23
      const allSegments = []
      let startIndex = 0
      let chunkNumber = 1

      while (startIndex < allPoints.length - 1) {
        const endIndex = Math.min(startIndex + maxWaypoints + 2, allPoints.length)
        const chunk = allPoints.slice(startIndex, endIndex)

        const origin = chunk[0]
        const destination = chunk[chunk.length - 1]
        const waypoints = chunk.slice(1, -1)

        try {
          const segmentResult = await getDirectionsForSegment(
            directionsService,
            origin,
            waypoints,
            destination
          )
          allSegments.push(segmentResult)
        } catch (error) {
          allSegments.push(createFallbackResult(origin, destination))
        }

        // Move to next chunk with overlap
        startIndex = endIndex - 1
        chunkNumber++
      }

      return allSegments
    } catch (error: any) {
      console.error('DirectionsService error:', error)
      return createFallbackSegments(allPoints)
    }
  }

  /**
   * Create fallback segments for all points (direct lines)
   */
  const createFallbackSegments = (allPoints: any[]) => {
    if (!allPoints || allPoints.length < 2) return []

    const segments = []
    for (let i = 0; i < allPoints.length - 1; i++) {
      segments.push(createFallbackResult(allPoints[i], allPoints[i + 1]))
    }
    return segments
  }

  /**
   * Generate live route from current position to new location
   */
  const generateLiveRoute = async (currentPosition: any, newLocation: any) => {
    try {
      const isGoogleReady = await waitForGoogleMaps()
      if (!isGoogleReady) throw new Error('Google Maps API not available')

      const google = (window as any).google
      const directionsService = new google.maps.DirectionsService()

      try {
        const result = await getDirectionsForSegment(
          directionsService,
          {
            latitude: Number(currentPosition.lat),
            longitude: Number(currentPosition.lng),
          },
          [],
          {
            latitude: Number(newLocation.lat ?? newLocation.latitude),
            longitude: Number(newLocation.lng ?? newLocation.longitude),
          }
        )
        return result
      } catch (error) {
        return []
      }
    } catch (error: any) {
      console.error('❌ Live route generation error:', error)
      throw error
    }
  }

  /**
   * Draw a simple line between two points (fallback)
   */
  const drawFallbackLine = (
    mapInstance: any,
    origin: any,
    destination: any,
    color: string = mapColors.OUT_DIRECTION_COLOR,
    weight: number = 5
  ) => {
    try {
      const google = (window as any).google
      const polyline = new google.maps.Polyline({
        path: [origin, destination],
        strokeColor: color,
        strokeWeight: weight,
        strokeOpacity: 0.8,
      })

      polyline.setMap(mapInstance.map)
      return polyline
    } catch (error) {
      console.error('Error drawing fallback line:', error)
      return null
    }
  }

  /**
   * Draw live route on the map
   */
  const drawLiveRoute = (mapInstance: any, routeResult: any) => {
    try {
      // Clean up previous live route
      if (liveDirectionsRenderer.value) {
        if (Array.isArray(liveDirectionsRenderer.value)) {
          liveDirectionsRenderer.value.forEach((renderer: any) => {
            if (typeof renderer?.setMap === 'function') {
              renderer.setMap(null)
            }
          })
        } else if (typeof liveDirectionsRenderer.value.setMap === 'function') {
          liveDirectionsRenderer.value.setMap(null)
        }
        liveDirectionsRenderer.value = null
      }

      const google = (window as any).google

      if (routeResult.isFallback) {
        liveDirectionsRenderer.value = drawFallbackLine(
          mapInstance,
          routeResult.origin,
          routeResult.destination,
          mapColors.DIRECTION_INNER_COLOR,
          4
        )
      } else {
        const borderRenderer = new google.maps.DirectionsRenderer({
          suppressMarkers: true,
          preserveViewport: true,
          polylineOptions: {
            strokeColor: mapColors.DIRECTION_BORDER_COLOR,
            strokeWeight: 6,
            strokeOpacity: 1.0,
            zIndex: 1,
          },
        })
        borderRenderer.setMap(mapInstance.map)
        borderRenderer.setDirections(routeResult)

        const innerRenderer = new google.maps.DirectionsRenderer({
          suppressMarkers: true,
          preserveViewport: true,
          polylineOptions: {
            strokeColor: mapColors.DIRECTION_INNER_COLOR,
            strokeWeight: 3,
            strokeOpacity: 1.0,
            zIndex: 2,
          },
        })
        innerRenderer.setMap(mapInstance.map)
        innerRenderer.setDirections(routeResult)

        liveDirectionsRenderer.value = [borderRenderer, innerRenderer]
      }
    } catch (error) {
      console.error('Error drawing live route:', error)
    }
  }

  /**
   * Update live route
   */
  const updateLiveRoute = async (
    mapInstance: any,
    currentPosition: any,
    newLocation: any,
    drawRoute: boolean = true
  ) => {
    try {
      const routeResult = await generateLiveRoute(currentPosition, newLocation)
      if (drawRoute) drawLiveRoute(mapInstance, routeResult)
      return routeResult
    } catch (error) {
      console.error('❌ Live route update error:', error)
      throw error
    }
  }

  /**
   * Get all path points from route
   */
  const getRoutePathPoints = (routeResult: any) => {
    try {
      if (routeResult.isFallback) {
        return [routeResult.origin, routeResult.destination]
      }
      if (!routeResult?.routes?.[0]) {
        return []
      }

      const route = routeResult.routes[0]
      const pathPoints: any[] = []

      route.legs?.forEach((leg: any) => {
        leg.steps?.forEach((step: any) => {
          if (step.path && step.path.length > 0) {
            step.path.forEach((point: any) => {
              pathPoints.push({
                lat: typeof point.lat === 'function' ? point.lat() : point.lat,
                lng: typeof point.lng === 'function' ? point.lng() : point.lng,
              })
            })
          }
        })
      })

      if (pathPoints.length === 0 && route.overview_path) {
        route.overview_path.forEach((point: any) => {
          pathPoints.push({
            lat: typeof point.lat === 'function' ? point.lat() : point.lat,
            lng: typeof point.lng === 'function' ? point.lng() : point.lng,
          })
        })
      }

      // Memory cleanup for extracted data
      route.legs = null
      route.overview_path = null

      return pathPoints
    } catch (error) {
      console.error('❌ Error getting route points:', error)
      return []
    }
  }

  /**
   * Clear main direction renderers
   */
  const clearDirections = () => {
    try {
      directionsRenderers.value.forEach((renderer: any) => {
        if (renderer && typeof renderer.setMap === 'function') {
          renderer.setMap(null)
        }
      })
      directionsRenderers.value = []

      fallbackPolylines.value.forEach((polyline: any) => {
        if (polyline && typeof polyline.setMap === 'function') {
          polyline.setMap(null)
        }
      })
      fallbackPolylines.value = []
    } catch (error) {
      console.error('Error in clearDirections:', error)
    }
  }

  /**
   * Clear out-of-route renderers
   */
  const clearOutOfRouteRenderers = () => {
    try {
      outOfRouteRenderers.value.forEach((renderer: any) => {
        if (renderer && typeof renderer.setMap === 'function') {
          renderer.setMap(null)
        }
      })
      outOfRouteRenderers.value = []
    } catch (error) {
      console.error('Error clearing out-of-route renderers:', error)
    }
  }

  /**
   * Clean up all renderers
   */
  const cleanUpRenderers = () => {
    clearDirections()
    clearOutOfRouteRenderers()

    if (liveDirectionsRenderer.value) {
      if (Array.isArray(liveDirectionsRenderer.value)) {
        liveDirectionsRenderer.value.forEach((renderer: any) => {
          if (typeof renderer?.setMap === 'function') renderer.setMap(null)
        })
      } else if (typeof liveDirectionsRenderer.value.setMap === 'function') {
        liveDirectionsRenderer.value.setMap(null)
      }
      liveDirectionsRenderer.value = null
    }

    directionMarkers.value.forEach((marker: any) => marker.setMap(null))
    directionMarkers.value = []

    if (etaInfoWindow.value) {
      etaInfoWindow.value.close()
      etaInfoWindow.value = null
    }
  }

  const renderDirections = async (mapInstance: any, segments: any[]) => {
    const google = (window as any).google
    clearDirections()

    // 1. Render historical/main route segments
    segments.forEach((segment) => {
      try {
        if (segment.isFallback) {
          const polyline = drawFallbackLine(
            mapInstance,
            segment.origin,
            segment.destination,
            mapColors.DIRECTION_COLOR
          )
          if (polyline) fallbackPolylines.value.push(polyline)
        } else {
          const renderer = new google.maps.DirectionsRenderer({
            suppressMarkers: true,
            preserveViewport: false,
            polylineOptions: {
              strokeColor: mapColors.DIRECTION_COLOR,
              strokeWeight: 5,
              strokeOpacity: 0.8,
            },
          })
          renderer.setMap(mapInstance.map)
          renderer.setDirections(segment)
          directionsRenderers.value.push(renderer)
        }
      } catch (error) {
        console.warn('Error rendering segment:', error)
      }
    })
  }

  const showETAInfoWindow = (
    mapInstance: any,
    position: { lat: number; lng: number },
    etaText: string,
    distanceText: string
  ) => {
    const google = (window as any).google
    if (etaInfoWindow.value) {
      etaInfoWindow.value.close()
    }
    const contentString = `
      <div style="padding: 8px; font-family: Roboto; font-size: 14px;">
        <div style="font-weight: bold; margin-bottom: 4px;">ETA: ${etaText}</div>
        <div style="color: #666;">Distance: ${distanceText}</div>
      </div>
    `
    etaInfoWindow.value = new google.maps.InfoWindow({
      content: contentString,
      position: position,
      pixelOffset: new google.maps.Size(0, -30),
    })
    etaInfoWindow.value.open(mapInstance.map)
  }

  const clearETAInfoWindow = () => {
    if (etaInfoWindow.value) {
      etaInfoWindow.value.close()
      etaInfoWindow.value = null
    }
  }

  const calculateRouteFromAddress = async (
    originLat: number,
    originLng: number,
    toAddress: string
  ): Promise<{ segments: any[]; destination: { latitude: number; longitude: number } | null }> => {
    try {
      const isGoogleReady = await waitForGoogleMaps()
      if (!isGoogleReady) throw new Error('Google Maps API not available')

      const google = (window as any).google
      const directionsService = new google.maps.DirectionsService()
      const geocoder = new google.maps.Geocoder()

      // Geocode the destination address to get coordinates
      const geocodeResult: any = await new Promise((resolve, reject) => {
        geocoder.geocode({ address: toAddress }, (results: any, status: any) => {
          if (status === google.maps.GeocoderStatus.OK && results && results.length > 0) {
            resolve(results[0])
          } else {
            reject(new Error(`Geocoding failed: ${status}`))
          }
        })
      })

      const destinationLatLng = geocodeResult.geometry.location
      const destination = {
        latitude: destinationLatLng.lat(),
        longitude: destinationLatLng.lng(),
      }

      // Get directions from origin coordinates to destination
      const directionsResult: any = await new Promise((resolve, reject) => {
        directionsService.route(
          {
            origin: { lat: originLat, lng: originLng },
            destination: { lat: destination.latitude, lng: destination.longitude },
            travelMode: google.maps.TravelMode.DRIVING,
          },
          (result: any, status: any) => {
            if (status === google.maps.DirectionsStatus.OK) {
              resolve(result)
            } else {
              reject(new Error(`Directions calculation failed: ${status}`))
            }
          }
        )
      })

      return {
        segments: [directionsResult],
        destination,
      }
    } catch (error) {
      console.error('Error calculating route from address:', error)
      throw error
    }
  }

  // 6. WATCHERS
  // (None)

  // 7. LIFECYCLE HOOKS
  // (None)

  return {
    testDirectionsAPI,
    renderDirections,
    updateLiveRoute,
    cleanUpRenderers,
    getRoutePathPoints,
    calculateRouteFromAddress,
    decodePolyline,
    showETAInfoWindow,
    clearETAInfoWindow,
    waitForGoogleMaps,
  }
}
