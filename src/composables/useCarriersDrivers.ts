import { ref } from 'vue'
import { useApi } from '@/composables/useAxiosService'
import { ApiEndpoints } from '@/api/endpoints'
import { useAuthStore } from '@/modules/Auth/store/authStore'

export interface CarrierItem {
  id: string
  name: string
  timeZoneInfo?: { ianaId: string }
  provider?: { name: string }
}

export interface DriverItem {
  id: string
  name: string
  user?: { firstName: string; lastName: string }
}

export function useCarriersDrivers() {
  const api = useApi()
  const authStore = useAuthStore()

  const carriers = ref<CarrierItem[]>([])
  const drivers = ref<DriverItem[]>([])

  async function fetchCarriers() {
    try {
      const response = await api.post<{ successResult: { data: CarrierItem[] } }>(
        ApiEndpoints.CARRIERS_FILTER,
        { pageNumber: null, pageSize: null, providerId: authStore.providerId }
      )
      carriers.value = response.data?.successResult?.data ?? []
    } catch (err) {
      console.error('Error fetching carriers:', err)
    }
  }

  async function fetchDrivers(carrierId?: string | null) {
    try {
      const payload: Record<string, unknown> = { pageNumber: null, pageSize: null }
      if (carrierId && carrierId !== 'all') payload.carrierId = carrierId

      const response = await api.post<{ successResult: { data: any[] } | any[] }>(
        ApiEndpoints.DRIVERS_FILTER,
        payload
      )

      const result = response.data?.successResult
      const list: any[] = Array.isArray(result) ? result : result?.data ?? []

      drivers.value = list.map((d) => ({
        id: d.id,
        name: d.user ? `${d.user.firstName} ${d.user.lastName}` : d.name || 'Unknown',
        user: d.user,
      }))
    } catch (err) {
      console.error('Error fetching drivers:', err)
    }
  }

  return { carriers, drivers, fetchCarriers, fetchDrivers }
}
