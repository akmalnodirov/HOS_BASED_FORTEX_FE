/**
 * Composable for managing VehicleFuels
 * Handles data fetching, pagination, sorting, and CRUD operations
 */

import { ref, computed, watch, onMounted } from 'vue'
import { useDebounce } from '@/composables/useDebounce'
import { sortArray, commonTransformers } from '@/utils/sort'
import { usePagination } from '@/composables/usePagination'
import { useSorting } from '@/composables/useSorting'
import { vehicleFuelService } from '../services/vehicleFuelService'
import type {
  VehicleFuelResponse,
  SortKey,
  SortOrder,
  VehicleFuel,
  VehicleFuelFormData,
} from '../types'

export function useVehicleFuels() {
  // State
  const vehicleFuels = ref<VehicleFuelResponse[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const searchQuery = ref('')

  // Sorting using composable
  const sorting = useSorting<SortKey>({
    defaultKey: 'name',
    defaultOrder: 'asc',
  })

  // Pagination setup
  const totalItems = ref(0)
  const pagination = usePagination(totalItems, { itemsPerPage: 10 })

  // Debounce search - triggers API refetch
  const debouncedSearch = useDebounce(searchQuery, 300, () => {
    pagination.resetPage()
    fetchVehicleFuels()
  })

  /**
   * Fetch vehicle fuels from API with pagination, search, and sorting
   */
  const fetchVehicleFuels = async () => {
    isLoading.value = true
    error.value = null

    try {
      const params = {
        pageNumber: pagination.currentPage.value,
        pageSize: pagination.itemsPerPage.value,
        search: debouncedSearch.value || undefined,
        sortKey: sorting.sortKey.value || undefined,
        sortOrder: sorting.sortOrder.value || undefined,
      }

      const response = await vehicleFuelService.getVehicleFuels(params)

      if (response.successResult) {
        vehicleFuels.value = response.successResult.data || []
        totalItems.value = response.successResult.totalCount || 0
      } else {
        vehicleFuels.value = []
        totalItems.value = 0
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message || 'Failed to fetch vehicle fuels'
      console.error('Error fetching vehicle fuels:', err)
    } finally {
      isLoading.value = false
    }
  }

  // Transform backend data for table display
  // Backend handles filtering, sorting, and pagination
  const paginatedVehicleFuels = computed(() => {
    const startIndex = (pagination.currentPage.value - 1) * pagination.itemsPerPage.value

    return vehicleFuels.value.map((vehicleFuel, index) => ({
      id: vehicleFuel.id,
      no: startIndex + index + 1,
      name: vehicleFuel.name,
    })) as VehicleFuel[]
  })

  // Methods
  const addVehicleFuel = async (data: VehicleFuelFormData) => {
    try {
      await vehicleFuelService.createVehicleFuel({
        name: data.name,
      })

      await fetchVehicleFuels()
    } catch (err: any) {
      console.error('Error adding vehicle fuel:', err)
      throw err
    }
  }

  const updateVehicleFuel = async (id: string | number, data: VehicleFuelFormData) => {
    try {
      await vehicleFuelService.updateVehicleFuel(String(id), {
        name: data.name,
      })

      await fetchVehicleFuels()
    } catch (err: any) {
      console.error('Error updating vehicle fuel:', err)
      throw err
    }
  }

  const deleteVehicleFuel = async (id: string | number) => {
    try {
      await vehicleFuelService.deleteVehicleFuel(String(id))
      await fetchVehicleFuels()
    } catch (err: any) {
      console.error('Error deleting vehicle fuel:', err)
      throw err
    }
  }

  // Watchers - refetch when pagination or sorting changes
  watch(
    [
      () => pagination.currentPage.value,
      () => pagination.itemsPerPage.value,
      () => sorting.sortKey.value,
      () => sorting.sortOrder.value,
    ],
    () => {
      fetchVehicleFuels()
    }
  )

  // Auto-fetch on mount
  onMounted(async () => {
    await fetchVehicleFuels()
  })

  return {
    // State
    searchQuery,
    debouncedSearch,
    sortKey: sorting.sortKey,
    sortOrder: sorting.sortOrder,
    isLoading,
    error,

    // Pagination
    currentPage: pagination.currentPage,
    itemsPerPage: pagination.itemsPerPage,
    totalPages: pagination.totalPages,
    totalEntries: pagination.totalEntries,
    pageNumbers: pagination.pageNumbers,
    goToPage: pagination.goToPage,

    // Computed
    paginatedVehicleFuels,

    // Methods
    handleSort: sorting.handleSort,
    addVehicleFuel,
    updateVehicleFuel,
    deleteVehicleFuel,
    fetchVehicleFuels,
  }
}
