import { ref, computed, watch, onMounted } from 'vue'
import { useApi } from '@/composables/useAxiosService'
import { toast } from 'vue-sonner'
import { useDebounce } from '@/composables/useDebounce'
import { sortArray, commonTransformers, type SortOrder } from '@/utils/sort'
import { usePagination } from '@/composables/usePagination'
import { useSorting } from '@/composables/useSorting'
import { ApiEndpoints } from '@/api/endpoints'
import { getCarrierId } from '@/utils/carrier'
import type {
  Driver,
  DriverFilter,
  DriverFormData,
  DriverApiResponse,
  DriverApiRequest,
  SortKey,
  NameWithId,
  IssuerStateOption,
  VehicleOption,
} from '@/modules/Drivers/types'
import dayjs from 'dayjs'

interface DriversListResponse {
  successResult: {
    data: DriverApiResponse[]
    totalCount: number
  }
}

interface SingleDriverResponse {
  successResult: DriverApiResponse
}

interface ConfigResponse<T> {
  successResult: T[] | { data: T[] }
}

interface ListConfigResponse<T> {
  successResult: {
    data: T[]
  }
}

interface CarrierDetailResponse {
  successResult: {
    id: string
    carrierTerminals: Array<{
      id: string
      street: string
      city: string
      zipCode: string
      issuerState?: { stateCode: string }
    }>
  }
}

export function useDrivers() {
  const api = useApi()

  const unwrapOptions = <T>(result: T[] | { data: T[] } | undefined): T[] => {
    if (!result) return []
    return Array.isArray(result) ? result : result.data || []
  }

  // State
  const drivers = ref<Driver[]>([])
  const totalCount = ref(0)
  const isLoading = ref(false)
  const searchQuery = ref('')
  const driverFilter = ref<DriverFilter>('all')
  const statusFilter = ref<DriverFilter>('all')

  // Sorting using composable
  const sorting = useSorting<SortKey>({
    defaultKey: 'id',
    defaultOrder: 'asc',
  })

  // Pagination setup - server-side
  const pagination = usePagination(totalCount, { itemsPerPage: 10 })

  // Debounce search
  const debouncedSearch = useDebounce(searchQuery, 300, () => {
    pagination.resetPage()
  })

  // Configuration data for the form
  const hosRoles = ref<NameWithId[]>([])
  const cargoTypes = ref<NameWithId[]>([])
  const restarts = ref<NameWithId[]>([])
  const restBreaks = ref<NameWithId[]>([])
  const issuerStateParents = ref<IssuerStateOption[]>([])
  const issuerStates = ref<IssuerStateOption[]>([])
  const vehicles = ref<VehicleOption[]>([])
  const homeTerminals = ref<Array<{ id: string; name: string }>>([])

  // Format event time for display
  const formatEventTime = (dateTime: string | null): string => {
    if (!dateTime) return 'N/A'
    return dayjs(dateTime).format('MMM D, hh:mm A')
  }

  // Transform API response to UI Driver shape
  const mapApiToDriver = (d: DriverApiResponse, index: number): Driver => ({
    id: d.id,
    name: `${d.user?.firstName || ''} ${d.user?.lastName || ''}`.trim(),
    unit: d.currentVehicleUnit || 'N/A',
    username: d.user?.userName || 'N/A',
    appVersion: `(${d.deviceInfo?.appVersion || 'N/A'}) ${d.deviceInfo?.osVersion || ''}`.trim(),
    eventsTime: formatEventTime(d.deviceInfo?.dateTime || null),
    status: d.isActive,
    // Keep raw data for edit
    firstName: d.user?.firstName,
    lastName: d.user?.lastName,
    phoneNumber: d.user?.phoneNumber,
    email: d.user?.email,
    homeTerminal: d.homeTerminal?.id,
    vehicles: d.vehicles?.filter((v) => v.id).map((v) => v.id as string) || [],
    issuerState: d.driverLicense?.issuerState?.id,
    issuerStateParent: d.driverLicense?.issuerState?.parentId,
    driverLicenseNumber: d.driverLicense?.licenseNumber,
    exemptDriver: d.exemptDriver,
    shortHaulException: d.shortHaulException,
    allowPersonalUse: d.allowPersonalUse,
    allowYardMove: d.allowYardMoves,
    unlimitedTrailers: d.unlimitedTrailers,
    unlimitedShippingDocuments: d.unlimitedShippingDocuments,
    hosRoles: d.hosRule?.id,
    cargoType: d.cargoType?.id,
    restart: d.restart?.id,
    restBreak: d.restBreak?.id,
  })

  // Fetch drivers from API
  const fetchDrivers = async () => {
    isLoading.value = true
    try {
      const response = await api.post<DriversListResponse>(ApiEndpoints.DRIVERS_FILTER, {
        carrierId: getCarrierId(),
        pageNumber: pagination.currentPage.value,
        pageSize: pagination.itemsPerPage.value,
      })

      if (response.data?.successResult) {
        const apiData = response.data.successResult.data || []
        totalCount.value = response.data.successResult.totalCount || apiData.length
        drivers.value = apiData.map((d, i) => mapApiToDriver(d, i))
      } else {
        drivers.value = []
        totalCount.value = 0
      }
    } catch (error: any) {
      console.error('Error fetching drivers:', error)
    } finally {
      isLoading.value = false
    }
  }

  // Fetch configuration data
  const fetchConfigData = async () => {
    try {
      const [
        hosRes,
        cargoRes,
        restartRes,
        restBreakRes,
        issuerParentRes,
        issuerRes,
        vehicleRes,
        carrierRes,
      ] =
        await Promise.allSettled([
          api.get<ConfigResponse<NameWithId>>(ApiEndpoints.HOS_RULE_URL),
          api.get<ConfigResponse<NameWithId>>(ApiEndpoints.CARGO_TYPE_URL),
          api.get<ConfigResponse<NameWithId>>(ApiEndpoints.RESTART_URL),
          api.get<ConfigResponse<NameWithId>>(ApiEndpoints.REST_BREAK_URL),
          api.get<ConfigResponse<IssuerStateOption>>(ApiEndpoints.ISSUER_STATE_PARENT_URL),
          api.get<ListConfigResponse<IssuerStateOption>>(ApiEndpoints.ISSUER_STATE_URL),
          api.post<{ successResult: { data: any[] } }>(ApiEndpoints.VEHICLES_FILTER, {
            carrierId: getCarrierId(),
          }),
          api.get<CarrierDetailResponse>(`${ApiEndpoints.CARRIERS}/${getCarrierId()}`),
        ])

      if (hosRes.status === 'fulfilled' && hosRes.value.data?.successResult) {
        hosRoles.value = unwrapOptions(hosRes.value.data.successResult)
      }
      if (cargoRes.status === 'fulfilled' && cargoRes.value.data?.successResult) {
        cargoTypes.value = unwrapOptions(cargoRes.value.data.successResult)
      }
      if (restartRes.status === 'fulfilled' && restartRes.value.data?.successResult) {
        restarts.value = unwrapOptions(restartRes.value.data.successResult)
      }
      if (restBreakRes.status === 'fulfilled' && restBreakRes.value.data?.successResult) {
        restBreaks.value = unwrapOptions(restBreakRes.value.data.successResult)
      }
      if (issuerParentRes.status === 'fulfilled' && issuerParentRes.value.data?.successResult) {
        issuerStateParents.value = unwrapOptions(issuerParentRes.value.data.successResult)
      }
      if (issuerRes.status === 'fulfilled' && issuerRes.value.data?.successResult?.data) {
        issuerStates.value = issuerRes.value.data.successResult.data
      }
      if (vehicleRes.status === 'fulfilled' && vehicleRes.value.data?.successResult?.data) {
        vehicles.value = vehicleRes.value.data.successResult.data
      }
      if (carrierRes.status === 'fulfilled' && carrierRes.value.data?.successResult) {
        const carrier = carrierRes.value.data.successResult
        if (carrier.carrierTerminals) {
          homeTerminals.value = carrier.carrierTerminals.map((t: any) => ({
            id: t.id,
            name: `${t.street}, ${t.city}, ${t.issuerState?.stateCode || ''}, ${t.zipCode}`.trim(),
          }))
        }
      }
    } catch (error) {
      console.error('Error fetching config data:', error)
    }
  }

  // Computed - Filtered drivers (client-side on current page)
  const filteredDrivers = computed(() => {
    let filtered = drivers.value

    // Search filter
    if (debouncedSearch.value) {
      const search = debouncedSearch.value.toLowerCase()
      filtered = filtered.filter(
        (driver) =>
          driver.name.toLowerCase().includes(search) ||
          driver.unit.toLowerCase().includes(search) ||
          driver.username.toLowerCase().includes(search) ||
          driver.appVersion.toLowerCase().includes(search)
      )
    }

    // Status filter
    if (statusFilter.value !== 'all') {
      const isActive = statusFilter.value === 'active'
      filtered = filtered.filter((driver) => driver.status === isActive)
    }

    // Sort using generic utility
    sortArray(filtered, sorting.sortKey.value, sorting.sortOrder.value, {
      id: commonTransformers.toNumber,
      status: commonTransformers.toBoolean,
    })

    return filtered
  })

  // Server-side paginated, so return filtered as-is
  const paginatedDrivers = computed(() => filteredDrivers.value)

  // Status modal state
  const isStatusModalOpen = ref(false)
  const statusModalDriver = ref<Driver | null>(null)
  const isStatusChanging = ref(false)

  const openStatusModal = (driver: Driver) => {
    statusModalDriver.value = driver
    isStatusModalOpen.value = true
  }

  const closeStatusModal = () => {
    isStatusModalOpen.value = false
    statusModalDriver.value = null
  }

  const submitToggleStatus = async () => {
    const driver = statusModalDriver.value
    if (!driver) return
    isStatusChanging.value = true
    try {
      const newState = driver.status ? 1 : 0
      await api.put(ApiEndpoints.DRIVERS_STATE(driver.id as string), { state: newState })
      toast.success('Driver status updated')
      await fetchDrivers()
    } catch (error) {
      console.error('Error toggling driver status:', error)
    } finally {
      isStatusChanging.value = false
      closeStatusModal()
    }
  }

  // Add driver
  const addDriver = async (driverData: DriverFormData) => {
    try {
      const request: DriverApiRequest = {
        firstName: driverData.firstName,
        lastName: driverData.lastName,
        userName: driverData.username,
        phoneNumber: driverData.phoneNumber,
        email: driverData.email,
        password: driverData.password,
        passwordConfirm: driverData.confirmPassword,
        issuerStateId: driverData.issuerState,
        licenseNumber: driverData.driverLicenseNumber,
        homeTerminalId: driverData.homeTerminal,
        assignedVehicleIds: driverData.vehicles || [],
        exemptDriver: driverData.exemptDriver ?? false,
        shortHaulException: driverData.shortHaulException ?? false,
        allowPersonalUse: driverData.allowPersonalUse ?? false,
        allowYardMoves: driverData.allowYardMove ?? false,
        unlimitedTrailers: driverData.unlimitedTrailers ?? false,
        unlimitedShippingDocuments: driverData.unlimitedShippingDocuments ?? false,
        hosRuleId: driverData.hosRoles,
        cargoTypeId: driverData.cargoType,
        restartId: driverData.restart,
        restBreakId: driverData.restBreak,
        carrierId: getCarrierId() || '',
      }

      const response = await api.post(ApiEndpoints.DRIVERS, request)
      if (response.status === 200) {
        toast.success('Driver added successfully')
        await fetchDrivers()
      }
    } catch (error) {
      console.error('Error adding driver:', error)
      throw error
    }
  }

  // Update driver
  const updateDriver = async (id: number | string, driverData: Partial<DriverFormData>) => {
    try {
      const request: DriverApiRequest = {
        firstName: driverData.firstName || '',
        lastName: driverData.lastName || '',
        userName: driverData.username || '',
        phoneNumber: driverData.phoneNumber || '',
        email: driverData.email || '',
        password: driverData.password || '',
        passwordConfirm: driverData.confirmPassword || '',
        issuerStateId: driverData.issuerState || '',
        licenseNumber: driverData.driverLicenseNumber || '',
        homeTerminalId: driverData.homeTerminal || '',
        assignedVehicleIds: driverData.vehicles || [],
        exemptDriver: driverData.exemptDriver ?? false,
        shortHaulException: driverData.shortHaulException ?? false,
        allowPersonalUse: driverData.allowPersonalUse ?? false,
        allowYardMoves: driverData.allowYardMove ?? false,
        unlimitedTrailers: driverData.unlimitedTrailers ?? false,
        unlimitedShippingDocuments: driverData.unlimitedShippingDocuments ?? false,
        hosRuleId: driverData.hosRoles || '',
        cargoTypeId: driverData.cargoType || '',
        restartId: driverData.restart || '',
        restBreakId: driverData.restBreak || '',
        carrierId: getCarrierId() || '',
      }

      const response = await api.put(ApiEndpoints.DRIVERS_BY_ID(id as string), request)
      if (response.status === 200) {
        toast.success('Driver updated successfully')
        await fetchDrivers()
      }
    } catch (error) {
      console.error('Error updating driver:', error)
      throw error
    }
  }

  // Logout driver
  const logoutDriver = async (id: string) => {
    try {
      const response = await api.delete(ApiEndpoints.DRIVERS_LOGOUT_BY_ID(id))
      if (response.status === 200) {
        toast.success('Driver logged out successfully')
        await fetchDrivers()
      }
    } catch (error) {
      console.error('Error logging out driver:', error)
    }
  }

  // Watch pagination changes
  watch(
    [() => pagination.currentPage.value, () => pagination.itemsPerPage.value],
    async () => {
      await fetchDrivers()
    }
  )

  // Initial fetch
  onMounted(async () => {
    await Promise.allSettled([fetchDrivers(), fetchConfigData()])
  })

  return {
    // State
    drivers,
    searchQuery,
    debouncedSearch,
    driverFilter,
    statusFilter,
    sortKey: sorting.sortKey,
    sortOrder: sorting.sortOrder,
    isLoading,

    // Pagination (from usePagination)
    currentPage: pagination.currentPage,
    itemsPerPage: pagination.itemsPerPage,
    totalPages: pagination.totalPages,
    totalEntries: pagination.totalEntries,
    pageNumbers: pagination.pageNumbers,
    goToPage: pagination.goToPage,
    nextPage: pagination.nextPage,
    previousPage: pagination.previousPage,

    // Config data for form dropdowns
    hosRoles,
    cargoTypes,
    restarts,
    restBreaks,
    issuerStates,
    issuerStateParents,
    vehicles,
    homeTerminals,

    // Computed
    filteredDrivers,
    paginatedDrivers,

    // Methods
    handleSort: sorting.handleSort,
    openStatusModal,
    closeStatusModal,
    submitToggleStatus,
    isStatusModalOpen,
    statusModalDriver,
    isStatusChanging,
    addDriver,
    updateDriver,
    logoutDriver,
    fetchDrivers,
  }
}
