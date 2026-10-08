import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useApi } from '@/composables/useAxiosService.ts'
import { ApiEndpoints } from '@/api/endpoints.ts'
import { capitalizeKeys } from '@/utils/object.ts'
import type {
  TransferReassignRequest,
  TransferEventParams,
  TransferGraphParams,
  TransferByIdsRequest,
  TransferByDateRangeRequest,
} from '../types/history.ts'

export const useTransferEventsStore = defineStore('transferEvents', () => {
  const api = useApi()

  const originalDailyEvents = ref<any[]>([])
  const loading = ref(false)

  async function getOriginalTransferEvents(params: TransferEventParams): Promise<void> {
    loading.value = true
    try {
      const response = await api.get<{ successResult: any[] }>(
        ApiEndpoints.TRANSFER_EVENTS_ORIGINAL,
        { params: capitalizeKeys(params) }
      )
      originalDailyEvents.value = response.data?.successResult ?? []
      console.log('response', originalDailyEvents.value)
    } catch (error) {
      console.error('Failed to fetch original transfer events:', error)
      originalDailyEvents.value = []
    } finally {
      loading.value = false
    }
  }

  async function getGraphTransferEvents(params: TransferGraphParams): Promise<any | null> {
    try {
      const response = await api.get<{ successResult: any }>(ApiEndpoints.TRANSFER_EVENTS_GRAPH, {
        params: capitalizeKeys(params),
      })
      return response.data?.successResult ?? null
    } catch (error) {
      console.error('Failed to fetch graph transfer events:', error)
      return null
    }
  }

  async function getDailySummaryTransferEvents(params: TransferEventParams): Promise<any | null> {
    try {
      const response = await api.get<{ successResult: any }>(
        ApiEndpoints.TRANSFER_EVENTS_DAILY_SUMMARY,
        { params: capitalizeKeys(params) }
      )
      return response.data?.successResult ?? null
    } catch (error) {
      console.error('Failed to fetch daily summary:', error)
      return null
    }
  }

  async function setTransferEventsByIds(request: TransferByIdsRequest): Promise<boolean> {
    loading.value = true
    try {
      const response = await api.post(ApiEndpoints.TRANSFER_EVENTS_IDS, request)
      return response.status === 200
    } catch (error) {
      console.error('Failed to transfer events by IDs:', error)
      return false
    } finally {
      loading.value = false
    }
  }

  async function setTransferEventsByDateRange(
    request: TransferByDateRangeRequest
  ): Promise<boolean> {
    loading.value = true
    try {
      const response = await api.post(ApiEndpoints.TRANSFER_EVENTS_DATE_RANGE, request)
      return response.status === 200
    } catch (error) {
      console.error('Failed to transfer events by date range:', error)
      return false
    } finally {
      loading.value = false
    }
  }

  async function reassignTransferEvents(request: TransferReassignRequest): Promise<boolean> {
    loading.value = true
    try {
      const response = await api.post(ApiEndpoints.TRANSFER_EVENTS_REASSIGN, request)
      return response.status === 200
    } catch (error) {
      console.error('Failed to reassign transfer events:', error)
      return false
    } finally {
      loading.value = false
    }
  }

  function clearOriginalDailyEvents(): void {
    originalDailyEvents.value = []
  }

  return {
    originalDailyEvents,
    loading,

    getOriginalTransferEvents,
    getGraphTransferEvents,
    getDailySummaryTransferEvents,
    setTransferEventsByIds,
    setTransferEventsByDateRange,
    reassignTransferEvents,
    clearOriginalDailyEvents,
  }
})
