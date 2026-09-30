<template>
  <div class="rounded-lg border border-border bg-card h-[calc(100vh-95px)]">
    <div class="rounded-lg h-full overflow-hidden">
      <GoogleMap
        :api-key="googleMapsApiKey"
        style="width: 100%; height: 100%"
        :center="mapCenter"
        :zoom="8"
        :styles="mapStyles"
        :disable-default-ui="true"
        ref="mapRef"
        @ready="onMapReady"
      >
        <!-- Weight Station Markers (commented out — not needed for driver route) -->
        <!--
        <CustomMarker
          v-for="(station, ind) in weightStations"
          :key="'ws-' + ind"
          :options="{
            position: { lat: station.latitude, lng: station.longitude },
            anchorPoint: 'CENTER',
          }"
        >
          <Popover>
            <PopoverTrigger>
              <div class="bg-destructive px-2 py-1 rounded-xl border-2 border-white text-white cursor-pointer">
                <p class="text-xs text-center leading-tight">weight<br />station</p>
              </div>
            </PopoverTrigger>
            <PopoverContent class="w-auto p-2 min-w-36 max-w-44">
              <div class="flex justify-between gap-x-4 text-xs">
                <p class="truncate font-medium flex gap-x-1">
                  <MapPin class="w-4 shrink-0" />{{ station.location || 'N/A' }}
                </p>
                <a
                  :href="`https://maps.google.com/maps?q=${station.latitude},${station.longitude}`"
                  target="_blank"
                  class="shrink-0"
                >
                  <ExternalLink class="w-4 text-primary" />
                </a>
              </div>
              <div class="mt-2 flex justify-center">
                <p class="text-xs text-muted-foreground flex gap-x-1">
                  <FileCheck class="w-4" />{{ station.name }}
                </p>
              </div>
            </PopoverContent>
          </Popover>
        </CustomMarker>
        -->

        <!-- Tracking Markers -->
        <CustomMarker
          v-for="(tracking, ind) in trackings"
          :key="'track-' + ind"
          :options="{
            position: { lat: tracking.latitude, lng: tracking.longitude },
            anchorPoint: 'CENTER',
          }"
        >
          <div
            class="w-3 h-3 rounded-full bg-primary border-2 border-white cursor-pointer hover:scale-125 transition-transform"
            @click="(e: MouseEvent) => emit('toggleTooltip', tracking.eventId, e)"
          />
        </CustomMarker>
      </GoogleMap>

      <!-- Tooltip overlays -->
      <Teleport to="body">
        <div
          v-for="tracking in trackings"
          :key="'tooltip-' + tracking.eventId"
          v-show="activeTooltips[tracking.eventId]"
          class="fixed bg-card border border-border rounded-lg shadow-xl p-3 min-w-36 max-w-44 z-[999999]"
          :style="tooltipPositions[tracking.eventId]"
          @click.stop
        >
          <div class="flex justify-between items-center gap-x-4 text-xs">
            <p class="truncate font-medium flex gap-x-1">
              <MapPin class="w-4 shrink-0" />
              {{ tracking.calculatedLocation || tracking.manualLocation || 'N/A' }}
            </p>
            <button
              class="shrink-0 text-primary"
              @click.stop="emit('openGoogleMaps', tracking.latitude, tracking.longitude)"
            >
              <ExternalLink class="w-4 h-4" />
            </button>
          </div>
          <div class="mt-2 flex justify-center">
            <p class="text-xs text-muted-foreground flex gap-x-1">
              <FileCheck class="w-4" />
              {{ tracking.annotation }}
            </p>
          </div>
          <button
            class="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center hover:bg-destructive/80"
            @click.stop="emit('closeTooltip', tracking.eventId)"
          >
            &times;
          </button>
        </div>
      </Teleport>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { GoogleMap, CustomMarker } from 'vue3-google-map'
import { MapPin, ExternalLink, FileCheck } from 'lucide-vue-next'
import { mapStyles } from '@/utils/maps'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { /* WeightStation, */ AuditTracking } from '../types'

interface Props {
  trackings: AuditTracking[]
  // weightStations: WeightStation[]
  activeTooltips: Record<string, boolean>
  tooltipPositions: Record<string, any>
}

const props = defineProps<Props>()
const emit = defineEmits<{
  toggleTooltip: [eventId: string, event: MouseEvent]
  closeTooltip: [eventId: string]
  openGoogleMaps: [lat: number, lng: number]
  mapReady: [mapComponent: any]
}>()

const mapRef = ref<any>(null)
const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''

const mapCenter = computed(() => {
  if (!props.trackings || props.trackings.length === 0) {
    return { lat: 39.8283, lng: -98.5795 } // US center
  }
  const avgLat = props.trackings.reduce((sum, t) => sum + t.latitude, 0) / props.trackings.length
  const avgLng = props.trackings.reduce((sum, t) => sum + t.longitude, 0) / props.trackings.length
  return { lat: avgLat || 0, lng: avgLng || 0 }
})

async function onMapReady(rawMap: any) {
  await nextTick()
  // renderDirections expects an object with .map property (raw google.maps.Map)
  // Prefer component ref (has .map), fallback to wrapping raw map from @ready event
  if (mapRef.value?.map) {
    emit('mapReady', mapRef.value)
  } else if (rawMap) {
    emit('mapReady', { map: rawMap })
  }
}

defineExpose({ mapRef })
</script>
