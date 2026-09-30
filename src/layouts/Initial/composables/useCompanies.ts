// src/composables/useCompanies.ts
import { ref, computed, watch, onMounted } from 'vue'
import { useApi } from '@/composables/useAxiosService'
import type { ProvidersResponse, Provider, Carrier } from '@/types/company'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-vue-next'
import { usePagination } from '@/composables/usePagination'

export type SortKey = 'providerName' | 'carrierCount'
export type SortOrder = 'asc' | 'desc'

export interface UseCompaniesOptions {
  autoFetch?: boolean
}

export function useCompanies(options: UseCompaniesOptions = {}) {
  const { autoFetch = true } = options
  const api = useApi()

  // API State
  const providers = ref<Provider[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Modal state
  const isCreateModalOpen = ref(false)

  // Search filters
  const searchCompany = ref('')
  const searchUsdot = ref('')

  // Debounced search
  const debouncedSearchCompany = ref('')
  const debouncedSearchUsdot = ref('')
  let searchTimeout: ReturnType<typeof setTimeout>

  // Sorting
  const sortKey = ref<SortKey>('providerName')
  const sortOrder = ref<SortOrder>('asc')

  watch([searchCompany, searchUsdot], () => {
    if (searchTimeout) clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
      debouncedSearchCompany.value = searchCompany.value
      debouncedSearchUsdot.value = searchUsdot.value
    }, 300)
  })

  // Filtered providers
  const filteredProviders = computed(() => {
    let filtered = providers.value

    // Filter by provider/carrier name
    if (debouncedSearchCompany.value) {
      const search = debouncedSearchCompany.value.toLowerCase()
      filtered = filtered.filter(
        (provider) =>
          provider.providerName.toLowerCase().includes(search) ||
          provider.carriers.some((carrier) => carrier.name.toLowerCase().includes(search))
      )
    }

    // Filter by USDOT
    if (debouncedSearchUsdot.value) {
      filtered = filtered.filter((provider) =>
        provider.carriers.some((carrier) =>
          carrier.usdotNumber.includes(debouncedSearchUsdot.value)
        )
      )
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let aVal: any
      let bVal: any

      if (sortKey.value === 'providerName') {
        aVal = a.providerName
        bVal = b.providerName
      } else if (sortKey.value === 'carrierCount') {
        aVal = a.carriers.length
        bVal = b.carriers.length
      }

      if (typeof aVal === 'number') {
        return sortOrder.value === 'asc' ? aVal - bVal : bVal - aVal
      }

      if (aVal < bVal) return sortOrder.value === 'asc' ? -1 : 1
      if (aVal > bVal) return sortOrder.value === 'asc' ? 1 : -1
      return 0
    })

    return sorted
  })

  // Setup pagination
  const pagination = usePagination(
    computed(() => filteredProviders.value.length),
    {
      itemsPerPage: 10,
    }
  )

  // Paginated providers
  const paginatedProviders = computed(() => pagination.paginateData(filteredProviders.value))

  // Functions
  const handleSort = (key: SortKey) => {
    if (sortKey.value === key) {
      sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
    } else {
      sortKey.value = key
      sortOrder.value = 'asc'
    }
  }

  const getSortIcon = (key: SortKey) => {
    if (sortKey.value !== key) return ArrowUpDown
    return sortOrder.value === 'asc' ? ArrowUp : ArrowDown
  }

  const toggleCarrierStatus = (providerId: string, carrierId: string) => {
    const provider = providers.value.find((p) => p.providerId === providerId)
    if (provider) {
      const carrier = provider.carriers.find((c) => c.carrierId === carrierId)
      if (carrier) {
        // Toggle status logic here
        console.log('Toggle carrier status:', carrierId)
      }
    }
  }

  // Fetch providers from API
  const fetchProviders = async () => {
    isLoading.value = true
    error.value = null

    try {
      const response = await api.get<ProvidersResponse>('/api/providers/providers/filter')

      if (response.data?.successResult) {
        providers.value = response.data.successResult
      } else {
        throw new Error('Invalid response format')
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message || 'Failed to fetch providers'
      console.error('Error fetching providers:', err)
    } finally {
      isLoading.value = false
    }
  }

  // Refresh providers list
  const refreshProviders = async () => {
    await fetchProviders()
  }

  // Get provider by ID
  const getProviderById = (providerId: string): Provider | undefined => {
    return providers.value.find((provider) => provider.providerId === providerId)
  }

  // Create company
  const handleCreateCompany = async (companyData: any) => {
    try {
      // TODO: Implement create company API call
      console.log('Create company:', companyData)
      isCreateModalOpen.value = false
      await refreshProviders()
    } catch (err) {
      console.error('Error creating company:', err)
      throw err
    }
  }

  // Modal actions
  const openCreateModal = () => {
    isCreateModalOpen.value = true
  }

  const closeCreateModal = () => {
    isCreateModalOpen.value = false
  }

  // Auto-fetch on mount if enabled
  if (autoFetch) {
    onMounted(async () => {
      await fetchProviders()
    })
  }

  return {
    // API State
    providers,
    isLoading,
    error,

    // Modal state
    isCreateModalOpen,

    // Search
    searchCompany,
    searchUsdot,
    debouncedSearchCompany,
    debouncedSearchUsdot,

    // Sorting
    sortKey,
    sortOrder,

    // Pagination
    currentPage: pagination.currentPage,
    itemsPerPage: pagination.itemsPerPage,
    totalPages: pagination.totalPages,
    totalEntries: pagination.totalEntries,
    pageNumbers: pagination.pageNumbers,
    goToPage: pagination.goToPage,
    nextPage: pagination.nextPage,
    previousPage: pagination.previousPage,

    // Computed
    filteredProviders,
    paginatedProviders,

    // Functions
    fetchProviders,
    refreshProviders,
    getProviderById,
    handleSort,
    getSortIcon,
    toggleCarrierStatus,
    handleCreateCompany,
    openCreateModal,
    closeCreateModal,
  }
}
