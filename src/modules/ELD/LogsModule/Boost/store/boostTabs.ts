import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useApi } from '@/composables/useAxiosService.ts'
import { ApiEndpoints } from '@/api/endpoints.ts'
import { capitalizeKeys } from '@/utils/object.ts'
import type { TabRequest, TabResponse } from '../types/boost.ts'

export const useBoostTabsStore = defineStore('boostTabs', () => {
  const api = useApi()

  const tabs = ref<TabResponse[]>([])
  const selectedTab = ref<TabResponse | null>(null)
  const currentAbortController = ref<AbortController | null>(null)

  async function getTabs(sessionId: string) {
    const res = await api.get<{ successResult: TabResponse[] }>(
      ApiEndpoints.TABS_SESSION(sessionId)
    )
    tabs.value = res.data?.successResult ?? []
    return tabs.value
  }

  async function addTab(model: TabRequest) {
    const res = await api.post<{ successResult: TabResponse }>(
      ApiEndpoints.TABS_ADD,
      capitalizeKeys(model)
    )
    return res.data?.successResult ?? null
  }

  async function updateTab(tabId: string, model: TabRequest) {
    await api.put(ApiEndpoints.TABS_UPDATE(tabId), capitalizeKeys(model))
    return true
  }

  async function deleteTab(tabId: string) {
    await api.delete(`${ApiEndpoints.TABS}/${tabId}`)
    if (selectedTab.value?.id === tabId) selectedTab.value = null
    tabs.value = tabs.value.filter((t) => t.id !== tabId)
    return true
  }

  return {
    tabs,
    selectedTab,
    currentAbortController,
    getTabs,
    addTab,
    updateTab,
    deleteTab,
  }
})
