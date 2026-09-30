<template>
  <div class="pb-10 mb-1">
    <!-- Chart Section -->
    <div ref="chartSectionRef" class="bg-white dark:bg-card px-6 py-4 overflow-x-hidden">
      <div v-if="isGraphLoading" class="flex items-center justify-center p-8">
        <div class="text-muted-foreground">Loading chart...</div>
      </div>
      <MainChart
        v-else-if="chartData && Object.keys(chartData).length > 0"
        ref="editChartRef"
        :loading="isGraphLoading"
        :chart-data="chartData"
        :daily-summary="dailySummary || undefined"
        :violations="(dailyPixelViolations || []) as any"
        :add="true"
        :event-time="headerDate"
        :event-type="eventState.eventType"
        :event-code="eventState.eventCode"
        :event-oncesetprev="eventState.onceSetPrev"
        :block-event-time-edit="false"
        @container:update="handleContainerUpdate"
        @duty-event:update="handleDutyEventUpdate"
        @oncesetprev:update="handleOnceSetPrevUpdate"
      />
      <div v-else class="flex flex-col items-center justify-center p-8 space-y-2">
        <div class="text-muted-foreground">No chart data available</div>
      </div>
    </div>

    <!-- Insert Info Form Section -->
    <div class="bg-white dark:bg-card px-6 py-4">
      <CInsertInfoForm
        ref="formRef"
        :event-start="eventState.eventStart"
        :event-end="eventState.eventEnd"
        :event-type="eventState.eventType"
        :event-code="eventState.eventCode"
        @update:event-start="handleEventStartUpdate"
        @update:event-end="handleEventEndUpdate"
        @update:event-type="handleEventTypeUpdate"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, inject, onMounted } from 'vue'

// Page Components
import MainChart from '@/modules/ELD/LogsModule/[Id]/components/chart/MainChart.vue'
import CInsertInfoForm from '../components/CInsertInfoForm.vue'

// Inject shared data from layout
const logDetail = inject('logDetail') as ReturnType<
  typeof import('@/modules/ELD/LogsModule/[Id]/composables/useELDLogDetail.ts').useELDLogDetail
>

const {
  // State
  chartData,
  dailySummary,
  dailyPixelViolations,
  isGraphLoading,
  headerDate,

  // Functions
  getChartWidth,
  fetchChart,
  setChartResolution,
} = logDetail

// Refs
const editChartRef = ref<InstanceType<typeof MainChart> | null>(null)
const formRef = ref<InstanceType<typeof CInsertInfoForm> | null>(null)
const chartSectionRef = ref<HTMLElement | null>(null)

// Event state shared between chart and form
interface TimeObject {
  hours: number
  minutes: number
  seconds: number
}

const eventState = reactive({
  eventType: 1,
  eventCode: 1,
  eventStart: { hours: 0, minutes: 0, seconds: 0 } as TimeObject,
  eventEnd: { hours: 0, minutes: 0, seconds: 0 } as TimeObject,
  onceSetPrev: false,
})

// On mount: set the chart resolution to match this page's actual svgContainer width,
// then fetch fresh chart data. This prevents stale resolution from other pages
// (e.g., PELDLogDetail uses pr-5 while this page uses px-6, making it ~28px narrower)
// from causing the SVG to overflow and show part of the next day's data.
//
// svgContainer width = wrapper.clientWidth - px-6 padding (48px) - labels w-12 (48px)
onMounted(async () => {
  chartData.value = null
  const wrapperWidth = chartSectionRef.value?.clientWidth ?? 0
  const svgContainerWidth = wrapperWidth - 48 - 48 // px-6 padding + labels (w-12)
  if (svgContainerWidth > 0) {
    setChartResolution(svgContainerWidth)
  }
  await fetchChart(false)
})

// Handle container update for chart
function handleContainerUpdate(width: number) {
  getChartWidth(width)
}

// Handle duty event update from chart (when dragging controllers)
function handleDutyEventUpdate(data: any) {
  if (data.eventStart) {
    eventState.eventStart = { ...data.eventStart }
  }
  if (data.eventEnd) {
    eventState.eventEnd = { ...data.eventEnd }
  }
}

// Handle once set prev update
function handleOnceSetPrevUpdate(value: boolean) {
  eventState.onceSetPrev = value
}

// Handle event start update from form
function handleEventStartUpdate(time: TimeObject) {
  eventState.eventStart = { ...time }
  // Update chart
  if (editChartRef.value) {
    const timeStr = `${time.hours}:${time.minutes}:${time.seconds}`
    editChartRef.value.onEditMouseMove?.(timeStr, true)
  }
}

// Handle event end update from form
function handleEventEndUpdate(time: TimeObject) {
  eventState.eventEnd = { ...time }
  // Update chart
  if (editChartRef.value) {
    const timeStr = `${time.hours}:${time.minutes}:${time.seconds}`
    editChartRef.value.onEditMouseMove?.(timeStr, false)
  }
}

// Handle event type update from form
function handleEventTypeUpdate(data: { eventType: number; eventCode: number }) {
  eventState.eventType = data.eventType
  eventState.eventCode = data.eventCode
}
</script>
