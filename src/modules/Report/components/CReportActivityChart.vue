<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import * as echarts from 'echarts'

interface Bucket {
  label: string
  companiesAdded: number
  companiesDeleted: number
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
      grid: { left: 45, right: 20, top: 42, bottom: 35 },
      xAxis: { type: 'category', data: props.buckets.map((bucket) => bucket.label) },
      yAxis: { type: 'value', minInterval: 1 },
      series: [
        {
          name: 'Companies added',
          type: 'bar',
          data: props.buckets.map((bucket) => bucket.companiesAdded),
          itemStyle: { color: '#0ca593' },
        },
        {
          name: 'Companies deleted',
          type: 'bar',
          data: props.buckets.map((bucket) => bucket.companiesDeleted),
          itemStyle: { color: '#d64545' },
        },
        {
          name: 'Drivers added',
          type: 'bar',
          data: props.buckets.map((bucket) => bucket.driversAdded),
          itemStyle: { color: '#3b82f6' },
        },
        {
          name: 'Drivers deleted',
          type: 'bar',
          data: props.buckets.map((bucket) => bucket.driversDeleted),
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

<template>
  <div ref="element" class="h-72 w-full" />
</template>
