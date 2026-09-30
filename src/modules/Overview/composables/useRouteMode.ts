import { reactive, ref, watch, type Ref } from 'vue'

export interface RoutePoint {
  label: string
  lat: number
  lng: number
}

export interface RouteAlternative {
  via: string
  hasTolls: boolean
  tollCount: number
  durationText: string
  distanceText: string
}

const ACTIVE_POLYLINE = { strokeColor: '#3C64D8', strokeOpacity: 1, strokeWeight: 5 }
const INACTIVE_POLYLINE = { strokeColor: '#3C64D8', strokeOpacity: 0.35, strokeWeight: 3 }

export const useRouteMode = (mapInstance: Ref<any>) => {
  const isRoutingMode = ref(false)
  const routeForm = reactive({
    from: '',
    fromLat: 0,
    fromLng: 0,
    destinations: [{ text: '', lat: 0, lng: 0 }] as Array<{
      text: string
      lat: number
      lng: number
    }>,
  })

  const selectedRouteIndex = ref(0)
  const isFetchingRoutes = ref(false)
  const routeAlternatives = ref<RouteAlternative[]>([])

  let directionsRenderers: any[] = []

  const clearDirectionsRenderers = () => {
    directionsRenderers.forEach((r) => r.setMap(null))
    directionsRenderers = []
  }

  // Clear map when from or destination coordinates are removed
  watch(
    [() => routeForm.fromLat, () => routeForm.destinations[0]?.lat],
    ([fromLat, destLat]) => {
      if (!fromLat || !destLat) {
        routeAlternatives.value = []
        clearDirectionsRenderers()
      }
    },
  )

  const onSelectRouteFrom = (option: RoutePoint) => {
    routeForm.from = option.label
    routeForm.fromLat = option.lat
    routeForm.fromLng = option.lng
  }

  const onSelectRouteDestination = (option: RoutePoint, index: number) => {
    routeForm.destinations[index].text = option.label
    routeForm.destinations[index].lat = option.lat
    routeForm.destinations[index].lng = option.lng
  }

  const fetchRouteAlternatives = async () => {
    const { fromLat, fromLng } = routeForm
    const toLat = routeForm.destinations[0]?.lat
    const toLng = routeForm.destinations[0]?.lng

    if (!fromLat || !fromLng || !toLat || !toLng) return
    if (!mapInstance.value?.map) return

    isFetchingRoutes.value = true

    try {
      const google = (window as any).google
      const service = new google.maps.DirectionsService()

      const result = await service.route({
        origin: { lat: fromLat, lng: fromLng },
        destination: { lat: toLat, lng: toLng },
        travelMode: google.maps.TravelMode.DRIVING,
        provideRouteAlternatives: true,
      })

      clearDirectionsRenderers()
      selectedRouteIndex.value = 0

      // Inactive routes drawn first (below the active route)
      result.routes.forEach((_: any, idx: number) => {
        if (idx === 0) return
        directionsRenderers[idx] = new google.maps.DirectionsRenderer({
          map: mapInstance.value.map,
          directions: result,
          routeIndex: idx,
          suppressMarkers: true,
          polylineOptions: INACTIVE_POLYLINE,
        })
      })

      // Active route drawn last so it renders on top
      directionsRenderers[0] = new google.maps.DirectionsRenderer({
        map: mapInstance.value.map,
        directions: result,
        routeIndex: 0,
        suppressMarkers: false,
        polylineOptions: ACTIVE_POLYLINE,
      })

      routeAlternatives.value = result.routes.map((route: any) => {
        const leg = route.legs[0]
        const hasTolls =
          route.warnings?.some((w: string) => w.toLowerCase().includes('toll')) ?? false
        return {
          via: route.summary || 'Route',
          hasTolls,
          tollCount: hasTolls ? 1 : 0,
          durationText: leg.duration?.text || '',
          distanceText: leg.distance?.text || '',
        }
      })
    } catch (err) {
      console.error('Route fetch error:', err)
    } finally {
      isFetchingRoutes.value = false
    }
  }

  const selectRoute = (idx: number) => {
    const prev = selectedRouteIndex.value
    selectedRouteIndex.value = idx

    if (directionsRenderers[prev]) {
      directionsRenderers[prev].setOptions({
        suppressMarkers: true,
        polylineOptions: INACTIVE_POLYLINE,
      })
      directionsRenderers[prev].setMap(mapInstance.value?.map ?? null)
    }

    if (directionsRenderers[idx]) {
      directionsRenderers[idx].setOptions({
        suppressMarkers: false,
        polylineOptions: ACTIVE_POLYLINE,
      })
      // Re-add to map so it renders on top of other routes
      directionsRenderers[idx].setMap(null)
      directionsRenderers[idx].setMap(mapInstance.value?.map ?? null)
    }
  }

  return {
    isRoutingMode,
    routeForm,
    selectedRouteIndex,
    isFetchingRoutes,
    routeAlternatives,
    clearDirectionsRenderers,
    onSelectRouteFrom,
    onSelectRouteDestination,
    fetchRouteAlternatives,
    selectRoute,
  }
}
