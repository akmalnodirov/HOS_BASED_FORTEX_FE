import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useApi } from '@/composables/useAxiosService'
import { ApiEndpoints } from '@/api/endpoints'
import { capitalizeKeys } from '@/utils/object'
import type { OptimizeCategory } from '../../Boost/types/boost'
import type { OptimizeNotificationResult } from '../types/optimize'

/**
 * Optimize Store
 * Manages optimize categories and optimization operations
 * Following Single Responsibility Principle
 */
export const useOptimizeStore = defineStore('optimize', () => {
  const api = useApi()

  // State
  const optimizeCategories = ref<OptimizeCategory[]>([])
  const isOptimizing = ref(false)

  /**
   * Get available optimize categories
   */
  async function getOptimizeCategories() {
    try {
      const res = await api.get<{ successResult: OptimizeCategory[] }>(
        ApiEndpoints.OPTIMIZE_CATEGORIES
      )
      optimizeCategories.value = res.data?.successResult ?? []
      return optimizeCategories.value
    } catch (error) {
      console.error('Failed to fetch optimize categories:', error)
      throw error
    }
  }

  /**
   * Optimize selected categories
   */
  async function optimizeSelectedCategories(model: {
    sessionId: string
    tabId: string
    eventCategoryInfos: OptimizeCategory[]
  }): Promise<OptimizeNotificationResult | null> {
    isOptimizing.value = true
    try {
      const res = await api.post<{ successResult: OptimizeNotificationResult }>(
        ApiEndpoints.OPTIMIZE,
        capitalizeKeys(model)
      )
      return res.data?.successResult ?? null
    } catch (error) {
      console.error('Failed to optimize categories:', error)
      throw error
    } finally {
      isOptimizing.value = false
    }
  }

  return {
    // State
    optimizeCategories,
    isOptimizing,
    // Actions
    getOptimizeCategories,
    optimizeSelectedCategories,
  }
})
