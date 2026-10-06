import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { ApiEndpoints } from '@/api/endpoints'
import { useApi } from '@/composables/useAxiosService'
import { usePagination } from '@/composables/usePagination'
import type { RouteEldCompaniesResponse, RouteEldCompany } from '@/types/company'
import { setCompanyId, setCompanyTimeZoneId } from '@/utils/company'

export type SortKey = 'name' | 'dotNumber' | 'isActive'
export type SortOrder = 'asc' | 'desc'

export function useCompanies() {
  const api = useApi()
  const router = useRouter()
  const companies = ref<RouteEldCompany[]>([])
  const isLoading = ref(false)
  const selectingCompanyId = ref<string | null>(null)
  const error = ref<string | null>(null)
  const searchCompany = ref('')
  const searchUsdot = ref('')
  const sortKey = ref<SortKey>('name')
  const sortOrder = ref<SortOrder>('asc')

  const filteredCompanies = computed(() => {
    const name = searchCompany.value.trim().toLowerCase()
    const dot = searchUsdot.value.trim().toLowerCase()
    const result = companies.value.filter(
      (company) =>
        (!name || company.name.toLowerCase().includes(name)) &&
        (!dot || company.dotNumber.toLowerCase().includes(dot))
    )

    return [...result].sort((left, right) => {
      const leftValue = left[sortKey.value]
      const rightValue = right[sortKey.value]
      const comparison = String(leftValue).localeCompare(String(rightValue))
      return sortOrder.value === 'asc' ? comparison : -comparison
    })
  })

  const pagination = usePagination(
    computed(() => filteredCompanies.value.length),
    { itemsPerPage: 10 }
  )
  const paginatedCompanies = computed(() => pagination.paginateData(filteredCompanies.value))

  const fetchCompanies = async () => {
    isLoading.value = true
    error.value = null
    try {
      const response = await api.get<RouteEldCompaniesResponse>(ApiEndpoints.ROUTE_ELD_COMPANIES)
      companies.value = response.data?.successResult ?? []
    } catch (exception: any) {
      error.value =
        exception.response?.data?.message || exception.message || 'Failed to load companies'
    } finally {
      isLoading.value = false
    }
  }

  const selectCompany = async (company: RouteEldCompany) => {
    if (!company.isActive || selectingCompanyId.value) return false
    selectingCompanyId.value = company.id
    try {
      const response = await api.post<{
        successResult: { issues: { message: string }[] }
      }>(ApiEndpoints.ROUTE_ELD_SELECT_COMPANY(company.id))
      for (const issue of response.data?.successResult?.issues ?? []) {
        toast.warning(issue.message)
      }
      setCompanyId(company.id)
      setCompanyTimeZoneId('UTC')
      await router.push('/eld/logs')
      return true
    } catch (exception: any) {
      toast.error(
        exception.response?.data?.message || exception.message || 'Failed to synchronize company'
      )
      return false
    } finally {
      selectingCompanyId.value = null
    }
  }

  const handleSort = (key: SortKey) => {
    if (sortKey.value === key) sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
    else {
      sortKey.value = key
      sortOrder.value = 'asc'
    }
  }

  watch([searchCompany, searchUsdot], () => pagination.resetPage())
  onMounted(fetchCompanies)

  return {
    companies,
    isLoading,
    selectingCompanyId,
    error,
    searchCompany,
    searchUsdot,
    sortKey,
    sortOrder,
    filteredCompanies,
    paginatedCompanies,
    currentPage: pagination.currentPage,
    itemsPerPage: pagination.itemsPerPage,
    totalPages: pagination.totalPages,
    totalEntries: pagination.totalEntries,
    pageNumbers: pagination.pageNumbers,
    goToPage: pagination.goToPage,
    nextPage: pagination.nextPage,
    previousPage: pagination.previousPage,
    fetchCompanies,
    selectCompany,
    handleSort,
  }
}
