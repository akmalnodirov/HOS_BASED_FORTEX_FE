<template>
  <div class="space-y-4">
    <!-- Tracking Content -->
    <div v-show="trackingCollapse" class="grid grid-cols-12 gap-x-1">
      <!-- Left Sidebar: History -->
      <div
        v-if="!isFullscreen"
        class="col-span-3 bg-white dark:bg-gray-900 overflow-hidden p-[16px]"
      >
        <div class="flex items-center justify-between mb-4 mx-1">
          <h2 class="text-xl font-semibold text-foreground">Tracking</h2>
          <!--      <Button @click="toggleTrackingCollapse" variant="default" size="lg">-->
          <!--        <ChevronsUpDown-->
          <!--          :class="['w-4 h-4 transition-transform', trackingCollapse ? 'rotate-180' : '']"-->
          <!--        />-->
          <!--      </Button>-->
        </div>
        <!-- History Events List -->
        <div class="max-h-[calc(100vh-280px)] overflow-y-auto">
          <template v-for="(tracking, ind) in filteredTrackingEvents" :key="tracking.eventId">
            <!-- Drive Event -->
            <div
              v-if="tracking.eventType === 1 && tracking.eventCode === 3"
              @click="selectEvent(tracking)"
              :class="[
                'border-b border-gray-200 dark:border-gray-700 last:border-b-0 cursor-pointer transition-colors',
                selectedEvent && selectedEvent.eventId === tracking.eventId
                  ? 'bg-purple-50 dark:bg-purple-900/20'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800/50',
              ]"
            >
              <div class="flex items-center gap-2 px-1 py-3">
                <div class="flex-1">
                  <div class="flex items-center justify-between mb-2">
                    <p class="text-sm font-normal text-gray-900 dark:text-gray-100">
                      <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {{ filteredTrackingEvents.length - ind }}.
                      </span>
                      Drive
                    </p>
                    <div class="flex items-center gap-1">
                      <Clock class="w-4 h-4 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                      <span class="text-xs text-gray-600 dark:text-gray-400">
                        {{ formatDuration(tracking.duration, true) }}
                      </span>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-xs text-gray-900 dark:text-gray-100">
                      {{ tracking.vehicleMiles || 0 }}mi / {{ tracking.vehicleSpeed || 0 }}mph
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Location/Stop Event -->
            <div
              v-else
              @click="selectEvent(tracking)"
              :class="[
                'border-b border-gray-200 dark:border-gray-700 last:border-b-0 cursor-pointer transition-colors',
                selectedEvent && selectedEvent.eventId === tracking.eventId
                  ? 'bg-purple-50 dark:bg-purple-900/20'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800/50',
              ]"
            >
              <div class="flex items-start gap-2 px-1 py-3">
                <div class="flex-1">
                  <div class="text-sm text-gray-900 dark:text-gray-100 mb-2">
                    <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {{ filteredTrackingEvents.length - ind }}.
                    </span>
                    {{
                      tracking.calculatedLocation ||
                        tracking.manualLocation ||
                        'Location not available'
                    }}
                  </div>
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <Calendar class="w-4 h-4 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                      <span class="text-xs text-gray-600 dark:text-gray-400">
                        {{ formatTime(tracking.startTime, 'hh:mm A') }}
                        -
                        {{ formatTime(tracking.endTime, 'hh:mm A') }}
                      </span>
                    </div>
                    <div class="flex items-center gap-2">
                      <Clock class="w-4 h-4 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                      <span class="text-xs text-gray-600 dark:text-gray-400">
                        {{ formatDuration(tracking.duration, true) }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- Empty State -->
          <div
            v-if="!filteredTrackingEvents.length"
            class="text-sm text-gray-500 dark:text-gray-400 text-center py-4 px-4"
          >
            No history events available
          </div>
        </div>
      </div>

      <!-- Right: Map -->
      <div
        class="bg-white dark:bg-card p-1"
        :class="[
          'overflow-hidden relative transition-all duration-300 bg-white dark:bg-card',
          isFullscreen ? 'col-span-12' : 'col-span-9',
        ]"
      >
        <!-- Map Controls -->
        <CMapControls
          v-if="dailyTrackings?.trackingEventResponse?.length"
          v-model:map-type="mapType"
          v-model:current-filter="currentStatusFilter"
          :filter-options="eventStatuses"
          :is-traffic-active="isTrafficActive"
          :is-fullscreen="isFullscreen"
          @toggle-traffic="toggleTraffic"
          @toggle-fullscreen="toggleFullscreen"
        />

        <!-- Google Map -->
        <GoogleMap
          v-if="dailyTrackings?.trackingEventResponse?.length"
          :api-key="apiKey"
          :center="{
            lat: (selectedEvent && selectedEvent.latitude) || mapCenter.lat,
            lng: (selectedEvent && selectedEvent.longitude) || mapCenter.lng,
          }"
          :zoom="zoomMap"
          :map-type-id="mapType"
          :styles="mapStyles"
          :disable-default-ui="true"
          style="width: 100%; height: 100%"
          :style="{ height: isFullscreen ? 'calc(100vh - 100px)' : 'calc(100vh - 280px)' }"
          ref="mapInstance"
          @ready="onMapReady"
        >
          <!-- Every tracking points (for drive events) -->
          <CustomMarker
            v-for="(tracking, ind) in selectedTrackingEvents"
            :key="`every-${ind}`"
            :options="{
              position: { lat: tracking.latitude || 0, lng: tracking.longitude || 0 },
              anchorPoint: 'CENTER',
            }"
          >
            <Navigation
              v-if="
                ind + 1 === selectedTrackingEvents.length &&
                  dailyTrackings?.trackingEventResponse.at(-1)?.eventCode === 3 &&
                  dailyTrackings?.trackingEventResponse.at(-1)?.eventType === 1
              "
              class="w-8 text-purple-600"
              :style="{
                transform: `rotate(${
                  calculateBearing(
                    selectedTrackingEvents[ind - 1]?.latitude || 0,
                    selectedTrackingEvents[ind - 1]?.longitude || 0,
                    tracking?.latitude || 0,
                    tracking?.longitude || 0
                  ) + 45
                }deg)`,
              }"
            />
          </CustomMarker>

          <!-- Tracking event markers -->
          <CustomMarker
            class="cursor-pointer"
            v-for="(tracking, ind) in filteredTrackingEvents"
            :key="`event-${ind}`"
            :options="{
              position: { lat: tracking.latitude, lng: tracking.longitude },
              anchorPoint: 'CENTER',
            }"
            @click="selectEvent(tracking)"
          >
            <Popover :open="Boolean(trackingTooltips[tracking.eventId])">
              <PopoverTrigger as-child>
                <div
                  class="w-6 h-6 rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform cursor-pointer"
                  :class="getMarkerColor(tracking)"
                >
                  <span class="text-white text-xs font-semibold">
                    {{ filteredTrackingEvents.length - ind }}
                  </span>
                </div>
              </PopoverTrigger>
              <PopoverContent class="w-auto p-0 z-[9999]" :side="'top'" :align="'center'">
                <div class="px-3 py-2 min-w-[150px] max-w-[200px]">
                  <div class="flex flex-col gap-2">
                    <!-- Location -->
                    <div class="flex items-start gap-1.5">
                      <MapPin class="w-4 h-4 mt-0.5 flex-shrink-0 text-purple-600" />
                      <p class="text-xs font-normal text-gray-700 dark:text-gray-300 break-words">
                        {{ tracking.calculatedLocation || tracking.manualLocation || 'N/A' }}
                      </p>
                    </div>

                    <!-- Annotation -->
                    <div
                      v-if="tracking.annotation"
                      class="flex items-center gap-1.5 mt-1 pt-2 border-t border-gray-200 dark:border-gray-700"
                    >
                      <FileText class="w-4 h-4 flex-shrink-0 text-gray-600 dark:text-gray-400" />
                      <p class="text-xs text-gray-600 dark:text-gray-400">
                        {{ tracking.annotation }}
                      </p>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </CustomMarker>
        </GoogleMap>

        <!-- Empty State -->
        <div
          v-else
          class="w-full h-[calc(100vh-280px)] flex items-center justify-center bg-muted/30 rounded-lg border border-border"
        >
          <p class="text-muted-foreground">No tracking data available</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, ref, onUnmounted, nextTick } from 'vue'
import {
  ChevronsUpDown,
  Navigation,
  MapPin,
  Clock,
  Calendar,
  FileText,
} from 'lucide-vue-next'
import CMapControls from '@/components/custom/CMapControls.vue'
import { GoogleMap, CustomMarker } from 'vue3-google-map'
import { mapStyles } from '@/utils/maps'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { DailyTrackingResponse, TrackingResponse } from '@/types/tracking'
import { formatTime, formatDuration } from '@/utils/time.ts'

interface Props {
  dailyTrackings: DailyTrackingResponse | null
  everyTrackings: any[]
  selectedEvent: TrackingResponse | null
  trackingTooltips: Record<string, boolean>
  mapCenter: { lat: number; lng: number }
  zoomMap: number
  trackingCollapse: boolean
  directionsSegments?: any[]
  renderRouteOnMap?: (map: any) => void
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'select-event', event: TrackingResponse): void
  (e: 'toggle-collapse'): void
}>()

const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
const mapInstance = ref<any>(null)
const rawMapInstance = ref<any>(null) // Store raw Google Map from @ready event
const trafficLayer = ref<any>(null)
const isMapReady = ref(false)

// Map controls state
const mapType = ref<'roadmap' | 'terrain' | 'satellite'>('roadmap')
const isTrafficActive = ref(false)
const isFullscreen = ref(false)
const currentStatusFilter = ref('all')

// Computed: Event status counts
const eventStatuses = computed(() => {
  const events = props.dailyTrackings?.trackingEventResponse || []

  const counts = {
    all: events.length,
    offDuty: events.filter((e) => e.eventType === 1 && e.eventCode === 1).length,
    sleeper: events.filter((e) => e.eventType === 1 && e.eventCode === 2).length,
    driving: events.filter((e) => e.eventType === 1 && e.eventCode === 3).length,
    onDuty: events.filter((e) => e.eventType === 1 && e.eventCode === 4).length,
  }

  return [
    { id: 'all', label: 'All', count: counts.all, colorClass: '' },
    { id: 'offDuty', label: 'Off Duty(YM)', count: counts.offDuty, colorClass: 'bg-gray-400' },
    { id: 'sleeper', label: 'Sleep', count: counts.sleeper, colorClass: 'bg-purple-500' },
    { id: 'driving', label: 'Driving', count: counts.driving, colorClass: 'bg-green-500' },
    { id: 'onDuty', label: 'On Duty', count: counts.onDuty, colorClass: 'bg-yellow-500' },
  ]
})

// Computed: Filtered tracking events based on status filter
const filteredTrackingEvents = computed(() => {
  const events = props.dailyTrackings?.trackingEventResponse || []

  if (currentStatusFilter.value === 'all') {
    return events
  }

  const filterMap: Record<string, { eventType: number; eventCode: number }> = {
    offDuty: { eventType: 1, eventCode: 1 },
    sleeper: { eventType: 1, eventCode: 2 },
    driving: { eventType: 1, eventCode: 3 },
    onDuty: { eventType: 1, eventCode: 4 },
  }

  const filter = filterMap[currentStatusFilter.value]
  if (!filter) return events

  return events.filter((e) => e.eventType === filter.eventType && e.eventCode === filter.eventCode)
})

// Computed: Selected tracking events for drive events
const selectedTrackingEvents = computed(() => {
  if (
    !props.selectedEvent ||
    props.selectedEvent.eventCode !== 3 ||
    props.selectedEvent.eventType !== 1
  ) {
    return []
  }

  const startTime = props.selectedEvent.startTime
  const endTime = props.selectedEvent.endTime

  if (!startTime || !endTime) {
    return []
  }

  return props.everyTrackings.filter((tracking) => {
    const eventTime = tracking.currentTime
    if (!eventTime) return false

    const eventTimeStr = typeof eventTime === 'string' ? eventTime : String(eventTime)
    const startTimeStr = typeof startTime === 'string' ? startTime : String(startTime)
    const endTimeStr = typeof endTime === 'string' ? endTime : String(endTime)

    return eventTimeStr >= startTimeStr && eventTimeStr <= endTimeStr
  })
})

// Methods
const selectEvent = (event: TrackingResponse) => {
  emit('select-event', event)
}

const toggleTrackingCollapse = () => {
  emit('toggle-collapse')
}

// Helper to get a valid map wrapper
const getMapWrapper = () => {
  if (mapInstance.value?.map) {
    return mapInstance.value
  }
  if (rawMapInstance.value) {
    return { map: rawMapInstance.value }
  }
  return null
}

// Map ready handler
const onMapReady = async (instance: any) => {
  // Store the raw map instance from the event
  rawMapInstance.value = instance

  // Wait for Vue to populate the template ref
  await nextTick()

  isMapReady.value = true

  // Render route when map is ready
  if (props.renderRouteOnMap && props.directionsSegments && props.directionsSegments.length > 0) {
    const mapWrapper = getMapWrapper()
    if (mapWrapper) {
      props.renderRouteOnMap(mapWrapper)
    }
  }
}

// Toggle traffic layer
const toggleTraffic = () => {
  isTrafficActive.value = !isTrafficActive.value

  const mapWrapper = getMapWrapper()
  if (!mapWrapper?.map) return

  if (isTrafficActive.value) {
    if (!trafficLayer.value && window.google?.maps) {
      trafficLayer.value = new (window.google.maps as any).TrafficLayer()
    }
    trafficLayer.value?.setMap(mapWrapper.map)
  } else {
    trafficLayer.value?.setMap(null)
  }
}

// Toggle fullscreen
const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value
}

// Get marker color based on event type
const getMarkerColor = (tracking: TrackingResponse): string => {
  if (tracking.eventType === 1) {
    switch (tracking.eventCode) {
      case 1:
        return 'bg-gray-500' // Off Duty
      case 2:
        return 'bg-purple-500' // Sleeper
      case 3:
        return 'bg-green-500' // Driving
      case 4:
        return 'bg-yellow-500' // On Duty
    }
  }
  return 'bg-purple-600' // Default
}

// Calculate bearing for rotation
const calculateBearing = (
  lat1: number | null,
  lng1: number | null,
  lat2: number | null,
  lng2: number | null
): number => {
  if (!lat1 || !lng1 || !lat2 || !lng2) return 0

  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const lat1Rad = (lat1 * Math.PI) / 180
  const lat2Rad = (lat2 * Math.PI) / 180

  const y = Math.sin(dLng) * Math.cos(lat2Rad)
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng)

  const bearing = (Math.atan2(y, x) * 180) / Math.PI
  return (bearing + 360) % 360
}

// Watch for map center changes to update map
watch(
  () => props.mapCenter,
  (newCenter) => {
    const mapWrapper = getMapWrapper()
    if (mapWrapper?.map && newCenter) {
      mapWrapper.map.panTo({ lat: newCenter.lat, lng: newCenter.lng })
    }
  },
  { deep: true }
)

// Watch for direction segments changes to render route
watch(
  () => props.directionsSegments,
  (newSegments) => {
    const mapWrapper = getMapWrapper()
    if (mapWrapper?.map && newSegments && newSegments.length > 0 && props.renderRouteOnMap) {
      props.renderRouteOnMap(mapWrapper)
    }
  },
  { deep: true }
)

// Watch for map becoming ready - render if segments are already loaded
watch(
  () => isMapReady.value,
  (ready) => {
    const mapWrapper = getMapWrapper()
    if (
      ready &&
      mapWrapper?.map &&
      props.directionsSegments &&
      props.directionsSegments.length > 0 &&
      props.renderRouteOnMap
    ) {
      props.renderRouteOnMap(mapWrapper)
    }
  }
)

onUnmounted(() => {
  trafficLayer.value?.setMap(null)
})
</script>
