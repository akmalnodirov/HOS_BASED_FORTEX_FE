<template>
  <div class="flex min-h-0 flex-1 flex-col lg:flex-row">
    <aside
      class="max-h-[38vh] w-full shrink-0 overflow-y-auto border-b border-border p-4 lg:max-h-none lg:w-[310px] lg:border-b-0 lg:border-r"
    >
      <slot name="route-builder" />

      <div v-if="routes.length" class="mt-4">
        <div class="mb-3 flex items-center justify-between">
          <h3 class="text-sm font-semibold">Route options</h3>
          <span class="text-xs text-muted-foreground">{{ routes.length }}</span>
        </div>
        <button
          v-for="(route, index) in routes"
          :key="`${route.label}-${index}`"
          type="button"
          class="mb-3 w-full rounded-md border p-3 text-left transition-colors"
          :class="
            selectedIndex === index
              ? 'border-primary bg-primary/5'
              : 'border-border hover:bg-accent/40'
          "
          @click="emit('update:selectedIndex', index)"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <span class="truncate text-sm font-semibold">{{ route.label }}</span>
                <span
                  v-if="route.isRecommended"
                  class="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-primary"
                  >Recommended</span
                >
              </div>
              <div class="mt-1 text-xs text-muted-foreground">
                {{ formatMiles(route.distanceMetres) }} mi ·
                {{ formatDuration(route.durationSeconds) }}
              </div>
            </div>
            <span
              class="rounded bg-red-50 px-2 py-1 text-sm font-bold text-[#AF4B4B] dark:bg-red-950/30 dark:text-red-400"
              >{{ route.cameraCount }}</span
            >
          </div>
          <p class="mt-2 truncate text-xs text-muted-foreground">
            via {{ route.roadSummary || 'provider route' }}
          </p>
        </button>
      </div>
    </aside>

    <div class="relative min-h-[360px] min-w-0 flex-1">
      <CAlprRouteMap
        :routes="routes"
        :selected-index="selectedIndex"
        :origin="origin"
        :destination="destination"
        :stops="stops"
        @select-route="emit('update:selectedIndex', $event)"
        @select-location="emit('select-location', $event)"
      />
      <Button
        v-if="selectedCameras.length"
        variant="secondary"
        size="sm"
        class="absolute bottom-4 right-4 z-30 shadow-md"
        @click="cameraPanelOpen = !cameraPanelOpen"
      >
        <PanelRightClose v-if="cameraPanelOpen" class="mr-2 h-4 w-4" />
        <ListOrdered v-else class="mr-2 h-4 w-4" />
        {{ cameraPanelOpen ? 'Hide camera journey' : 'Camera journey' }}
      </Button>
    </div>

    <aside
      v-if="cameraPanelOpen && selectedCameras.length"
      class="max-h-[36vh] w-full shrink-0 overflow-y-auto border-t border-border bg-background p-4 lg:max-h-none lg:w-[330px] lg:border-l lg:border-t-0"
    >
      <div class="mb-3 flex items-center justify-between">
        <div>
          <h3 class="text-sm font-semibold">Camera journey</h3>
          <p class="text-[11px] text-muted-foreground">Estimated at 55 mph</p>
        </div>
        <span class="text-xs text-muted-foreground">{{ selectedCameras.length }}</span>
      </div>
      <ol class="space-y-3">
        <li
          v-for="camera in selectedCameras"
          :key="`${camera.id}-${camera.index}`"
          class="rounded-md border p-3"
        >
          <div class="flex items-start gap-2">
            <span
              class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
              >{{ camera.index + 1 }}</span
            >
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium">{{ camera.name || `Camera ${camera.id}` }}</p>
              <dl class="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                <dt class="text-muted-foreground">From origin</dt>
                <dd class="text-right font-medium">
                  {{ formatMiles(camera.fromOriginMetres) }} mi
                </dd>
                <dt class="text-muted-foreground">
                  {{ camera.index === 0 ? 'Origin to camera' : 'From previous' }}
                </dt>
                <dd class="text-right font-medium">
                  {{ formatMiles(camera.fromPreviousMetres) }} mi
                </dd>
                <dt class="text-muted-foreground">Travel time</dt>
                <dd class="text-right font-medium">
                  {{ formatTravelTime(camera.fromPreviousMetres) }}
                </dd>
                <template v-if="camera.toNextMetres !== null">
                  <dt class="text-muted-foreground">To next camera</dt>
                  <dd class="text-right font-medium">{{ formatMiles(camera.toNextMetres) }} mi</dd>
                </template>
              </dl>
            </div>
          </div>
        </li>
      </ol>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ListOrdered, PanelRightClose } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import CAlprRouteMap from '@/modules/AlprCamera/components/CAlprRouteMap.vue'
import type { AlprCameraRouteCandidate, AlprLocation } from '@/modules/AlprCamera/types'

const props = defineProps<{
  routes: AlprCameraRouteCandidate[]
  selectedIndex: number
  origin: AlprLocation | null
  destination: AlprLocation | null
  stops: AlprLocation[]
}>()
const emit = defineEmits<{
  (event: 'update:selectedIndex', index: number): void
  (event: 'select-location', location: { longitude: number; latitude: number }): void
}>()
const cameraPanelOpen = ref(false)
const selectedCameras = computed(() => {
  const cameras = [...(props.routes[props.selectedIndex]?.cameras ?? [])].sort(
    (a, b) => a.chainageMetres - b.chainageMetres
  )
  return cameras.map((camera, index) => {
    const previous = index === 0 ? 0 : cameras[index - 1].chainageMetres
    const next = cameras[index + 1]?.chainageMetres
    return {
      ...camera,
      index,
      fromOriginMetres: Math.max(camera.chainageMetres, 0),
      fromPreviousMetres: Math.max(camera.chainageMetres - previous, 0),
      toNextMetres: next === undefined ? null : Math.max(next - camera.chainageMetres, 0),
    }
  })
})
const formatMiles = (metres: number) => (metres / 1609.344).toFixed(1)
function formatDuration(seconds: number) {
  const minutes = Math.round(seconds / 60)
  const hours = Math.floor(minutes / 60)
  return hours ? `${hours}h ${minutes % 60}m` : `${minutes}m`
}
function formatTravelTime(metres: number) {
  const minutes = (metres / 1609.344 / 55) * 60
  return minutes < 1
    ? '<1 min'
    : minutes < 60
      ? `${Math.round(minutes)} min`
      : `${Math.floor(minutes / 60)}h ${Math.round(minutes % 60)}m`
}
watch(
  () => props.selectedIndex,
  () => {
    if (!selectedCameras.value.length) cameraPanelOpen.value = false
  }
)
</script>
