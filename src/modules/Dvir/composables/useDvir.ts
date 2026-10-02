// src/composables/useDvir.ts
import { computed, onMounted, ref, watch } from 'vue'
import { useApi } from '@/composables/useAxiosService'
import { ApiEndpoints } from '@/api/endpoints'
import type {
  DefectApiResponse,
  DefectsListResponse,
  DriverOption,
  DriversListResponse,
  DvirApiResponse,
  DvirListResponse,
  DvirRecord,
  DvirRequest,
  DvirStatus,
  DvirStatusesResponse,
  SignatureResponse,
  Vehicle,
  VehiclesResponse,
} from '@/modules/Dvir/types'
import { usePagination } from '@/composables/usePagination'
import { sortArray, commonTransformers, type SortOrder } from '@/utils/sort'
import { useSorting } from '@/composables/useSorting'
import { useModalState } from '@/composables/useModalState'
import { useTimeZoneHelper } from '@/composables/useTimezone'
import dayjs, { type Dayjs } from 'dayjs'

export type SortKey = 'id' | 'driverName' | 'time' | 'vehicle' | 'status' | 'defects'

export interface UseDvirOptions {
  autoFetch?: boolean
  companyId: string
}

export function useDvir(options: UseDvirOptions) {
  const { autoFetch = true, companyId } = options
  const api = useApi()
  const { formatToUTC, getStartOf, getEndOf, convertToTimeZone, acceptAsTimeZone } =
    useTimeZoneHelper()

  // State
  const dvirs = ref<DvirRecord[]>([])
  const vehicles = ref<Vehicle[]>([])
  const drivers = ref<DriverOption[]>([])
  const vehicleDefects = ref<DefectApiResponse[]>([])
  const trailerDefects = ref<DefectApiResponse[]>([])
  const signatures = ref<string[]>([])
  const dvirStatuses = ref<DvirStatus[]>([])
  const isLoading = ref(false)
  const isLoadingVehicles = ref(false)
  const isLoadingDrivers = ref(false)
  const isLoadingDefects = ref(false)
  const isLoadingSignatures = ref(false)
  const isLoadingStatuses = ref(false)
  const error = ref<string | null>(null)

  // Filters
  const searchQuery = ref('')
  const dateRange = ref<[Dayjs, Dayjs]>([
    convertToTimeZone().subtract(2, 'week'),
    convertToTimeZone(),
  ])
  const selectedVehicle = ref<string | null>(null)

  // Transform API response to UI shape
  const mapApiToDvirRecord = (item: DvirApiResponse): DvirRecord => ({
    id: item.id,
    driverId: item.driver?.id,
    vehicleId: item.vehicle?.id,
    driverName: item.driver
      ? `${item.driver.user.firstName} ${item.driver.user.lastName}`.trim()
      : 'N/A',
    time: acceptAsTimeZone(item.dateTime).format('MMM D, YYYY hh:mm:ss A'),
    vehicle: item.vehicle?.unit || 'N/A',
    status: item.dvirStatus?.name || 'N/A',
    defects: item.vehicleDefects?.map((d) => d.name).join(', ') || 'No defects',
    odometer: item.odometer?.toString(),
    location: item.location,
    remarks: item.remarks,
    signature: item.signaturePath,
  })

  // Modal state using composable
  const addModal = useModalState()
  const editModal = useModalState()

  // Selected DVIR for editing
  const selectedDvir = ref<DvirApiResponse | null>(null)

  // Sorting using composable
  const sorting = useSorting<SortKey>({
    defaultKey: 'time',
    defaultOrder: 'desc',
  })

  // Total items for pagination (can be updated from API)
  const totalItems = ref(0)

  // Setup pagination
  const pagination = usePagination(totalItems, {
    itemsPerPage: 10,
  })

  // Filtered DVIRs
  const filteredDvirs = computed(() => {
    let filtered = dvirs.value

    // Search filter
    if (searchQuery.value) {
      const search = searchQuery.value.toLowerCase()
      filtered = filtered.filter(
        (dvir) =>
          dvir.driverName.toLowerCase().includes(search) ||
          dvir.vehicle.toLowerCase().includes(search) ||
          dvir.status.toLowerCase().includes(search)
      )
    }

    // Sort using utility function
    sortArray(filtered, sorting.sortKey.value, sorting.sortOrder.value, {
      time: commonTransformers.toDate,
    })

    return filtered
  })

  // Paginated DVIRs
  const paginatedDvirs = computed(() => pagination.paginateData(filteredDvirs.value))

  // Fetch vehicles
  const fetchVehicles = async () => {
    isLoadingVehicles.value = true
    try {
      const response = await api.post<VehiclesResponse>('/api/vehicles/filter', {
        companyId: companyId,
      })
      if (response.data?.successResult?.data) {
        vehicles.value = response.data.successResult.data
      }
    } catch (err: any) {
      console.error('Error fetching vehicles:', err)
    } finally {
      isLoadingVehicles.value = false
    }
  }

  // Fetch defects grouped by type (0 = vehicle, 1 = trailer)
  const fetchDefects = async () => {
    isLoadingDefects.value = true
    try {
      const response = await api.get<DefectsListResponse>(ApiEndpoints.DEFECTS)
      if (response.data?.successResult) {
        const all = response.data.successResult
        vehicleDefects.value = all.filter((d) => d.type === 0)
        trailerDefects.value = all.filter((d) => d.type === 1)
      }
    } catch (err: any) {
      console.error('Error fetching defects:', err)
    } finally {
      isLoadingDefects.value = false
    }
  }

  // Fetch drivers for the carrier
  const fetchDrivers = async () => {
    isLoadingDrivers.value = true
    try {
      const response = await api.post<DriversListResponse>(ApiEndpoints.DRIVERS_FILTER, {
        companyId,
        pageNumber: null,
        pageSize: null,
      })
      const result = response.data?.successResult
      const list = Array.isArray(result) ? result : (result?.data ?? [])
      drivers.value = list.map((d) => ({
        id: d.id,
        name: d.user ? `${d.user.firstName} ${d.user.lastName}`.trim() : 'Unknown',
      }))
    } catch (err: any) {
      console.error('Error fetching drivers:', err)
    } finally {
      isLoadingDrivers.value = false
    }
  }

  // Fetch signature paths for a specific driver
  const fetchSignaturesByDriver = async (driverId: string) => {
    if (!driverId) return
    isLoadingSignatures.value = true
    signatures.value = []
    try {
      const response = await api.get<SignatureResponse>(
        ApiEndpoints.DVIRS_LOCATION_SIGNATURES_BY_DRIVER(driverId)
      )
      if (response.data?.successResult) {
        signatures.value = response.data.successResult.signaturesPath || []
      }
    } catch (err: any) {
      console.error('Error fetching signatures:', err)
    } finally {
      isLoadingSignatures.value = false
    }
  }

  // Fetch DVIR statuses
  const fetchDvirStatuses = async () => {
    isLoadingStatuses.value = true
    try {
      const response = await api.get<DvirStatusesResponse>(ApiEndpoints.DVIRS_STATUSES)
      if (response.data?.successResult) {
        dvirStatuses.value = response.data.successResult
      }
    } catch (err: any) {
      console.error('Error fetching DVIR statuses:', err)
    } finally {
      isLoadingStatuses.value = false
    }
  }

  // Fetch DVIRs
  const fetchDvirs = async () => {
    isLoading.value = true
    error.value = null

    try {
      const params: DvirRequest = {
        page: pagination.currentPage.value,
        pageSize: pagination.itemsPerPage.value,
        startDate: formatToUTC(getStartOf(dateRange.value[0])),
        endDate: formatToUTC(getEndOf(dateRange.value[1])),
        vehicleId: selectedVehicle.value,
        driverId: null,
        companyId: companyId,
      }

      const response = await api.get<DvirListResponse>('/api/edit-dvirs/filter', { params })

      if (response.data?.successResult?.data) {
        const apiData = response.data.successResult.data
        dvirs.value = apiData.map(mapApiToDvirRecord)
        // Update pagination total
        totalItems.value = response.data.successResult.totalCount || dvirs.value.length
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message || 'Failed to fetch DVIRs'
      console.error('Error fetching DVIRs:', err)
    } finally {
      isLoading.value = false
    }
  }

  // Watch for filter changes
  watch([dateRange, selectedVehicle, () => pagination.currentPage.value], async () => {
    await fetchDvirs()
  })

  // Functions - handleSort is provided by useSorting composable
  // Modal functions are provided by useModalState composable

  const handleCreateDvir = async () => {
    await fetchDvirs()
    addModal.close()
  }

  // Download DVIR PDF
  const downloadDvir = async (driverId: string, vehicleId: string) => {
    try {
      const payload = {
        driverId,
        vehicleId,
        startDateUtc: formatToUTC(getStartOf(dateRange.value[0])),
        endDateUtc: formatToUTC(getEndOf(dateRange.value[1])),
      }
      const response = await api.post<any>('/api/dvirs/download-dvir-pdf', payload, {
        responseType: 'blob',
      } as any)

      if (response.data) {
        // If the response is a URL string
        if (typeof response.data === 'string') {
          window.open(response.data, '_blank')
        } else if (response.data.successResult) {
          // If the response contains a download URL
          window.open(response.data.successResult, '_blank')
        } else {
          // If the response is a blob
          const blobData = response.data as Blob
          const url = window.URL.createObjectURL(blobData)
          const link = document.createElement('a')
          link.href = url
          link.setAttribute('download', `DVIR_${driverId}.pdf`)
          document.body.appendChild(link)
          link.click()
          link.remove()
          window.URL.revokeObjectURL(url)
        }
      }
    } catch (err) {
      console.error('Error downloading DVIR:', err)
    }
  }

  // Delete DVIR
  const deleteDvir = async (dvirId: string) => {
    try {
      await api.delete(`/api/edit-dvirs/${dvirId}`)
      await fetchDvirs()
    } catch (err) {
      console.error('Error deleting DVIR:', err)
    }
  }

  // Fetch single DVIR by ID
  const fetchDvirById = async (dvirId: string): Promise<DvirApiResponse | null> => {
    try {
      const response = await api.get<{ successResult: DvirApiResponse }>(
        ApiEndpoints.DVIRS_BY_ID(dvirId)
      )
      return response.data?.successResult ?? null
    } catch (err) {
      console.error('Error fetching DVIR by ID:', err)
      return null
    }
  }

  // Open edit modal: fetch DVIR data and open modal
  const openEditModal = async (dvirId: string) => {
    const dvir = await fetchDvirById(dvirId)
    if (dvir) {
      selectedDvir.value = dvir
      editModal.open()
    }
  }

  const closeEditModal = () => {
    selectedDvir.value = null
    editModal.close()
  }

  const handleUpdateDvir = async () => {
    await fetchDvirs()
    closeEditModal()
  }

  // Update DVIR
  const updateDvir = async (dvirId: string, data: any) => {
    try {
      await api.put(`/api/edit-dvirs/${dvirId}`, data)
      await fetchDvirs()
    } catch (err) {
      console.error('Error updating DVIR:', err)
    }
  }

  // Auto-fetch on mount
  if (autoFetch) {
    onMounted(async () => {
      await Promise.allSettled([
        fetchVehicles(),
        fetchDvirs(),
        fetchDefects(),
        fetchDrivers(),
        fetchDvirStatuses(),
      ])
    })
  }

  return {
    // State
    dvirs,
    vehicles,
    drivers,
    vehicleDefects,
    trailerDefects,
    signatures,
    dvirStatuses,
    isLoading,
    isLoadingVehicles,
    isLoadingDrivers,
    isLoadingDefects,
    isLoadingSignatures,
    isLoadingStatuses,
    error,

    // Filters
    searchQuery,
    dateRange,
    selectedVehicle,

    // Modal
    isAddModalOpen: addModal.isOpen,
    isEditModalOpen: editModal.isOpen,
    selectedDvir,

    // Sorting
    sortKey: sorting.sortKey,
    sortOrder: sorting.sortOrder,

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
    filteredDvirs,
    paginatedDvirs,

    // Functions
    fetchDvirs,
    fetchVehicles,
    fetchDefects,
    fetchDrivers,
    fetchSignaturesByDriver,
    fetchDvirStatuses,
    handleSort: sorting.handleSort,
    openAddModal: addModal.open,
    closeAddModal: addModal.close,
    openEditModal,
    closeEditModal,
    handleCreateDvir,
    handleUpdateDvir,
    downloadDvir,
    deleteDvir,
    updateDvir,
  }
}
