<template>
  <div class="w-full min-w-0 bg-white dark:bg-card">
    <div class="flex items-center justify-end border-b border-border/60 px-3 py-2">
      <span class="mr-2 text-xs font-medium text-muted-foreground">Graph markers</span>
      <CLogGraphMarkerSettings
        :options="markerOptions"
        :model-value="markerSettings"
        @toggle="setMarkerEnabled"
        @toggle-all="setAllMarkersEnabled"
      />
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

          <g v-for="line in chartData?.verticalLines ?? []" :key="verticalKey(line)">
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
            v-for="event in graphEvents"
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
              :stroke-dasharray="event.order > 4 ? '8 5' : undefined"
              stroke-linecap="round"
              class="text-[#465A95] transition-[stroke-width] dark:text-[#7588BF]"
            />
            <text
              v-if="event.x2 - event.x1 >= 42"
              :x="(event.x1 + event.x2) / 2"
              :y="orderY(event.order) - 8"
              text-anchor="middle"
              font-size="11"
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
              font-size="10"
              fill="currentColor"
              class="pointer-events-none text-[#465A95] dark:text-[#9BA9D2]"
            >
              {{ speedMilesLabel(event.value) }}
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

          <g
            v-for="marker in intermediateMarkers"
            :key="`intermediate-${marker.event.id}`"
            class="cursor-pointer text-[#465A95] dark:text-[#9BA9D2]"
            @click="emit('select-event', marker.event)"
          >
            <title>{{ marker.title }}</title>
            <line
              :x1="marker.x"
              :x2="marker.x"
              :y1="orderY(3) - 5"
              :y2="orderY(3) + 5"
              stroke="currentColor"
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
        </svg>
      </div>

      <div
        class="grid h-[206px] w-18 shrink-0 self-start grid-rows-4 pt-6 text-xs font-semibold text-foreground"
      >
        <span v-for="value in totals" :key="value" class="flex items-center justify-center">
          {{ value }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue'
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
  }>(),
  {
    events: () => [],
    eventIssues: () => [],
    violations: () => [],
    dailySummary: null,
    selectedEventId: null,
    rangeStart: 0,
    rangeEnd: 0,
  }
)

const emit = defineEmits<{
  'select-event': [event: GraphDuties | RouteEldEvent]
}>()

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

const eventX = (event: Pick<RouteEldEvent, 'timestamp'>) => {
  const duration = props.rangeEnd - props.rangeStart
  if (duration <= 0) return 0
  return Math.min(
    graphWidth,
    Math.max(0, ((event.timestamp - props.rangeStart) / duration) * graphWidth)
  )
}

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
    if (event.recordStatus === 'ACTIVE' && ['OFF', 'SB', 'D', 'ON'].includes(event.eventCategory)) {
      duty = event.eventCategory
      continue
    }
    if (event.recordStatus !== 'ACTIVE' || duty !== 'D' || !isIntermediate(event)) continue
    result.push({
      event,
      x: eventX(event),
      title: `Intermediate driving · ${formatMarkerTime(event)}`,
    })
  }
  return result
})

const totals = computed(() => [
  hours(props.dailySummary?.dailyOffDuty),
  hours(props.dailySummary?.dailySleeperBerth),
  hours(props.dailySummary?.dailyDriving),
  hours(props.dailySummary?.dailyOnDuty),
])

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

function speedMilesLabel(event: GraphDuties) {
  const miles = Math.max(0, event.distanceMiles ?? 0)
  const speed = event.speedMph ?? (event.duration > 0 ? miles / (event.duration / 3600) : 0)
  const milesText = Number.isInteger(miles) ? miles.toFixed(0) : miles.toFixed(1)
  return `${speed.toFixed(1)} mph · ${milesText} mi`
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
