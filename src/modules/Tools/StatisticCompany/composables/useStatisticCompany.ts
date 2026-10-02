import { computed, onMounted, ref } from 'vue'
import { useApi } from '@/composables/useAxiosService'
import { ApiEndpoints } from '@/api/endpoints'
import { useAuthStore } from '@/modules/Auth/store/authStore'
import type {
  Company,
  CompanyName,
  CompanyNamesResponse,
  CompaniesStatisticsResponse,
  CompanyDetailedResponse,
} from '../types'

const timeFilterMap: Record<string, number> = {
  Weekly: 1,
  Monthly: 2,
  Yearly: 3,
}

export function useStatisticCompany() {
  const api = useApi()
  const authStore = useAuthStore()

  const clientId = computed(() => authStore.clientId || '')

  // Table data — always shows all companies
  const tableCompanies = ref<Company[]>([])
  const companyNames = ref<CompanyName[]>([])
  const isLoadingTable = ref(false)

  // Chart data — only populated when a carrier is selected
  const detailedCompany = ref<Company | null>(null)
  const detailedSession = ref<Company | null>(null)
  const isLoadingChart = ref(false)

  // Selection
  const selectedCompanyId = ref<string | null>(null)
  const timeFilter = ref<string>('Weekly')

  // Time filter as API value (1=Weekly, 2=Monthly, 3=Yearly)
  const timeFilterValue = computed(() => timeFilterMap[timeFilter.value] || 3)

  // Fetch company names for dropdown + table name matching
  async function fetchCompanyNames() {
    try {
      const response = await api.get<CompanyNamesResponse>(ApiEndpoints.STATISTICS_COMPANY_NAMES, {
        params: { clientId: clientId.value },
      })
      if (response.data?.successResult) {
        companyNames.value = response.data.successResult
      }
    } catch (err) {
      console.error('Error fetching company names:', err)
    }
  }

  // Fetch all companies statistics — for the TABLE (always visible)
  async function fetchTableStatistics() {
    isLoadingTable.value = true
    try {
      const params = { type: timeFilterValue.value, clientId: clientId.value }
      const response = await api.get<CompaniesStatisticsResponse>(ApiEndpoints.STATISTICS_COMPANY, {
        params,
      })
      if (response.data?.successResult?.data) {
        tableCompanies.value = response.data.successResult.data
      } else {
        tableCompanies.value = []
      }
    } catch (err) {
      console.error('Error fetching table statistics:', err)
    } finally {
      isLoadingTable.value = false
    }
  }

  // Fetch detailed statistics for selected carrier — for CHARTS
  async function fetchDetailedStatistics(companyId: string) {
    isLoadingChart.value = true
    try {
      const params = { type: timeFilterValue.value, clientId: clientId.value }

      const [companyRes, sessionRes] = await Promise.allSettled([
        api.get<CompanyDetailedResponse>(ApiEndpoints.STATISTICS_COMPANY_DETAILED(companyId), {
          params,
        }),
        api.get<CompanyDetailedResponse>(
          ApiEndpoints.STATISTICS_COMPANY_DETAILED_SESSION(companyId),
          { params }
        ),
      ])

      detailedCompany.value =
        companyRes.status === 'fulfilled' ? companyRes.value.data?.successResult || null : null
      detailedSession.value =
        sessionRes.status === 'fulfilled' ? sessionRes.value.data?.successResult || null : null
    } catch (err) {
      console.error('Error fetching detailed statistics:', err)
    } finally {
      isLoadingChart.value = false
    }
  }

  // Clear chart data
  function clearChartData() {
    detailedCompany.value = null
    detailedSession.value = null
  }

  // Chart data for TrucksChart — empty if no carrier selected
  const trucksChartData = computed(() => {
    if (!detailedCompany.value) {
      return { categories: [] as string[], series: [] as number[] }
    }
    return {
      categories: detailedCompany.value.data?.map((d) => d.name) || [],
      series: detailedCompany.value.data?.map((d) => d.quantity) || [],
    }
  })

  // Chart data for RequestsChart — empty if no carrier selected
  const requestsChartData = computed(() => {
    if (!detailedSession.value) {
      return { categories: [] as string[], series: [] as number[] }
    }
    return {
      categories: detailedSession.value.data?.map((d) => d.name) || [],
      series: detailedSession.value.data?.map((d) => d.quantity) || [],
    }
  })

  // Selected company name (for table checkbox highlighting)
  const selectedCompanyName = computed(() => {
    if (!selectedCompanyId.value) return null
    const found = companyNames.value.find((c) => c.id === selectedCompanyId.value)
    return found?.name || null
  })

  // Select a company by ID (from dropdown)
  function selectCompany(companyId: string | null) {
    if (companyId === selectedCompanyId.value) {
      // Toggle off
      selectedCompanyId.value = null
      clearChartData()
      return
    }
    selectedCompanyId.value = companyId
    if (companyId) {
      fetchDetailedStatistics(companyId)
    } else {
      clearChartData()
    }
  }

  // Select a company by name (from table row click)
  function selectCompanyByName(companyName: string | null) {
    if (!companyName) {
      selectedCompanyId.value = null
      clearChartData()
      return
    }
    const found = companyNames.value.find((c) => c.name === companyName)
    if (found) {
      selectCompany(found.id)
    }
  }

  // Change time filter
  async function changeTimeFilter(value: string) {
    timeFilter.value = value
    // Re-fetch table and chart data in parallel so loaders show immediately
    const promises: Promise<void>[] = [fetchTableStatistics()]
    if (selectedCompanyId.value) {
      promises.push(fetchDetailedStatistics(selectedCompanyId.value))
    }
    await Promise.allSettled(promises)
  }

  // Initial load — only table + company names, charts stay empty
  onMounted(async () => {
    await fetchCompanyNames()
    await fetchTableStatistics()
  })

  return {
    // Table
    tableCompanies,
    companyNames,
    isLoadingTable,

    // Charts
    trucksChartData,
    requestsChartData,
    isLoadingChart,

    // Selection
    selectedCompanyId,
    selectedCompanyName,
    timeFilter,

    // Actions
    selectCompany,
    selectCompanyByName,
    changeTimeFilter,
  }
}
