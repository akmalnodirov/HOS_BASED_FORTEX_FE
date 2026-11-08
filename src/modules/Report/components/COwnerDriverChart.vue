<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import * as echarts from 'echarts'

interface Bucket {
  label: string
  driversAdded: number
  driversDeleted: number
}
const props = defineProps<{ buckets: Bucket[] }>()
const element = ref<HTMLElement | null>(null)
let chart: echarts.ECharts | null = null
let observer: ResizeObserver | null = null
function render() {
  if (!element.value) return
  chart ??= echarts.init(element.value)
  chart.setOption(
    {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { top: 0, textStyle: { color: '#888' } },
      grid: { left: 42, right: 20, top: 40, bottom: 30 },
      xAxis: { type: 'category', data: props.buckets.map((item) => item.label) },
      yAxis: { type: 'value', minInterval: 1 },
      series: [
        {
          name: 'Drivers added',
          type: 'bar',
          data: props.buckets.map((item) => item.driversAdded),
          itemStyle: { color: '#3b82f6' },
        },
        {
          name: 'Drivers removed',
          type: 'bar',
          data: props.buckets.map((item) => item.driversDeleted),
          itemStyle: { color: '#e2a03f' },
        },
      ],
    },
    true
  )
}
watch(() => props.buckets, render, { deep: true })
onMounted(() => {
  render()
  if (element.value) {
    observer = new ResizeObserver(() => chart?.resize())
    observer.observe(element.value)
  }
})
onUnmounted(() => {
  observer?.disconnect()
  chart?.dispose()
})
</script>

<template><div ref="element" class="h-[260px] w-full" /></template>
