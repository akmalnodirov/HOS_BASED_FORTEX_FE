import { ref } from 'vue'
import { useApi } from '@/composables/useAxiosService'
import { ApiEndpoints } from '@/api/endpoints'
import { useAuthStore } from '@/modules/Auth/store/authStore'

export interface CompanyItem {
  id: string
  name: string
  timeZoneInfo?: { ianaId: string }
  client?: { name: string }
}

export interface DriverItem {
  id: string
  name: string
  user?: { firstName: string; lastName: string }
}

export function useCompaniesDrivers() {
  const api = useApi()
  const authStore = useAuthStore()

  const companies = ref<CompanyItem[]>([])
  const drivers = ref<DriverItem[]>([])

  async function fetchCompanies() {
    try {
      const response = await api.post<{
        successResult: { data: Array<Omit<CompanyItem, 'client'> & { provider?: { name: string } }> }
      }>(
        ApiEndpoints.COMPANIES_FILTER,
        { pageNumber: null, pageSize: null, clientId: authStore.clientId }
      )
      companies.value = (response.data?.successResult?.data ?? []).map((company) => ({
        ...company,
        client: company.provider,
      }))
    } catch (err) {
      console.error('Error fetching companies:', err)
    }
  }

  async function fetchDrivers(companyId?: string | null) {
    try {
      const payload: Record<string, unknown> = { pageNumber: null, pageSize: null }
      if (companyId && companyId !== 'all') payload.companyId = companyId

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

  return { companies, drivers, fetchCompanies, fetchDrivers }
}
