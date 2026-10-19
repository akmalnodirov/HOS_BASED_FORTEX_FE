<template>
  <div
    ref="containerRef"
    :class="[
      'relative overflow-hidden rounded-md border border-border bg-muted/30',
      isFullscreen ? 'h-screen' : 'h-full min-h-[380px]',
    ]"
  >
    <div
      v-if="!apiKey"
      class="flex h-full items-center justify-center text-sm text-muted-foreground"
    >
      Google Maps API key is not configured.
    </div>
    <GoogleMap
      v-else
      ref="mapRef"
      :api-key="apiKey"
      :center="{ lat: 39.5, lng: -98.35 }"
      :zoom="4"
      :styles="mapStyles"
      :map-type-id="mapTypeId"
      gesture-handling="greedy"
      :disable-default-ui="true"
      :zoom-control="true"
      :street-view-control="true"
      style="width: 100%; height: 100%"
      @ready="onReady"
      @zoom_changed="refreshZoom"
    >
      <Polyline
        v-if="selectedRoute.length > 1"
        :options="{
          path: selectedRoute,
          strokeColor: '#2563EB',
          strokeOpacity: 0.95,
          strokeWeight: 5,
          clickable: false,
          zIndex: 20,
        }"
      />

      <CustomMarker
        v-for="cluster in eventClusters"
        :key="cluster.key"
        :options="{
          position: { lat: cluster.latitude, lng: cluster.longitude },
          anchorPoint: 'CENTER',
        }"
      >
        <button
          type="button"
          :class="[
            'flex items-center justify-center rounded-full border-2 border-white bg-blue-600 font-semibold text-white shadow-md',
            cluster.events.length > 1 ? 'h-9 min-w-9 px-2 text-xs' : 'h-5 w-5',
          ]"
          @click="selectCluster(cluster)"
        >
          {{ cluster.events.length > 1 ? cluster.events.length : '' }}
        </button>
      </CustomMarker>

      <CustomMarker
        v-for="camera in selectedCameras"
        :key="camera.id"
        :options="{
          position: { lat: camera.latitude, lng: camera.longitude },
          anchorPoint: 'CENTER',
        }"
      >
        <button
          type="button"
          class="h-10 w-10 drop-shadow-md"
          :aria-label="`Show ${camera.displayName}`"
          @click="selectedCamera = camera"
        >
          <svg viewBox="0 0 40 40" class="h-10 w-10 overflow-visible">
            <path
              v-for="bearing in camera.bearings"
              :key="bearing"
              :d="bearingWedgePath(bearing)"
              fill="#F59E0B"
              :fill-opacity="cameraBearingOpacity(camera)"
              stroke="#F59E0B"
              stroke-opacity="0.6"
            />
            <circle
              v-if="camera.bearings.length || camera.bearingConfidence"
              cx="20"
              cy="20"
              r="6.5"
              fill="none"
              stroke="#F59E0B"
              stroke-width="2.5"
            />
            <circle cx="20" cy="20" r="4.5" fill="#E5484D" stroke="#FFFFFF" stroke-width="1.5" />
          </svg>
        </button>
      </CustomMarker>
    </GoogleMap>

    <div v-if="apiKey" class="absolute right-3 top-3 z-10 flex items-center gap-2">
      <CMapTypeControl v-model="mapTypeId" :get-map="getMap" />
      <button
        type="button"
        title="Toggle fullscreen"
        class="flex h-10 w-10 items-center justify-center rounded-md bg-white text-gray-700 shadow-md transition-colors hover:bg-gray-50 dark:bg-card dark:text-foreground dark:hover:bg-muted"
        @click="toggleFullscreen"
      >
        <Minimize v-if="isFullscreen" class="h-5 w-5" />
        <Maximize v-else class="h-5 w-5" />
      </button>
    </div>

    <div class="absolute left-3 top-3 z-10 rounded-md bg-white px-3 py-2 shadow-md dark:bg-card">
      <div class="text-xs font-semibold">
        {{ selectedMatch ? 'Driving interval locations' : 'Period locations' }}
      </div>
      <div class="text-[11px] text-muted-foreground">
        {{ visibleLocatedEvents.length }} events with coordinates
      </div>
    </div>

    <div
      v-if="selectedEvent"
      class="absolute bottom-3 left-3 z-10 w-[min(340px,calc(100%-24px))] rounded-md bg-white p-3 text-xs shadow-lg dark:bg-card"
    >
      <button
        type="button"
        class="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
        @click="clearSelection"
      >
        <X class="h-4 w-4" />
      </button>
      <div class="pr-6 font-semibold">{{ selectedEvent.eventName }}</div>
      <div class="mt-2 grid grid-cols-[75px_1fr] gap-x-2 gap-y-1">
        <span class="text-muted-foreground">Time</span
        ><span>{{ formatEventTime(selectedEvent) }}</span>
        <span class="text-muted-foreground">Location</span
        ><span>{{ selectedEvent.location || '—' }}</span>
        <span class="text-muted-foreground">Coordinates</span
        ><span
          >{{ selectedEvent.latitude?.toFixed(5) }}, {{ selectedEvent.longitude?.toFixed(5) }}</span
        >
        <span v-if="selectedCameras.length" class="text-muted-foreground">Cameras</span
        ><span v-if="selectedCameras.length">{{ selectedCameras.length }} matched</span>
      </div>
    </div>

    <div
      v-if="selectedCamera"
      class="absolute bottom-3 right-3 z-20 w-64 rounded-md bg-white p-3 text-xs shadow-lg dark:bg-card"
    >
      <button
        type="button"
        class="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
        @click="selectedCamera = null"
      >
        <X class="h-4 w-4" />
      </button>
      <div class="pr-6 font-semibold">ALPR camera</div>
      <div class="mt-2 grid grid-cols-[70px_1fr] gap-x-2 gap-y-1">
        <span class="text-muted-foreground">Name</span><span>{{ selectedCamera.displayName }}</span>
        <span class="text-muted-foreground">Route position</span
        ><span>{{ formatMiles(selectedCamera.routePositionMetres) }} mi</span>
        <span class="text-muted-foreground">Bearing</span
        ><span>{{ formatBearings(selectedCamera.bearings) }}</span>
        <span class="text-muted-foreground">Confidence</span
        ><span>{{ selectedCamera.bearingConfidence || '—' }}</span>
        <span class="text-muted-foreground">Coordinates</span
        ><span
          >{{ selectedCamera.latitude.toFixed(5) }}, {{ selectedCamera.longitude.toFixed(5) }}</span
        >
        <template v-if="selectedCamera.brand">
          <span class="text-muted-foreground">Brand</span><span>{{ selectedCamera.brand }}</span>
        </template>
        <template v-if="selectedCamera.operator">
          <span class="text-muted-foreground">Operator</span
          ><span>{{ selectedCamera.operator }}</span>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Maximize, Minimize, X } from 'lucide-vue-next'
import { CustomMarker, GoogleMap, Polyline } from 'vue3-google-map'
import CMapTypeControl from '@/components/custom/CMapTypeControl.vue'
import { mapStyles } from '@/utils/maps'
import { resolveRouteEldScheduleTimeZone } from '../../composables/useScheduleBoost'
import type { RouteEldEventCameraAnalysis, RouteEldHosEvent, RouteEldMatchedCamera } from '../../types/boost'

const formatEventTime = (event: RouteEldHosEvent) =>
  new Intl.DateTimeFormat('en-US', {
    timeZone: resolveRouteEldScheduleTimeZone(event.timeZone),
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(event.timestamp))

const props = defineProps<{
  events: RouteEldHosEvent[]
  analysis: RouteEldEventCameraAnalysis | null
  selectedEventId?: string | null
}>()
const emit = defineEmits<{ (event: 'select-event', eventId: string | null): void }>()
const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
const mapRef = ref<any>(null)
const containerRef = ref<HTMLElement | null>(null)
const zoom = ref(4)
const mapTypeId = ref('roadmap')
const isFullscreen = ref(false)
const localSelectedEventId = ref<string | null>(null)
const selectedCamera = ref<RouteEldMatchedCamera | null>(null)

const locatedEvents = computed(() =>
  props.events.filter(
    (event) => event.recordStatus === 'ACTIVE' && event.latitude != null && event.longitude != null
  )
)
const locatedEventSourceKey = computed(() =>
  locatedEvents.value
    .map((event) => `${event.id}:${event.latitude}:${event.longitude}`)
    .join('|')
)
const selectedId = computed(() => props.selectedEventId ?? localSelectedEventId.value)
const selectedEvent = computed(
  () => locatedEvents.value.find((event) => event.id === selectedId.value) ?? null
)
const selectedMatch = computed(
  () => props.analysis?.matches.find((match) => match.eventId === selectedId.value) ?? null
)
const visibleLocatedEvents = computed(() => {
  if (!selectedMatch.value) return locatedEvents.value
  const routeEventIds = new Set(selectedMatch.value.routeEventIds)
  return locatedEvents.value.filter((event) => routeEventIds.has(event.id))
})
const selectedCameras = computed(() => selectedMatch.value?.cameras ?? [])
const selectedRoute = computed(() =>
  (selectedMatch.value?.route ?? []).map((point) => ({ lat: point.latitude, lng: point.longitude }))
)
const eventClusters = computed(() => {
  const cell = 360 / Math.pow(2, Math.min(zoom.value + 5, 20))
  const groups = new Map<string, RouteEldHosEvent[]>()
  for (const event of visibleLocatedEvents.value) {
    const key = `${Math.floor(event.latitude! / cell)}:${Math.floor(event.longitude! / cell)}`
    const group = groups.get(key)
    if (group) group.push(event)
    else groups.set(key, [event])
  }
  return [...groups.entries()].map(([key, events]) => ({
    key,
    events,
    latitude: events.reduce((sum, event) => sum + event.latitude!, 0) / events.length,
    longitude: events.reduce((sum, event) => sum + event.longitude!, 0) / events.length,
  }))
})

watch(
  () => props.selectedEventId,
  (value) => {
    localSelectedEventId.value = value ?? null
    selectedCamera.value = null
    void nextTick(focusSelection)
  }
)
watch(selectedMatch, () => {
  selectedCamera.value = null
  void nextTick(focusSelection)
})
watch(locatedEventSourceKey, () => {
  if (
    localSelectedEventId.value &&
    !locatedEvents.value.some((event) => event.id === localSelectedEventId.value)
  )
    localSelectedEventId.value = null
  selectedCamera.value = null
  void nextTick(() => {
    if (selectedEvent.value) focusSelection()
    else fitAll()
  })
})
onMounted(() => document.addEventListener('fullscreenchange', handleFullscreenChange))
onBeforeUnmount(() => document.removeEventListener('fullscreenchange', handleFullscreenChange))

function getMap() {
  return mapRef.value?.map
}
async function toggleFullscreen() {
  if (!containerRef.value) return
  if (document.fullscreenElement === containerRef.value) await document.exitFullscreen()
  else await containerRef.value.requestFullscreen()
}
function handleFullscreenChange() {
  isFullscreen.value = document.fullscreenElement === containerRef.value
  void nextTick(() => {
    const map = getMap()
    const googleMaps = (window as any).google?.maps
    if (map && googleMaps?.event) googleMaps.event.trigger(map, 'resize')
    if (selectedEvent.value) focusSelection()
    else fitAll()
  })
}
function onReady() {
  if (selectedEvent.value) focusSelection()
  else fitAll()
}
function refreshZoom() {
  zoom.value = getMap()?.getZoom?.() ?? zoom.value
}
function fitAll() {
  const map = getMap()
  const googleMaps = (window as any).google?.maps
  if (!map || !googleMaps || visibleLocatedEvents.value.length === 0) return
  if (visibleLocatedEvents.value.length === 1) {
    map.setCenter({
      lat: visibleLocatedEvents.value[0].latitude!,
      lng: visibleLocatedEvents.value[0].longitude!,
    })
    map.setZoom(14)
    return
  }
  const bounds = new googleMaps.LatLngBounds()
  visibleLocatedEvents.value.forEach((event) =>
    bounds.extend({ lat: event.latitude!, lng: event.longitude! })
  )
  map.fitBounds(bounds, 60)
}
function selectCluster(cluster: {
  events: RouteEldHosEvent[]
  latitude: number
  longitude: number
}) {
  const map = getMap()
  if (cluster.events.length > 1 && (map?.getZoom?.() ?? 0) < 16) {
    map?.panTo({ lat: cluster.latitude, lng: cluster.longitude })
    map?.setZoom(Math.min(16, (map.getZoom?.() ?? 4) + 3))
    return
  }
  localSelectedEventId.value = cluster.events[0].id
  emit('select-event', cluster.events[0].id)
  selectedCamera.value = null
}
function clearSelection() {
  localSelectedEventId.value = null
  selectedCamera.value = null
  emit('select-event', null)
  fitAll()
}
function focusSelection() {
  const map = getMap()
  const event = selectedEvent.value
  const googleMaps = (window as any).google?.maps
  if (!map || !event || !googleMaps) return
  const bounds = new googleMaps.LatLngBounds()
  bounds.extend({ lat: event.latitude!, lng: event.longitude! })
  selectedRoute.value.forEach((point) => bounds.extend(point))
  selectedCameras.value.forEach((camera) =>
    bounds.extend({ lat: camera.latitude, lng: camera.longitude })
  )
  map.fitBounds(bounds, 90)
  googleMaps.event?.addListenerOnce(map, 'idle', () => {
    if ((map.getZoom?.() ?? 0) > 17) map.setZoom(17)
  })
}
function formatMiles(metres: number) {
  return (metres / 1609.344).toFixed(1)
}
function formatBearings(bearings: number[]) {
  return bearings.length ? bearings.map((bearing) => `${Math.round(bearing)}°`).join(', ') : '—'
}
function cameraBearingOpacity(camera: RouteEldMatchedCamera) {
  return camera.bearingConfidence === 'Low' || camera.bearingConfidence === 'None' ? 0.18 : 0.32
}
function bearingWedgePath(bearing: number) {
  const center = 20
  const radius = 18
  const start = bearingPoint(center, radius, bearing - 60)
  const end = bearingPoint(center, radius, bearing + 60)
  return `M ${center} ${center} L ${start[0].toFixed(2)} ${start[1].toFixed(2)} A ${radius} ${radius} 0 0 1 ${end[0].toFixed(2)} ${end[1].toFixed(2)} Z`
}
function bearingPoint(center: number, radius: number, bearing: number): [number, number] {
  const radians = ((bearing - 90) * Math.PI) / 180
  return [center + radius * Math.cos(radians), center + radius * Math.sin(radians)]
}
</script>
