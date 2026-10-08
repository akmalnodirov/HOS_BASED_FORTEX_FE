<template>
  <div class="flex w-full min-w-0 bg-white py-3 dark:bg-card">
    <div class="grid w-12 shrink-0 grid-rows-4 pt-6 text-xs font-semibold text-foreground">
      <span v-for="label in labels" :key="label" class="flex items-center justify-center">
        {{ label }}
      </span>
    </div>

    <div class="min-w-0 flex-1">
      <svg
        class="block h-[206px] w-full overflow-visible"
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

        <g v-for="event in graphEvents" :key="event.eventId">
          <line
            :x1="event.x1"
            :x2="event.x2"
            :y1="orderY(event.order)"
            :y2="orderY(event.order)"
            stroke="currentColor"
            :stroke-width="selectedEventId === event.eventId ? 7 : 4"
            :stroke-dasharray="event.order > 4 ? '8 5' : undefined"
            stroke-linecap="round"
            class="cursor-pointer text-[#465A95] transition-[stroke-width] dark:text-[#7588BF]"
            @click="emit('select-event', event.value)"
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
            v-if="event.order === 3 && event.x2 - event.x1 >= 58 && event.value.distanceMiles"
            :x="(event.x1 + event.x2) / 2"
            :y="orderY(event.order) + 14"
            text-anchor="middle"
            font-size="10"
            fill="currentColor"
            class="pointer-events-none text-[#465A95] dark:text-[#9BA9D2]"
          >
            {{ Math.round(event.value.distanceMiles) }}mi
          </text>
        </g>
      </svg>
    </div>

    <div class="grid w-18 shrink-0 grid-rows-4 pt-6 text-xs font-semibold text-foreground">
      <span v-for="value in totals" :key="value" class="flex items-center justify-center">
        {{ value }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type {
  DailySummaryResponse,
  GraphDuties,
  GraphResponse,
  GraphVerticalLines,
} from '../../types/chart'

const props = defineProps<{
  chartData: GraphResponse | null
  dailySummary?: DailySummaryResponse | null
  selectedEventId?: string | null
}>()

const emit = defineEmits<{
  'select-event': [event: GraphDuties]
}>()

const graphWidth = 1440
const graphHeight = 206
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

const totals = computed(() => [
  hours(props.dailySummary?.dailyOffDuty),
  hours(props.dailySummary?.dailySleeperBerth),
  hours(props.dailySummary?.dailyDriving),
  hours(props.dailySummary?.dailyOnDuty),
])

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

function hours(seconds?: number) {
  return `${((seconds ?? 0) / 3600).toFixed(2)} h`
}

function verticalKey(line: GraphVerticalLines) {
  return `${line.x1}-${line.eventOrders.join('-')}`
}
</script>
