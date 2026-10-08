import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useApi } from '@/composables/useAxiosService.ts'
import { ApiEndpoints } from '@/api/endpoints.ts'
import { capitalizeKeys } from '@/utils/object.ts'
import type { HistoryTabRequest, HistoryTabResponse } from '../types/history.ts'

export const useHistoryTabsStore = defineStore('historyTabs', () => {
  const api = useApi()

  const tabs = ref<HistoryTabResponse[]>([])
  const selectedTab = ref<HistoryTabResponse | null>(null)

  async function getTabs(sessionId: string): Promise<HistoryTabResponse[]> {
    try {
      const response = await api.get<{ successResult: HistoryTabResponse[] }>(
        ApiEndpoints.TABS_SESSION(sessionId)
      )
      tabs.value = response.data?.successResult ?? []
      return tabs.value
    } catch (error) {
      console.error('Failed to fetch history tabs:', error)
      tabs.value = []
      return []
    }
  }

  async function addTab(request: HistoryTabRequest): Promise<HistoryTabResponse | null> {
    try {
      const response = await api.post<{ successResult: HistoryTabResponse }>(
        ApiEndpoints.TABS_ADD,
        capitalizeKeys(request)
      )
      return response.data?.successResult ?? null
    } catch (error) {
      console.error('Failed to add history tab:', error)
      return null
    }
  }

  async function updateTab(tabId: string, request: HistoryTabRequest): Promise<boolean> {
    try {
      await api.put(ApiEndpoints.TABS_UPDATE(tabId), capitalizeKeys(request))
      return true
    } catch (error) {
      console.error('Failed to update history tab:', error)
      return false
    }
  }

  async function deleteTab(tabId: string): Promise<boolean> {
    try {
      await api.delete(`${ApiEndpoints.TABS}/${tabId}`)
      if (selectedTab.value?.id === tabId) {
        selectedTab.value = null
      }
      tabs.value = tabs.value.filter((t) => t.id !== tabId)
      return true
    } catch (error) {
      console.error('Failed to delete history tab:', error)
      return false
    }
  }

  function clearTabs(): void {
    tabs.value = []
    selectedTab.value = null
  }

  return {
    tabs,
    selectedTab,

    getTabs,
    addTab,
    updateTab,
    deleteTab,
    clearTabs,
  }
})
