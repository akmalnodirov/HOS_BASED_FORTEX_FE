import { ref, computed, watch, onMounted } from 'vue'
import { useApi } from '@/composables/useAxiosService'
import { toast } from 'vue-sonner'
import { useDebounce } from '@/composables/useDebounce'
import { sortArray, commonTransformers, type SortOrder } from '@/utils/sort'
import { usePagination } from '@/composables/usePagination'
import { useSorting } from '@/composables/useSorting'
import { useModalState } from '@/composables/useModalState'
import { ApiEndpoints } from '@/api/endpoints'
import { getCarrierId } from '@/utils/carrier'
import type {
  Vehicle,
  VehicleApiResponse,
  VehicleRequest,
  VehicleSingleResponse,
  FuelOption,
  EldConnectionOption,
  IssuerStateOption,
} from '@/modules/Vehicles/types'

export type SortKey = keyof Vehicle

interface VehiclesListResponse {
  successResult: {
    data: VehicleApiResponse[]
    totalCount: number
  }
}

interface SingleVehicleResponse {
  successResult: VehicleSingleResponse
}

interface ConfigResponse<T> {
  successResult: { data: T[]; totalCount: number }
}

interface VinDecodeResult {
  isValid: boolean
  year?: number
  make?: string
  model?: string
  fuelType?: string
  eldConnectionId?: number | string
}

interface VinDecodeApiResponse {
  successResult: VinDecodeResult
}

export function useVehicles() {
  const api = useApi()

  // State
  const allVehicles = ref<Vehicle[]>([])
  const totalCount = ref(0)
  const isLoading = ref(false)

  // Search and filters
  const searchQuery = ref('')

  // Modal state
  const vehicleModal = useModalState<Vehicle>()

  // Full vehicle details for edit (fetched from GET /vehicles/{id})
  const vehicleDetails = ref<VehicleSingleResponse | null>(null)

  // Status confirm modal
  const isStatusConfirmOpen = ref(false)
  const pendingStatusVehicle = ref<Vehicle | null>(null)
  const isStatusChanging = ref(false)

  // Sorting
  const sorting = useSorting<SortKey>({
    defaultKey: 'id',
    defaultOrder: 'asc',
  })

  // Pagination - server-side
  const pagination = usePagination(totalCount, { itemsPerPage: 10 })

  // Debounced search
  const debouncedSearch = useDebounce(searchQuery, 300, () => {
    pagination.resetPage()
  })

  // Configuration data for add/edit form
  const fuels = ref<FuelOption[]>([])
  const eldConnections = ref<EldConnectionOption[]>([])
  const issuerStates = ref<IssuerStateOption[]>([])

  // VIN decode state
  const vinDecodingLoading = ref(false)
  const vinError = ref('')

  // Transform API response to UI shape
  const mapApiToVehicle = (v: VehicleApiResponse): Vehicle => ({
    id: v.id,
    unit: v.unit || 'N/A',
    model: v.model || 'N/A',
    make: v.make || 'N/A',
    eld: v.serialNumber || 'N/A',
    vin: v.vin || 'N/A',
    status: v.status ?? false,
    isAllowedSleep: v.isAllowedSleep ?? false,
  })

  // Fetch vehicles from API
  const fetchVehicles = async () => {
    isLoading.value = true
    try {
      const response = await api.post<VehiclesListResponse>(ApiEndpoints.VEHICLES_FILTER, {
        carrierId: getCarrierId(),
        pageNumber: pagination.currentPage.value,
        pageSize: pagination.itemsPerPage.value,
        status: null,
      })

      if (response.data?.successResult) {
        const apiData = response.data.successResult.data || []
        totalCount.value = response.data.successResult.totalCount || 0
        allVehicles.value = apiData.map(mapApiToVehicle)
      } else {
        allVehicles.value = []
        totalCount.value = 0
      }
    } catch (error: any) {
      console.error('Error fetching vehicles:', error)
    } finally {
      isLoading.value = false
    }
  }

  // Fetch single vehicle details (for edit mode)
  const fetchVehicleById = async (id: string): Promise<VehicleSingleResponse | null> => {
    try {
      const response = await api.get<SingleVehicleResponse>(ApiEndpoints.VEHICLES_BY_ID(id))
      return response.data?.successResult ?? null
    } catch (error) {
      console.error('Error fetching vehicle by id:', error)
      return null
    }
  }

  // Fetch configuration data
  const fetchFuels = async () => {
    try {
      const response = await api.get<ConfigResponse<FuelOption>>(ApiEndpoints.VEHICLE_FUEL_URL)
      if (response.data?.successResult?.data) fuels.value = response.data.successResult.data
    } catch (error) {
      console.error('Error fetching fuels:', error)
    }
  }

  const fetchEldConnections = async () => {
    try {
      const response = await api.get<ConfigResponse<EldConnectionOption>>(
        ApiEndpoints.ELD_CONNECTION_URL
      )
      if (response.data?.successResult?.data) eldConnections.value = response.data.successResult.data
    } catch (error) {
      console.error('Error fetching ELD connections:', error)
    }
  }

  const fetchIssuerStates = async () => {
    try {
      const response = await api.get<ConfigResponse<IssuerStateOption>>(
        ApiEndpoints.ISSUER_STATE_URL
      )
      if (response.data?.successResult?.data) issuerStates.value = response.data.successResult.data
    } catch (error) {
      console.error('Error fetching issuer states:', error)
    }
  }

  // VIN decode — returns decoded data and auto-fills form fields via callback
  const decodeVin = async (vin: string): Promise<VinDecodeResult | null> => {
    if (!vin || vin.length !== 17) return null
    vinDecodingLoading.value = true
    vinError.value = ''
    try {
      const response = await api.post<VinDecodeApiResponse>(ApiEndpoints.VEHICLES_DECODE_VIN, vin)
      const result = response.data?.successResult
      if (!result || result.isValid === false) {
        vinError.value = 'Vehicle not found for this VIN'
        return null
      }
      return result
    } catch (error) {
      console.error('Error decoding VIN:', error)
      vinError.value = 'Vehicle not found for this VIN'
      return null
    } finally {
      vinDecodingLoading.value = false
    }
  }

  // Filtered vehicles (client-side search on current page)
  const filteredVehicles = computed(() => {
    let filtered = allVehicles.value

    if (debouncedSearch.value) {
      const s = debouncedSearch.value.toLowerCase()
      filtered = filtered.filter(
        (v) =>
          v.unit.toLowerCase().includes(s) ||
          v.model.toLowerCase().includes(s) ||
          v.make.toLowerCase().includes(s) ||
          v.vin.toLowerCase().includes(s)
      )
    }

    sortArray(filtered, sorting.sortKey.value, sorting.sortOrder.value, {
      id: commonTransformers.toNumber,
      status: commonTransformers.toBoolean,
    })

    return filtered
  })

  const paginatedVehicles = computed(() => filteredVehicles.value)

  // Open add modal
  const openAddModal = () => {
    vehicleDetails.value = null
    vehicleModal.open()
  }

  // Open edit modal — fetch full details first
  const openEditModal = async (vehicle: Vehicle) => {
    vehicleDetails.value = null
    vehicleModal.open(vehicle)
    const details = await fetchVehicleById(vehicle.id as string)
    vehicleDetails.value = details
  }

  const closeModal = () => {
    vehicleModal.close()
    vehicleDetails.value = null
    vinError.value = ''
  }

  // Handle save (add or update)
  const handleSaveVehicle = async (vehicleData: any) => {
    try {
      const request: VehicleRequest = {
        unit: vehicleData.unit,
        make: vehicleData.make,
        model: vehicleData.model,
        manufactureYear: parseInt(vehicleData.year) || 0,
        vin: vehicleData.vin,
        vehicleFuelId: vehicleData.vehicleFuelId,
        eldVehicleConnectionId: vehicleData.eldVehicleConnectionId,
        carrierId: getCarrierId() || '',
        isAllowedSleep: vehicleData.isAllowedSleep ?? false,
      }

      if (vehicleData.licensePlateState && vehicleData.licensePlateNumber) {
        request.licensePlate = {
          issuerStateId: vehicleData.licensePlateState,
          plateNumber: vehicleData.licensePlateNumber,
        }
      }

      if (vehicleModal.selectedItem.value) {
        // Update existing vehicle
        await api.put(ApiEndpoints.VEHICLES_BY_ID(vehicleModal.selectedItem.value.id as string), request)
        toast.success('Vehicle updated successfully')
      } else {
        // Add new vehicle
        const response = await api.post<{ successResult: any }>(ApiEndpoints.VEHICLES, request)

        // Check for duplicate VIN
        if (response.data?.successResult?.code === 'DUPLICATE_VALUE') {
          vinError.value = response.data.successResult.message || 'This VIN already exists'
          return // Keep modal open
        }

        toast.success('Vehicle added successfully')
      }

      closeModal()
      await fetchVehicles()
    } catch (error) {
      console.error('Error saving vehicle:', error)
    }
  }

  // Status toggle — opens confirm modal
  const openStatusModal = (vehicle: Vehicle) => {
    pendingStatusVehicle.value = vehicle
    isStatusConfirmOpen.value = true
  }

  const confirmToggleStatus = async () => {
    const vehicle = pendingStatusVehicle.value
    if (!vehicle) return
    isStatusChanging.value = true
    try {
      const newState = vehicle.status ? 1 : 0
      await api.put(ApiEndpoints.VEHICLES_STATE(vehicle.id as string), { state: newState })
      toast.success('Vehicle status updated')
      await fetchVehicles()
    } catch (error) {
      console.error('Error toggling vehicle status:', error)
    } finally {
      isStatusChanging.value = false
      isStatusConfirmOpen.value = false
      pendingStatusVehicle.value = null
    }
  }

  const cancelToggleStatus = () => {
    isStatusConfirmOpen.value = false
    pendingStatusVehicle.value = null
  }

  // Watch pagination changes
  watch(
    [() => pagination.currentPage.value, () => pagination.itemsPerPage.value],
    async () => { await fetchVehicles() }
  )

  // Initial fetch
  onMounted(async () => {
    await Promise.allSettled([
      fetchVehicles(),
      fetchFuels(),
      fetchEldConnections(),
      fetchIssuerStates(),
    ])
  })

  return {
    // Data
    allVehicles,
    isLoading,

    // Search
    searchQuery,

    // Pagination
    currentPage: pagination.currentPage,
    itemsPerPage: pagination.itemsPerPage,
    totalPages: pagination.totalPages,
    totalEntries: pagination.totalEntries,
    pageNumbers: pagination.pageNumbers,
    goToPage: pagination.goToPage,
    nextPage: pagination.nextPage,
    previousPage: pagination.previousPage,

    // Modal
    isModalOpen: vehicleModal.isOpen,
    editingVehicle: vehicleModal.selectedItem,
    vehicleDetails,

    // Status confirm modal
    isStatusConfirmOpen,
    pendingStatusVehicle,
    isStatusChanging,

    // Config data
    fuels,
    eldConnections,
    issuerStates,
    vinDecodingLoading,
    vinError,

    // Computed
    paginatedVehicles,

    // Functions
    handleSort: sorting.handleSort,
    openAddModal,
    openEditModal,
    handleSaveVehicle,
    closeModal,
    decodeVin,
    fetchVehicles,
    openStatusModal,
    confirmToggleStatus,
    cancelToggleStatus,
  }
}
