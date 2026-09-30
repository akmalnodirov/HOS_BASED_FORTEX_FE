import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useApi } from '@/composables/useAxiosService'
import { ApiEndpoints } from '@/api/endpoints'
import { capitalizeKeys } from '@/utils/object'
import { toast } from 'vue-sonner'
import type { Dayjs } from 'dayjs'
import type {
  UnidentifiedEventResponse,
  SelectEventRequest,
  ReassignEventRequest,
} from '../types'

export const useUnidentifiedStore = defineStore('unidentifiedEvents', () => {
  const api = useApi()

  // State
  const unidentifiedEvents = ref<UnidentifiedEventResponse[]>([])
  const unidentifiedEventsTotal = ref(0)

  async function getUnidentifiedEvents(model: {
    startDate: string | Dayjs | null
    endDate: string | Dayjs | null
    vehicleId: string | null
    carrierId: string | null
    pageNumber: number
    pageSize: number
  }) {
    const response = await api.get<{
      successResult: { data: UnidentifiedEventResponse[]; totalCount: number }
    }>(ApiEndpoints.UNIDENTIFIED_EVENTS_FILTER, {
      params: capitalizeKeys(model),
    })
    if (response.status === 200) {
      unidentifiedEventsTotal.value = response.data.successResult.totalCount
      unidentifiedEvents.value = response.data.successResult.data
    }
  }

  async function selectUnidentifiedEvents(model: SelectEventRequest): Promise<boolean> {
    const response = await api.post(ApiEndpoints.UNIDENTIFIED_EVENTS_SELECT, model)
    if (response.status === 200) {
      toast.success('Event status selected successfully')
      return true
    }
    return false
  }

  async function reassignUnidentifiedEvents(model: ReassignEventRequest): Promise<boolean> {
    const response = await api.post(ApiEndpoints.UNIDENTIFIED_EVENTS_REASSIGN, model)
    if (response.status === 200) {
      toast.success('Events reassigned successfully')
      return true
    }
    return false
  }

  async function deleteUnidentifiedEvents(eventIds: string[]): Promise<boolean> {
    const response = await api.delete(ApiEndpoints.UNIDENTIFIED_EVENTS_DELETE, {
      params: { eventIds: eventIds.join(',') },
    })
    if (response.status === 200) {
      toast.success('Events deleted successfully')
      return true
    }
    return false
  }

  return {
    // State
    unidentifiedEvents,
    unidentifiedEventsTotal,

    // Actions
    getUnidentifiedEvents,
    selectUnidentifiedEvents,
    reassignUnidentifiedEvents,
    deleteUnidentifiedEvents,
  }
})
