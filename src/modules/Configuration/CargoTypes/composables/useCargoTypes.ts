/**
 * Composable for managing CargoTypes
 * Handles data fetching, pagination, sorting, and CRUD operations
 */

import { ref, computed, watch, onMounted } from 'vue'
import { useDebounce } from '@/composables/useDebounce'
import { sortArray, commonTransformers } from '@/utils/sort'
import { usePagination } from '@/composables/usePagination'
import { useSorting } from '@/composables/useSorting'
import { cargoTypeService } from '../services/cargoTypeService'
import type {
  CargoTypeResponse,
  SortKey,
  SortOrder,
  CargoType,
  CargoTypeFormData,
} from '../types'

export function useCargoTypes() {
  // State
  const cargoTypes = ref<CargoTypeResponse[]>([])
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
    fetchCargoTypes()
  })

  /**
   * Fetch cargo types from API with pagination, search, and sorting
   */
  const fetchCargoTypes = async () => {
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

      const response = await cargoTypeService.getCargoTypes(params)

      if (response.successResult) {
        cargoTypes.value = response.successResult.data || []
        totalItems.value = response.successResult.totalCount || 0
      } else {
        cargoTypes.value = []
        totalItems.value = 0
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message || 'Failed to fetch cargo types'
      console.error('Error fetching cargo types:', err)
    } finally {
      isLoading.value = false
    }
  }

  // Transform backend data for table display
  // Backend handles filtering, sorting, and pagination
  const paginatedCargoTypes = computed(() => {
    const startIndex = (pagination.currentPage.value - 1) * pagination.itemsPerPage.value

    return cargoTypes.value.map((cargoType, index) => ({
      id: cargoType.id,
      no: startIndex + index + 1,
      name: cargoType.name,
    })) as CargoType[]
  })

  // Methods
  const addCargoType = async (data: CargoTypeFormData) => {
    try {
      await cargoTypeService.createCargoType({
        name: data.name,
      })

      await fetchCargoTypes()
    } catch (err: any) {
      console.error('Error adding cargo type:', err)
      throw err
    }
  }

  const updateCargoType = async (id: string | number, data: CargoTypeFormData) => {
    try {
      await cargoTypeService.updateCargoType(String(id), {
        name: data.name,
      })

      await fetchCargoTypes()
    } catch (err: any) {
      console.error('Error updating cargo type:', err)
      throw err
    }
  }

  const deleteCargoType = async (id: string | number) => {
    try {
      await cargoTypeService.deleteCargoType(String(id))
      await fetchCargoTypes()
    } catch (err: any) {
      console.error('Error deleting cargo type:', err)
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
      fetchCargoTypes()
    }
  )

  // Auto-fetch on mount
  onMounted(async () => {
    await fetchCargoTypes()
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
    paginatedCargoTypes,

    // Methods
    handleSort: sorting.handleSort,
    addCargoType,
    updateCargoType,
    deleteCargoType,
    fetchCargoTypes,
  }
}
