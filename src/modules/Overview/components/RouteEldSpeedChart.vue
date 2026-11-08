<template>
  <section class="relative min-h-[145px] overflow-hidden bg-white dark:bg-card">
    <div ref="chartRef" class="h-full w-full" />
    <div
      v-if="loading || error || points.length === 0"
      class="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-muted-foreground"
    >
      {{ loading ? 'Loading speed…' : error ? 'Speed data could not be loaded' : 'No speed data for this day' }}
    </div>
  </section>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts'
import { useDarkMode } from '@/composables/useDarkMode'
import type { RouteEldSpeedChartPoint } from '../types'

const HOUR_MS = 60 * 60 * 1000
const props = defineProps<{
  points: RouteEldSpeedChartPoint[]
  fromTimestamp: number
  toTimestamp: number
  loading?: boolean
  error?: string | null
}>()
const { isDarkMode } = useDarkMode()
const chartRef = ref<HTMLElement | null>(null)
let chart: echarts.ECharts | null = null
let observer: ResizeObserver | null = null

function options(): echarts.EChartsOption {
  const text = isDarkMode.value ? '#cbd5e1' : '#64748b'
  const grid = isDarkMode.value ? '#334155' : '#e2e8f0'
  const tooltipBg = isDarkMode.value ? '#1e293b' : '#ffffff'
  const tooltipBorder = isDarkMode.value ? '#475569' : '#cbd5e1'
  const maximumSpeed = Math.max(10, ...props.points.map((point) => point.speed))
  const yMaximum = Math.max(20, Math.ceil(maximumSpeed / 10) * 10)

  return {
    animation: false,
    grid: { left: 52, right: 20, top: 20, bottom: 32 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: tooltipBg,
      borderColor: tooltipBorder,
      textStyle: { color: isDarkMode.value ? '#f8fafc' : '#0f172a', fontSize: 11 },
      formatter: (items: unknown) => {
        const item = Array.isArray(items) ? (items[0] as { value?: [number, number] }) : null
        const value = item?.value
        if (!value) return ''
        const time = new Intl.DateTimeFormat(undefined, {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }).format(value[0])
        return `${time}<br/><strong>${Number(value[1]).toFixed(1)} mph</strong>`
      },
    },
    xAxis: {
      type: 'time',
      min: props.fromTimestamp,
      max: props.toTimestamp,
      minInterval: HOUR_MS,
      maxInterval: HOUR_MS,
      axisLine: { lineStyle: { color: grid } },
      axisTick: { lineStyle: { color: grid } },
      splitLine: { show: true, lineStyle: { color: grid, type: 'dashed' } },
      axisLabel: {
        color: text,
        fontSize: 10,
        hideOverlap: true,
        formatter: (value: number) =>
          new Intl.DateTimeFormat(undefined, {
            hour: '2-digit',
            hour12: false,
          }).format(value),
      },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: yMaximum,
      name: 'Speed (mph)',
      nameTextStyle: { color: text, fontSize: 10, padding: [0, 0, 0, 8] },
      axisLabel: { color: text, fontSize: 10 },
      splitLine: { lineStyle: { color: grid, type: 'dashed' } },
    },
    series: [
      {
        type: 'line',
        data: props.points.map((point) => [point.timestamp, point.speed]),
        showSymbol: false,
        smooth: false,
        connectNulls: false,
        lineStyle: { color: '#3b82f6', width: 1.5 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(59, 130, 246, 0.28)' },
            { offset: 1, color: 'rgba(59, 130, 246, 0.02)' },
          ]),
        },
      },
    ],
  }
}

async function render() {
  await nextTick()
  if (!chart && chartRef.value) chart = echarts.init(chartRef.value)
  chart?.setOption(options(), true)
  chart?.resize()
}

watch(
  () => [props.points, props.fromTimestamp, props.toTimestamp, isDarkMode.value],
  () => void render(),
  { deep: true }
)

onMounted(() => {
  void render()
  if (chartRef.value) {
    observer = new ResizeObserver(() => chart?.resize())
    observer.observe(chartRef.value)
  }
})

onBeforeUnmount(() => {
  observer?.disconnect()
  chart?.dispose()
})
</script>
