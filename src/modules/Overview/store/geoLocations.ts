import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useApi } from '@/composables/useAxiosService.ts'
import { ApiEndpoints } from '@/api/endpoints.ts'

export const useGeoLocationsStore = defineStore('geoLocations', () => {
  const api = useApi()
  const calculatedAddress = ref<string>()

  async function getCalculatedAddress(model: { latitude: number; longitude: number }) {
    try {
      const result = await api.get<{ successResult: string }>(ApiEndpoints.GEO_CALCULATE_ADDRESS, {
        params: model,
      })

      if (result.status === 200 && result.data?.successResult) {
        calculatedAddress.value = result.data.successResult
        return result.data.successResult
      }

      return null
    } catch (error) {
      console.error('Error fetching calculated address:', error)
      return null
    }
  }

  return {
    getCalculatedAddress,
    calculatedAddress,
  }
})
