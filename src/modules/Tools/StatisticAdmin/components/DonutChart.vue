<!-- src/components/statistics/DonutChart.vue -->
<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import VueApexCharts from 'vue3-apexcharts'
import type { DonutData } from '@/modules/Tools/StatisticAdmin/types'

interface Props {
  data: DonutData
}

const props = defineProps<Props>()

const total = computed(() => props.data.series.reduce((sum, val) => sum + val, 0))

const chartOptions = ref({
  chart: {
    type: 'donut',
    height: 350,
  },
  labels: props.data.labels,
  colors: ['#3B82F6', '#A855F7'],
  legend: {
    position: 'bottom',
    horizontalAlign: 'center',
    markers: {
      width: 10,
      height: 10,
      radius: 10,
    },
  },
  plotOptions: {
    pie: {
      donut: {
        size: '70%',
        labels: {
          show: true,
          total: {
            show: true,
            label: 'Total New Orders',
            fontSize: '14px',
            fontWeight: 400,
            color: '#6B7280',
            formatter: () => total.value.toString(),
          },
          value: {
            fontSize: '32px',
            fontWeight: 600,
            color: '#111827',
            formatter: (val: string) => val,
          },
        },
      },
    },
  },
  dataLabels: {
    enabled: false,
  },
  stroke: {
    width: 0,
  },
})

const series = ref(props.data.series)

watch(
  () => props.data,
  (newData) => {
    series.value = newData.series
    chartOptions.value.labels = newData.labels
  },
  { deep: true }
)
</script>

<template>
  <div>
    <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">AI / Boster</h3>
    <VueApexCharts type="donut" height="350" :options="chartOptions" :series="series" />
  </div>
</template>
