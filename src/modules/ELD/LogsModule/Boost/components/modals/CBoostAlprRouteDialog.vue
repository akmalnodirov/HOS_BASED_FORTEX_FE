<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent
      class="flex h-[min(92vh,900px)] max-w-[min(1500px,calc(100vw-24px))] flex-col overflow-hidden p-0"
    >
      <DialogHeader class="shrink-0 border-b px-5 py-4 pr-12">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div class="min-w-0">
            <DialogTitle class="truncate" :title="routeTitle">{{ routeTitle }}</DialogTitle>
            <DialogDescription class="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              <span v-if="displaySequenceId">Sequence #{{ displaySequenceId }}</span>
              <span v-if="createdAt" class="inline-flex items-center gap-1.5"
                ><CalendarDays class="h-3.5 w-3.5" />{{ formatDate(createdAt) }}</span
              >
              <span v-if="routes.length" class="inline-flex items-center gap-1.5"
                ><RouteIcon class="h-3.5 w-3.5" />{{ routes.length }} routes</span
              >
            </DialogDescription>
          </div>
          <Select :model-value="selectedHistoryId" @update:model-value="selectHistory">
            <SelectTrigger class="h-9 w-full text-sm font-normal lg:w-[330px]">
              <SelectValue placeholder="Latest routes for this session" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem :value="NEW_ROUTE">New route</SelectItem>
              <SelectItem v-for="item in context?.history ?? []" :key="item.id" :value="item.id">
                {{ shortLocationName(item.destinationLabel) }} ·
                {{ formatDate(item.createdAt) }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </DialogHeader>

      <div v-if="loading" class="flex flex-1 items-center justify-center">
        <LoaderCircle class="h-7 w-7 animate-spin text-primary" />
      </div>
      <div
        v-else-if="loadError"
        class="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center"
      >
        <CircleAlert class="h-9 w-9 text-destructive" />
        <p class="font-medium">The ALPR route could not be loaded</p>
        <p class="text-sm text-muted-foreground">Close the dialog and try again.</p>
      </div>
      <div
        v-else-if="!origin"
        class="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center"
      >
        <MapPinOff class="h-9 w-9 text-muted-foreground" />
        <p class="font-medium">No route origin is available</p>
        <p class="max-w-md text-sm text-muted-foreground">
          This session tab has no effective event containing both latitude and longitude.
        </p>
      </div>
      <CBoostAlprRouteViewer
        v-else
        :routes="routes"
        :selected-index="selectedRouteIndex"
        :origin="origin"
        :destination="destination"
        :stops="stops"
        @update:selected-index="selectedRouteIndex = $event"
        @select-location="selectPointFromMap"
      >
        <template v-if="isNewRoute" #route-builder>
          <div class="space-y-3">
            <div>
              <label class="mb-1 block text-xs font-medium text-muted-foreground">From event</label>
              <div class="rounded-md border bg-muted/40 px-3 py-2 text-sm">
                <p class="truncate font-medium" :title="origin.label">{{ origin.label }}</p>
                <p class="mt-0.5 text-xs text-muted-foreground">
                  {{ origin.latitude.toFixed(5) }}, {{ origin.longitude.toFixed(5) }}
                </p>
              </div>
            </div>
            <div v-for="(point, index) in points" :key="point.key" class="flex items-center gap-2">
              <div class="min-w-0 flex-1">
                <label class="mb-1 block text-xs font-medium text-muted-foreground">{{
                  pointLabel(index)
                }}</label>
                <CAlprLocationInput
                  v-model="point.label"
                  :placeholder="pointLabel(index)"
                  @select="(location) => selectPoint(index, location)"
                  @clear="clearPoint(index)"
                  @focus="activePointIndex = index"
                />
              </div>
              <button
                v-if="index < points.length - 1"
                type="button"
                title="Remove waypoint"
                class="mt-5 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                @click="removeWaypoint(index)"
              >
                <X class="h-4 w-4" />
              </button>
            </div>
            <Button variant="outline" class="w-full border-dashed" @click="addWaypoint">
              <Plus class="mr-2 h-4 w-4" />Add waypoint
            </Button>
            <Button class="w-full" :disabled="!canAnalyze || analyzing" @click="analyzeRoute">
              <LoaderCircle v-if="analyzing" class="mr-2 h-4 w-4 animate-spin" /><Navigation
                v-else
                class="mr-2 h-4 w-4"
              />{{ analyzing ? 'Finding cameras…' : 'Analyze route' }}
            </Button>
          </div>
        </template>
      </CBoostAlprRouteViewer>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import dayjs from 'dayjs'
import {
  CalendarDays,
  CircleAlert,
  LoaderCircle,
  MapPinOff,
  Navigation,
  Plus,
  Route as RouteIcon,
  X,
} from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { ApiEndpoints } from '@/api/endpoints'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useApi } from '@/composables/useAxiosService'
import CAlprLocationInput from '@/modules/AlprCamera/components/CAlprLocationInput.vue'
import type {
  AlprCameraRouteCandidate,
  AlprLocation,
  AlprReverseGeocodeResult,
} from '@/modules/AlprCamera/types'
import type {
  RouteEldAlprRouteAnalysis,
  RouteEldAlprRouteContext,
  RouteEldAlprRouteHistoryDetail,
} from '../../types/boost'
import CBoostAlprRouteViewer from './CBoostAlprRouteViewer.vue'

interface RoutePoint {
  key: number
  label: string
  location: AlprLocation | null
}
interface ApiEnvelope<T> {
  successResult: T
}
const props = defineProps<{ open: boolean; sessionId: string | null; tabId: string | null; driverId: string }>()
const emit = defineEmits<{ (event: 'update:open', open: boolean): void }>()
const NEW_ROUTE = '__new__'
const api = useApi()
let nextPointKey = 1
let reverseRequestVersion = 0
const context = ref<RouteEldAlprRouteContext | null>(null)
const detail = ref<RouteEldAlprRouteHistoryDetail | null>(null)
const selectedHistoryId = ref(NEW_ROUTE)
const selectedRouteIndex = ref(0)
const localAnalysis = ref<RouteEldAlprRouteAnalysis | null>(null)
const points = ref<RoutePoint[]>([newPoint()])
const activePointIndex = ref(0)
const loading = ref(false)
const analyzing = ref(false)
const loadError = ref(false)
const unwrap = <T,>(value: T | ApiEnvelope<T>): T =>
  value && typeof value === 'object' && 'successResult' in value ? value.successResult : value
const isNewRoute = computed(() => selectedHistoryId.value === NEW_ROUTE)
const origin = computed<AlprLocation | null>(() =>
  !isNewRoute.value && detail.value
    ? {
        label: detail.value.report.originLabel,
        longitude: detail.value.report.originLongitude,
        latitude: detail.value.report.originLatitude,
      }
    : (localAnalysis.value?.origin.location ?? context.value?.origin?.location ?? null)
)
const destination = computed<AlprLocation | null>(() =>
  !isNewRoute.value && detail.value
    ? {
        label: detail.value.report.destinationLabel,
        longitude: detail.value.report.destinationLongitude,
        latitude: detail.value.report.destinationLatitude,
      }
    : (points.value.at(-1)?.location ?? null)
)
const stops = computed<AlprLocation[]>(() =>
  !isNewRoute.value && detail.value
    ? detail.value.report.stops
        .filter((p) => p.length >= 2)
        .map((p, i) => ({ label: `Waypoint ${i + 1}`, longitude: p[0], latitude: p[1] }))
    : points.value
        .slice(0, -1)
        .map((p) => p.location)
        .filter((p): p is AlprLocation => p !== null)
)
const routes = computed<AlprCameraRouteCandidate[]>(() =>
  isNewRoute.value
    ? (localAnalysis.value?.analysis.routes ?? [])
    : (detail.value?.report.routes ?? [])
)
const createdAt = computed(() =>
  isNewRoute.value ? localAnalysis.value?.createdAt : detail.value?.report.createdAt
)
const sequenceId = computed(() =>
  isNewRoute.value
    ? (localAnalysis.value?.origin.sequenceId ?? context.value?.origin?.sequenceId)
    : detail.value?.originSequenceId
)
const displaySequenceId = computed(() => sequenceToDecimal(sequenceId.value))
const routeTitle = computed(() => {
  const from = origin.value ? shortLocationName(origin.value.label) : 'ALPR camera route'
  const to = destination.value ? shortLocationName(destination.value.label) : null
  return to ? `${from} → ${to}` : from
})
const canAnalyze = computed(
  () =>
    !!props.sessionId &&
    !!props.tabId &&
    !!origin.value &&
    points.value.length > 0 &&
    points.value.every((point) => point.location)
)

function newPoint(): RoutePoint {
  return { key: nextPointKey++, label: '', location: null }
}
function resetNewRoute() {
  localAnalysis.value = null
  selectedRouteIndex.value = 0
  points.value = [newPoint()]
  activePointIndex.value = 0
}
function pointLabel(index: number) {
  return index === points.value.length - 1 ? 'To' : `Waypoint ${index + 1}`
}
function selectPoint(index: number, location: AlprLocation) {
  const point = points.value[index]
  if (!point) return
  point.label = location.label
  point.location = location
  localAnalysis.value = null
  activePointIndex.value = Math.min(index + 1, points.value.length - 1)
}
function clearPoint(index: number) {
  const point = points.value[index]
  if (!point) return
  point.location = null
  localAnalysis.value = null
  activePointIndex.value = index
}
function addWaypoint() {
  points.value.splice(Math.max(points.value.length - 1, 0), 0, newPoint())
  activePointIndex.value = Math.max(points.value.length - 2, 0)
  localAnalysis.value = null
}
function removeWaypoint(index: number) {
  points.value.splice(index, 1)
  activePointIndex.value = Math.min(activePointIndex.value, points.value.length - 1)
  localAnalysis.value = null
}

async function loadContext() {
  if (!props.sessionId || !props.tabId) return
  loading.value = true
  loadError.value = false
  try {
    const response = await api.get<
      RouteEldAlprRouteContext | ApiEnvelope<RouteEldAlprRouteContext>
    >(ApiEndpoints.ROUTE_ELD_EVENT_SESSION_ALPR_ROUTES(props.sessionId, props.tabId), {
      params: { driverId: props.driverId },
    })
    context.value = unwrap(response.data)
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
}
async function selectHistory(value: unknown) {
  if (typeof value !== 'string') return
  selectedHistoryId.value = value
  selectedRouteIndex.value = 0
  if (value === NEW_ROUTE) {
    detail.value = null
    resetNewRoute()
    return
  }
  if (!props.sessionId) return
  loading.value = true
  loadError.value = false
  try {
    const response = await api.get<
      RouteEldAlprRouteHistoryDetail | ApiEnvelope<RouteEldAlprRouteHistoryDetail>
    >(ApiEndpoints.ROUTE_ELD_EVENT_SESSION_ALPR_ROUTE(props.sessionId, value))
    detail.value = unwrap(response.data)
    selectedRouteIndex.value = Math.max(
      detail.value.report.routes.findIndex((route) => route.isRecommended),
      0
    )
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
}
async function selectPointFromMap(coordinates: { longitude: number; latitude: number }) {
  if (!isNewRoute.value) return
  const empty = points.value.findIndex((point) => point.location === null)
  const index = empty >= 0 ? empty : activePointIndex.value
  const target = points.value[index]
  if (!target) return
  const fallback = `${coordinates.latitude.toFixed(5)}, ${coordinates.longitude.toFixed(5)}`
  const version = ++reverseRequestVersion
  target.label = fallback
  target.location = { ...coordinates, label: fallback }
  localAnalysis.value = null
  try {
    const response = await api.get<AlprReverseGeocodeResult>(ApiEndpoints.ALPR_GEOCODE_REVERSE, {
      params: coordinates,
      _skipErrorHandling: true,
    })
    if (version !== reverseRequestVersion) return
    const label = response.data.label?.trim() || fallback
    target.label = label
    target.location = { ...coordinates, label }
  } catch {
    /* coordinates remain usable */
  }
}
async function analyzeRoute() {
  if (!canAnalyze.value || !props.sessionId || !props.tabId) return
  const endpoint = points.value.at(-1)?.location
  if (!endpoint) return
  analyzing.value = true
  try {
    const response = await api.post<
      RouteEldAlprRouteAnalysis | ApiEnvelope<RouteEldAlprRouteAnalysis>
    >(ApiEndpoints.ROUTE_ELD_EVENT_SESSION_ALPR_ROUTES(props.sessionId, props.tabId), {
      destination: endpoint,
      stops: stops.value,
      driverId: props.driverId,
    })
    localAnalysis.value = unwrap(response.data)
    selectedRouteIndex.value = Math.max(
      localAnalysis.value.analysis.routes.findIndex((route) => route.isRecommended),
      0
    )
    await loadContext()
    toast.success(localAnalysis.value.id ? 'Route analyzed and saved' : 'Route analyzed')
  } catch (error: any) {
    toast.error(error?.response?.data?.message || 'ALPR route analysis could not be completed')
  } finally {
    analyzing.value = false
  }
}
function sequenceToDecimal(value?: string | null) {
  if (!value) return ''
  const parsed = Number.parseInt(value, 16)
  return Number.isFinite(parsed) ? String(parsed) : value
}
function shortLocationName(value: string) {
  return (
    value
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p && p.toLowerCase() !== 'united states')[0] || 'Location'
  )
}
function formatDate(value: string) {
  return dayjs(value).format('MMM D, YYYY h:mm A')
}
watch(
  () => [props.open, props.sessionId, props.tabId, props.driverId] as const,
  ([open]) => {
    if (!open) return
    selectedHistoryId.value = NEW_ROUTE
    detail.value = null
    resetNewRoute()
    void loadContext()
  }
)
</script>
