<template>
  <div class="w-full min-w-0 bg-white dark:bg-card">
    <div class="flex items-center justify-end border-b border-border/60 px-3 py-2">
      <CLogViolations
        v-if="violations.length"
        :violations="violations"
        :events="events"
        @select-event="selectViolationEvent"
      />
      <div class="flex items-center" :class="violations.length ? 'ml-3' : ''">
        <span class="mr-2 text-xs font-medium text-muted-foreground">Graph markers</span>
        <CLogGraphMarkerSettings
          :options="markerOptions"
          :model-value="markerSettings"
          @toggle="setMarkerEnabled"
          @toggle-all="setAllMarkersEnabled"
        />
      </div>
    </div>

    <div class="flex w-full min-w-0 py-3">
      <div
        class="grid h-[206px] w-12 shrink-0 self-start grid-rows-4 pt-6 text-xs font-semibold text-foreground"
      >
        <span v-for="label in labels" :key="label" class="flex items-center justify-center">
          {{ label }}
        </span>
      </div>

      <div class="min-w-0 flex-1">
        <svg
          class="block h-[240px] w-full overflow-visible"
          :viewBox="`0 0 ${graphWidth} ${graphHeight}`"
          preserveAspectRatio="none"
          role="img"
          aria-label="Driver duty status graph"
        >
          <g class="text-muted-foreground">
            <text
              v-for="hour in 24"
              :key="`hour-${hour}`"
              :x="hourX(hour - 1) + hourWidth / 2"
              y="12"
              text-anchor="middle"
              font-size="11"
              fill="currentColor"
            >
              {{ hourLabel(hour - 1) }}
            </text>
          </g>

          <g stroke="currentColor" class="text-border">
            <line
              v-for="row in 5"
              :key="`row-${row}`"
              x1="0"
              :y1="chartTop + (row - 1) * rowHeight"
              :x2="graphWidth"
              :y2="chartTop + (row - 1) * rowHeight"
              stroke-width="1"
            />
            <line
              v-for="tick in 97"
              :key="`tick-${tick}`"
              :x1="((tick - 1) * graphWidth) / 96"
              :x2="((tick - 1) * graphWidth) / 96"
              :y1="chartTop"
              :y2="chartBottom"
              :stroke-width="(tick - 1) % 4 === 0 ? 1 : 0.5"
              :opacity="(tick - 1) % 4 === 0 ? 0.8 : 0.45"
            />
          </g>

          <g v-for="line in visibleVerticalLines" :key="verticalKey(line)">
            <line
              :x1="line.x1"
              :x2="line.x2"
              :y1="orderY(line.eventOrders[0])"
              :y2="orderY(line.eventOrders[1])"
              stroke="currentColor"
              class="text-[#465A95] dark:text-[#7588BF]"
              stroke-width="2"
            />
          </g>

          <g
            v-for="event in visibleGraphEvents"
            :key="event.eventId"
            class="cursor-pointer"
            @click="emit('select-event', event.value)"
          >
            <rect
              v-if="selectedEventId === event.eventId"
              :x="event.x1"
              :y="orderY(event.order) - 13"
              :width="Math.max(4, event.x2 - event.x1)"
              height="26"
              rx="4"
              class="pointer-events-none fill-amber-200/60 stroke-amber-500/70 dark:fill-amber-500/25"
              stroke-width="1"
            />
            <line
              :x1="event.x1"
              :x2="event.x2"
              :y1="orderY(event.order)"
              :y2="orderY(event.order)"
              stroke="currentColor"
              :stroke-width="selectedEventId === event.eventId ? 7 : 4"
              :stroke-dasharray="event.order > 4 || event.value.providerEventCode === 'DS_WT' ? '8 5' : undefined"
              stroke-linecap="round"
              class="text-[#465A95] transition-[stroke-width] dark:text-[#7588BF]"
            />
            <text
              v-if="event.x2 - event.x1 >= 42"
              :x="(event.x1 + event.x2) / 2"
              :y="orderY(event.order) - 8"
              text-anchor="middle"
              font-size="12"
              fill="currentColor"
              class="pointer-events-none text-[#465A95] dark:text-[#9BA9D2]"
            >
              {{ durationLabel(event.value.duration) }}
            </text>
            <text
              v-if="event.x2 - event.x1 >= 42 && event.value.distanceMiles"
              :x="(event.x1 + event.x2) / 2"
              :y="orderY(event.order) + 14"
              text-anchor="middle"
              font-size="12"
              fill="currentColor"
              class="pointer-events-none text-[#465A95] dark:text-[#9BA9D2]"
            >
              {{ milesLabel(event.value) }}
            </text>
            <text
              v-if="event.x2 - event.x1 >= 42 && event.value.distanceMiles"
              :x="(event.x1 + event.x2) / 2"
              :y="orderY(event.order) + 28"
              text-anchor="middle"
              font-size="12"
              fill="currentColor"
              class="pointer-events-none text-[#465A95] dark:text-[#9BA9D2]"
            >
              {{ speedLabel(event.value) }}
            </text>
            <rect
              :x="event.x1"
              :width="Math.max(1, event.x2 - event.x1)"
              :y="chartTop"
              :height="chartBottom - chartTop"
              fill="transparent"
              pointer-events="all"
            >
              <title>{{ segmentTitle(event.value) }}</title>
            </rect>
          </g>

          <g v-if="preview && preview.endX > preview.startX" class="pointer-events-none">
            <line v-if="preview.previousOrder && preview.previousOrder !== preview.order"
              :x1="preview.startX" :x2="preview.startX"
              :y1="orderY(preview.previousOrder)" :y2="orderY(preview.order)"
              class="stroke-primary/70" stroke-width="2" />
            <line :key="previewEventCode"
              :x1="preview.startX" :x2="preview.endX"
              :y1="orderY(preview.order)" :y2="orderY(preview.order)"
              class="insert-info-preview-line stroke-primary" stroke-width="5"
              :stroke-dasharray="preview.dashed ? '8 5' : undefined" stroke-linecap="round" />
            <line v-if="preview.nextOrder && preview.nextOrder !== preview.order"
              :x1="preview.endX" :x2="preview.endX"
              :y1="orderY(preview.order)" :y2="orderY(preview.nextOrder)"
              class="stroke-primary/70" stroke-width="2" />
            <title>Preview: {{ preview.label }} from the selected time until the next duty event</title>
          </g>

          <g
            v-for="violation in violationBands"
            :key="`violation-${violation.type}-${violation.eventId}-${violation.startedAt}`"
            class="cursor-pointer"
            @click.stop="selectViolationEvent(violation.eventId)"
          >
            <rect
              :x="violation.startX"
              :y="chartTop"
              :width="Math.max(2, violation.endX - violation.startX)"
              :height="chartBottom - chartTop"
              class="fill-red-400/20 stroke-red-500/70 dark:fill-red-500/15"
              :stroke-width="selectedEventId === violation.eventId ? 2 : 1"
            />
            <text
              v-if="violation.endX - violation.startX >= 80"
              :x="violation.startX + 5"
              :y="chartTop + 11"
              class="pointer-events-none fill-red-700 text-[10px] font-semibold dark:fill-red-300"
            >
              {{ violation.shortTitle }}
            </text>
            <title>{{ violation.title }}</title>
          </g>

          <g
            v-for="marker in intermediateMarkers"
            :key="`intermediate-${marker.event.id}`"
            class="cursor-pointer"
            @click="emit('select-event', marker.event)"
          >
            <title>{{ marker.title }}</title>
            <line
              :x1="marker.x"
              :x2="marker.x"
              :y1="orderY(3) - 5"
              :y2="orderY(3) + 5"
              stroke="#2563EB"
              :stroke-width="selectedEventId === marker.event.id ? 7 : 4"
            />
            <rect
              :x="marker.x - 6"
              :y="orderY(3) - 10"
              width="12"
              height="20"
              fill="transparent"
              pointer-events="all"
            />
          </g>

          <g
            v-for="marker in graphMarkers"
            :key="marker.key"
            class="cursor-pointer"
            @click="emit('select-event', marker.event)"
          >
            <title>{{ marker.title }}</title>
            <line
              v-if="marker.stackIndex === 0"
              :x1="marker.x"
              :x2="marker.x"
              :y1="chartTop"
              :y2="chartBottom"
              :stroke="marker.color"
              stroke-width="1.25"
              stroke-dasharray="4 4"
              opacity="0.8"
            />
            <circle
              v-if="marker.compact"
              :cx="marker.iconX"
              :cy="markerY"
              r="3"
              :fill="marker.color"
            />
            <component
              v-else
              :is="marker.icon"
              :x="marker.iconX - 9"
              :y="markerY - 9"
              :size="18"
              :color="marker.color"
              :stroke-width="selectedEventId === marker.eventId ? 3 : 2"
              pointer-events="none"
            />
            <rect
              :x="marker.iconX - 9"
              :y="markerY - 10"
              width="18"
              height="20"
              fill="transparent"
              pointer-events="all"
            />
          </g>
          <g v-if="selectTimeEnabled">
            <line
              v-if="selectedTimeSeconds !== null"
              :x1="selectedTimeSeconds / 86400 * graphWidth"
              :x2="selectedTimeSeconds / 86400 * graphWidth"
              :y1="chartTop"
              :y2="chartBottom"
              class="stroke-primary"
              stroke-width="2"
              stroke-dasharray="4 3"
              pointer-events="none"
            />
            <rect
              x="0"
              :y="chartTop"
              :width="graphWidth"
              :height="chartBottom - chartTop"
              fill="transparent"
              class="cursor-ew-resize touch-none"
              pointer-events="all"
              @pointerdown="startGraphDrag"
              @pointermove="moveGraphDrag"
              @pointerup="endGraphDrag"
              @pointercancel="endGraphDrag"
            />
          </g>
        </svg>
      </div>

      <div
        class="grid h-[206px] w-18 shrink-0 self-start grid-rows-4 pt-6 text-xs font-semibold text-foreground"
      >
        <span v-for="(value, index) in totals" :key="index" class="flex items-center justify-center">
          {{ value }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes insert-info-preview-appear {
  from { opacity: 0.35; stroke-width: 2; }
  to { opacity: 1; stroke-width: 5; }
}
.insert-info-preview-line { animation: insert-info-preview-appear 250ms ease-out; }
@media (prefers-reduced-motion: reduce) {
  .insert-info-preview-line { animation: none; }
}
</style>

<script setup lang="ts">
import { computed, ref, toRef } from 'vue'
import type {
  DailySummaryResponse,
  GraphDuties,
  GraphResponse,
  GraphVerticalLines,
} from '../../types/chart'
import type {
  RouteEldCalculatedViolation,
  RouteEldEvent,
  RouteEldEventIssue,
} from '../../types/routeEldDetail'
import { useRouteEldLogGraphMarkers } from '../../composables/useRouteEldLogGraphMarkers'
import CLogGraphMarkerSettings from './CLogGraphMarkerSettings.vue'
import CLogViolations from './CLogViolations.vue'

const props = withDefaults(
  defineProps<{
    chartData: GraphResponse | null
    dailySummary?: DailySummaryResponse | null
    selectedEventId?: string | null
    events?: RouteEldEvent[]
    eventIssues?: RouteEldEventIssue[]
    violations?: RouteEldCalculatedViolation[]
    rangeStart?: number
    rangeEnd?: number
    selectTimeEnabled?: boolean
    selectedTimeSeconds?: number | null
    previewEventCode?: string | null
  }>(),
  {
    events: () => [],
    eventIssues: () => [],
    violations: () => [],
    dailySummary: null,
    selectedEventId: null,
    rangeStart: 0,
    rangeEnd: 0,
    selectTimeEnabled: false,
    selectedTimeSeconds: null,
    previewEventCode: null,
  }
)

const emit = defineEmits<{
  'select-event': [event: GraphDuties | RouteEldEvent | { eventId: string }]
  'select-time': [seconds: number]
}>()

const draggingPointerId = ref<number | null>(null)

function updateGraphTime(event: PointerEvent) {
  const bounds = (event.currentTarget as SVGRectElement).getBoundingClientRect()
  if (!bounds?.width) return
  const ratio = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width))
  emit('select-time', Math.min(86340, Math.round(ratio * 1440) * 60))
}

function startGraphDrag(event: PointerEvent) {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  draggingPointerId.value = event.pointerId
  ;(event.currentTarget as SVGRectElement).setPointerCapture(event.pointerId)
  updateGraphTime(event)
}

function moveGraphDrag(event: PointerEvent) {
  if (draggingPointerId.value === event.pointerId) updateGraphTime(event)
}

function endGraphDrag(event: PointerEvent) {
  if (draggingPointerId.value !== event.pointerId) return
  updateGraphTime(event)
  draggingPointerId.value = null
  const target = event.currentTarget as SVGRectElement
  if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId)
}

const graphWidth = 1440
const graphHeight = 240
const chartTop = 24
const rowHeight = 44
const chartBottom = chartTop + rowHeight * 4
const hourWidth = graphWidth / 24
const labels = ['OFF', 'SB', 'D', 'ON']

const graphEvents = computed(() => {
  const duties = props.chartData?.duties
  if (!duties) return []
  return Object.entries(duties).flatMap(([order, events]) =>
    events.map((value) => ({
      order: Number(order),
      eventId: value.eventId,
      value,
      x1: value.x1,
      x2: value.x2,
    }))
  )
})

const previewDefinitions: Record<string, { order: number; label: string; dashed: boolean }> = {
  DS_OFF: { order: 1, label: 'Off duty', dashed: false },
  DS_SB: { order: 2, label: 'Sleeper', dashed: false },
  DS_D: { order: 3, label: 'Driving', dashed: false },
  DS_ON: { order: 4, label: 'On duty', dashed: false },
  DR_IND_YM: { order: 5, label: 'Yard move', dashed: true },
  DR_IND_PC: { order: 6, label: 'Personal conveyance', dashed: true },
  DS_WT: { order: 1, label: 'Waiting', dashed: true },
}

const preview = computed(() => {
  if (!props.selectTimeEnabled || props.selectedTimeSeconds === null || !props.previewEventCode) return null
  const definition = previewDefinitions[props.previewEventCode]
  if (!definition) return null
  const startX = Math.max(0, Math.min(graphWidth, props.selectedTimeSeconds / 86400 * graphWidth))
  const segments = graphEvents.value
  const nextStart = segments.map(event => event.x1).filter(x => x > startX + 0.01).sort((a, b) => a - b)[0]
  const lastEnd = Math.max(0, ...segments.map(event => event.x2))
  const endX = nextStart ?? (lastEnd > startX ? lastEnd : graphWidth)
  const current = segments.find(event => event.x1 < startX && event.x2 > startX)
    ?? segments.filter(event => event.x2 <= startX).sort((a, b) => b.x2 - a.x2)[0]
  const next = segments.find(event => Math.abs(event.x1 - endX) < 0.01)
  return {
    startX, endX, order: definition.order, label: definition.label, dashed: definition.dashed,
    previousOrder: current?.order ?? null, nextOrder: next?.order ?? null,
  }
})

const visibleGraphEvents = computed(() => {
  if (!preview.value) return graphEvents.value
  const { startX, endX } = preview.value
  return graphEvents.value.flatMap(event => {
    if (event.x1 >= startX && event.x1 < endX) return []
    if (event.x1 < startX && event.x2 > startX) {
      const fraction = (startX - event.x1) / (event.x2 - event.x1)
      return [{ ...event, x2: startX, value: {
        ...event.value, duration: event.value.duration * fraction,
        distanceMiles: event.value.distanceMiles === undefined ? undefined : event.value.distanceMiles * fraction,
      } }]
    }
    return [event]
  })
})

const visibleVerticalLines = computed(() => {
  const lines = props.chartData?.verticalLines ?? []
  if (!preview.value) return lines
  return lines.filter(line => line.x1 < preview.value!.startX || line.x1 > preview.value!.endX)
})

const eventX = (event: Pick<RouteEldEvent, 'timestamp'>) => {
  const duration = props.rangeEnd - props.rangeStart
  if (duration <= 0) return 0
  return Math.min(
    graphWidth,
    Math.max(0, ((event.timestamp - props.rangeStart) / duration) * graphWidth)
  )
}

const violationBands = computed(() =>
  props.violations
    .map((violation) => ({
      ...violation,
      startX: Math.max(0, eventX({ timestamp: violation.startedAt })),
      endX: Math.min(graphWidth, eventX({ timestamp: violation.endedAt })),
      shortTitle: violation.title.replace(' limit', ''),
    }))
    .filter((violation) => violation.startX < graphWidth && violation.endX > violation.startX)
)

const { markerOptions, markerSettings, graphMarkers, setMarkerEnabled, setAllMarkersEnabled } =
  useRouteEldLogGraphMarkers({
    events: toRef(props, 'events'),
    eventIssues: toRef(props, 'eventIssues'),
    violations: toRef(props, 'violations'),
    graphWidth,
    eventX,
    formatEventTime: formatMarkerTime,
  })

const intermediateMarkers = computed(() => {
  const sorted = [...props.events].sort(
    (left, right) => left.timestamp - right.timestamp || left.id.localeCompare(right.id)
  )
  let duty: RouteEldEvent['eventCategory'] | null = null
  const result: Array<{ event: RouteEldEvent; x: number; title: string }> = []
  for (const event of sorted) {
    if (event.recordStatus !== 'ACTIVE') continue
    if (isIntermediate(event)) {
      if (duty !== 'D') continue
      result.push({
        event,
        x: eventX(event),
        title: `Intermediate driving · ${formatMarkerTime(event)}`,
      })
      continue
    }
    if (['OFF', 'SB', 'D', 'ON'].includes(event.eventCategory)) {
      duty = event.eventCategory
    }
  }
  return result.filter((marker) => marker.x >= 0 && marker.x <= graphWidth)
})

const totals = computed(() => {
  const values = [props.dailySummary?.dailyOffDuty ?? 0, props.dailySummary?.dailySleeperBerth ?? 0,
    props.dailySummary?.dailyDriving ?? 0, props.dailySummary?.dailyOnDuty ?? 0]
  if (preview.value) {
    const { startX, endX, order } = preview.value
    for (const event of graphEvents.value) {
      const overlap = Math.max(0, Math.min(event.x2, endX) - Math.max(event.x1, startX))
      if (overlap > 0) values[event.order === 5 ? 3 : event.order === 6 ? 0 : event.order - 1] -= overlap / graphWidth * 86400
    }
    values[order === 5 ? 3 : order === 6 ? 0 : order - 1] += (endX - startX) / graphWidth * 86400
  }
  return values.map(value => hours(Math.max(0, value)))
})

function isIntermediate(event: RouteEldEvent) {
  const code = event.eventCode.toUpperCase()
  return [
    'LOG_NORMAL_PRECISION',
    'LOG_REDUCED_PRECISION',
    'ILC',
    'ILR',
    'INTERMEDIATE_CLP',
    'INTERMEDIATE_RLP',
  ].includes(code)
}

const markerY = chartBottom + 12

function formatMarkerTime(event: RouteEldEvent) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: markerTimeZone(event.timeZone),
    hour: 'numeric',
    minute: '2-digit',
  }).format(event.timestamp)
}

function markerTimeZone(code?: string | null) {
  return (
    (
      {
        ET: 'America/New_York',
        CT: 'America/Chicago',
        MT: 'America/Denver',
        PT: 'America/Los_Angeles',
        AT: 'America/Halifax',
        NT: 'America/St_Johns',
        AKT: 'America/Anchorage',
        HT: 'Pacific/Honolulu',
        AZ: 'America/Phoenix',
        SK: 'America/Regina',
      } as Record<string, string>
    )[code?.trim().toUpperCase() ?? ''] ?? 'America/Chicago'
  )
}

function selectViolationEvent(eventId: string) {
  emit('select-event', { eventId })
}

function orderY(order: number) {
  if (order === 5) return chartTop + rowHeight * 3.5
  if (order === 6) return chartTop + rowHeight * 0.5
  return chartTop + rowHeight * (Math.min(4, Math.max(1, order)) - 0.5)
}

function hourX(hour: number) {
  return hour * hourWidth
}

function hourLabel(hour: number) {
  if (hour === 0) return 'M'
  if (hour === 12) return 'N'
  return hour > 12 ? hour - 12 : hour
}

function durationLabel(seconds: number) {
  const minutes = Math.max(0, Math.round(seconds / 60))
  const hour = Math.floor(minutes / 60)
  const minute = minutes % 60
  if (!hour) return `${minute}m`
  return minute ? `${hour}h ${minute}m` : `${hour}h`
}

function speedLabel(event: GraphDuties) {
  return `${segmentSpeed(event).toFixed(1)} mph`
}

function milesLabel(event: GraphDuties) {
  const miles = segmentMiles(event)
  return `${Number.isInteger(miles) ? miles.toFixed(0) : miles.toFixed(1)} mi`
}

function speedMilesLabel(event: GraphDuties) {
  return `${speedLabel(event)} · ${milesLabel(event)}`
}

function segmentMiles(event: GraphDuties) {
  return Math.max(0, Number(event.distanceMiles) || 0)
}

function segmentSpeed(event: GraphDuties) {
  const miles = segmentMiles(event)
  const explicitSpeed = Number(event.speedMph)
  return Number.isFinite(explicitSpeed)
    ? Math.max(0, explicitSpeed)
    : event.duration > 0
      ? miles / (event.duration / 3600)
      : 0
}

function segmentTitle(event: GraphDuties) {
  const rawEvent = props.events.find((item) => item.id === event.eventId)
  const details = [durationLabel(event.duration)]
  if (event.distanceMiles) details.push(speedMilesLabel(event))
  return [rawEvent?.eventName, rawEvent ? formatMarkerTime(rawEvent) : null, ...details]
    .filter(Boolean)
    .join(' · ')
}

function hours(seconds?: number) {
  return `${((seconds ?? 0) / 3600).toFixed(2)} h`
}

function verticalKey(line: GraphVerticalLines) {
  return `${line.x1}-${line.eventOrders.join('-')}`
}
</script>
