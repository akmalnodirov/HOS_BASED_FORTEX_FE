<template>
  <div>
    <!-- Chart Section -->
    <div class="bg-white dark:bg-card">
      <div v-if="isGraphLoading" class="flex items-center justify-center p-8">
        <div class="text-muted-foreground">Loading chart...</div>
      </div>
      <MainChart
        v-else-if="chartData && Object.keys(chartData).length > 0"
        ref="mainChartRef"
        @container:update="handleChartUpdate"
        @selected-event="handleSelectedEvent"
        @selected-events="handleSelectedEvents"
        :loading="isGraphLoading"
        :chart-data="chartDataWithDates"
        :daily-summary="dailySummary || undefined"
        :violations="(dailyPixelViolations || []) as any"
        :all-violations="allViolations"
        :free-times="freeTimes"
        :able-to-boost="true"
      />
      <div v-else class="flex flex-col items-center justify-center p-8 space-y-2">
        <div class="text-muted-foreground">No chart data available</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Dayjs } from 'dayjs'
import MainChart from '@/modules/ELD/LogsModule/[Id]/components/chart/MainChart.vue'
import type {
  GraphResponse,
  DailySummaryResponse,
} from '@/modules/ELD/LogsModule/[Id]/types/chart.ts'
import type { BoostFreeTime } from '@/modules/ELD/LogsModule/[Id]/types/chart.ts'
import type { GraphDuties } from '@/modules/ELD/LogsModule/[Id]/types/chart.ts'
import { useTimeZoneHelper } from '@/composables/useTimezone.ts'

// Chart ref
const mainChartRef = ref<InstanceType<typeof MainChart> | null>(null)

interface Props {
  chartData?: GraphResponse | null
  dailySummary?: DailySummaryResponse | null
  dailyPixelViolations?: any[]
  pinTimes?: any[]
  headerDate?: [Dayjs, Dayjs] | null
  freeTimes?: BoostFreeTime[]
  isGraphLoading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  chartData: null,
  dailySummary: null,
  dailyPixelViolations: () => [],
  pinTimes: () => [],
  headerDate: null,
  freeTimes: () => [],
  isGraphLoading: false,
})

const { getStartOf, getEndOf } = useTimeZoneHelper()

// Violation description → reset type mapping (ported from RouteAppFE)
const VIOLATION_RESET_TYPE: Record<string, string> = {
  '14 - Hour on duty limit': '10h',
  '11 - Hour on driving limit': '10h',
  '30 Minutes rest break': '10h',
  'USA 70/8 - cycle limit': '34h',
}

/**
 * Port of getEventViolationsBlock from RouteAppFE/utils/violation.ts.
 * Given flat pixel violations and reset pin-times, computes [start, width]
 * blocks for a specific violation description / reset type pair.
 */
function computeViolationBlocks(
  allViolations: any[],
  stringType: string,
  resetType: string,
  pinTimesRaw: any[],
  headerDateStr: string,
  endTimeStr: string,
): [number, number][] {
  // Filter violations of the requested type
  const curr = allViolations.filter((v: any) => v?.description === stringType)
  if (!curr.length) return []

  // Sort violations chronologically
  curr.sort((a: any, b: any) => {
    const ta = String(a.startedAt)
    const tb = String(b.startedAt)
    return ta < tb ? -1 : ta > tb ? 1 : 0
  })

  // For cycle violations, only use 34h pin times; otherwise use all
  const pins =
    resetType === '34h'
      ? pinTimesRaw.filter((p: any) => p?.type === resetType)
      : [...pinTimesRaw]

  pins.sort((a: any, b: any) => {
    const ta = String(a.time)
    const tb = String(b.time)
    return ta < tb ? -1 : ta > tb ? 1 : 0
  })

  const result: [number, number][] = []
  let i = 0
  let j = 0
  const n = curr.length
  const m = pins.length

  while (i < n && j < m) {
    const startPixel: number = curr[i].position

    // Advance to the next pin time that is AFTER this violation
    while (j < m && String(pins[j]?.time) < String(curr[i].startedAt)) {
      j++
    }
    if (j >= m) break

    const endPixel: number = pins[j]?.prevPosition ?? startPixel
    result.push([startPixel, Math.max(endPixel - startPixel, 4)])

    // Skip all violations that are resolved by this same pin time
    while (i < n && String(curr[i].startedAt) <= String(pins[j]?.time)) {
      i++
    }
    j++
  }

  // Any remaining violations have no subsequent pin time – extend to chart end
  if (i < n) {
    const startPixel: number = curr[i].position
    // Approximate end: (endTime - resetType hours) proportional to violation position
    try {
      const headerSec = new Date(headerDateStr).getTime() / 1000
      const endSec = new Date(endTimeStr).getTime() / 1000
      const violationSec = new Date(String(curr[i].startedAt)).getTime() / 1000
      const violationDeltaSec = violationSec - headerSec
      const resetHours = parseInt(resetType) || 10
      const endDeltaSec = endSec - headerSec - resetHours * 3600
      const endPixel =
        violationDeltaSec > 0
          ? (endDeltaSec / violationDeltaSec) * startPixel
          : startPixel + 50
      result.push([startPixel, Math.max(endPixel - startPixel, 4)])
    } catch {
      // Fallback: extend to SVG end
      const svgWidth = props.chartData?.svgWidth ?? 99999
      result.push([startPixel, Math.max(svgWidth - startPixel, 4)])
    }
  }

  return result
}

// Compute allViolations blocks for red background highlighting
const allViolations = computed(() => {
  const violations = props.dailyPixelViolations || []
  if (!violations.length) return []

  // ── Nested format (legacy ELD log view): each item is ViolationPixelResponse[]
  if (Array.isArray(violations[0])) {
    const blocks: [number, number][] = (violations as any[][]).map((v) => {
      const start = v[0].position
      const end = v[v.length - 1].position
      return [start, Math.max(end - start, 4)] as [number, number]
    })
    return [{ stringType: 'violations', violationBlocks: blocks }]
  }

  // ── Flat format (boost): use pinTimes to compute proper block widths
  const pinTimesRaw = props.pinTimes || []
  const headerDateStr = props.headerDate
    ? getStartOf(props.headerDate[0]).format('YYYY-MM-DDTHH:mm:ss')
    : ''
  const endTimeStr = props.headerDate
    ? getEndOf(props.headerDate[1]).format('YYYY-MM-DDTHH:mm:ss')
    : ''

  if (pinTimesRaw.length && headerDateStr && endTimeStr) {
    // Compute blocks for every known violation type
    const groups: { stringType: string; violationBlocks: [number, number][] }[] = []
    for (const [desc, resetType] of Object.entries(VIOLATION_RESET_TYPE)) {
      const blocks = computeViolationBlocks(
        violations,
        desc,
        resetType,
        pinTimesRaw,
        headerDateStr,
        endTimeStr,
      )
      if (blocks.length) {
        groups.push({ stringType: desc, violationBlocks: blocks })
      }
    }
    return groups
  }

  // ── Fallback: no pinTimes available – extend each violation to SVG end
  const svgWidth = props.chartData?.svgWidth ?? 99999
  const sorted = [...violations].sort((a: any, b: any) => a.position - b.position)
  const blocks: [number, number][] = sorted.map((v: any, i: number) => {
    const start: number = v.position
    const nextPos: number = sorted[i + 1]?.position ?? svgWidth
    return [start, Math.max(nextPos - start, 4)] as [number, number]
  })
  return blocks.length ? [{ stringType: 'violations', violationBlocks: blocks }] : []
})

const emit = defineEmits<{
  (e: 'chart-update', width: number): void
  (e: 'selected-event', event: any): void
  (e: 'selected-events', events: GraphDuties[], durations: number[]): void
}>()

// Inject date labels (DD.MM) into chartData.dayNames so LabelsForDays renders them
const chartDataWithDates = computed(() => {
  if (!props.chartData) return props.chartData
  if (!props.headerDate) return props.chartData
  const [from, to] = props.headerDate
  const days = to.diff(from, 'day') + 1
  const dayNames = Array.from({ length: days }, (_, i) => from.add(i, 'day').format('MMM D'))
  return { ...props.chartData, dayNames }
})

const handleChartUpdate = (width: number) => {
  emit('chart-update', width)
}

const handleSelectedEvent = (event: any) => {
  emit('selected-event', event)
}

const handleSelectedEvents = (events: GraphDuties[], durations: number[]) => {
  emit('selected-events', events, durations)
}

// Scroll to event segment on chart
const scrollToEventSegment = (eventId: string) => {
  if (mainChartRef.value?.handleSelectedLineId) {
    mainChartRef.value.handleSelectedLineId(eventId as unknown as number)
  }
}

defineExpose({
  scrollToEventSegment,
})
</script>
