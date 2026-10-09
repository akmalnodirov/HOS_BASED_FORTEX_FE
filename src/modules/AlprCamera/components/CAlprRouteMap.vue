<template>
  <div ref="mapContainerRef" class="relative h-full min-h-[320px] w-full overflow-hidden bg-muted">
    <div
      v-if="!apiKey"
      class="absolute inset-0 z-20 flex items-center justify-center p-8 text-center text-sm text-muted-foreground"
    >
      Google Maps API Key required in .env file to render map.
    </div>

    <div class="absolute right-4 top-4 z-30 flex flex-wrap items-center justify-end gap-2">
      <CAlprMapTypeControl v-model="mapTypeId" :get-map="getMap" />
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

    <GoogleMap
      v-if="apiKey"
      ref="mapRef"
      :api-key="apiKey"
      :styles="mapStyles"
      :center="defaultCenter"
      :zoom="4"
      :map-type-id="mapTypeId"
      :disable-default-ui="true"
      :street-view-control="true"
      :zoom-control="true"
      gesture-handling="greedy"
      style="width: 100%; height: 100%"
      @click="handleMapClick"
      @idle="scheduleClusterRefresh"
      @zoom_changed="scheduleClusterRefresh"
      @tilesloaded="ensureRouteCameraMarkers"
      @ready="onReady"
    >
      <Polyline
        v-for="(route, index) in routes"
        :key="`${route.label}-${index}`"
        ref="routePolylineRefs"
        :options="polylineOptions(route, index)"
        @click="emit('select-route', index)"
      />

      <Polyline
        v-for="(connector, index) in waypointConnectors"
        :key="`waypoint-connector-${index}`"
        :options="connectorPolylineOptions(connector)"
      />

      <Marker v-if="origin" :options="endpointMarkerOptions(origin, 'A')" />
      <Marker
        v-for="(stop, index) in stops"
        :key="`${stop.longitude}-${stop.latitude}-${index}`"
        :options="endpointMarkerOptions(stop, String(index + 1))"
      />
      <Marker v-if="destination" :options="endpointMarkerOptions(destination, 'B')" />

      <InfoWindow
        v-if="selectedCamera"
        :options="{
          position: { lat: selectedCamera.latitude, lng: selectedCamera.longitude },
          pixelOffset: infoWindowOffset,
          headerDisabled: true,
        }"
        @closeclick="selectedCamera = null"
      >
        <div class="min-w-[220px] p-1 text-sm text-gray-900">
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
      </InfoWindow>
    </GoogleMap>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, toRaw, watch } from 'vue'
import { Camera, LocateFixed, Maximize, Minimize, X } from 'lucide-vue-next'
import { GoogleMap, InfoWindow, Marker, Polyline } from 'vue3-google-map'
import { ApiEndpoints } from '@/api/endpoints'
import { Button } from '@/components/ui/button'
import CAlprMapTypeControl from './CAlprMapTypeControl.vue'
import { useApi } from '@/composables/useAxiosService'
import { mapStyles } from '@/utils/maps'
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

const MAX_CLUSTER_MARKERS = 450
const MARKERS_PER_FRAME = 24
const api = useApi()
const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
const defaultCenter = { lat: 39.5, lng: -98.35 }
const mapContainerRef = ref<HTMLElement | null>(null)
const mapRef = ref<any>(null)
const routePolylineRefs = ref<any[]>([])
const rawMap = ref<any>(null)
const mapTypeId = ref('roadmap')
const backgroundCamerasVisible = ref(false)
const isFullscreen = ref(false)
const selectedCamera = ref<AlprRouteCamera | AlprMapCamera | null>(null)
const clusterMarkers: any[] = []
const routeCameraMarkers: any[] = []
const allRouteCameraMarkers = new Set<any>()
const routePathCache = new WeakMap<number[][], Array<{ lat: number; lng: number }>>()
const routePolylineOptionsCache = new WeakMap<AlprCameraRouteCandidate, Record<string, unknown>>()
const routeBoundsCache = new WeakMap<
  number[][],
  { north: number; south: number; east: number; west: number }
>()
const routeCameraIconCache = new WeakMap<AlprRouteCamera, string>()
let routeCameraMarkerCache = new WeakMap<AlprCameraRouteCandidate, any[]>()
let clusterAbort: AbortController | null = null
let clusterRenderVersion = 0
let routeRenderVersion = 0
let lastClusterView = ''
let clusterRefreshTimer: number | null = null
let routeRenderTimer: number | null = null
let renderingRoute: AlprCameraRouteCandidate | null = null
let flyRaf = 0
let fractionalZoomEnabled = false

const infoWindowOffset = computed(() => {
  const google = (window as any).google
  return google?.maps?.Size ? new google.maps.Size(0, -8) : undefined
})
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
    .filter((path): path is Array<{ lat: number; lng: number }> => path !== null)
})

function onReady(instance: any) {
  rawMap.value = instance
  const map = getMap()
  if (map && !fractionalZoomEnabled) {
    map.setOptions?.({ isFractionalZoomEnabled: true })
    fractionalZoomEnabled = true
  }
  backgroundCamerasVisible.value = !selectedRoute.value
  if (backgroundCamerasVisible.value) scheduleClusterRefresh()
  void nextTick().then(() => {
    void renderRouteCameras()
    if (routeRenderTimer) clearTimeout(routeRenderTimer)
    routeRenderTimer = window.setTimeout(ensureRouteCameraMarkers, 250)
  })
  if (selectedRoute.value) void fitSelectedRoute()
}

function getMap() {
  return mapRef.value?.map ?? rawMap.value ?? null
}

function polylineOptions(route: AlprCameraRouteCandidate, index: number) {
  const routeKey = toRaw(route)
  const cached = routePolylineOptionsCache.get(routeKey)
  if (cached) return cached

  const options = {
    path: routePath(route),
    ...routePolylineStyle(index),
    clickable: true,
  }
  routePolylineOptionsCache.set(routeKey, options)
  return options
}

function routePolylineStyle(index: number) {
  const selected = index === props.selectedIndex
  return {
    strokeColor: selected ? '#3C64D8' : '#7C8799',
    strokeOpacity: selected ? 1 : 0.35,
    strokeWeight: selected ? 6 : 4,
    zIndex: selected ? 20 : 15,
  }
}

async function applyRoutePolylineStyles() {
  await nextTick()
  routePolylineRefs.value.forEach((component, index) => {
    const polyline = component?.polyline?.value ?? component?.polyline
    polyline?.setOptions?.(routePolylineStyle(index))
  })
}

function routePath(route: AlprCameraRouteCandidate) {
  const geometry = toRaw(route.geometry)
  const cached = routePathCache.get(geometry)
  if (cached) return cached

  const path: Array<{ lat: number; lng: number }> = []
  let north = Number.NEGATIVE_INFINITY
  let south = Number.POSITIVE_INFINITY
  let east = Number.NEGATIVE_INFINITY
  let west = Number.POSITIVE_INFINITY
  geometry.forEach((point) => {
    if (point.length < 2) return
    const lat = point[1]
    const lng = point[0]
    path.push({ lat, lng })
    north = Math.max(north, lat)
    south = Math.min(south, lat)
    east = Math.max(east, lng)
    west = Math.min(west, lng)
  })
  routePathCache.set(geometry, path)
  if ([north, south, east, west].every(Number.isFinite)) {
    routeBoundsCache.set(geometry, { north, south, east, west })
  }
  return path
}

function endpointMarkerOptions(location: AlprLocation, label: string) {
  return {
    position: { lat: location.latitude, lng: location.longitude },
    label: { text: label, color: '#FFFFFF', fontWeight: '700' },
    title: location.label,
    zIndex: 1000,
  }
}

function connectorPolylineOptions(path: Array<{ lat: number; lng: number }>) {
  return {
    path,
    strokeOpacity: 0,
    clickable: false,
    zIndex: 45,
    icons: [
      {
        icon: {
          path: 'M 0,0 m -1,0 a 1,1 0 1,0 2,0 a 1,1 0 1,0 -2,0',
          fillColor: '#E5484D',
          fillOpacity: 0.9,
          strokeOpacity: 0,
          scale: 1.7,
        },
        offset: '0',
        repeat: '9px',
      },
    ],
  }
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
  const bounds = map?.getBounds?.()
  if (!map || !bounds || !backgroundCamerasVisible.value) return

  const northEast = bounds.getNorthEast()
  const southWest = bounds.getSouthWest()
  const viewport = {
    west: southWest.lng(),
    south: southWest.lat(),
    east: northEast.lng(),
    north: northEast.lat(),
  }
  if (viewport.west >= viewport.east) return

  const mapZoom = Math.max(0, Math.min(22, Math.floor(map.getZoom?.() ?? 4)))
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
  clearMarkers(clusterMarkers)
  if (
    selectedCamera.value &&
    isMapCamera(selectedCamera.value) &&
    !cameras.some((camera) => camera.id === selectedCamera.value?.id)
  ) {
    selectedCamera.value = null
  }
  const map = getMap()
  const google = (window as any).google
  if (!map || !google?.maps?.Marker || !backgroundCamerasVisible.value) return

  const version = ++clusterRenderVersion
  let index = 0
  const renderBatch = () => {
    if (version !== clusterRenderVersion || !backgroundCamerasVisible.value) return
    const end = Math.min(index + MARKERS_PER_FRAME, cameras.length)
    for (; index < end; index += 1) {
      const camera = cameras[index]
      const marker = new google.maps.Marker({
        position: { lat: camera.latitude, lng: camera.longitude },
        map,
        title: camera.displayName,
        icon: {
          url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(cameraMarkerSvg())}`,
          anchor: new google.maps.Point(13, 13),
          scaledSize: new google.maps.Size(26, 26),
        },
        optimized: true,
        zIndex: 6,
      })
      marker.addListener('click', () => {
        selectedCamera.value = camera
      })
      clusterMarkers.push(marker)
    }
    if (index < cameras.length) requestAnimationFrame(renderBatch)
  }
  requestAnimationFrame(renderBatch)
}

function renderClusterMarkers(clusters: AlprCameraCluster[]) {
  clearMarkers(clusterMarkers)
  if (selectedCamera.value && isMapCamera(selectedCamera.value)) selectedCamera.value = null
  const map = getMap()
  const google = (window as any).google
  if (!map || !google?.maps?.Marker || !backgroundCamerasVisible.value) return

  const version = ++clusterRenderVersion
  let index = 0
  const renderBatch = () => {
    if (version !== clusterRenderVersion || !backgroundCamerasVisible.value) return
    const end = Math.min(index + MARKERS_PER_FRAME, clusters.length)
    for (; index < end; index += 1) {
      const cluster = clusters[index]
      const size = clusterDiameter(cluster.count)
      const marker = new google.maps.Marker({
        position: { lat: cluster.latitude, lng: cluster.longitude },
        map,
        label: {
          text: formatCount(cluster.count),
          color: '#FFFFFF',
          fontSize: '12px',
          fontWeight: '700',
        },
        icon: {
          url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(clusterMarkerSvg(size))}`,
          anchor: new google.maps.Point(size / 2, size / 2),
          scaledSize: new google.maps.Size(size, size),
          labelOrigin: new google.maps.Point(size / 2, size / 2),
        },
        opacity: 1,
        optimized: true,
        zIndex: 5,
      })
      marker.addListener('click', () => {
        flyTo(
          { lat: cluster.latitude, lng: cluster.longitude },
          Math.min((map.getZoom?.() ?? 4) + 2, 16)
        )
      })
      clusterMarkers.push(marker)
    }
    if (index < clusters.length) requestAnimationFrame(renderBatch)
  }
  requestAnimationFrame(renderBatch)
}

function renderRouteCameras() {
  const version = ++routeRenderVersion
  hideRouteCameraMarkers()
  selectedCamera.value = null
  const route = selectedRoute.value
  renderingRoute = route ? toRaw(route) : null
  const cameras = route ? toRaw(route.cameras) : []
  const map = getMap()
  const google = (window as any).google
  if (!route || !map || !google?.maps?.Marker) {
    renderingRoute = null
    return
  }

  const routeKey = toRaw(route)
  const cachedMarkers = routeCameraMarkerCache.get(routeKey)
  const createdMarkers: any[] = []
  let index = 0
  const renderBatch = () => {
    if (version !== routeRenderVersion) {
      createdMarkers.forEach((marker) => {
        marker.setMap(null)
        allRouteCameraMarkers.delete(marker)
      })
      return
    }
    if (cachedMarkers) {
      const end = Math.min(index + MARKERS_PER_FRAME, cachedMarkers.length)
      for (; index < end; index += 1) {
        const marker = cachedMarkers[index]
        marker.setMap(map)
        routeCameraMarkers.push(marker)
      }
      if (index < cachedMarkers.length) requestAnimationFrame(renderBatch)
      else renderingRoute = null
      return
    }

    const end = Math.min(index + MARKERS_PER_FRAME, cameras.length)
    for (; index < end; index += 1) {
      const camera = cameras[index]
      const marker = new google.maps.Marker({
        position: { lat: camera.latitude, lng: camera.longitude },
        map,
        icon: routeCameraMarkerIcon(camera, google),
        title: camera.name || `Camera ${camera.id}`,
        optimized: true,
        zIndex: 900,
      })
      marker.addListener('click', () => {
        selectedCamera.value = camera
      })
      createdMarkers.push(marker)
      allRouteCameraMarkers.add(marker)
      routeCameraMarkers.push(marker)
    }
    if (index < cameras.length) requestAnimationFrame(renderBatch)
    else {
      routeCameraMarkerCache.set(routeKey, createdMarkers)
      renderingRoute = null
    }
  }
  requestAnimationFrame(renderBatch)
}

function ensureRouteCameraMarkers() {
  const route = selectedRoute.value ? toRaw(selectedRoute.value) : null
  const expected = route?.cameras.length ?? 0
  if (expected > 0 && routeCameraMarkers.length === 0 && renderingRoute !== route) {
    renderRouteCameras()
  }
}

function hideRouteCameraMarkers() {
  routeCameraMarkers.forEach((marker) => marker.setMap(null))
  routeCameraMarkers.splice(0, routeCameraMarkers.length)
}

function clearAllRouteCameraMarkers() {
  routeRenderVersion += 1
  renderingRoute = null
  allRouteCameraMarkers.forEach((marker) => marker.setMap(null))
  allRouteCameraMarkers.clear()
  routeCameraMarkers.splice(0, routeCameraMarkers.length)
  routeCameraMarkerCache = new WeakMap<AlprCameraRouteCandidate, any[]>()
}

function clearMarkers(markers: any[]) {
  markers.forEach((marker) => marker.setMap(null))
  markers.splice(0, markers.length)
}

function toggleBackgroundCameras() {
  backgroundCamerasVisible.value = !backgroundCamerasVisible.value
  clusterMarkers.forEach((marker) => marker.setVisible(backgroundCamerasVisible.value))
  if (backgroundCamerasVisible.value) {
    lastClusterView = ''
    scheduleClusterRefresh()
  } else {
    clusterAbort?.abort()
    clusterRenderVersion += 1
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

function handleMapClick(event: any) {
  selectedCamera.value = null
  const latLng = event?.latLng
  const latitude = typeof latLng?.lat === 'function' ? latLng.lat() : latLng?.lat
  const longitude = typeof latLng?.lng === 'function' ? latLng.lng() : latLng?.lng
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return
  emit('select-location', { longitude, latitude })
}

async function fitSelectedRoute() {
  selectedCamera.value = null
  await nextTick()
  const route = selectedRoute.value
  const map = getMap()
  const google = (window as any).google
  if (!route?.geometry.length || !map || !google?.maps?.LatLngBounds) return

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
  map.fitBounds(bounds, 48)
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

function flyTo(target: { lat: number; lng: number }, endZoom = 13) {
  const map = getMap()
  if (!map) return
  if (flyRaf) cancelAnimationFrame(flyRaf)

  if (!fractionalZoomEnabled) {
    map.setOptions?.({ isFractionalZoomEnabled: true })
    fractionalZoomEnabled = true
  }

  const startCenter = map.getCenter?.()
  const startZoom = map.getZoom?.() ?? endZoom
  const move = (center: { lat: number; lng: number }, zoom: number) => {
    if (typeof map.moveCamera === 'function') map.moveCamera({ center, zoom })
    else {
      map.setCenter(center)
      map.setZoom(zoom)
    }
  }

  if (!startCenter) {
    move(target, endZoom)
    return
  }

  const startLat = startCenter.lat()
  const startLng = startCenter.lng()
  const latitudeDelta = target.lat - startLat
  const longitudeDelta = target.lng - startLng
  const distance = haversineKm(startLat, startLng, target.lat, target.lng)
  const minZoom = Math.min(startZoom, endZoom)
  const dip = Math.min(Math.max(0, Math.log2(Math.max(distance, 1) / 40)), Math.max(0, minZoom - 2))
  const duration = Math.min(1800, 850 + dip * 190 + Math.min(500, distance / 5))
  const startedAt = performance.now()
  const ease = (progress: number) =>
    progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2

  const step = (now: number) => {
    const progress = Math.min(1, (now - startedAt) / duration)
    const eased = ease(progress)
    move(
      {
        lat: startLat + latitudeDelta * eased,
        lng: startLng + longitudeDelta * eased,
      },
      startZoom + (endZoom - startZoom) * eased - dip * Math.sin(Math.PI * progress)
    )
    if (progress < 1) flyRaf = requestAnimationFrame(step)
    else flyRaf = 0
  }
  flyRaf = requestAnimationFrame(step)
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
    const map = getMap()
    const google = (window as any).google
    if (map && google?.maps?.event) google.maps.event.trigger(map, 'resize')
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

function routeCameraMarkerIcon(camera: AlprRouteCamera, google: any) {
  const size = 40
  const cameraKey = toRaw(camera)
  let url = routeCameraIconCache.get(cameraKey)
  if (!url) {
    url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(routeCameraMarkerSvg(camera))}`
    routeCameraIconCache.set(cameraKey, url)
  }
  return {
    url,
    anchor: new google.maps.Point(size / 2, size / 2),
    scaledSize: new google.maps.Size(size, size),
  }
}

function routeCameraMarkerSvg(camera: AlprRouteCamera) {
  const size = 40
  const center = size / 2
  const wedgeRadius = 18
  const confidence = camera.bearingConfidence
  const hasDirection = camera.bearings.length > 0 || Boolean(confidence)
  const faint = confidence === 'Low' || confidence === 'None'
  const facingOpacity = faint ? 0.18 : 0.32
  const dash = faint ? ' stroke-dasharray="2 2"' : ''
  const coreColor = camera.attempted === false ? '#9CA3AF' : '#E5484D'

  let facing = ''
  if (hasDirection && camera.bearings.length === 0) {
    facing = `<circle cx="${center}" cy="${center}" r="${wedgeRadius}" fill="#F59E0B" fill-opacity="${facingOpacity * 0.6}" stroke="#F59E0B" stroke-opacity="0.5"${dash}/>`
  } else if (camera.bearings.length > 0) {
    facing = camera.bearings
      .map((bearing) => bearingWedgePath(center, wedgeRadius, bearing, facingOpacity, dash))
      .join('')
  }

  const ring = hasDirection
    ? `<circle cx="${center}" cy="${center}" r="6.5" fill="none" stroke="#F59E0B" stroke-width="2.5"/>`
    : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${facing}${ring}<circle cx="${center}" cy="${center}" r="4.5" fill="${coreColor}" stroke="#ffffff" stroke-width="1.5"/></svg>`
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
  () => props.routes,
  () => clearAllRouteCameraMarkers()
)

watch(selectedRoute, async (route, previousRoute) => {
  if (route && !previousRoute) {
    backgroundCamerasVisible.value = false
    clusterAbort?.abort()
    clusterRenderVersion += 1
    clearMarkers(clusterMarkers)
  } else if (!route && previousRoute) {
    backgroundCamerasVisible.value = true
    lastClusterView = ''
    scheduleClusterRefresh()
  }
  await applyRoutePolylineStyles()
  renderRouteCameras()
  if (route) await fitSelectedRoute()
})

defineExpose({
  focusLocation: (location: AlprLocation, zoom = 13) =>
    flyTo({ lat: location.latitude, lng: location.longitude }, zoom),
})

onMounted(() => document.addEventListener('fullscreenchange', syncFullscreen))

onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', syncFullscreen)
  clusterAbort?.abort()
  if (clusterRefreshTimer) clearTimeout(clusterRefreshTimer)
  if (routeRenderTimer) clearTimeout(routeRenderTimer)
  if (flyRaf) cancelAnimationFrame(flyRaf)
  clusterRenderVersion += 1
  clearMarkers(clusterMarkers)
  clearAllRouteCameraMarkers()
})
</script>
