<!-- src/components/statistics/TasksBarChart.vue -->
<script setup lang="ts">
import { ref, watch } from 'vue'
import VueApexCharts from 'vue3-apexcharts'

interface Props {
  tasks: { name: string; value: number }[]
}

const props = defineProps<Props>()

const chartOptions = ref({
  chart: {
    type: 'bar',
    height: 350,
    toolbar: {
      show: false,
    },
  },
  plotOptions: {
    bar: {
      horizontal: false,
      columnWidth: '60%',
      distributed: true,
    },
  },
  colors: ['#1F2937', '#374151', '#4B5563', '#6B7280', '#9CA3AF', '#D1D5DB', '#E5E7EB'],
  xaxis: {
    categories: props.tasks.map((t) => t.name),
    labels: {
      rotate: -45,
      rotateAlways: true,
      style: {
        colors: '#6B7280',
        fontSize: '10px',
      },
    },
  },
  yaxis: {
    min: 0,
    max: 120,
    tickAmount: 6,
    labels: {
      style: {
        colors: '#6B7280',
      },
    },
  },
  legend: {
    show: false,
  },
  grid: {
    borderColor: '#E5E7EB',
    strokeDashArray: 4,
  },
  dataLabels: {
    enabled: false,
  },
})

const series = ref([
  {
    name: 'Tasks',
    data: props.tasks.map((t) => t.value),
  },
])

watch(
  () => props.tasks,
  (newTasks) => {
    series.value[0].data = newTasks.map((t) => t.value)
    chartOptions.value.xaxis.categories = newTasks.map((t) => t.name)
  },
  { deep: true }
)
</script>

<template>
  <div>
    <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Tasks /time period</h3>

    <!-- Tasks List -->
    <div class="space-y-2 mb-4">
      <div v-for="task in tasks" :key="task.name" class="flex items-center justify-between text-sm">
        <span class="text-gray-600 dark:text-gray-400">{{ task.name }}</span>
        <span class="font-medium text-gray-900 dark:text-gray-100">{{ task.value }}</span>
      </div>
    </div>

    <VueApexCharts type="bar" height="300" :options="chartOptions" :series="series" />
  </div>
</template>
