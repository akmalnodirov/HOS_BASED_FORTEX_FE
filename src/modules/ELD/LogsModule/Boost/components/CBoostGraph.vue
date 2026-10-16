<template>
  <div class="rounded-md border border-border bg-white dark:bg-card">
    <div class="grid grid-cols-[1fr_minmax(0,2fr)_1fr] items-center gap-3 border-b px-3 py-2">
      <div class="flex min-w-0 items-center gap-3 text-xs text-muted-foreground">
        <slot name="graph-actions" />
      </div>
      <div class="flex min-w-0 items-center justify-center gap-2">
        <slot name="toolbar">
          <span />
        </slot>
      </div>
      <div class="flex items-center justify-end gap-1">
        <Button
          variant="outline"
          size="icon"
          class="h-7 w-7"
          title="Zoom out"
          :disabled="zoom <= 0.75"
          @click="changeZoom(-0.25)"
        >
          <Minus class="h-3.5 w-3.5" />
        </Button>
        <span class="w-11 text-center text-[11px] text-muted-foreground">{{ Math.round(zoom * 100) }}%</span>
        <Button
          variant="outline"
          size="icon"
          class="h-7 w-7"
          title="Zoom in"
          :disabled="zoom >= 2.5"
          @click="changeZoom(0.25)"
        >
          <Plus class="h-3.5 w-3.5" />
        </Button>
        <CLogGraphMarkerSettings
          :options="markerOptions"
          :model-value="markerSettings"
          @toggle="setMarkerEnabled"
          @toggle-all="setAllMarkersEnabled"
        />
      </div>
    </div>

    <div class="relative grid grid-cols-[52px_minmax(0,1fr)_62px]">
      <div
        v-if="isGraphLoading || isCoDriverLoading"
        class="absolute inset-0 z-30 flex items-center justify-center gap-2 bg-background/80 text-xs text-muted-foreground backdrop-blur-[1px]"
      >
        <Loader2 class="h-4 w-4 animate-spin" />
        {{ isGraphLoading ? 'Loading session event graph' : 'Loading co-driver graph' }}
      </div>

      <svg
        :viewBox="`0 0 52 ${chartHeight}`"
        :style="{ height: `${chartHeight}px` }"
        class="w-[52px] bg-white dark:bg-card"
      >
        <text
          v-for="(label, index) in statusLabels"
          :key="label"
          x="42"
          :y="statusY[index] + 4"
          text-anchor="end"
          class="fill-muted-foreground text-[11px] font-medium"
        >
          {{ label }}
        </text>
      </svg>

      <div
        ref="scroller"
        class="min-w-0 overflow-x-auto overscroll-contain border-x"
        @scroll="scheduleVisibleDayUpdate"
        @wheel="panWithWheel"
      >
        <svg
          :viewBox="`0 0 ${plotWidth} ${chartHeight}`"
          :style="{ width: `${plotWidth}px`, minWidth: `${plotWidth}px` }"
          class="select-none"
          :height="chartHeight"
        >
          <rect :width="plotWidth" :height="chartHeight" class="fill-white dark:fill-card" />

          <g v-for="(label, index) in statusLabels" :key="label">
            <line
              x1="0"
              :x2="plotWidth"
              :y1="statusY[index]"
              :y2="statusY[index]"
              class="stroke-border"
            />
          </g>
          <g v-for="tick in hourTicks" :key="tick.hour">
            <line
              :x1="tick.x"
              :x2="tick.x"
              y1="40"
              y2="170"
              :class="tick.isDay ? 'stroke-slate-400 dark:stroke-slate-500' : 'stroke-border/70'"
              :stroke-width="tick.isDay ? 1.5 : 1"
            />
            <text
              v-if="tick.isDay && tick.label"
              :x="tick.x + 6"
              y="18"
              class="fill-foreground text-[11px] font-semibold"
            >
              {{ tick.label }}
            </text>
            <text
              v-if="tick.showHour"
              :x="tick.x"
              y="34"
              text-anchor="middle"
              class="fill-muted-foreground text-[9px]"
            >
              {{ tick.hourOfDay }}
            </text>
          </g>

          <rect
            v-for="period in freeTimeBands"
            :key="`free-${period.eventId}-${period.startedAt}`"
            :x="period.startX"
            y="40"
            :width="Math.max(2, period.endX - period.startX)"
            height="130"
            class="fill-emerald-400/20 dark:fill-emerald-500/15"
          />

          <g
            v-for="violation in violationBands"
            :key="`violation-${violation.type}-${violation.eventId}-${violation.startedAt}`"
            class="cursor-pointer"
            @click="selectEvent(violation.eventId)"
          >
            <rect
              :x="violation.startX"
              y="40"
              :width="Math.max(2, violation.endX - violation.startX)"
              height="130"
              class="fill-red-400/20 stroke-red-500/70 dark:fill-red-500/15"
            />
            <text
              v-if="violation.endX - violation.startX >= 80"
              :x="violation.startX + 5"
              y="50"
              class="fill-red-700 text-[8px] font-semibold dark:fill-red-300"
            >
              {{ violation.shortTitle }}
            </text>
            <title>{{ violation.title }}</title>
          </g>

          <rect
            v-for="segment in dutySegments"
            :key="`column-${segment.eventId}`"
            :x="segment.startX"
            :width="Math.max(1, segment.endX - segment.startX)"
            y="40"
            height="130"
            fill="transparent"
            class="cursor-pointer"
            pointer-events="all"
            @click="selectEvent(segment.eventId)"
            @contextmenu.prevent.stop="boostSelect(segment.eventId)"
          >
            <title>{{ segment.title }}</title>
          </rect>

          <g
            v-for="marker in graphMarkers"
            :key="marker.key"
            class="cursor-pointer"
            @click="selectEvent(marker.eventId)"
            @contextmenu.prevent.stop="boostSelect(marker.eventId)"
          >
            <line
              v-if="marker.stackIndex === 0"
              :x1="marker.x"
              :x2="marker.x"
              y1="40"
              y2="170"
              :stroke="marker.color"
              :stroke-width="marker.eventId === selectedEventId ? 2.5 : 1.5"
              stroke-dasharray="3 3"
              opacity="0.85"
            />
            <circle
              v-if="marker.compact && !markerIsExpanded(marker)"
              :cx="marker.iconX"
              cy="181"
              r="2.75"
              :fill="marker.color"
            />
            <component
              v-else
              :is="marker.icon"
              :x="marker.iconX - 7"
              y="174"
              :size="14"
              :color="marker.color"
              :stroke-width="marker.eventId === selectedEventId ? 3 : 2"
              pointer-events="none"
            />
            <rect
              :x="marker.iconX - 7"
              y="171"
              width="14"
              height="19"
              fill="transparent"
              pointer-events="all"
              @mouseenter="revealMarker(marker.key)"
              @mouseleave="hideMarkerLater(marker.key)"
              @click.stop="selectMarker(marker)"
            />
            <title>{{ marker.title }}</title>
          </g>

          <rect
            v-for="segment in selectedSegments"
            :key="`selected-${segment.eventId}`"
            :x="segment.startX"
            :y="segment.y - 13"
            :width="Math.max(4, segment.endX - segment.startX)"
            height="26"
            rx="4"
            class="fill-amber-200/60 stroke-amber-500/70 dark:fill-amber-500/25"
          />
          <g v-for="segment in boostSegments" :key="`boost-${segment.eventId}`">
            <rect
              :x="segment.startX"
              :y="segment.y - 13"
              :width="Math.max(4, segment.endX - segment.startX)"
              height="26"
              rx="4"
              class="fill-blue-500/10 stroke-blue-500/60"
            />
          </g>

          <path
            v-if="dutyPath"
            :d="dutyPath"
            fill="none"
            stroke="#465A95"
            stroke-width="3"
            stroke-linejoin="round"
          />
          <line
            v-for="segment in specialDutySegments"
            :key="`special-${segment.eventId}`"
            :x1="segment.startX"
            :x2="segment.endX"
            :y1="segment.y"
            :y2="segment.y"
            :stroke="segment.specialKind === 'PC' ? '#7C3AED' : '#D97706'"
            stroke-width="4"
            stroke-dasharray="7 4"
          />

          <g
            v-for="segment in dutySegments"
            :key="`segment-${segment.eventId}`"
            class="cursor-pointer"
            @click="selectEvent(segment.eventId)"
            @contextmenu.prevent.stop="boostSelect(segment.eventId)"
          >
            <text
              v-if="segment.showLabels && segment.durationLabel"
              :x="segment.labelX"
              :y="segment.y - 7"
              text-anchor="middle"
              class="fill-[#465A95] text-[10px] font-semibold dark:fill-[#9BA9D2]"
              style="
                paint-order: stroke;
                stroke: hsl(var(--background));
                stroke-width: 3px;
                stroke-linejoin: round;
              "
            >
              {{ segment.durationLabel }}
            </text>
            <text
              v-if="segment.showLabels && segment.speedLabel"
              :x="segment.labelX"
              :y="segment.y + 15"
              text-anchor="middle"
              class="fill-[#465A95] text-[10px] font-semibold dark:fill-[#9BA9D2]"
              style="
                paint-order: stroke;
                stroke: hsl(var(--background));
                stroke-width: 3px;
                stroke-linejoin: round;
              "
            >
              {{ segment.speedLabel }}
            </text>
            <text
              v-if="segment.showLabels && segment.milesLabel"
              :x="segment.labelX"
              :y="segment.y + 26"
              text-anchor="middle"
              class="fill-[#465A95] text-[10px] font-semibold dark:fill-[#9BA9D2]"
              style="paint-order: stroke; stroke: hsl(var(--background)); stroke-width: 3px"
            >
              {{ segment.milesLabel }}
            </text>
            <rect
              :x="segment.startX"
              :y="segment.y - 13"
              :width="Math.max(3, segment.endX - segment.startX)"
              height="26"
              fill="transparent"
              pointer-events="all"
            >
              <title>{{ segment.title }}</title>
            </rect>
          </g>

          <circle
            v-for="point in dutyPoints"
            :key="`point-${point.id}`"
            :cx="point.x"
            :cy="point.y"
            r="3"
            fill="#465A95"
            stroke="white"
            stroke-width="1.5"
          >
            <title>{{ point.title }}</title>
          </circle>

          <g
            v-for="intermediate in intermediateLines"
            :key="`intermediate-${intermediate.eventId}`"
            class="cursor-pointer"
            @click.stop="selectEvent(intermediate.eventId)"
          >
            <line
              :x1="intermediate.x"
              :x2="intermediate.x"
              :y1="intermediate.y - 5"
              :y2="intermediate.y + 5"
              stroke="#2563EB"
              :stroke-width="intermediate.eventId === selectedEventId ? 7 : 4"
            />
            <rect
              :x="intermediate.x - 6"
              :y="intermediate.y - 10"
              width="12"
              height="20"
              fill="transparent"
              pointer-events="all"
            />
            <title>{{ intermediate.title }}</title>
          </g>

          <g v-if="coDriverPath" class="pointer-events-none opacity-50">
            <path :d="coDriverPath" fill="none" stroke="#64748B" stroke-width="2" stroke-linejoin="round" />
            <circle
              v-for="point in coDriverPoints"
              :key="`co-${point.event.id}`"
              :cx="point.x"
              :cy="point.y"
              r="3"
              fill="#64748B"
              stroke="white"
              stroke-width="1.5"
            >
              <title>{{ coDriverName || 'Co-driver' }} · {{ point.event.eventName }}</title>
            </circle>
          </g>
          <g v-if="reassignedSegments.length" class="pointer-events-none opacity-80">
            <path
              v-for="segment in reassignedSegments"
              :key="`reassigned-${segment.id}`"
              :d="`M ${segment.startX} ${segment.previousY} V ${segment.y} H ${segment.endX}`"
              fill="none"
              stroke="#D97706"
              stroke-width="2.5"
              stroke-dasharray="5 4"
              stroke-linejoin="round"
            />
          </g>
          <text
            v-if="!dutyPath && !coDriverPath"
            :x="plotWidth / 2"
            y="104"
            text-anchor="middle"
            class="fill-muted-foreground text-xs"
          >
            No active duty-status events in this period
          </text>
        </svg>
      </div>

      <svg
        :viewBox="`0 0 62 ${chartHeight}`"
        :style="{ height: `${chartHeight}px` }"
        class="w-[62px] bg-white dark:bg-card"
      >
        <text x="31" y="18" text-anchor="middle" class="fill-foreground text-[10px] font-semibold">
          {{ visibleDayLabel }}
        </text>
        <text
          v-for="(total, index) in visibleDayTotals"
          :key="statusLabels[index]"
          x="31"
          :y="statusY[index] + 4"
          text-anchor="middle"
          class="fill-muted-foreground font-mono text-[10px]"
        >
          {{ total }}
        </text>
      </svg>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Loader2, Minus, Plus } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import CLogGraphMarkerSettings from '../../[Id]/components/detail/CLogGraphMarkerSettings.vue'
import { useRouteEldLogGraphMarkers } from '../../[Id]/composables/useRouteEldLogGraphMarkers'
import type {
  RouteEldCalculatedViolation,
  RouteEldEvent,
  RouteEldEventIssue,
} from '../../[Id]/types/routeEldDetail'
import type { RouteEldHosEvent, RouteEldScheduleCalculations } from '../types/boost'
import { resolveRouteEldScheduleTimeZone } from '../composables/useScheduleBoost'

const props = withDefaults(
  defineProps<{
    events?: RouteEldHosEvent[]
    fromDate: string
    toDate: string
    timeZone?: string | null
    sessionCreatedAt?: string | null
    selectedEventId?: string | null
    boostSelectedIds?: string[]
    freeTimes?: RouteEldScheduleCalculations['freeTimes']
    violations?: RouteEldScheduleCalculations['violations']
    eventIssues?: RouteEldScheduleCalculations['eventIssues']
    reassignedEvents?: RouteEldHosEvent[]
    coDriverEvents?: RouteEldHosEvent[]
    coDriverName?: string | null
    isGraphLoading?: boolean
    isCoDriverLoading?: boolean
  }>(),
  {
    events: () => [],
    timeZone: 'CT',
    sessionCreatedAt: null,
    selectedEventId: null,
    boostSelectedIds: () => [],
    freeTimes: () => [],
    violations: () => [],
    eventIssues: () => [],
    reassignedEvents: () => [],
    coDriverEvents: () => [],
    coDriverName: null,
    isGraphLoading: false,
    isCoDriverLoading: false,
  }
)
const emit = defineEmits<{
  'selected-event': [eventId: string]
  'boost-select': [eventId: string]
}>()
const statusLabels = ['OFF', 'SB', 'D', 'ON'] as const
const statusY = [58, 93, 128, 163]
const baseDayWidth = 220
const zoom = ref(1)
const scroller = ref<HTMLElement | null>(null)
const viewportWidth = ref(baseDayWidth)
const visibleDayIndex = ref(0)
let resizeObserver: ResizeObserver | null = null
let visibleDayUpdateTimer: ReturnType<typeof setTimeout> | null = null
const expandedMarkerKeys = ref(new Set<string>())
const markerExpansionTimers = new Map<string, ReturnType<typeof setTimeout>>()

const days = computed(() => {
  const result: string[] = []
  if (!props.fromDate || !props.toDate) return result
  const cursor = new Date(`${props.fromDate}T00:00:00Z`)
  const end = new Date(`${props.toDate}T00:00:00Z`)
  while (cursor <= end) {
    result.push(cursor.toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return result
})
const dayWidth = computed(() => Math.max(baseDayWidth, viewportWidth.value) * zoom.value)
const plotWidth = computed(() => Math.max(days.value.length, 1) * dayWidth.value)
const totalHours = computed(() => days.value.length * 24)
const graphTimeZone = computed(() => props.timeZone || props.events[0]?.timeZone || 'CT')
const chartHeight = 190
const periodEndTimestamp = computed(() => {
  if (!props.toDate) return Date.now()
  return zonedTimestamp(`${nextDate(props.toDate)}T00:00:00`, graphTimeZone.value)
})
const graphEndTimestamp = computed(() => {
  const created = props.sessionCreatedAt ? Date.parse(props.sessionCreatedAt) : Number.NaN
  return Math.min(
    Date.now(),
    Number.isFinite(created) ? created : Number.POSITIVE_INFINITY,
    periodEndTimestamp.value
  )
})
const hourTicks = computed(() =>
  Array.from({ length: totalHours.value + 1 }, (_, hour) => {
    const dayIndex = Math.min(Math.floor(hour / 24), Math.max(days.value.length - 1, 0))
    const hourOfDay = hour % 24
    return {
      hour,
      hourOfDay,
      x: (hour / 24) * dayWidth.value,
      isDay: hourOfDay === 0,
      showHour: hour < totalHours.value,
      label: hour < totalHours.value ? formatDay(days.value[dayIndex] ?? '') : '',
    }
  })
)

const activeDutyEvents = computed(() =>
  props.events
    .filter(
      (event) =>
        event.recordStatus === 'ACTIVE' &&
        statusLabels.includes(event.eventCategory as (typeof statusLabels)[number])
    )
    .map((event) => ({ event, x: eventX(event), y: categoryY(event.eventCategory) }))
    .filter((point) => point.x >= 0 && point.x <= plotWidth.value)
    .sort((a, b) => a.event.timestamp - b.event.timestamp || a.event.id.localeCompare(b.event.id))
)
const lastEndX = computed(() =>
  Math.min(plotWidth.value, Math.max(0, timeX(graphEndTimestamp.value, graphTimeZone.value)))
)
const dutySegments = computed(() =>
  activeDutyEvents.value.map((point, index) => {
    const next = activeDutyEvents.value[index + 1]
    const endX = Math.max(point.x, next?.x ?? lastEndX.value)
    const duration = Math.max(
      0,
      (next?.event.timestamp ?? graphEndTimestamp.value) - point.event.timestamp
    )
    const mileage =
      next && point.event.odometerMiles != null && next.event.odometerMiles != null
        ? next.event.odometerMiles - point.event.odometerMiles
        : null
    const durationLabel = formatSegmentDuration(duration)
    const speedLabel =
      mileage == null || mileage <= 0 || duration <= 0
        ? null
        : `${(mileage / (duration / 3600000)).toFixed(1)} mph`
    const milesLabel =
      mileage == null || mileage <= 0
        ? null
        : `${Number.isInteger(mileage) ? mileage.toFixed(0) : mileage.toFixed(1)} mi`
    return {
      eventId: point.event.id,
      startX: point.x,
      endX,
      y: point.y,
      specialKind: personalUseCodes.has(point.event.eventCode)
        ? 'PC'
        : yardMoveCodes.has(point.event.eventCode)
          ? 'YM'
          : null,
      labelX: (point.x + endX) / 2,
      showLabels: endX - point.x >= 42,
      durationLabel,
      speedLabel,
      milesLabel,
      title: [
        point.event.eventName,
        formatEventTime(point.event),
        durationLabel,
        speedLabel,
        milesLabel,
      ]
        .filter(Boolean)
        .join(' · '),
    }
  })
)
const dutyPath = computed(() => {
  const points = activeDutyEvents.value
  if (!points.length) return ''
  let path = `M ${points[0].x} ${points[0].y}`
  for (let index = 1; index < points.length; index += 1)
    path += ` H ${points[index].x} V ${points[index].y}`
  return `${path} H ${lastEndX.value}`
})
const dutyPoints = computed(() =>
  activeDutyEvents.value.map(({ event, x, y }) => ({
    id: event.id,
    x,
    y,
    title: `${event.eventName} · ${formatEventTime(event)}`,
  }))
)
const intermediateLines = computed(() => {
  const dutyTimeline = props.events
    .filter((event) =>
      event.recordStatus === 'ACTIVE' &&
      !isIntermediate(event) &&
      statusLabels.includes(event.eventCategory as (typeof statusLabels)[number])
    )
    .sort((first, second) => first.timestamp - second.timestamp || first.id.localeCompare(second.id))
  return props.events
    .filter((event) => event.recordStatus === 'ACTIVE' && isIntermediate(event))
    .filter((event) =>
      dutyTimeline.findLast((dutyEvent) => dutyEvent.timestamp <= event.timestamp)?.eventCategory === 'D'
    )
    .map((event) => ({
      eventId: event.id,
      x: eventX(event),
      y: categoryY('D'),
      title: `${event.eventName} · ${formatEventTime(event)}`,
    }))
    .filter((event) => event.x >= 0 && event.x <= plotWidth.value)
})

function isIntermediate(event: RouteEldHosEvent) {
  return ['LOG_NORMAL_PRECISION', 'LOG_REDUCED_PRECISION', 'ILC', 'ILR', 'INTERMEDIATE_CLP', 'INTERMEDIATE_RLP']
    .includes(event.eventCode.toUpperCase())
}
const coDriverPoints = computed(() =>
  props.coDriverEvents
    .filter((event) => event.recordStatus === 'ACTIVE' && statusLabels.includes(event.eventCategory as (typeof statusLabels)[number]))
    .map((event) => ({ event, x: eventX(event), y: categoryY(event.eventCategory) }))
    .filter((point) => point.x >= 0 && point.x <= plotWidth.value)
    .sort((a, b) => a.event.timestamp - b.event.timestamp || a.event.id.localeCompare(b.event.id))
)
const coDriverPath = computed(() => {
  const points = coDriverPoints.value
  if (!points.length) return ''
  let path = `M ${points[0].x} ${points[0].y}`
  for (let index = 1; index < points.length; index += 1) path += ` H ${points[index].x} V ${points[index].y}`
  const lastDayEnd = Math.min(plotWidth.value, (Math.floor(points.at(-1)!.x / dayWidth.value) + 1) * dayWidth.value)
  return `${path} H ${lastDayEnd}`
})
const reassignedSegments = computed(() => {
  const reassigned = props.reassignedEvents
    .filter((event) => event.recordStatus === 'ACTIVE' && statusLabels.includes(event.eventCategory as (typeof statusLabels)[number]))
  const reassignedIds = new Set(reassigned.map((event) => event.id))
  const timeline = [...new Map([...props.events, ...reassigned].map((event) => [event.id, event])).values()]
    .filter((event) => event.recordStatus === 'ACTIVE' && statusLabels.includes(event.eventCategory as (typeof statusLabels)[number]))
    .map((event) => ({ event, x: eventX(event), y: categoryY(event.eventCategory) }))
    .filter((point) => point.x >= 0 && point.x <= plotWidth.value)
    .sort((a, b) => a.event.timestamp - b.event.timestamp || a.event.id.localeCompare(b.event.id))
  return timeline.flatMap((point, index) => reassignedIds.has(point.event.id)
    ? [{ id: point.event.id, startX: point.x, endX: Math.max(point.x, timeline[index + 1]?.x ?? lastEndX.value), previousY: timeline[index - 1]?.y ?? point.y, y: point.y }]
    : [])
})
const specialDutySegments = computed(() =>
  dutySegments.value.filter((segment) => segment.specialKind)
)
const selectedSegments = computed(() =>
  props.selectedEventId
    ? dutySegments.value.filter((segment) => segment.eventId === props.selectedEventId)
    : []
)
const boostSegments = computed(() =>
  dutySegments.value.filter((segment) => props.boostSelectedIds.includes(segment.eventId))
)
const freeTimeBands = computed(() =>
  props.freeTimes
    .map((period) => ({
      ...period,
      startX: Math.max(0, timeX(period.startedAt, graphTimeZone.value)),
      endX: Math.min(plotWidth.value, timeX(period.endedAt, graphTimeZone.value)),
    }))
    .filter((period) => period.startX < plotWidth.value && period.endX > period.startX)
)
const violationBands = computed(() =>
  props.violations
    .map((violation) => ({
      ...violation,
      startX: Math.max(0, timeX(violation.startedAt, graphTimeZone.value)),
      endX: Math.min(plotWidth.value, timeX(violation.endedAt, graphTimeZone.value)),
      shortTitle: violation.title.replace(' limit', ''),
    }))
    .filter((violation) => violation.startX < plotWidth.value && violation.endX > violation.startX)
)

const markerEvents = computed(() => props.events as unknown as RouteEldEvent[])
const markerIssues = computed(() => props.eventIssues as unknown as RouteEldEventIssue[])
const markerViolations = computed(
  () => props.violations as unknown as RouteEldCalculatedViolation[]
)
const { markerOptions, markerSettings, graphMarkers, setMarkerEnabled, setAllMarkersEnabled } =
  useRouteEldLogGraphMarkers({
    events: markerEvents,
    eventIssues: markerIssues,
    violations: markerViolations,
    graphWidth: 100000,
    eventX: (event) => timeX(event.timestamp, graphTimeZone.value),
    formatEventTime: (event) => formatEventTime(event as RouteEldHosEvent),
  })

const visibleDayLabel = computed(() => formatDay(days.value[visibleDayIndex.value] ?? ''))
const visibleDayTotals = computed(() => {
  const start = visibleDayIndex.value * dayWidth.value
  const end = start + dayWidth.value
  return statusLabels.map((_, index) => {
    const pixels = dutySegments.value
      .filter((segment) => segment.y === statusY[index])
      .reduce(
        (sum, segment) =>
          sum + Math.max(0, Math.min(segment.endX, end) - Math.max(segment.startX, start)),
        0
      )
    return ((pixels / dayWidth.value) * 24).toFixed(2).padStart(5, '0')
  })
})

watch(
  () => [props.fromDate, props.toDate],
  () => {
    zoom.value = 1
    nextTick(scrollToLatestDay)
  }
)
onMounted(() => {
  const element = scroller.value
  if (!element) return
  viewportWidth.value = graphViewportWidth(element)
  resizeObserver = new ResizeObserver(resizeGraph)
  resizeObserver.observe(element.parentElement ?? element)
  requestAnimationFrame(() => {
    resizeGraph()
    nextTick(scrollToLatestDay)
  })
})
onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  if (visibleDayUpdateTimer) clearTimeout(visibleDayUpdateTimer)
  markerExpansionTimers.forEach(clearTimeout)
})

function selectEvent(eventId: string) {
  emit('selected-event', eventId)
}
function boostSelect(eventId: string) {
  emit('boost-select', eventId)
}
function markerIsExpanded(marker: { compact: boolean; eventId: string; key: string }) {
  return (
    !marker.compact ||
    marker.eventId === props.selectedEventId ||
    expandedMarkerKeys.value.has(marker.key)
  )
}
function revealMarker(key: string) {
  const timer = markerExpansionTimers.get(key)
  if (timer) clearTimeout(timer)
  markerExpansionTimers.delete(key)
  expandedMarkerKeys.value = new Set(expandedMarkerKeys.value).add(key)
}
function hideMarkerLater(key: string) {
  const timer = setTimeout(() => {
    const next = new Set(expandedMarkerKeys.value)
    next.delete(key)
    expandedMarkerKeys.value = next
    markerExpansionTimers.delete(key)
  }, 300)
  markerExpansionTimers.set(key, timer)
}
function selectMarker(marker: { key: string; eventId: string }) {
  revealMarker(marker.key)
  hideMarkerLater(marker.key)
  selectEvent(marker.eventId)
}
function scrollToEventSegment(eventId: string) {
  const segment = dutySegments.value.find((item) => item.eventId === eventId)
  const marker = graphMarkers.value.find((item) => item.eventId === eventId)
  const intermediate = intermediateLines.value.find((item) => item.eventId === eventId)
  const element = scroller.value
  if ((!segment && !marker && !intermediate) || !element) return false
  const x = segment ? (segment.startX + segment.endX) / 2 : (marker?.x ?? intermediate!.x)
  element.scrollTo({ left: Math.max(0, x - element.clientWidth / 2), behavior: 'smooth' })
  return true
}
defineExpose({ scrollToEventSegment })
function panWithWheel(event: WheelEvent) {
  const element = scroller.value
  if (!element || element.scrollWidth <= element.clientWidth) return
  event.preventDefault()
  element.scrollLeft +=
    Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
}
function scheduleVisibleDayUpdate() {
  if (visibleDayUpdateTimer) return
  visibleDayUpdateTimer = setTimeout(() => {
    visibleDayUpdateTimer = null
    updateVisibleDay()
  }, 80)
}
function updateVisibleDay() {
  const element = scroller.value
  if (!element || !days.value.length) return
  visibleDayIndex.value = Math.min(
    days.value.length - 1,
    Math.floor(Math.max(0, element.scrollLeft + element.clientWidth - 2) / dayWidth.value)
  )
}
function scrollToLatestDay() {
  const element = scroller.value
  if (!element) return
  element.scrollLeft = Math.max(0, days.value.length - 2) * dayWidth.value
  updateVisibleDay()
}
function resizeGraph() {
  const element = scroller.value
  if (!element || element.clientWidth <= 0) return
  const leftDay = element.scrollLeft / dayWidth.value
  viewportWidth.value = graphViewportWidth(element)
  nextTick(() => {
    element.scrollLeft = leftDay * dayWidth.value
    updateVisibleDay()
  })
}
function graphViewportWidth(element: HTMLElement) {
  return Math.max(baseDayWidth, (element.parentElement?.clientWidth ?? element.clientWidth) - 116)
}
function changeZoom(delta: number) {
  const element = scroller.value
  const centerDay = element ? (element.scrollLeft + element.clientWidth / 2) / dayWidth.value : 0
  zoom.value = Math.min(2.5, Math.max(0.75, zoom.value + delta))
  nextTick(() => {
    if (element) element.scrollLeft = centerDay * dayWidth.value - element.clientWidth / 2
    updateVisibleDay()
  })
}
function timeX(timestamp: number, timeZone: string | null) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: resolveRouteEldScheduleTimeZone(timeZone),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(timestamp))
  const part = (type: string) => Number(parts.find((item) => item.type === type)?.value ?? 0)
  const localDate = `${part('year')}-${String(part('month')).padStart(2, '0')}-${String(part('day')).padStart(2, '0')}`
  let dayIndex = days.value.indexOf(localDate)
  if (dayIndex < 0 && localDate === nextDate(props.toDate)) dayIndex = days.value.length
  if (dayIndex < 0) return -1
  return (
    (dayIndex + (part('hour') + part('minute') / 60 + part('second') / 3600) / 24) * dayWidth.value
  )
}
function eventX(event: RouteEldHosEvent) {
  return timeX(event.timestamp, graphTimeZone.value)
}
function categoryY(category: string) {
  return statusY[Math.max(statusLabels.indexOf(category as (typeof statusLabels)[number]), 0)]
}
function formatDay(value: string) {
  return value
    ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(
        new Date(`${value}T00:00:00Z`)
      )
    : ''
}
function formatEventTime(event: RouteEldHosEvent) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: resolveRouteEldScheduleTimeZone(event.timeZone),
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(event.timestamp))
}
function formatSegmentDuration(milliseconds: number) {
  const minutes = Math.max(0, Math.round(milliseconds / 60000))
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}
function nextDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}
function zonedTimestamp(value: string, timeZone: string | null) {
  const [datePart, timePart] = value.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hour, minute, second = 0] = timePart.split(':').map(Number)
  const target = Date.UTC(year, month - 1, day, hour, minute, second)
  let result = target
  for (let index = 0; index < 4; index += 1) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: resolveRouteEldScheduleTimeZone(timeZone),
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date(result))
    const part = (type: string) => Number(parts.find((item) => item.type === type)?.value ?? 0)
    const represented = Date.UTC(
      part('year'),
      part('month') - 1,
      part('day'),
      part('hour'),
      part('minute'),
      part('second')
    )
    const adjustment = target - represented
    if (!adjustment) return result
    result += adjustment
  }
  return result
}
const personalUseCodes = new Set(['DS_PC', 'DR_IND_PC'])
const yardMoveCodes = new Set(['DS_YM', 'DR_IND_YM'])
</script>
