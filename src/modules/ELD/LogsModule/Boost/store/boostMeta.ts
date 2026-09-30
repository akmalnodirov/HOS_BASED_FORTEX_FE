import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'
import { useApi } from '@/composables/useAxiosService.ts'
import { ApiEndpoints } from '@/api/endpoints.ts'
import { capitalizeKeys } from '@/utils/object.ts'
import type {
  BoostHistoryRequest,
  BoostHistoryWithScreenRequest,
  BoostViolationRequest,
  BoostViolationResponse,
  HosTimeRemainder,
} from '../types/boost.ts'
import type {
  BoostFreeTime,
  DailyDictionarySummaryResponse,
  ViolationPixelResponse,
} from '@/modules/ELD/LogsModule/[Id]/types/chart.ts'

export const useBoostMetaStore = defineStore('boostMeta', () => {
  const api = useApi()

  const boostTimeRemainder = ref<HosTimeRemainder | null>(null)
  const boostSummaries = shallowRef<DailyDictionarySummaryResponse>({})
  const boostViolations = shallowRef<BoostViolationResponse[]>([])
  const boostPixelViolations = shallowRef<ViolationPixelResponse[]>([])
  const boostFreeTimes = shallowRef<BoostFreeTime[] | undefined>([])

  // Table selection
  const selectedRows = ref<any[]>([])
  const selectedRowSet = shallowRef<Set<string>>(new Set())

  const clearSelection = () => {
    selectedRows.value = []
    selectedRowSet.value.clear()
  }

  async function getHistoryBoostSummaries(model: BoostHistoryRequest, signal?: AbortSignal) {
    const res = await api.get<{ successResult: DailyDictionarySummaryResponse }>(
      ApiEndpoints.BOOST_HISTORY_SUMMARIES,
      {
        params: capitalizeKeys(model),
        signal,
      }
    )
    boostSummaries.value = res.data?.successResult ?? {}
  }

  async function getHistoryBoostViolations(model: BoostHistoryRequest, signal?: AbortSignal) {
    const res = await api.get<{ successResult: BoostViolationResponse[] }>(
      ApiEndpoints.BOOST_HISTORY_VIOLATIONS,
      {
        params: capitalizeKeys(model),
        signal,
      }
    )
    boostViolations.value = res.data?.successResult ?? []
  }

  async function getBoostPixelViolations(model: BoostViolationRequest, signal?: AbortSignal) {
    const res = await api.get<{ successResult: ViolationPixelResponse[] }>(
      ApiEndpoints.BOOST_PIXEL_VIOLATIONS,
      {
        params: capitalizeKeys(model),
        signal,
      }
    )

    // RouteApp flattens; backend may return nested. Keep safe.
    const v = res.data?.successResult as any
    boostPixelViolations.value = Array.isArray(v) ? (v as ViolationPixelResponse[]) : []
  }

  async function getHistoryBoostTimeRemainder(model: BoostHistoryRequest, signal?: AbortSignal) {
    const res = await api.get<{ successResult: HosTimeRemainder }>(
      ApiEndpoints.BOOST_HISTORY_TIME_REMAINDER,
      {
        params: capitalizeKeys(model),
        signal,
      }
    )
    boostTimeRemainder.value = res.data?.successResult ?? null
  }

  async function getHistoryFreeTimes(model: BoostHistoryWithScreenRequest, signal?: AbortSignal) {
    const res = await api.get<{ successResult: BoostFreeTime[] }>(
      ApiEndpoints.BOOST_HISTORY_FREE_TIMES,
      {
        params: capitalizeKeys(model),
        signal,
      }
    )
    boostFreeTimes.value = res.data?.successResult ?? []
  }

  return {
    boostTimeRemainder,
    boostSummaries,
    boostViolations,
    boostPixelViolations,
    boostFreeTimes,
    selectedRows,
    selectedRowSet,
    clearSelection,
    getHistoryBoostSummaries,
    getHistoryBoostViolations,
    getBoostPixelViolations,
    getHistoryBoostTimeRemainder,
    getHistoryFreeTimes,
  }
})
