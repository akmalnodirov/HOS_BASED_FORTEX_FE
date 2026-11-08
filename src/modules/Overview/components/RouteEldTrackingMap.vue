<template>
  <div
    ref="containerRef"
    :class="[
      'relative h-full min-h-[420px] overflow-hidden bg-muted/30',
      isFullscreen && 'fixed inset-0 z-[100] min-h-screen',
    ]"
  >
    <CMap ref="mapRef" :center="mapCenter" :zoom="5" @ready="onReady">
      <CMapLine
        :path="committedPath"
        color="#2563EB"
        :width="5"
        :opacity="0.95"
        casing-color="#ffffff"
        :casing-width="8"
        :casing-opacity="0.9"
      />
      <CMapLine
        :path="activeTrailPath"
        color="#2563EB"
        :width="5"
        :opacity="0.95"
        casing-color="#ffffff"
        :casing-width="8"
        :casing-opacity="0.9"
      />
      <CMapMarker
        v-for="point in filteredTransitionPoints"
        :key="point.id"
        :position="position(point)"
      >
        <button
          type="button"
          :class="[
            'flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-[10px] font-semibold text-white shadow',
            markerClass(point),
          ]"
          :title="formatTime(point.timestamp)"
          @click="selectedPoint = point"
        >
          {{ markerNumber(point) }}
        </button>
      </CMapMarker>
      <CMapMarker v-if="animatedPosition" :position="animatedPosition" :z-index="1">
        <div class="relative flex flex-col items-center">
          <div
            v-if="vehicleName"
            class="absolute bottom-full mb-1 max-w-32 truncate rounded bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-900 shadow"
            :title="vehicleName"
          >
            {{ vehicleName }}
          </div>
          <button
            type="button"
            class="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white bg-[#465a95] text-white shadow-lg ring-4 ring-[#465a95]/20"
            title="Current vehicle position"
            @click="selectedPoint = latestPoint"
          >
            <Navigation
              class="h-5 w-5"
              :style="{ transform: `rotate(${markerRotation(bearing)}deg)` }"
            />
          </button>
        </div>
      </CMapMarker>
    </CMap>

    <div
      class="absolute left-3 top-3 z-10 rounded-md bg-white/95 px-3 py-2 shadow-md backdrop-blur dark:bg-card/95"
    >
      <div class="flex items-center gap-2 text-xs font-semibold">
        <span
          :class="[
            'h-2 w-2 rounded-full',
            isLive ? 'animate-pulse bg-emerald-500' : 'bg-slate-400',
          ]"
        />
        {{ isLive ? 'Live route' : 'Historical route' }}
      </div>
      <div class="mt-0.5 text-[11px] text-muted-foreground">
        {{ validPoints.length }} position points
        <span v-if="isMatchingRoute"> · Matching route to roads…</span>
      </div>
    </div>

    <div
      class="absolute left-1/2 top-3 z-10 max-w-[calc(100%-500px)] -translate-x-1/2 overflow-x-auto rounded-lg bg-white/95 p-1 shadow-md backdrop-blur dark:bg-card/95"
    >
      <div class="flex items-center whitespace-nowrap">
        <button
          v-for="option in statusOptions"
          :key="option.id"
          type="button"
          :class="[
            'flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors',
            selectedStatus === option.id
              ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900'
              : 'border-transparent text-muted-foreground hover:bg-muted',
          ]"
          @click="selectedStatus = option.id"
        >
          <span v-if="option.id !== 'all'" :class="['h-2 w-2 rounded-full', option.color]" />
          {{ option.label }}
          <span class="opacity-70">{{ option.count }}</span>
        </button>
      </div>
    </div>

    <div class="absolute right-3 top-3 z-10 flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        :class="[
          'h-10 w-10 bg-white shadow-md dark:bg-card',
          autoFollow && 'text-blue-600 ring-2 ring-blue-500/30',
        ]"
        :title="autoFollow ? 'Stop following vehicle' : 'Follow vehicle'"
        @click="toggleFollow"
      >
        <LocateFixed class="h-5 w-5" />
      </Button>
      <CMapTypeControl />
      <Button
        variant="outline"
        size="icon"
        class="h-10 w-10 bg-white shadow-md dark:bg-card"
        title="Toggle fullscreen"
        @click="toggleFullscreen"
      >
        <Minimize v-if="isFullscreen" class="h-5 w-5" />
        <Maximize v-else class="h-5 w-5" />
      </Button>
    </div>

    <div
      v-if="selectedPoint"
      class="absolute bottom-3 left-3 z-10 w-[min(330px,calc(100%-24px))] rounded-md border border-border bg-white/95 p-3 text-xs shadow-lg backdrop-blur dark:bg-card/95"
    >
      <button class="absolute right-2 top-2 text-muted-foreground" @click="selectedPoint = null">
        <X class="h-4 w-4" />
      </button>
      <div class="pr-6 font-semibold">{{ selectedPoint.location || 'Tracking point' }}</div>
      <div class="mt-2 grid grid-cols-[76px_1fr] gap-x-2 gap-y-1">
        <span class="text-muted-foreground">Time</span><span>{{ formatTime(selectedPoint.timestamp) }}</span>
        <span class="text-muted-foreground">Speed</span><span>{{ speedLabel(selectedPoint.speed) }}</span>
        <span class="text-muted-foreground">Duty status</span><span>{{ dutyStatusLabel(selectedPoint) }}</span>
        <span class="text-muted-foreground">Odometer</span><span>{{ numberLabel(selectedPoint.odometer, ' mi') }}</span>
        <span class="text-muted-foreground">Position</span>
        <span>{{ selectedPoint.latitude.toFixed(5) }}, {{ selectedPoint.longitude.toFixed(5) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { LocateFixed, Maximize, Minimize, Navigation, X } from 'lucide-vue-next'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { Button } from '@/components/ui/button'
import CMap from '@/components/custom/CMap.vue'
import CMapLine from '@/components/custom/CMapLine.vue'
import CMapMarker from '@/components/custom/CMapMarker.vue'
import CMapTypeControl from '@/components/custom/CMapTypeControl.vue'
import { positionsBounds } from '@/utils/maps'
import { fetchMapRoute, MAP_ROUTE_MAX_POINTS } from '@/services/mapRouteService'
import type { RouteEldLiveTrackingPoint } from '../types'

interface LatLng {
  lat: number
  lng: number
}

type StatusFilter = 'all' | 'offDuty' | 'sleeper' | 'driving' | 'onDuty'

const props = defineProps<{
  points: RouteEldLiveTrackingPoint[]
  isLive: boolean
  currentStatus?: string | null
  vehicleName?: string | null
}>()

const MAX_ROUTE_ANCHORS = 180
const MIN_ROUTE_POINT_DISTANCE_METERS = 75
const FOLLOW_PAN_DISTANCE_METERS = 800
const mapRef = ref<InstanceType<typeof CMap> | null>(null)
const containerRef = ref<HTMLElement | null>(null)
const isFullscreen = ref(false)
const autoFollow = ref(true)
const isMatchingRoute = ref(false)
const selectedStatus = ref<StatusFilter>('all')
const selectedPoint = ref<RouteEldLiveTrackingPoint | null>(null)
const committedPath = ref<LatLng[]>([])
const animatedPosition = ref<LatLng | null>(null)
const animationPath = ref<LatLng[]>([])
const animationCumulativeDistances = ref<number[]>([])
const animationSegmentIndex = ref(0)
const bearing = ref(0)
const visiblePointTimestamp = ref(Number.POSITIVE_INFINITY)
const roadPathCache = new Map<string, LatLng[]>()
let animationStartedAt = 0
let animationDuration = 0
let animationFromTimestamp = 0
let animationToTimestamp = 0
let animationFrame: number | null = null
let lastFrameAt = 0
let knownPointIds = new Set<string>()
let sourceStartTimestamp: number | null = null
let routeRevision = 0
let lastPanPosition: LatLng | null = null

const validPoints = computed(() =>
  [...props.points]
    .filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude))
    .sort((left, right) => left.timestamp - right.timestamp)
)
const latestPoint = computed(() => validPoints.value.at(-1) ?? null)
const mapCenter = ref<LatLng>({ lat: 39.8283, lng: -98.5795 })
const activeTrailPath = computed(() => {
  if (animationPath.value.length === 0) return []
  const path = animationPath.value.slice(0, animationSegmentIndex.value + 1)
  if (animatedPosition.value) appendUniquePoint(path, animatedPosition.value)
  return path
})
const transitionPoints = computed(() => {
  const result: RouteEldLiveTrackingPoint[] = []
  let previous: Exclude<StatusFilter, 'all'> | null = null
  for (const point of validPoints.value) {
    const status = statusForPoint(point)
    if (status !== previous) result.push(point)
    previous = status
  }
  const latest = validPoints.value.at(-1)
  if (latest && result.at(-1)?.id !== latest.id) result.push(latest)
  return result
})
const statusCounts = computed(() => {
  const counts = { offDuty: 0, sleeper: 0, driving: 0, onDuty: 0 }
  transitionPoints.value.forEach((point) => {
    counts[statusForPoint(point)] += 1
  })
  return counts
})
const statusOptions = computed(() => [
  { id: 'all' as const, label: 'All', count: transitionPoints.value.length, color: '' },
  {
    id: 'offDuty' as const,
    label: 'Off Duty',
    count: statusCounts.value.offDuty,
    color: 'bg-red-500',
  },
  {
    id: 'sleeper' as const,
    label: 'Sleep',
    count: statusCounts.value.sleeper,
    color: 'bg-purple-500',
  },
  {
    id: 'driving' as const,
    label: 'Driving',
    count: statusCounts.value.driving,
    color: 'bg-emerald-500',
  },
  {
    id: 'onDuty' as const,
    label: 'On Duty',
    count: statusCounts.value.onDuty,
    color: 'bg-blue-500',
  },
])
const filteredTransitionPoints = computed(() =>
  transitionPoints.value.filter(
    (point) =>
      point.timestamp <= visiblePointTimestamp.value &&
      (selectedStatus.value === 'all' || statusForPoint(point) === selectedStatus.value)
  )
)

watch(
  () => props.points,
  (points) => void consumePoints(points),
  { deep: false, immediate: true }
)

onMounted(() => {
  document.addEventListener('fullscreenchange', handleFullscreenChange)
})

onBeforeUnmount(() => {
  stopAnimation()
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
})

async function consumePoints(points: RouteEldLiveTrackingPoint[]) {
  if (!points.length) {
    resetRoute([])
    return
  }
  const rangeChanged =
    sourceStartTimestamp !== points[0].timestamp ||
    !points.some((point) => knownPointIds.has(point.id))
  if (rangeChanged || knownPointIds.size === 0) {
    resetRoute(points)
    await rebuildRoadPath(points)
    return
  }

  const incoming = points.filter((point) => !knownPointIds.has(point.id))
  if (!incoming.length) return
  incoming.forEach((point) => knownPointIds.add(point.id))
  const targetPoint = incoming.at(-1)!
  if (!props.isLive || targetPoint.motionStatus !== 'MOVING') {
    routeRevision += 1
    commitAnimationProgress()
    stopAnimation()
    bearing.value = pointBearing(points, points.indexOf(targetPoint)) ?? bearing.value
    animatedPosition.value = position(targetPoint)
    visiblePointTimestamp.value = targetPoint.timestamp
    maybePanToVehicle(animatedPosition.value)
    await rebuildRoadPath(points)
    return
  }

  const current = animatedPosition.value ?? committedPath.value.at(-1) ?? position(incoming[0])
  commitAnimationProgress()
  stopAnimation()
  appendCommittedPoint(current)
  const revision = ++routeRevision
  isMatchingRoute.value = true
  const roadPath = await resolveRoadPath([current, ...incoming.map(position)])
  if (revision !== routeRevision) return
  isMatchingRoute.value = false
  const timing = liveAnimationTiming(incoming)
  startPathAnimation(
    roadPath,
    liveAnimationDuration(incoming),
    timing.startTimestamp,
    timing.endTimestamp
  )
}

function resetRoute(points: RouteEldLiveTrackingPoint[]) {
  routeRevision += 1
  stopAnimation()
  knownPointIds = new Set(points.map((point) => point.id))
  sourceStartTimestamp = points[0]?.timestamp ?? null
  committedPath.value = []
  const liveLeg = initialLiveLeg(points)
  animatedPosition.value = liveLeg?.start ?? (points.length ? position(points.at(-1)!) : null)
  bearing.value = points.length ? (pointBearing(points, points.length - 1) ?? 0) : 0
  visiblePointTimestamp.value =
    liveLeg?.startTimestamp ?? points.at(-1)?.timestamp ?? Number.POSITIVE_INFINITY
  lastPanPosition = animatedPosition.value
  selectedPoint.value = null
}

async function rebuildRoadPath(points: RouteEldLiveTrackingPoint[]) {
  const revision = ++routeRevision
  if (points.length < 2) {
    committedPath.value = points.map(position)
    bearing.value = points.length ? (normalizeBearing(points[0].bearing) ?? bearing.value) : 0
    isMatchingRoute.value = false
    await nextTick(fitRoute)
    return
  }
  isMatchingRoute.value = true
  const liveLeg = initialLiveLeg(points)
  if (liveLeg) {
    const [historyPath, livePath] = await Promise.all([
      resolveRoadPath(liveLeg.historyPoints.map(position)),
      resolveRoadPath([liveLeg.start, liveLeg.end]),
    ])
    if (revision !== routeRevision) return
    committedPath.value = historyPath
    animatedPosition.value = liveLeg.start
    lastPanPosition = liveLeg.start
    isMatchingRoute.value = false
    startPathAnimation(
      livePath,
      initialLiveAnimationDuration(liveLeg),
      liveLeg.startTimestamp,
      liveLeg.endTimestamp
    )
    await nextTick(fitRoute)
    return
  }
  const roadPath = await resolveRoadPath(points.map(position))
  if (revision !== routeRevision) return
  committedPath.value = roadPath
  animatedPosition.value = position(points.at(-1)!)
  bearing.value = pathBearing(roadPath) ?? pointBearing(points, points.length - 1) ?? bearing.value
  isMatchingRoute.value = false
  await nextTick(fitRoute)
}

function startPathAnimation(
  path: LatLng[],
  duration: number,
  fromTimestamp: number,
  toTimestamp: number
) {
  stopAnimation()
  animationFromTimestamp = fromTimestamp
  animationToTimestamp = toTimestamp
  visiblePointTimestamp.value = fromTimestamp
  if (path.length < 2) {
    if (path[0]) {
      animatedPosition.value = path[0]
      appendCommittedPoint(path[0])
    }
    visiblePointTimestamp.value = toTimestamp
    return
  }
  animatedPosition.value = path[0]
  animationPath.value = path
  animationCumulativeDistances.value = cumulativeDistances(path)
  animationSegmentIndex.value = 0
  bearing.value = calculateBearing(path[0], path[1])
  animationStartedAt = performance.now()
  animationDuration = duration
  animationFrame = requestAnimationFrame(animate)
}

function animate(now: number) {
  const path = animationPath.value
  const cumulative = animationCumulativeDistances.value
  if (path.length < 2 || cumulative.length !== path.length) return
  animationFrame = requestAnimationFrame(animate)
  if (now - lastFrameAt < 32) return
  lastFrameAt = now
  const progress = Math.min(1, (now - animationStartedAt) / Math.max(animationDuration, 1))
  visiblePointTimestamp.value =
    animationFromTimestamp + (animationToTimestamp - animationFromTimestamp) * progress
  const targetDistance = cumulative.at(-1)! * progress
  const index = findDistanceSegment(cumulative, targetDistance)
  const start = path[index]
  const end = path[index + 1]
  const segmentDistance = cumulative[index + 1] - cumulative[index]
  const segmentProgress =
    segmentDistance > 0 ? (targetDistance - cumulative[index]) / segmentDistance : 0
  animationSegmentIndex.value = index
  animatedPosition.value = interpolate(start, end, segmentProgress)
  bearing.value = calculateBearing(start, end)
  maybePanToVehicle(animatedPosition.value)
  if (progress >= 1) {
    appendCommittedPath(path)
    animatedPosition.value = path.at(-1)!
    visiblePointTimestamp.value = animationToTimestamp
    stopAnimation()
  }
}

function stopAnimation() {
  if (animationFrame !== null) cancelAnimationFrame(animationFrame)
  animationFrame = null
  animationPath.value = []
  animationCumulativeDistances.value = []
  animationSegmentIndex.value = 0
}

function commitAnimationProgress() {
  if (!animationPath.value.length) return
  appendCommittedPath(animationPath.value.slice(0, animationSegmentIndex.value + 1))
  if (animatedPosition.value) appendCommittedPoint(animatedPosition.value)
}

function liveAnimationDuration(points: RouteEldLiveTrackingPoint[]) {
  const timing = liveAnimationTiming(points)
  return validAnimationDuration(timing.endTimestamp - timing.startTimestamp)
}

function liveAnimationTiming(points: RouteEldLiveTrackingPoint[]) {
  const latest = points.at(-1)!
  const firstIncoming = points[0]
  const previous = props.points.findLast((point) => point.timestamp < firstIncoming.timestamp)
  return {
    startTimestamp: previous?.timestamp ?? latest.timestamp - 60_000,
    endTimestamp: latest.timestamp,
  }
}

function initialLiveLeg(points: RouteEldLiveTrackingPoint[]) {
  if (!props.isLive || points.length < 2) return null
  const latest = points.at(-1)!
  if (latest.motionStatus !== 'MOVING') return null
  const end = position(latest)
  for (let index = points.length - 2; index >= 0; index -= 1) {
    const start = position(points[index])
    if (distanceMeters(start, end) < 5) continue
    return {
      start,
      end,
      startTimestamp: points[index].timestamp,
      endTimestamp: latest.timestamp,
      historyPoints: points.slice(0, index + 1),
    }
  }
  return null
}

function initialLiveAnimationDuration(liveLeg: { startTimestamp: number; endTimestamp: number }) {
  return validAnimationDuration(liveLeg.endTimestamp - liveLeg.startTimestamp)
}

function validAnimationDuration(sourceInterval: number) {
  return Number.isFinite(sourceInterval) && sourceInterval > 0 ? sourceInterval : 1_000
}

async function resolveRoadPath(rawPoints: LatLng[]) {
  const anchors = prepareRouteAnchors(rawPoints)
  if (anchors.length < 2) return anchors

  const path: LatLng[] = []
  for (let start = 0; start < anchors.length - 1; start += MAP_ROUTE_MAX_POINTS - 1) {
    const batch = anchors.slice(start, start + MAP_ROUTE_MAX_POINTS)
    const resolved = await resolveRoadBatch(batch)
    appendUniquePath(path, resolved)
  }
  return path.length >= 2 ? path : anchors
}

function prepareRouteAnchors(points: LatLng[]) {
  if (points.length < 2) return [...points]
  const filtered: LatLng[] = [points[0]]
  for (let index = 1; index < points.length - 1; index += 1) {
    if (distanceMeters(filtered.at(-1)!, points[index]) >= MIN_ROUTE_POINT_DISTANCE_METERS)
      filtered.push(points[index])
  }
  appendUniquePoint(filtered, points.at(-1)!)
  if (filtered.length <= MAX_ROUTE_ANCHORS) return filtered

  const sampled: LatLng[] = []
  const step = (filtered.length - 1) / (MAX_ROUTE_ANCHORS - 1)
  for (let index = 0; index < MAX_ROUTE_ANCHORS; index += 1) {
    appendUniquePoint(sampled, filtered[Math.round(index * step)])
  }
  return sampled
}

async function resolveRoadBatch(points: LatLng[]) {
  if (points.length < 2) return points
  const key = points.map((point) => `${point.lat.toFixed(5)},${point.lng.toFixed(5)}`).join('|')
  const cached = roadPathCache.get(key)
  if (cached) return cached

  try {
    const route = await fetchMapRoute(
      points.map((point) => ({ latitude: point.lat, longitude: point.lng })),
      true
    )
    const path: LatLng[] = []
    for (const point of route.path ?? []) {
      if (Number.isFinite(point.latitude) && Number.isFinite(point.longitude))
        appendUniquePoint(path, { lat: point.latitude, lng: point.longitude })
    }
    const resolved = path.length >= 2 ? path : points
    if (roadPathCache.size >= 200) {
      const oldestKey = roadPathCache.keys().next().value
      if (oldestKey) roadPathCache.delete(oldestKey)
    }
    roadPathCache.set(key, resolved)
    return resolved
  } catch {
    return points
  }
}

function onReady(map: MapLibreMap) {
  map.on('dragstart', handleManualMapInteraction)
  if (!isMatchingRoute.value) fitRoute()
}

function getMap(): MapLibreMap | null {
  return mapRef.value?.getMap() ?? null
}

function fitRoute() {
  const map = getMap()
  const path = [...committedPath.value]
  if (animationPath.value.length) appendUniquePath(path, animationPath.value)
  if (!path.length) appendUniquePath(path, props.points.map(position))
  if (!map || !path.length) return
  if (path.length === 1) {
    map.jumpTo({ center: path[0], zoom: 15 })
    return
  }
  const bounds = positionsBounds(path)
  if (bounds) map.fitBounds(bounds, { padding: 70, duration: 0 })
  if (animatedPosition.value) lastPanPosition = animatedPosition.value
}

function toggleFollow() {
  autoFollow.value = !autoFollow.value
  const map = getMap()
  if (autoFollow.value && animatedPosition.value && map) {
    map.easeTo({ center: animatedPosition.value, zoom: Math.max(map.getZoom(), 15) })
    lastPanPosition = animatedPosition.value
  }
}

function handleManualMapInteraction() {
  autoFollow.value = false
}

function maybePanToVehicle(value: LatLng) {
  if (!autoFollow.value) return
  if (!lastPanPosition) {
    lastPanPosition = value
    return
  }
  if (distanceMeters(lastPanPosition, value) < FOLLOW_PAN_DISTANCE_METERS) return
  getMap()?.panTo(value)
  lastPanPosition = value
}

async function toggleFullscreen() {
  const element = containerRef.value
  if (!element) return
  if (document.fullscreenElement === element) await document.exitFullscreen().catch(() => {})
  else await element.requestFullscreen().catch(() => {})
}

function handleFullscreenChange() {
  isFullscreen.value = document.fullscreenElement === containerRef.value
  nextTick(() => {
    const map = getMap()
    map?.resize()
    if (autoFollow.value && animatedPosition.value) map?.panTo(animatedPosition.value)
    else fitRoute()
  })
}

function statusForPoint(point: RouteEldLiveTrackingPoint): Exclude<StatusFilter, 'all'> {
  const status = dutyStatusForPoint(point)
  if (status === 'sleeper') return 'sleeper'
  if (status === 'driving') return 'driving'
  if (status === 'onDuty' || status === 'yardMove') return 'onDuty'
  return 'offDuty'
}

function dutyStatusForPoint(point: RouteEldLiveTrackingPoint) {
  const rawStatus =
    point.dutyStatus ||
    (point.id === validPoints.value.at(-1)?.id ? props.currentStatus : null) ||
    point.engineEventCode ||
    ''
  const status = rawStatus.replace(/[\s_-]/g, '').toUpperCase()
  if (status.includes('PERSONAL') || status === 'PC' || status.includes('DRINDPC'))
    return 'personalUse'
  if (status.includes('YARD') || status === 'YM' || status.includes('DRINDYM')) return 'yardMove'
  if (status.includes('SLEEP') || status === 'SB' || status.includes('DSSB')) return 'sleeper'
  if (status.includes('DRIV') || status === 'D' || status.includes('DSD')) return 'driving'
  if (status.includes('ONDUTY') || status === 'ON' || status.includes('DSON')) return 'onDuty'
  if (status.includes('OFF') || status.includes('DSOFF')) return 'offDuty'
  return point.motionStatus === 'MOVING' ? 'driving' : 'offDuty'
}

function dutyStatusLabel(point: RouteEldLiveTrackingPoint) {
  const status = dutyStatusForPoint(point)
  if (status === 'personalUse') return 'Personal Use'
  if (status === 'yardMove') return 'Yard Move'
  if (status === 'sleeper') return 'Sleeper Berth'
  if (status === 'driving') return 'Driving'
  if (status === 'onDuty') return 'On Duty'
  return 'Off Duty'
}

function markerClass(point: RouteEldLiveTrackingPoint) {
  const status = statusForPoint(point)
  if (status === 'driving') return 'bg-emerald-500'
  if (status === 'sleeper') return 'bg-purple-500'
  if (status === 'onDuty') return 'bg-blue-500'
  return 'bg-red-500'
}

function markerNumber(point: RouteEldLiveTrackingPoint) {
  return transitionPoints.value.findIndex((item) => item.id === point.id) + 1
}

function position(point: RouteEldLiveTrackingPoint): LatLng {
  return { lat: point.latitude, lng: point.longitude }
}

function appendCommittedPoint(value: LatLng) {
  const path = [...committedPath.value]
  appendUniquePoint(path, value)
  committedPath.value = path
}

function appendCommittedPath(values: LatLng[]) {
  const path = [...committedPath.value]
  appendUniquePath(path, values)
  committedPath.value = path
}

function appendUniquePath(target: LatLng[], values: LatLng[]) {
  values.forEach((value) => appendUniquePoint(target, value))
}

function appendUniquePoint(target: LatLng[], value: LatLng) {
  const last = target.at(-1)
  if (!last || !samePosition(last, value)) target.push(value)
}

function samePosition(left: LatLng, right: LatLng) {
  return Math.abs(left.lat - right.lat) < 0.0000001 && Math.abs(left.lng - right.lng) < 0.0000001
}

function cumulativeDistances(path: LatLng[]) {
  const result = [0]
  for (let index = 1; index < path.length; index += 1)
    result.push(result[index - 1] + distanceMeters(path[index - 1], path[index]))
  return result
}

function findDistanceSegment(distances: number[], distance: number) {
  let low = 0
  let high = distances.length - 2
  while (low < high) {
    const middle = Math.floor((low + high + 1) / 2)
    if (distances[middle] <= distance) low = middle
    else high = middle - 1
  }
  return low
}

function interpolate(start: LatLng, end: LatLng, progress: number): LatLng {
  return {
    lat: start.lat + (end.lat - start.lat) * progress,
    lng: start.lng + (end.lng - start.lng) * progress,
  }
}

function distanceMeters(start: LatLng, end: LatLng) {
  const latitudeDelta = ((end.lat - start.lat) * Math.PI) / 180
  const longitudeDelta = ((end.lng - start.lng) * Math.PI) / 180
  const startLatitude = (start.lat * Math.PI) / 180
  const endLatitude = (end.lat * Math.PI) / 180
  const value =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(longitudeDelta / 2) ** 2
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value))
}

function markerRotation(value: number) {
  return value - 45
}

function normalizeBearing(value: number | null | undefined) {
  return value != null && Number.isFinite(value) ? ((value % 360) + 360) % 360 : null
}

function pointBearing(points: RouteEldLiveTrackingPoint[], index: number) {
  if (!points[index]) return null
  for (let previous = index - 1; previous >= 0; previous -= 1) {
    if (!samePosition(position(points[previous]), position(points[index])))
      return calculateBearing(position(points[previous]), position(points[index]))
  }
  for (let next = index + 1; next < points.length; next += 1) {
    if (!samePosition(position(points[index]), position(points[next])))
      return calculateBearing(position(points[index]), position(points[next]))
  }
  return normalizeBearing(points[index].bearing)
}

function pathBearing(path: LatLng[]) {
  for (let index = path.length - 1; index > 0; index -= 1) {
    if (!samePosition(path[index - 1], path[index]))
      return calculateBearing(path[index - 1], path[index])
  }
  return null
}

function calculateBearing(from: LatLng, to: LatLng) {
  const lat1 = (from.lat * Math.PI) / 180
  const lat2 = (to.lat * Math.PI) / 180
  const delta = ((to.lng - from.lng) * Math.PI) / 180
  const y = Math.sin(delta) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(delta)
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

function formatTime(value: number) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'medium' }).format(
    value
  )
}

function speedLabel(value: number | null) {
  return value == null ? '—' : `${value.toFixed(1)} mph`
}

function numberLabel(value: number | null, suffix: string) {
  return value == null
    ? '—'
    : `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })}${suffix}`
}
</script>
