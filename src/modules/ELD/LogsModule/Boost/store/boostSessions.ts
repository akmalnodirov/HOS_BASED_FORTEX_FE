import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useApi } from '@/composables/useAxiosService.ts'
import { ApiEndpoints } from '@/api/endpoints.ts'
import { capitalizeKeys } from '@/utils/object.ts'
import type { SessionRequest, SessionResponse } from '../types/boost.ts'

export const useBoostSessionsStore = defineStore('boostSessions', () => {
  const api = useApi()

  const session = ref<SessionResponse | null>(null)
  const sessionId = ref<string | null>(null)

  async function getSession(id: string) {
    try {
      const res = await api.get<{ successResult: SessionResponse }>(`${ApiEndpoints.SESSIONS}/${id}`)
      session.value = res.data?.successResult ?? null
      sessionId.value = session.value?.id ?? null
      return !!session.value
    } catch {
      session.value = null
      sessionId.value = null
      return false
    }
  }

  async function addSession(model: SessionRequest) {
    const res = await api.post<{ successResult: { id: string } }>(
      ApiEndpoints.SESSIONS,
      capitalizeKeys(model)
    )
    const id = res.data?.successResult?.id
    sessionId.value = id ?? null
    return id ?? null
  }

  async function deleteSession(id: string) {
    await api.delete(`${ApiEndpoints.SESSIONS}/${id}`)
    if (sessionId.value === id) {
      sessionId.value = null
      session.value = null
    }
    return true
  }

  return {
    session,
    sessionId,
    getSession,
    addSession,
    deleteSession,
  }
})

