import { computed, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { ApiEndpoints } from '@/api/endpoints'
import { useApi } from '@/composables/useAxiosService'
import { useDebounce } from '@/composables/useDebounce'
import type {
  RouteEldCompaniesPageResponse,
  RouteEldCompany,
  RouteEldCompanyResponse,
} from '@/types/company'
import { setCompanyId, setCompanyTimeZoneId } from '@/utils/company'

const pageSize = 25

export function useCompanySwitcher() {
  const api = useApi()
  const companies = ref<RouteEldCompany[]>([])
  const selectedCompany = ref<RouteEldCompany | null>(null)
  const selectedCompanyId = ref(localStorage.getItem('companyId'))
  const searchQuery = ref('')
  const debouncedSearch = useDebounce(searchQuery, 300)
  const pageNumber = ref(1)
  const totalPages = ref(0)
  const totalCount = ref(0)
  const isLoading = ref(false)
  const isLoadingMore = ref(false)
  const selectingCompanyId = ref<string | null>(null)
  const error = ref<string | null>(null)
  let requestSequence = 0

  const selectedCompanyName = computed(
    () => selectedCompany.value?.name || localStorage.getItem('companyName') || ''
  )
  const hasMore = computed(() => pageNumber.value < totalPages.value)

  const loadSelectedCompany = async () => {
    if (!selectedCompanyId.value) return
    try {
      const response = await api.get<RouteEldCompanyResponse>(
        ApiEndpoints.ROUTE_ELD_COMPANY(selectedCompanyId.value)
      )
      selectedCompany.value = response.data.successResult
      localStorage.setItem('companyName', selectedCompany.value.name)
    } catch {
      selectedCompany.value = null
    }
  }

  const loadCompanies = async (append = false) => {
    const sequence = ++requestSequence
    const nextPage = append ? pageNumber.value + 1 : 1
    if (append) isLoadingMore.value = true
    else isLoading.value = true
    error.value = null

    try {
      const response = await api.get<RouteEldCompaniesPageResponse>(
        ApiEndpoints.ROUTE_ELD_COMPANIES_PAGE,
        {
          params: {
            search: debouncedSearch.value.trim() || undefined,
            pageNumber: nextPage,
            pageSize,
          },
        }
      )
      if (sequence !== requestSequence) return

      const result = response.data.successResult
      companies.value = append
        ? [
            ...companies.value,
            ...result.data.filter((item) => !companies.value.some((x) => x.id === item.id)),
          ]
        : result.data
      pageNumber.value = result.pagination.pageNumber
      totalPages.value = result.pagination.totalPages
      totalCount.value = result.pagination.totalCount
    } catch (exception: any) {
      if (sequence !== requestSequence) return
      error.value =
        exception.response?.data?.message || exception.message || 'Failed to load companies'
    } finally {
      if (sequence === requestSequence) {
        isLoading.value = false
        isLoadingMore.value = false
      }
    }
  }

  const selectCompany = async (company: RouteEldCompany) => {
    if (!company.isActive || selectingCompanyId.value) return false
    if (company.id === selectedCompanyId.value) return true

    selectingCompanyId.value = company.id
    try {
      await api.post(ApiEndpoints.ROUTE_ELD_SELECT_COMPANY(company.id))
      setCompanyId(company.id)
      setCompanyTimeZoneId('UTC')
      localStorage.setItem('companyName', company.name)
      selectedCompanyId.value = company.id
      selectedCompany.value = company
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

  watch(debouncedSearch, () => loadCompanies())
  loadSelectedCompany()

  return {
    companies,
    selectedCompanyId,
    selectedCompanyName,
    searchQuery,
    totalCount,
    hasMore,
    isLoading,
    isLoadingMore,
    selectingCompanyId,
    error,
    loadCompanies,
    selectCompany,
  }
}
