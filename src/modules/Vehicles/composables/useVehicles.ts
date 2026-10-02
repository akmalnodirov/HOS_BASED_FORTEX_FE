import { computed, onMounted, ref, watch } from 'vue'
import { ApiEndpoints } from '@/api/endpoints'
import { useApi } from '@/composables/useAxiosService'
import { useDebounce } from '@/composables/useDebounce'
import { usePagination } from '@/composables/usePagination'
import { useSorting } from '@/composables/useSorting'
import type { Vehicle, VehicleApiResponse } from '@/modules/Vehicles/types'
import { getCompanyId } from '@/utils/company'
import { commonTransformers, sortArray } from '@/utils/sort'

export type SortKey = keyof Vehicle

interface VehiclesListResponse {
  successResult: {
    data: VehicleApiResponse[]
    totalCount: number
  }
}

export function useVehicles() {
  const api = useApi()
  const allVehicles = ref<Vehicle[]>([])
  const totalCount = ref(0)
  const isLoading = ref(false)
  const searchQuery = ref('')
  const sorting = useSorting<SortKey>({ defaultKey: 'id', defaultOrder: 'asc' })
  const pagination = usePagination(totalCount, { itemsPerPage: 10 })
  const debouncedSearch = useDebounce(searchQuery, 300, pagination.resetPage)

  const fetchVehicles = async () => {
    isLoading.value = true
    try {
      const response = await api.post<VehiclesListResponse>(ApiEndpoints.VEHICLES_FILTER, {
        companyId: getCompanyId(),
        pageNumber: pagination.currentPage.value,
        pageSize: pagination.itemsPerPage.value,
        status: null,
      })
      const result = response.data?.successResult
      totalCount.value = result?.totalCount ?? 0
      allVehicles.value = (result?.data ?? []).map((vehicle) => ({
        id: vehicle.id,
        unit: vehicle.unit || '',
        model: vehicle.model || '',
        make: vehicle.make || '',
        eld: vehicle.serialNumber || '',
        vin: vehicle.vin || '',
        status: vehicle.status ?? false,
        isAllowedSleep: vehicle.isAllowedSleep ?? false,
      }))
    } finally {
      isLoading.value = false
    }
  }

  const filteredVehicles = computed(() => {
    const search = debouncedSearch.value.toLowerCase()
    const vehicles = search
      ? allVehicles.value.filter(
          (vehicle) =>
            vehicle.unit.toLowerCase().includes(search) ||
            vehicle.model.toLowerCase().includes(search) ||
            vehicle.make.toLowerCase().includes(search) ||
            vehicle.vin.toLowerCase().includes(search)
        )
      : [...allVehicles.value]
    sortArray(vehicles, sorting.sortKey.value, sorting.sortOrder.value, {
      id: commonTransformers.toNumber,
      status: commonTransformers.toBoolean,
    })
    return vehicles
  })

  watch([() => pagination.currentPage.value, () => pagination.itemsPerPage.value], fetchVehicles)
  onMounted(fetchVehicles)

  return {
    allVehicles,
    isLoading,
    searchQuery,
    currentPage: pagination.currentPage,
    itemsPerPage: pagination.itemsPerPage,
    totalPages: pagination.totalPages,
    totalEntries: pagination.totalEntries,
    pageNumbers: pagination.pageNumbers,
    goToPage: pagination.goToPage,
    nextPage: pagination.nextPage,
    previousPage: pagination.previousPage,
    paginatedVehicles: filteredVehicles,
    handleSort: sorting.handleSort,
    fetchVehicles,
  }
}
