<template>
  <div
    class="flex min-h-[calc(100vh-65px)] flex-col overflow-hidden bg-background lg:h-[calc(100vh-65px)] lg:min-h-0 lg:flex-row"
  >
    <aside
      class="flex max-h-[52vh] w-full shrink-0 flex-col border-b border-border bg-background lg:max-h-none lg:w-[360px] lg:border-b-0 lg:border-r"
    >
      <div class="flex items-center justify-between border-b border-border px-4 py-4">
        <div>
          <h1 class="text-lg font-semibold text-foreground">ALPR camera route</h1>
          <p class="mt-0.5 text-xs text-muted-foreground">Find routes and cameras in one search</p>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-4">
        <div class="relative pl-6">
          <div
            class="absolute bottom-5 left-1.5 top-5 z-0 w-[2px] border-l-2 border-dashed border-gray-300 dark:border-gray-700"
          />

          <div
            v-for="(point, index) in points"
            :key="point.key"
            class="group relative mb-3 flex items-center gap-2"
          >
            <div class="absolute -left-6 top-3 flex h-4 w-4 items-center justify-center">
              <div
                class="z-10 h-3 w-3 rounded-full border-2 bg-white dark:bg-card"
                :class="index === 0 ? 'border-primary' : 'border-gray-500'"
              >
                <div
                  class="m-[1px] h-1.5 w-1.5 rounded-full"
                  :class="index === 0 ? 'bg-primary' : 'bg-gray-500'"
                />
              </div>
            </div>

            <CAlprLocationInput
              v-model="point.label"
              :placeholder="pointPlaceholder(index)"
              @select="(location) => selectPoint(index, location)"
              @clear="clearPoint(index)"
              @focus="activePointIndex = index"
            />

            <Button
              v-if="points.length > 2 && index > 0 && index < points.length - 1"
              type="button"
              variant="ghost"
              size="icon-sm"
              title="Remove"
              class="shrink-0 text-muted-foreground hover:text-foreground"
              @click="removePoint(index)"
            >
              <X class="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Button
          variant="outline"
          class="mt-2 h-10 w-full border-dashed border-gray-300 text-sm font-medium shadow-sm dark:border-border"
          @click="addDestination"
        >
          <Plus class="h-4 w-4 text-muted-foreground" />
          Add destination
        </Button>

        <Button
          class="mt-3 h-10 w-full"
          :disabled="!canSearch || analyzeMutation.isPending.value"
          @click="searchRoute"
        >
          <LoaderCircle v-if="analyzeMutation.isPending.value" class="h-4 w-4 animate-spin" />
          <Navigation v-else class="h-4 w-4" />
          {{ analyzeMutation.isPending.value ? 'Finding cameras…' : 'Search route' }}
        </Button>

        <div
          v-if="analyzeMutation.isPending.value"
          class="mt-4 rounded-md border border-primary/20 bg-primary/5 px-3 py-3 text-xs leading-5 text-muted-foreground"
        >
          Routes and ALPR cameras are being checked together. The completed result will be saved to
          History.
        </div>

        <div v-if="routes.length" class="mt-5 space-y-3">
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-semibold text-foreground">Route results</h2>
            <span class="text-xs text-muted-foreground">{{ routes.length }} found</span>
          </div>

          <button
            v-for="(route, index) in routes"
            :key="`${route.label}-${index}`"
            type="button"
            class="w-full rounded-md border p-3 text-left transition-colors"
            :class="
              selectedIndex === index
                ? 'border-primary bg-primary/5 dark:bg-primary/10'
                : 'border-border bg-card hover:border-gray-300 dark:hover:border-gray-600'
            "
            @click="selectedIndex = index"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <span class="font-semibold text-foreground">{{ route.label }}</span>
                  <span
                    v-if="route.isRecommended"
                    class="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary"
                  >
                    Recommended
                  </span>
                </div>
                <p class="mt-0.5 truncate text-xs text-muted-foreground">
                  via {{ route.roadSummary || 'provider route' }}
                </p>
              </div>
              <span
                class="rounded bg-red-50 px-2 py-1 text-sm font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-400"
              >
                {{ route.cameraCount }}
              </span>
            </div>

            <div class="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div class="rounded bg-muted/60 px-2 py-2">
                <span class="block text-[10px] uppercase text-muted-foreground">Distance</span>
                <span class="font-semibold text-foreground">
                  {{ formatMiles(route.distanceMetres) }} mi
                </span>
              </div>
              <div class="rounded bg-muted/60 px-2 py-2">
                <span class="block text-[10px] uppercase text-muted-foreground">Time</span>
                <span class="font-semibold text-foreground">{{
                  formatDuration(route.durationSeconds)
                }}</span>
              </div>
              <div class="rounded bg-muted/60 px-2 py-2">
                <span class="block text-[10px] uppercase text-muted-foreground">Cameras</span>
                <span class="font-semibold text-foreground">{{ route.cameraCount }}</span>
              </div>
            </div>
          </button>
        </div>

        <div
          v-else-if="analysis && !analyzeMutation.isPending.value"
          class="mt-5 rounded-md border border-border px-4 py-6 text-center text-sm text-muted-foreground"
        >
          No routes were returned for these points.
        </div>
      </div>
    </aside>

    <main class="min-h-[48vh] flex-1 bg-muted lg:min-h-0">
      <CAlprRouteMap
        ref="routeMapRef"
        :routes="routes"
        :selected-index="selectedIndex"
        :origin="points[0]?.location"
        :destination="points[points.length - 1]?.location"
        :stops="routeStops"
        @select-route="selectedIndex = $event"
        @select-location="selectPointFromMap"
      />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { LoaderCircle, Navigation, Plus, X } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { ApiEndpoints } from '@/api/endpoints'
import { Button } from '@/components/ui/button'
import { useApi } from '@/composables/useAxiosService'
import CAlprLocationInput from '../components/CAlprLocationInput.vue'
import CAlprRouteMap from '../components/CAlprRouteMap.vue'
import { useAnalyzeAlprCameraRoute } from '../composables/useAlprCameraRoutes'
import type {
  AlprCameraRouteAnalysisResponse,
  AlprCameraRouteRequest,
  AlprLocation,
  AlprReverseGeocodeResult,
} from '../types'

interface RoutePoint {
  key: number
  label: string
  location: AlprLocation | null
}

const api = useApi()
const analyzeMutation = useAnalyzeAlprCameraRoute()
const analysis = ref<AlprCameraRouteAnalysisResponse | null>(null)
const selectedIndex = ref(0)
const activePointIndex = ref(0)
const routeMapRef = ref<{ focusLocation: (location: AlprLocation, zoom?: number) => void } | null>(
  null
)
let nextPointKey = 2
let reverseRequestVersion = 0
const reverseRequestVersions = new Map<number, number>()

const points = ref<RoutePoint[]>([
  { key: 0, label: '', location: null },
  { key: 1, label: '', location: null },
])

const routes = computed(() => analysis.value?.routes ?? [])
const routeStops = computed(() =>
  points.value
    .slice(1, -1)
    .map((point) => point.location)
    .filter((location): location is AlprLocation => location !== null)
)
const canSearch = computed(
  () => points.value.length >= 2 && points.value.every((point) => point.location !== null)
)

function pointPlaceholder(index: number) {
  if (index === 0) return 'From'
  if (index === points.value.length - 1) return 'To'
  return `Stop ${index}`
}

function selectPoint(index: number, location: AlprLocation) {
  points.value[index].label = location.label
  points.value[index].location = location
  routeMapRef.value?.focusLocation(location)
  const nextEmptyIndex = points.value.findIndex(
    (point, pointIndex) => pointIndex !== index && point.location === null
  )
  activePointIndex.value = nextEmptyIndex >= 0 ? nextEmptyIndex : index
}

function clearPoint(index: number) {
  points.value[index].location = null
  activePointIndex.value = index
}

function addDestination() {
  const stopIndex = Math.max(1, points.value.length - 1)
  points.value.splice(stopIndex, 0, { key: nextPointKey++, label: '', location: null })
  activePointIndex.value = stopIndex
}

function removePoint(index: number) {
  points.value.splice(index, 1)
  activePointIndex.value = Math.min(activePointIndex.value, points.value.length - 1)
}

async function selectPointFromMap(coordinates: { longitude: number; latitude: number }) {
  const incompleteIndex = points.value.findIndex((point) => point.location === null)
  let targetIndex: number
  if (incompleteIndex >= 0) {
    targetIndex = incompleteIndex
  } else if (routes.value.length > 0) {
    targetIndex = points.value.length - 1
    points.value.splice(targetIndex, 0, {
      key: nextPointKey++,
      label: '',
      location: null,
    })
    activePointIndex.value = targetIndex
  } else {
    targetIndex =
      activePointIndex.value >= 0 && activePointIndex.value < points.value.length
        ? activePointIndex.value
        : points.value.length - 1
  }
  const target = points.value[targetIndex]
  if (!target) return

  const fallbackLabel = `${coordinates.latitude.toFixed(5)}, ${coordinates.longitude.toFixed(5)}`
  const targetKey = target.key
  const version = ++reverseRequestVersion
  reverseRequestVersions.set(targetKey, version)
  target.label = fallbackLabel
  target.location = { ...coordinates, label: fallbackLabel }
  const nextEmptyIndex = points.value.findIndex((point) => point.location === null)
  activePointIndex.value = nextEmptyIndex >= 0 ? nextEmptyIndex : targetIndex

  try {
    const response = await api.get<AlprReverseGeocodeResult>(ApiEndpoints.ALPR_GEOCODE_REVERSE, {
      params: coordinates,
      _skipErrorHandling: true,
    })
    if (reverseRequestVersions.get(targetKey) !== version) return
    const current = points.value.find((point) => point.key === targetKey)
    if (!current) return
    const label = response.data.label?.trim() || fallbackLabel
    current.label = label
    current.location = { ...coordinates, label }
    const nextEmptyIndex = points.value.findIndex((point) => point.location === null)
    activePointIndex.value = nextEmptyIndex >= 0 ? nextEmptyIndex : points.value.indexOf(current)
  } catch {
    if (reverseRequestVersions.get(targetKey) === version) {
      const nextEmptyIndex = points.value.findIndex((point) => point.location === null)
      activePointIndex.value = nextEmptyIndex >= 0 ? nextEmptyIndex : targetIndex
    }
  } finally {
    if (reverseRequestVersions.get(targetKey) === version) reverseRequestVersions.delete(targetKey)
  }
}

function searchRoute() {
  const located = points.value.map((point) => point.location)
  if (located.some((point) => !point)) return

  const payload: AlprCameraRouteRequest = {
    name: `${points.value[0].label} → ${points.value[points.value.length - 1].label}`,
    origin: {
      longitude: located[0]!.longitude,
      latitude: located[0]!.latitude,
    },
    destination: {
      longitude: located[located.length - 1]!.longitude,
      latitude: located[located.length - 1]!.latitude,
    },
    stops: (located.slice(1, -1) as AlprLocation[]).map(({ longitude, latitude }) => ({
      longitude,
      latitude,
    })),
    radiusMetres: 150,
    directionalZones: true,
    departAt: null,
    checks: {
      cameras: true,
      bridges: false,
      truckRestrictions: false,
      optimizeBlockedSegments: false,
    },
  }

  analyzeMutation.mutate(payload, {
    onSuccess: (result) => {
      analysis.value = result
      selectedIndex.value = Math.max(
        result.routes.findIndex((route) => route.isRecommended),
        0
      )
      if (result.reportId) toast.success('Route analyzed and saved to History')
      else toast.success('Route analyzed')
    },
  })
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
</script>
