import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useApi } from '@/composables/useAxiosService.ts'
import { ApiEndpoints } from '@/api/endpoints.ts'
import { capitalizeKeys } from '@/utils/object.ts'
import type { HistorySessionRequest, HistorySessionResponse } from '../types/history.ts'

export const useHistorySessionsStore = defineStore('historySessions', () => {
  const api = useApi()

  const session = ref<HistorySessionResponse | null>(null)
  const sessionId = ref<string | null>(null)

  async function getSession(id: string): Promise<boolean> {
    try {
      const response = await api.get<{ successResult: HistorySessionResponse }>(
        `${ApiEndpoints.SESSIONS}/${id}`
      )
      session.value = response.data?.successResult ?? null
      sessionId.value = session.value?.id ?? null
      return !!session.value
    } catch (error) {
      console.error('Failed to fetch history session:', error)
      clearSession()
      return false
    }
  }

  async function addSession(request: HistorySessionRequest): Promise<string | null> {
    try {
      const response = await api.post<{ successResult: { id: string } }>(
        ApiEndpoints.SESSIONS,
        capitalizeKeys(request)
      )
      const id = response.data?.successResult?.id ?? null
      sessionId.value = id
      return id
    } catch (error) {
      console.error('Failed to create history session:', error)
      return null
    }
  }

  async function deleteSession(id: string): Promise<boolean> {
    try {
      await api.delete(`${ApiEndpoints.SESSIONS}/${id}`)
      if (sessionId.value === id) {
        clearSession()
      }
      return true
    } catch (error) {
      console.error('Failed to delete history session:', error)
      return false
    }
  }

  function clearSession(): void {
    session.value = null
    sessionId.value = null
  }

  return {
    session,
    sessionId,

    getSession,
    addSession,
    deleteSession,
    clearSession,
  }
})
