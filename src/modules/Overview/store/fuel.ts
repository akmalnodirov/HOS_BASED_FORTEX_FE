import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useApi } from '@/composables/useAxiosService.ts'
import { ApiEndpoints } from '@/api/endpoints.ts'
import type { NearbyCheapestFuelStationsRequest, FuelStationResponse } from '@/types/fuel'

export const useFuelStore = defineStore('fuel', () => {
  const api = useApi()
  const cheapestFuelStations = ref<FuelStationResponse[]>([])

  const capitalizeKeys = (obj: any): any => {
    if (obj === null || typeof obj !== 'object') return obj
    if (Array.isArray(obj)) return obj.map(capitalizeKeys)

    return Object.entries(obj).reduce((acc, [key, value]) => {
      const capitalizedKey = key.charAt(0).toUpperCase() + key.slice(1)
      acc[capitalizedKey] = typeof value === 'object' ? capitalizeKeys(value) : value
      return acc
    }, {} as any)
  }

  async function getCheapestFuelStations(model: NearbyCheapestFuelStationsRequest) {
    try {
      const result = await api.post<FuelStationResponse[]>(
        ApiEndpoints.FUEL_CHEAPEST_STATIONS,
        capitalizeKeys(model)
      )

      if (result.status === 200 && result.data) {
        cheapestFuelStations.value = result.data
      }

      return cheapestFuelStations.value
    } catch (error) {
      console.error('Error fetching fuel stations:', error)
      throw error
    }
  }

  return {
    cheapestFuelStations,
    getCheapestFuelStations,
  }
})
