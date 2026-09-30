import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useApi } from '@/composables/useAxiosService.ts'
import { ApiEndpoints } from '@/api/endpoints.ts'
import { capitalizeKeys } from '@/utils/object.ts'
import type { GraphResponse } from '@/modules/ELD/LogsModule/[Id]/types/chart.ts'

export const useChartStore = defineStore('chart', () => {
  const api = useApi()

  // default chart settings
  const topOffset = ref(20)

  // Loading states
  const isGraphDataLoading = ref(false)
  const isPixelDataLoading = ref(false)

  // readonly chart
  const chartData = ref<GraphResponse | null>(null)
  const heightInPixel = ref(40)
  const dutyTimes = computed(() => chartData.value)
  const chart = ref()

  // edit chart
  const editChartData = ref<GraphResponse | null>(null)
  const editHeightInPixel = ref(28)
  const editDutyTimes = computed(() => editChartData.value)
  const screenResolution = ref<number>(
    typeof window !== 'undefined' ? Math.max(320, document.documentElement.clientWidth) : 1200
  )

  // Computed loading state
  const isGraphLoading = computed(() => isGraphDataLoading.value || isPixelDataLoading.value)

  async function getChart(model: any, edit: boolean = false, signal?: AbortSignal) {
    isGraphDataLoading.value = true
    console.log('getChart called with model:', model)
    console.log('API Endpoint:', ApiEndpoints.DRIVER_LOGS_DAILY_GRAPH)
    try {
      const capitalizedModel = capitalizeKeys(model)
      console.log('Capitalized model:', capitalizedModel)
      const response = await api.get<{ successResult: GraphResponse }>(
        ApiEndpoints.DRIVER_LOGS_DAILY_GRAPH,
        {
          params: capitalizedModel,
          signal,
        }
      )
      console.log('=== CHART API RESPONSE ===')
      console.log('Full response:', response.data)
      if (response.data?.successResult) {
        const graphData = response.data.successResult
        console.log('Backend returned days:', graphData.days)
        console.log('Backend returned dayNames:', graphData.dayNames)
        console.log('Backend returned dates:', graphData.dates)
        console.log('Backend returned svgWidth:', graphData.svgWidth)
        console.log('Backend returned svgViewBox:', graphData.svgViewBox)

        // Count actual duty events
        let totalDutyEvents = 0
        Object.keys(graphData.duties || {}).forEach((key) => {
          const dutyArray = graphData.duties[key as keyof typeof graphData.duties]
          if (Array.isArray(dutyArray)) {
            totalDutyEvents += dutyArray.length
          }
        })
        console.log('Total duty events:', totalDutyEvents)

        if (!edit) {
          chartData.value = graphData
          console.log('✅ Chart data set with days:', chartData.value?.days)
        } else {
          editChartData.value = graphData
        }
      } else {
        console.warn('❌ No successResult in response:', response.data)
      }
    } catch (error) {
      console.error('Error fetching chart data:', error)
      if (error instanceof Error) {
        console.error('Error message:', error.message)
        console.error('Error stack:', error.stack)
      }
    } finally {
      isGraphDataLoading.value = false
    }
  }

  return {
    // State
    topOffset,
    chartData,
    chart,
    heightInPixel,
    dutyTimes,
    editChartData,
    editHeightInPixel,
    editDutyTimes,
    screenResolution,
    isGraphLoading,
    isGraphDataLoading,
    isPixelDataLoading,

    // Functions
    getChart,
  }
})
