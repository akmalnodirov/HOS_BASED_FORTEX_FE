<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as echarts from 'echarts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ChartData {
  categories: string[]
  series: number[]
}

const props = withDefaults(
  defineProps<{
    data: ChartData
    loading?: boolean
  }>(),
  { loading: false }
)

const chartRef = ref<HTMLElement | null>(null)
let chart: echarts.ECharts | null = null

const hasData = () => props.data.categories.length > 0

const buildOption = (data: ChartData): echarts.EChartsOption => {
  const maxVal = data.series.length > 0 ? Math.max(...data.series) : 100
  const yMax = Math.ceil(maxVal * 1.2) || 100

  return {
    tooltip: { trigger: 'axis' },
    legend: { show: false },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: data.categories,
      axisLine: { lineStyle: { color: '#9CA3AF' } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: yMax,
      splitLine: { lineStyle: { type: 'dashed', color: '#E5E7EB' } },
    },
    series: [
      {
        name: 'Requests',
        type: 'line',
        data: data.series,
        smooth: false,
        symbol: 'none',
        lineStyle: { color: '#3b82f6', width: 2 },
        itemStyle: { color: '#3b82f6' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#6082E024' },
            { offset: 1, color: '#6082E000' },
          ]),
        },
      },
    ],
  }
}

watch(
  () => props.data,
  async (newData) => {
    if (newData.categories.length > 0) {
      await nextTick()
      if (!chart && chartRef.value) {
        chart = echarts.init(chartRef.value)
      }
      if (chart) {
        chart.resize()
        chart.setOption(buildOption(newData), true)
      }
    } else {
      chart?.clear()
    }
  },
  { deep: true }
)

const resizeChart = () => {
  chart?.resize()
}

onMounted(() => {
  if (chartRef.value) {
    chart = echarts.init(chartRef.value)
    if (hasData()) {
      chart.setOption(buildOption(props.data))
    }
  }
  window.addEventListener('resize', resizeChart)
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeChart)
  chart?.dispose()
})
</script>

<template>
  <Card>
    <CardHeader class="p-4">
      <CardTitle class="text-base">Number of requests</CardTitle>
    </CardHeader>
    <CardContent class="px-4 relative">
      <div ref="chartRef" class="w-full h-75"></div>
      <!-- Overlay: loading -->
      <div v-if="loading" class="absolute inset-0 flex items-center justify-center bg-card/80">
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
      <!-- Overlay: empty state -->
      <div
        v-else-if="!hasData()"
        class="absolute inset-0 flex items-center justify-center text-muted-foreground"
      >
        Select a carrier to view statistics
      </div>
    </CardContent>
  </Card>
</template>
