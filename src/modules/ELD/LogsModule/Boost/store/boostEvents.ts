import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'
import { useApi } from '@/composables/useAxiosService.ts'
import { ApiEndpoints } from '@/api/endpoints.ts'
import { capitalizeKeys } from '@/utils/object.ts'
import type { GraphDuties, GraphResponse } from '@/modules/ELD/LogsModule/[Id]/types/chart.ts'
import type {
  BoostEventActionRequest,
  BoostEventAddUpdateRequest,
  BoostEventResponse,
  BoostEventMoveTimeRequest,
  BoostEventsDeleteRequest,
  BoostEventsMultiUpdateRequest,
  BoostEventsReassignRequest,
  BoostEventsResponse,
  BoostHistoryRequest,
  BoostHistoryWithScreenRequest,
  LocationSearchRequest,
  LocationSearchResponse,
} from '../types/boost.ts'

export const useBoostEventsStore = defineStore('boostEventsNewEld', () => {
  const api = useApi()

  const boostEvents = shallowRef<BoostEventsResponse[] | null>(null)
  const boostEvent = ref<BoostEventResponse | null>(null)
  const boostGraph = ref<GraphResponse | null>(null)
  const reassignGraph = ref<GraphResponse | null>(null)
  const pinTimes = shallowRef<any[]>([]) // backend type not defined in new-eld yet

  const boostLocationSearchEvents = ref<LocationSearchResponse[]>([])

  // Move-time selection (used by Boost)
  const selectedMoveEvents = ref<Record<string, GraphDuties[]>>({})
  const selectedMoveEventsDurations = ref<number[]>([])
  const isMoveTimeEventsReversed = ref(false)

  const isBoostGraphLoading = ref(false)
  const isBoostEventsLoading = ref(false)

  async function getHistoryBoostEvents(model: BoostHistoryRequest, signal?: AbortSignal) {
    isBoostEventsLoading.value = true
    try {
      const res = await api.get<{ successResult: BoostEventsResponse[] }>(
        ApiEndpoints.BOOST_EVENTS_HISTORY,
        {
          params: capitalizeKeys(model),
          signal,
        }
      )
      boostEvents.value = res.data?.successResult ?? []
    } finally {
      isBoostEventsLoading.value = false
    }
  }

  async function getBoostEvent(eventId: string) {
    const res = await api.get<{ successResult: BoostEventResponse }>(
      `${ApiEndpoints.BOOST_EVENTS}/${eventId}`
    )
    boostEvent.value = res.data?.successResult ?? null
    return boostEvent.value
  }

  async function getHistoryBoostGraph(model: BoostHistoryWithScreenRequest, signal?: AbortSignal) {
    isBoostGraphLoading.value = true
    try {
      const res1 = await api.get<{ successResult: GraphResponse }>(
        ApiEndpoints.BOOST_EVENTS_HISTORY_GRAPH,
        {
          params: capitalizeKeys(model),
          signal,
        }
      )
      boostGraph.value = res1.data?.successResult ?? null

      const res2 = await api.get<{ successResult: GraphResponse }>(
        ApiEndpoints.BOOST_EVENTS_HISTORY_REASSIGN_GRAPH,
        {
          params: capitalizeKeys(model),
          signal,
        }
      )
      reassignGraph.value = res2.data?.successResult ?? null
    } finally {
      isBoostGraphLoading.value = false
    }
  }

  async function getHistoryBoostResetPinTimes(
    model: BoostHistoryWithScreenRequest,
    signal?: AbortSignal
  ) {
    const res = await api.get<{ successResult: any[] }>(
      ApiEndpoints.BOOST_EVENTS_HISTORY_RESET_PIN_TIMES,
      {
        params: capitalizeKeys(model),
        signal,
      }
    )
    pinTimes.value = res.data?.successResult ?? []
  }

  async function addBoostEvent(model: BoostEventAddUpdateRequest) {
    await api.post(ApiEndpoints.BOOST_EVENTS_ADD, model)
    return true
  }

  async function updateBoostEvent(eventId: string, model: BoostEventAddUpdateRequest) {
    await api.put(ApiEndpoints.BOOST_EVENTS_UPDATE(eventId), model)
    return true
  }

  async function copyBoostEvent(model: BoostEventActionRequest) {
    await api.post(ApiEndpoints.BOOST_EVENTS_COPY, capitalizeKeys(model))
    return true
  }

  async function revertBoostEvent(model: BoostEventActionRequest) {
    await api.post(ApiEndpoints.BOOST_EVENTS_REVERT, capitalizeKeys(model))
    return true
  }

  async function deleteBoostEvent(model: BoostEventActionRequest) {
    await api.post(ApiEndpoints.BOOST_EVENTS_DELETE, capitalizeKeys(model))
    return true
  }

  async function multiDeleteBoostEvents(model: BoostEventsDeleteRequest) {
    await api.post(ApiEndpoints.BOOST_EVENTS_MULTI_DELETE, capitalizeKeys(model))
    return true
  }

  async function submitBoostEvents(sessionId: string) {
    await api.put(ApiEndpoints.BOOST_EVENTS_SUBMIT(sessionId))
    return true
  }

  async function rollbackBoostEvents(sessionId: string) {
    await api.put(ApiEndpoints.BOOST_EVENTS_ROLLBACK(sessionId))
    return true
  }

  async function reassignBoostEvents(model: BoostEventsReassignRequest) {
    await api.post(ApiEndpoints.BOOST_EVENTS_REASSIGN, capitalizeKeys(model))
    return true
  }

  async function replicateBoostEvents(model: BoostEventsReassignRequest) {
    await api.post(ApiEndpoints.BOOST_EVENTS_REPLICATE, capitalizeKeys(model))
    return true
  }

  async function multiUpdateBoostEvents(model: BoostEventsMultiUpdateRequest) {
    await api.post(ApiEndpoints.BOOST_EVENTS_MULTI_UPDATE, capitalizeKeys(model))
    return true
  }

  async function searchNearestLocations(model: LocationSearchRequest) {
    const res = await api.post<{ successResult: LocationSearchResponse[] }>(
      ApiEndpoints.BOOST_EVENTS_LOCATION_SEARCH,
      capitalizeKeys(model)
    )
    boostLocationSearchEvents.value = res.data?.successResult ?? []
    return boostLocationSearchEvents.value
  }

  async function moveTimeBoostEvents(model: BoostEventMoveTimeRequest) {
    await api.post(ApiEndpoints.BOOST_EVENTS_MOVE_TIME, model)
    return true
  }

  return {
    boostEvents,
    boostEvent,
    boostGraph,
    reassignGraph,
    pinTimes,
    boostLocationSearchEvents,
    selectedMoveEvents,
    selectedMoveEventsDurations,
    isMoveTimeEventsReversed,
    isBoostGraphLoading,
    isBoostEventsLoading,
    getHistoryBoostEvents,
    getBoostEvent,
    getHistoryBoostGraph,
    getHistoryBoostResetPinTimes,
    addBoostEvent,
    updateBoostEvent,
    copyBoostEvent,
    revertBoostEvent,
    deleteBoostEvent,
    multiDeleteBoostEvents,
    submitBoostEvents,
    rollbackBoostEvents,
    reassignBoostEvents,
    replicateBoostEvents,
    multiUpdateBoostEvents,
    searchNearestLocations,
    moveTimeBoostEvents,
  }
})
