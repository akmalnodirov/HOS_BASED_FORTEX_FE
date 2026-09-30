import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useApi } from '@/composables/useAxiosService.ts'
import { ApiEndpoints } from '@/api/endpoints.ts'
import { capitalizeKeys } from '@/utils/object.ts'
import type { OptimizeCategory } from '../types/boost.ts'

export const useBoostOptimizeStore = defineStore('boostOptimize', () => {
  const api = useApi()

  const optimizeCategories = ref<OptimizeCategory[]>([])

  async function getOptimizeCategories() {
    const res = await api.get<{ successResult: OptimizeCategory[] }>(ApiEndpoints.OPTIMIZE_CATEGORIES)
    optimizeCategories.value = res.data?.successResult ?? []
    return optimizeCategories.value
  }

  async function optimizeSelectedCategories(model: {
    sessionId: string
    tabId: string
    eventCategoryInfos: OptimizeCategory[]
  }) {
    const res = await api.post<{ successResult: any }>(ApiEndpoints.OPTIMIZE, capitalizeKeys(model))
    return res.data?.successResult
  }

  return {
    optimizeCategories,
    getOptimizeCategories,
    optimizeSelectedCategories,
  }
})

