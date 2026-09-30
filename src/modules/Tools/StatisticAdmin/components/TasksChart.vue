<!-- src/components/statistics/TasksChart.vue -->
<script setup lang="ts">
import { ref, watch } from 'vue'
import VueApexCharts from 'vue3-apexcharts'
import type { TasksData } from '@/modules/Tools/StatisticAdmin/types'

interface Props {
  data: TasksData
}

const props = defineProps<Props>()

const chartOptions = ref({
  chart: {
    type: 'bar',
    height: 350,
    stacked: true,
    stackType: '100%',
    toolbar: {
      show: false,
    },
  },
  plotOptions: {
    bar: {
      horizontal: false,
      columnWidth: '50%',
    },
  },
  colors: ['#3B82F6', '#10B981'],
  xaxis: {
    categories: props.data.categories,
    labels: {
      style: {
        colors: '#6B7280',
      },
    },
  },
  yaxis: {
    min: 0,
    max: 100,
    tickAmount: 5,
    labels: {
      formatter: (val: number) => `${val}%`,
      style: {
        colors: '#6B7280',
      },
    },
  },
  legend: {
    position: 'bottom',
    horizontalAlign: 'center',
    markers: {
      width: 10,
      height: 10,
      radius: 10,
    },
  },
  grid: {
    borderColor: '#E5E7EB',
    strokeDashArray: 4,
  },
  tooltip: {
    y: {
      formatter: (val: number) => `${val}%`,
    },
  },
})

const series = ref(props.data.series)

watch(
  () => props.data,
  (newData) => {
    series.value = newData.series
    chartOptions.value.xaxis.categories = newData.categories
  },
  { deep: true }
)
</script>

<template>
  <div>
    <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Tasks /time period</h3>
    <VueApexCharts type="bar" height="350" :options="chartOptions" :series="series" />
  </div>
</template>
