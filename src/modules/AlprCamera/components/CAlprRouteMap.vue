<template>
  <div ref="mapContainerRef" class="relative h-full min-h-[320px] w-full overflow-hidden bg-muted">
    <div class="absolute right-4 top-4 z-30 flex flex-wrap items-center justify-end gap-2">
      <CMapTypeControl />
      <Button
        type="button"
        :title="
          backgroundCamerasVisible ? 'Hide cameras outside route' : 'Show cameras outside route'
        "
        :variant="backgroundCamerasVisible ? 'default' : 'outline'"
        size="icon"
        class="h-10 w-10 bg-background shadow-md"
        @click="toggleBackgroundCameras"
      >
        <Camera class="h-5 w-5" />
      </Button>
      <Button
        type="button"
        :title="selectedRoute ? 'Fit selected route' : 'Show camera overview'"
        variant="outline"
        size="icon"
        class="h-10 w-10 bg-background shadow-md"
        @click="focusMap"
      >
        <LocateFixed class="h-5 w-5" />
      </Button>
      <Button
        type="button"
        title="Toggle fullscreen"
        variant="outline"
        size="icon"
        class="h-10 w-10 bg-background shadow-md"
        @click="toggleFullscreen"
      >
        <Minimize v-if="isFullscreen" class="h-5 w-5" />
        <Maximize v-else class="h-5 w-5" />
      </Button>
    </div>

    <div
      v-if="isFullscreen && routes.length > 1"
      class="absolute left-4 top-4 z-30 w-[min(300px,calc(100vw-32px))] rounded-lg border border-border bg-background/95 p-3 shadow-xl backdrop-blur"
    >
      <div class="mb-2 flex items-center justify-between">
        <span class="text-sm font-semibold text-foreground">Route results</span>
        <span class="text-xs text-muted-foreground">{{ routes.length }}</span>
      </div>
      <div class="max-h-[min(55vh,420px)] space-y-2 overflow-y-auto pr-1">
        <button
          v-for="(route, index) in routes"
          :key="`fullscreen-${route.label}-${index}`"
          type="button"
          class="w-full rounded-md border px-3 py-2.5 text-left transition-colors"
          :class="
            selectedIndex === index
              ? 'border-primary bg-primary/10'
              : 'border-border bg-card hover:bg-accent/60'
          "
          @click="emit('select-route', index)"
        >
          <div class="flex items-center justify-between gap-3">
            <span class="truncate text-sm font-semibold text-foreground">{{ route.label }}</span>
            <span
              class="rounded bg-red-50 px-1.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-400"
            >
              {{ route.cameraCount }}
            </span>
          </div>
          <div class="mt-1 text-xs text-muted-foreground">
            {{ formatMiles(route.distanceMetres) }} mi · {{ formatDuration(route.durationSeconds) }}
          </div>
          <div v-if="route.roadSummary" class="mt-1 truncate text-xs text-muted-foreground">
            via {{ route.roadSummary }}
          </div>
        </button>
      </div>
    </div>

    <CMap ref="mapRef" :center="defaultCenter" :zoom="4" @ready="onReady" @click="handleMapClick">
      <CMapMarker
        v-for="endpoint in endpointMarkers"
        :key="endpoint.key"
        :position="endpoint.position"
        anchor="bottom"
        :z-index="1"
      >
        <div class="relative h-[41px] w-[27px] drop-shadow" :title="endpoint.title">
          <svg viewBox="0 0 27 41" class="absolute inset-0 h-full w-full">
            <path
              d="M13.5 0.5C6.3 0.5 0.5 6.3 0.5 13.5c0 9.7 13 27 13 27s13-17.3 13-27C26.5 6.3 20.7 0.5 13.5 0.5z"
              fill="#EA4335"
              stroke="#B31412"
            />
          </svg>
          <span
            class="absolute inset-x-0 top-[7px] text-center text-xs font-bold leading-none text-white"
          >
            {{ endpoint.label }}
          </span>
        </div>
      </CMapMarker>

      <CMapMarker
        v-if="selectedCamera"
        :position="{ lat: selectedCamera.latitude, lng: selectedCamera.longitude }"
        anchor="bottom"
        :offset="[0, -8]"
        :z-index="2"
      >
        <div class="relative pb-2">
          <div class="min-w-[220px] rounded-lg bg-white p-3 text-sm text-gray-900 shadow-xl">
            <div class="mb-2 flex items-center justify-between gap-3">
              <div class="font-semibold">ALPR camera</div>
              <button
                type="button"
                aria-label="Close camera information"
                class="-mr-1 rounded p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
                @click="selectedCamera = null"
              >
                <X class="h-4 w-4" />
              </button>
            </div>
            <div class="space-y-1 text-xs">
              <div class="flex justify-between gap-4">
                <span class="text-gray-500">Name</span>
                <span class="max-w-[145px] text-right">{{ cameraName(selectedCamera) }}</span>
              </div>
              <div v-if="isRouteCamera(selectedCamera)" class="flex justify-between gap-4">
                <span class="text-gray-500">Route position</span>
                <span>{{ formatMiles(selectedCamera.chainageMetres) }} mi</span>
              </div>
              <div
                v-if="isMapCamera(selectedCamera) && selectedCamera.brand"
                class="flex justify-between gap-4"
              >
                <span class="text-gray-500">Brand</span>
                <span>{{ selectedCamera.brand }}</span>
              </div>
              <div v-if="selectedCamera.bearings.length" class="flex justify-between gap-4">
                <span class="text-gray-500">Bearing</span>
                <span>{{ selectedCamera.bearings.map(formatBearing).join(', ') }}</span>
              </div>
              <div v-if="selectedCamera.bearingConfidence" class="flex justify-between gap-4">
                <span class="text-gray-500">Confidence</span>
                <span>{{ selectedCamera.bearingConfidence }}</span>
              </div>
              <div v-if="selectedCamera.operator" class="flex justify-between gap-4">
                <span class="text-gray-500">Operator</span>
                <span>{{ selectedCamera.operator }}</span>
              </div>
              <div
                v-if="isMapCamera(selectedCamera) && selectedCamera.zone"
                class="flex justify-between gap-4"
              >
                <span class="text-gray-500">Zone</span>
                <span>{{ selectedCamera.zone }}</span>
              </div>
              <div
                v-if="isMapCamera(selectedCamera) && selectedCamera.mount"
                class="flex justify-between gap-4"
              >
                <span class="text-gray-500">Mount</span>
                <span>{{ selectedCamera.mount }}</span>
              </div>
              <div class="flex justify-between gap-4">
                <span class="text-gray-500">Coordinates</span>
                <span>
                  {{ selectedCamera.latitude.toFixed(5) }},
                  {{ selectedCamera.longitude.toFixed(5) }}
                </span>
              </div>
            </div>
          </div>
          <div
            class="absolute bottom-0 left-1/2 h-0 w-0 -translate-x-1/2 border-x-8 border-t-8 border-x-transparent border-t-white"
          />
        </div>
      </CMapMarker>
    </CMap>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, toRaw, watch } from 'vue'
import { Camera, LocateFixed, Maximize, Minimize, X } from 'lucide-vue-next'
import type {
  GeoJSONSource,
  Map as MapLibreMap,
  MapGeoJSONFeature,
  MapMouseEvent,
  PointLike,
} from 'maplibre-gl'
import type { Feature, FeatureCollection, Geometry } from 'geojson'
import { ApiEndpoints } from '@/api/endpoints'
import { Button } from '@/components/ui/button'
import CMap from '@/components/custom/CMap.vue'
import CMapMarker from '@/components/custom/CMapMarker.vue'
import CMapTypeControl from '@/components/custom/CMapTypeControl.vue'
import { useApi } from '@/composables/useAxiosService'
import { mapViewport, svgToMapImage, type MapPosition } from '@/utils/maps'
import type {
  AlprCameraCluster,
  AlprCameraClusterCollection,
  AlprCameraRouteCandidate,
  AlprLocation,
  AlprMapCamera,
  AlprRouteCamera,
} from '../types'

const props = defineProps<{
  routes: AlprCameraRouteCandidate[]
  selectedIndex: number
  origin?: AlprLocation | null
  destination?: AlprLocation | null
  stops?: AlprLocation[]
}>()

const emit = defineEmits<{
  (event: 'select-route', index: number): void
  (event: 'select-location', location: { longitude: number; latitude: number }): void
}>()

type RouteCameraHalo = 'none' | 'halo' | 'halo-faint'

const MAX_CLUSTER_MARKERS = 450
const ROUTE_SOURCE = 'alpr-routes'
const CONNECTOR_SOURCE = 'alpr-waypoint-connectors'
const CLUSTER_SOURCE = 'alpr-camera-clusters'
const MAP_CAMERA_SOURCE = 'alpr-map-cameras'
const ROUTE_CAMERA_BEARING_SOURCE = 'alpr-route-camera-bearings'
const ROUTE_CAMERA_SOURCE = 'alpr-route-cameras'
const INTERACTIVE_LAYERS = [ROUTE_SOURCE, CLUSTER_SOURCE, MAP_CAMERA_SOURCE, ROUTE_CAMERA_SOURCE]
const api = useApi()
const defaultCenter = { lat: 39.5, lng: -98.35 }
const mapContainerRef = ref<HTMLElement | null>(null)
const mapRef = ref<InstanceType<typeof CMap> | null>(null)
const backgroundCamerasVisible = ref(false)
const isFullscreen = ref(false)
const selectedCamera = ref<AlprRouteCamera | AlprMapCamera | null>(null)
const routeBoundsCache = new WeakMap<
  number[][],
  { north: number; south: number; east: number; west: number }
>()
let mapCameras: AlprMapCamera[] = []
let clusterAbort: AbortController | null = null
let lastClusterView = ''
let clusterRefreshTimer: number | null = null
let disposed = false

const selectedRoute = computed(() => props.routes[props.selectedIndex] ?? null)
const waypointConnectors = computed(() => {
  const geometry = selectedRoute.value ? toRaw(selectedRoute.value.geometry) : []
  if (geometry.length < 2) return []

  const waypoints = [props.origin, ...(props.stops ?? []), props.destination].filter(
    (location): location is AlprLocation => Boolean(location)
  )
  return waypoints
    .map((location) => {
      const nearest = nearestRoutePoint(location, geometry)
      if (!nearest) return null
      const gapMetres =
        haversineKm(location.latitude, location.longitude, nearest.lat, nearest.lng) * 1000
      if (gapMetres < 12) return null
      return [{ lat: location.latitude, lng: location.longitude }, nearest]
    })
    .filter((path): path is MapPosition[] => path !== null)
})
const endpointMarkers = computed(() => {
  const markers: { key: string; label: string; title: string; position: MapPosition }[] = []
  const add = (location: AlprLocation | null | undefined, label: string, key: string) => {
    if (!location) return
    markers.push({
      key,
      label,
      title: location.label,
      position: { lat: location.latitude, lng: location.longitude },
    })
  }
  add(props.origin, 'A', 'origin')
  ;(props.stops ?? []).forEach((stop, index) =>
    add(stop, String(index + 1), `${stop.longitude}-${stop.latitude}-${index}`)
  )
  add(props.destination, 'B', 'destination')
  return markers
})

function onReady(map: MapLibreMap) {
  map.setMissingStyleImageResolver((id) => resolveMapImage(map, id))
  addOverlayLayers(map)
  map.on('moveend', scheduleClusterRefresh)
  INTERACTIVE_LAYERS.forEach((layer) => {
    map.on('mouseenter', layer, () => {
      map.getCanvas().style.cursor = 'pointer'
    })
    map.on('mouseleave', layer, () => {
      map.getCanvas().style.cursor = ''
    })
  })
  backgroundCamerasVisible.value = !selectedRoute.value
  if (backgroundCamerasVisible.value) scheduleClusterRefresh()
  renderRoutes()
  renderWaypointConnectors()
  renderRouteCameras()
  if (selectedRoute.value) void fitSelectedRoute()
}

function getMap() {
  return mapRef.value?.getMap() ?? null
}

function emptyCollection(): FeatureCollection {
  return { type: 'FeatureCollection', features: [] }
}

function setSourceData(id: string, features: Feature<Geometry>[]) {
  getMap()?.getSource<GeoJSONSource>(id)?.setData({ type: 'FeatureCollection', features })
}

function pointFeature(
  position: { longitude: number; latitude: number },
  properties: Record<string, string | number | boolean>
): Feature<Geometry> {
  return {
    type: 'Feature',
    properties,
    geometry: { type: 'Point', coordinates: [position.longitude, position.latitude] },
  }
}

function addOverlayLayers(map: MapLibreMap) {
  ;[
    ROUTE_SOURCE,
    CONNECTOR_SOURCE,
    CLUSTER_SOURCE,
    MAP_CAMERA_SOURCE,
    ROUTE_CAMERA_BEARING_SOURCE,
    ROUTE_CAMERA_SOURCE,
  ].forEach((id) => map.addSource(id, { type: 'geojson', data: emptyCollection() }))
  map.addLayer({
    id: ROUTE_SOURCE,
    type: 'line',
    source: ROUTE_SOURCE,
    layout: {
      'line-join': 'round',
      'line-cap': 'round',
      'line-sort-key': ['case', ['get', 'selected'], 1, 0],
    },
    paint: {
      'line-color': ['case', ['get', 'selected'], '#3C64D8', '#7C8799'],
      'line-opacity': ['case', ['get', 'selected'], 1, 0.35],
      'line-width': ['case', ['get', 'selected'], 6, 4],
    },
  })
  map.addLayer({
    id: CONNECTOR_SOURCE,
    type: 'line',
    source: CONNECTOR_SOURCE,
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: {
      'line-color': '#E5484D',
      'line-opacity': 0.9,
      'line-width': 3.4,
      'line-dasharray': [0, 2.6],
    },
  })
  map.addLayer({
    id: CLUSTER_SOURCE,
    type: 'symbol',
    source: CLUSTER_SOURCE,
    layout: {
      'icon-image': ['get', 'icon'],
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
      'text-field': ['get', 'label'],
      'text-font': ['Noto Sans Medium'],
      'text-size': 12,
      'text-allow-overlap': true,
      'text-ignore-placement': true,
    },
    paint: { 'text-color': '#FFFFFF' },
  })
  map.addLayer({
    id: MAP_CAMERA_SOURCE,
    type: 'symbol',
    source: MAP_CAMERA_SOURCE,
    layout: {
      'icon-image': ['get', 'icon'],
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
    },
  })
  map.addLayer({
    id: ROUTE_CAMERA_BEARING_SOURCE,
    type: 'symbol',
    source: ROUTE_CAMERA_BEARING_SOURCE,
    layout: {
      'icon-image': ['get', 'icon'],
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
      'icon-rotate': ['get', 'bearing'],
      'icon-rotation-alignment': 'map',
    },
  })
  map.addLayer({
    id: ROUTE_CAMERA_SOURCE,
    type: 'symbol',
    source: ROUTE_CAMERA_SOURCE,
    layout: {
      'icon-image': ['get', 'icon'],
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
    },
  })
}

async function resolveMapImage(map: MapLibreMap, id: string) {
  const definition = mapImageDefinition(id)
  if (!definition) return
  const image = await svgToMapImage(definition.svg, definition.size, definition.size)
  if (image && !disposed && !map.hasImage(id)) map.addImage(id, image, { pixelRatio: 2 })
}

function mapImageDefinition(id: string) {
  if (id === 'alpr-camera') return { svg: cameraMarkerSvg(), size: 26 }
  const cluster = /^alpr-cluster-(\d+)$/.exec(id)
  if (cluster) {
    const size = Number(cluster[1])
    return { svg: clusterMarkerSvg(size), size }
  }
  const wedge = /^alpr-wedge-(solid|faint)$/.exec(id)
  if (wedge) return { svg: routeCameraWedgeSvg(wedge[1] === 'faint'), size: 40 }
  const body = /^alpr-route-camera-(none|halo|halo-faint)-(ring|plain)-(active|idle)$/.exec(id)
  if (body) {
    return {
      svg: routeCameraBodySvg(body[1] as RouteCameraHalo, body[2] === 'ring', body[3] === 'active'),
      size: 40,
    }
  }
  return null
}

function renderRoutes() {
  setSourceData(
    ROUTE_SOURCE,
    props.routes.map((route, index) => ({
      type: 'Feature',
      properties: { index, selected: index === props.selectedIndex },
      geometry: {
        type: 'LineString',
        coordinates: toRaw(route.geometry).filter((point) => point.length >= 2),
      },
    }))
  )
}

function renderWaypointConnectors() {
  setSourceData(
    CONNECTOR_SOURCE,
    waypointConnectors.value.map((path) => ({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: path.map((position) => [position.lng, position.lat]),
      },
    }))
  )
}

function nearestRoutePoint(location: AlprLocation, geometry: number[][]) {
  const latitudeScale = Math.max(0.2, Math.cos((location.latitude * Math.PI) / 180))
  const pointX = location.longitude * latitudeScale
  const pointY = location.latitude
  let nearest: { lat: number; lng: number } | null = null
  let nearestDistanceSquared = Number.POSITIVE_INFINITY

  for (let index = 1; index < geometry.length; index += 1) {
    const start = geometry[index - 1]
    const end = geometry[index]
    if (start.length < 2 || end.length < 2) continue
    const startX = start[0] * latitudeScale
    const startY = start[1]
    const endX = end[0] * latitudeScale
    const endY = end[1]
    const deltaX = endX - startX
    const deltaY = endY - startY
    const lengthSquared = deltaX * deltaX + deltaY * deltaY
    const projection = lengthSquared
      ? Math.max(
          0,
          Math.min(1, ((pointX - startX) * deltaX + (pointY - startY) * deltaY) / lengthSquared)
        )
      : 0
    const projectedX = startX + deltaX * projection
    const projectedY = startY + deltaY * projection
    const distanceSquared =
      (pointX - projectedX) * (pointX - projectedX) + (pointY - projectedY) * (pointY - projectedY)
    if (distanceSquared >= nearestDistanceSquared) continue
    nearestDistanceSquared = distanceSquared
    nearest = {
      lat: start[1] + (end[1] - start[1]) * projection,
      lng: start[0] + (end[0] - start[0]) * projection,
    }
  }

  return nearest
}

async function refreshCameraClusters() {
  const map = getMap()
  const viewport = map ? mapViewport(map) : null
  if (!map || !viewport || !backgroundCamerasVisible.value) return
  if (viewport.west >= viewport.east) return

  const mapZoom = Math.max(0, Math.min(22, Math.floor(map.getZoom())))
  const viewKey = [
    mapZoom,
    viewport.west.toFixed(3),
    viewport.south.toFixed(3),
    viewport.east.toFixed(3),
    viewport.north.toFixed(3),
  ].join(':')
  if (viewKey === lastClusterView) return

  clusterAbort?.abort()
  const controller = new AbortController()
  clusterAbort = controller

  try {
    if (mapZoom >= 14) {
      const response = await api.get<AlprMapCamera[]>(ApiEndpoints.ALPR_CAMERAS, {
        params: { ...viewport, limit: 1500 },
        signal: controller.signal,
        _skipErrorHandling: true,
      })
      if (controller.signal.aborted) return
      lastClusterView = viewKey
      renderMapCameras(response.data)
      return
    }

    let queryZoom = mapZoom
    let clusters: AlprCameraCluster[] = []
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await api.get<AlprCameraClusterCollection>(
        ApiEndpoints.ALPR_CAMERA_CLUSTERS,
        {
          params: { ...viewport, zoom: queryZoom },
          signal: controller.signal,
          _skipErrorHandling: true,
        }
      )
      clusters = response.data.features
        .filter((feature) => feature.geometry.coordinates.length >= 2)
        .map((feature) => ({
          longitude: feature.geometry.coordinates[0],
          latitude: feature.geometry.coordinates[1],
          count: feature.properties.count,
        }))
      if (clusters.length <= MAX_CLUSTER_MARKERS || queryZoom <= 4) break
      queryZoom = Math.max(4, queryZoom - 2)
    }

    if (controller.signal.aborted) return
    lastClusterView = viewKey
    renderClusterMarkers(clusters)
  } catch {
    if (!controller.signal.aborted) lastClusterView = ''
  }
}

function renderMapCameras(cameras: AlprMapCamera[]) {
  clearBackgroundCameras()
  if (
    selectedCamera.value &&
    isMapCamera(selectedCamera.value) &&
    !cameras.some((camera) => camera.id === selectedCamera.value?.id)
  ) {
    selectedCamera.value = null
  }
  if (!backgroundCamerasVisible.value) return
  mapCameras = cameras
  setSourceData(
    MAP_CAMERA_SOURCE,
    cameras.map((camera, index) => pointFeature(camera, { index, icon: 'alpr-camera' }))
  )
}

function renderClusterMarkers(clusters: AlprCameraCluster[]) {
  clearBackgroundCameras()
  if (selectedCamera.value && isMapCamera(selectedCamera.value)) selectedCamera.value = null
  if (!backgroundCamerasVisible.value) return
  setSourceData(
    CLUSTER_SOURCE,
    clusters.map((cluster) =>
      pointFeature(cluster, {
        label: formatCount(cluster.count),
        icon: `alpr-cluster-${clusterDiameter(cluster.count)}`,
      })
    )
  )
}

function renderRouteCameras() {
  selectedCamera.value = null
  const cameras = selectedRoute.value ? toRaw(selectedRoute.value.cameras) : []
  setSourceData(
    ROUTE_CAMERA_BEARING_SOURCE,
    cameras.flatMap((camera, index) =>
      camera.bearings.map((bearing) =>
        pointFeature(camera, {
          index,
          bearing,
          icon: `alpr-wedge-${isFaintCamera(camera) ? 'faint' : 'solid'}`,
        })
      )
    )
  )
  setSourceData(
    ROUTE_CAMERA_SOURCE,
    cameras.map((camera, index) => pointFeature(camera, { index, icon: routeCameraIcon(camera) }))
  )
}

function clearBackgroundCameras() {
  mapCameras = []
  setSourceData(MAP_CAMERA_SOURCE, [])
  setSourceData(CLUSTER_SOURCE, [])
}

function toggleBackgroundCameras() {
  backgroundCamerasVisible.value = !backgroundCamerasVisible.value
  if (backgroundCamerasVisible.value) {
    lastClusterView = ''
    scheduleClusterRefresh()
  } else {
    clusterAbort?.abort()
    clearBackgroundCameras()
  }
}

function scheduleClusterRefresh() {
  if (clusterRefreshTimer) clearTimeout(clusterRefreshTimer)
  if (!backgroundCamerasVisible.value) return
  clusterRefreshTimer = window.setTimeout(() => {
    clusterRefreshTimer = null
    void refreshCameraClusters()
  }, 180)
}

function renderedFeature(
  map: MapLibreMap,
  geometry: PointLike | [PointLike, PointLike],
  layer: string
): MapGeoJSONFeature | undefined {
  return map.queryRenderedFeatures(geometry, { layers: [layer] })[0]
}

function handleMapClick(event: MapMouseEvent) {
  selectedCamera.value = null
  const map = getMap()
  if (!map) return

  const routeCamera = renderedFeature(map, event.point, ROUTE_CAMERA_SOURCE)
  const routeCameraIndex = Number(routeCamera?.properties.index)
  if (routeCamera && selectedRoute.value?.cameras[routeCameraIndex]) {
    selectedCamera.value = selectedRoute.value.cameras[routeCameraIndex]
    return
  }

  const mapCamera = renderedFeature(map, event.point, MAP_CAMERA_SOURCE)
  const mapCameraIndex = Number(mapCamera?.properties.index)
  if (mapCamera && mapCameras[mapCameraIndex]) {
    selectedCamera.value = mapCameras[mapCameraIndex]
    return
  }

  const cluster = renderedFeature(map, event.point, CLUSTER_SOURCE)
  if (cluster?.geometry.type === 'Point') {
    const [lng, lat] = cluster.geometry.coordinates
    flyTo({ lat, lng }, Math.min(map.getZoom() + 2, 16))
    return
  }

  const { x, y } = event.point
  const routes = map.queryRenderedFeatures(
    [
      [x - 4, y - 4],
      [x + 4, y + 4],
    ],
    { layers: [ROUTE_SOURCE] }
  )
  const route = routes.find((feature) => feature.properties.selected) ?? routes[0]
  if (route) {
    emit('select-route', Number(route.properties.index))
    return
  }

  emit('select-location', { longitude: event.lngLat.lng, latitude: event.lngLat.lat })
}

async function fitSelectedRoute() {
  selectedCamera.value = null
  await nextTick()
  const route = selectedRoute.value
  const map = getMap()
  if (!route?.geometry.length || !map) return

  const geometry = toRaw(route.geometry)
  let bounds = routeBoundsCache.get(geometry)
  if (!bounds) {
    let north = Number.NEGATIVE_INFINITY
    let south = Number.POSITIVE_INFINITY
    let east = Number.NEGATIVE_INFINITY
    let west = Number.POSITIVE_INFINITY
    geometry.forEach((point) => {
      if (point.length < 2) return
      north = Math.max(north, point[1])
      south = Math.min(south, point[1])
      east = Math.max(east, point[0])
      west = Math.min(west, point[0])
    })
    if (![north, south, east, west].every(Number.isFinite)) return
    bounds = { north, south, east, west }
    routeBoundsCache.set(geometry, bounds)
  }
  map.fitBounds(
    [
      [bounds.west, bounds.south],
      [bounds.east, bounds.north],
    ],
    { padding: 48, duration: 0 }
  )
}

function focusMap() {
  if (selectedRoute.value) {
    void fitSelectedRoute()
    return
  }
  flyTo(defaultCenter, 4)
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const radius = 6371
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180
  const latitudeDelta = toRadians(lat2 - lat1)
  const longitudeDelta = toRadians(lng2 - lng1)
  const value =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(longitudeDelta / 2) ** 2
  return 2 * radius * Math.asin(Math.sqrt(value))
}

function flyTo(target: MapPosition, endZoom = 13) {
  getMap()?.flyTo({ center: target, zoom: endZoom, essential: true })
}

async function toggleFullscreen() {
  const element = mapContainerRef.value
  if (!element) return
  if (!document.fullscreenElement) await element.requestFullscreen().catch(() => {})
  else await document.exitFullscreen().catch(() => {})
}

function syncFullscreen() {
  isFullscreen.value = document.fullscreenElement === mapContainerRef.value
  void nextTick().then(() => {
    getMap()?.resize()
    if (selectedRoute.value) void fitSelectedRoute()
  })
}

function clusterDiameter(count: number) {
  if (count >= 1000) return 66
  if (count >= 100) return 54
  if (count >= 10) return 44
  return 36
}

function clusterMarkerSvg(size: number) {
  const radius = size / 2
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><defs><radialGradient id="camera-cluster" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#E5484D" stop-opacity="0.92"/><stop offset="45%" stop-color="#E5484D" stop-opacity="0.7"/><stop offset="100%" stop-color="#E5484D" stop-opacity="0"/></radialGradient></defs><circle cx="${radius}" cy="${radius}" r="${radius}" fill="url(#camera-cluster)"/></svg>`
}

function cameraMarkerSvg() {
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26">' +
    '<circle cx="13" cy="13" r="11" fill="#E5484D" stroke="#ffffff" stroke-width="2"/>' +
    '<rect x="6.5" y="10.2" width="13" height="8.3" rx="1.7" fill="#ffffff"/>' +
    '<rect x="10" y="8.4" width="4.4" height="2.4" rx="0.7" fill="#ffffff"/>' +
    '<circle cx="13" cy="14.3" r="2.7" fill="#E5484D"/>' +
    '<circle cx="13" cy="14.3" r="1.2" fill="#ffffff"/>' +
    '</svg>'
  )
}

function isFaintCamera(camera: AlprRouteCamera) {
  return camera.bearingConfidence === 'Low' || camera.bearingConfidence === 'None'
}

function routeCameraIcon(camera: AlprRouteCamera) {
  const hasDirection = camera.bearings.length > 0 || Boolean(camera.bearingConfidence)
  const halo: RouteCameraHalo =
    hasDirection && camera.bearings.length === 0
      ? isFaintCamera(camera)
        ? 'halo-faint'
        : 'halo'
      : 'none'
  const ring = hasDirection ? 'ring' : 'plain'
  const core = camera.attempted === false ? 'idle' : 'active'
  return `alpr-route-camera-${halo}-${ring}-${core}`
}

function routeCameraBodySvg(halo: RouteCameraHalo, ring: boolean, active: boolean) {
  const size = 40
  const center = size / 2
  const faint = halo === 'halo-faint'
  const facingOpacity = faint ? 0.18 : 0.32
  const dash = faint ? ' stroke-dasharray="2 2"' : ''
  const coreColor = active ? '#E5484D' : '#9CA3AF'
  const facing =
    halo === 'none'
      ? ''
      : `<circle cx="${center}" cy="${center}" r="18" fill="#F59E0B" fill-opacity="${facingOpacity * 0.6}" stroke="#F59E0B" stroke-opacity="0.5"${dash}/>`
  const ringSvg = ring
    ? `<circle cx="${center}" cy="${center}" r="6.5" fill="none" stroke="#F59E0B" stroke-width="2.5"/>`
    : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${facing}${ringSvg}<circle cx="${center}" cy="${center}" r="4.5" fill="${coreColor}" stroke="#ffffff" stroke-width="1.5"/></svg>`
}

function routeCameraWedgeSvg(faint: boolean) {
  const size = 40
  const opacity = faint ? 0.18 : 0.32
  const dash = faint ? ' stroke-dasharray="2 2"' : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${bearingWedgePath(size / 2, 18, 0, opacity, dash)}</svg>`
}

function bearingWedgePath(
  center: number,
  radius: number,
  bearing: number,
  opacity: number,
  dash: string
) {
  const start = bearingPoint(center, radius, bearing - 60)
  const end = bearingPoint(center, radius, bearing + 60)
  const path = `M ${center} ${center} L ${start[0].toFixed(2)} ${start[1].toFixed(2)} A ${radius} ${radius} 0 0 1 ${end[0].toFixed(2)} ${end[1].toFixed(2)} Z`
  return `<path d="${path}" fill="#F59E0B" fill-opacity="${opacity}" stroke="#F59E0B" stroke-opacity="0.6"${dash}/>`
}

function bearingPoint(center: number, radius: number, bearing: number): [number, number] {
  const radians = ((bearing - 90) * Math.PI) / 180
  return [center + radius * Math.cos(radians), center + radius * Math.sin(radians)]
}

function formatCount(count: number) {
  if (count >= 1000) {
    const value = count / 1000
    return `${value >= 10 ? Math.round(value) : value.toFixed(1).replace('.0', '')}k`
  }
  return String(count)
}

function formatMiles(metres: number) {
  return (metres / 1609.344).toFixed(1)
}

function formatDuration(seconds: number) {
  const totalMinutes = Math.round(seconds / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`
}

function formatBearing(value: number) {
  return `${Math.round(value)}°`
}

function isRouteCamera(camera: AlprRouteCamera | AlprMapCamera): camera is AlprRouteCamera {
  return 'chainageMetres' in camera
}

function isMapCamera(camera: AlprRouteCamera | AlprMapCamera): camera is AlprMapCamera {
  return 'displayName' in camera
}

function cameraName(camera: AlprRouteCamera | AlprMapCamera) {
  return isMapCamera(camera) ? camera.displayName : camera.name || `#${camera.id}`
}

watch(
  () => [props.routes, props.selectedIndex] as const,
  () => renderRoutes()
)

watch(waypointConnectors, () => renderWaypointConnectors())

watch(selectedRoute, async (route, previousRoute) => {
  if (route && !previousRoute) {
    backgroundCamerasVisible.value = false
    clusterAbort?.abort()
    clearBackgroundCameras()
  } else if (!route && previousRoute) {
    backgroundCamerasVisible.value = true
    lastClusterView = ''
    scheduleClusterRefresh()
  }
  renderRouteCameras()
  if (route) await fitSelectedRoute()
})

defineExpose({
  focusLocation: (location: AlprLocation, zoom = 13) =>
    flyTo({ lat: location.latitude, lng: location.longitude }, zoom),
})

onMounted(() => document.addEventListener('fullscreenchange', syncFullscreen))

onBeforeUnmount(() => {
  disposed = true
  document.removeEventListener('fullscreenchange', syncFullscreen)
  clusterAbort?.abort()
  if (clusterRefreshTimer) clearTimeout(clusterRefreshTimer)
})
</script>
