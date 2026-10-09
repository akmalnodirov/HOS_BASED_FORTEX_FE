import { computed, onMounted, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { ApiEndpoints } from '@/api/endpoints'
import { useApi } from '@/composables/useAxiosService'
import { useDebounce } from '@/composables/useDebounce'
import { useModalState } from '@/composables/useModalState'
import { usePagination } from '@/composables/usePagination'
import { useSorting } from '@/composables/useSorting'
import type { RouteEldCompaniesResponse } from '@/types/company'
import { getCompanyId } from '@/utils/company'
import { sortArray } from '@/utils/sort'
import type {
  CreateDotInspectionRequest,
  DotInspection,
  DotInspectionSortKey,
  DotInspectionStatusFilter,
  RouteEldDriverOption,
} from '../types'

interface ApiEnvelope<T> {
  successResult: T
}

function unwrap<T>(value: T | ApiEnvelope<T>): T {
  if (value && typeof value === 'object' && 'successResult' in value) return value.successResult
  return value
}

function getErrorMessage(error: unknown, fallback: string) {
  const value = error as {
    response?: { data?: string | { message?: string; errors?: { message?: string }[] } }
    message?: string
  }
  const data = value.response?.data
  if (typeof data === 'string' && data) return data
  if (data && typeof data === 'object') {
    return data.message ?? data.errors?.[0]?.message ?? value.message ?? fallback
  }
  return value.message ?? fallback
}

export function useDotIns() {
  const api = useApi()
  const dotInspections = ref<DotInspection[]>([])
  const drivers = ref<RouteEldDriverOption[]>([])
  const externalCompanyId = ref<string | null>(null)
  const isLoading = ref(false)
  const isRefreshing = ref(false)
  const isConfirmLoading = ref(false)
  const error = ref<string | null>(null)
  const searchQuery = ref('')
  const selectedDriver = ref('all')
  const selectedStatus = ref<DotInspectionStatusFilter>('all')
  const debouncedSearch = useDebounce(searchQuery, 250)
  const createModal = useModalState()
  const confirmModal = useModalState<{
    type: 'enable' | 'disable' | 'delete'
    inspectionId: string
    message: string
  }>()
  const sorting = useSorting<DotInspectionSortKey>({
    defaultKey: 'createdAt',
    defaultOrder: 'desc',
  })

  async function resolveSelectedCompany() {
    const companyId = getCompanyId()
    if (!companyId) throw new Error('Select a company before opening DOT inspections.')
    const response = await api.get<RouteEldCompaniesResponse>(ApiEndpoints.ROUTE_ELD_COMPANIES)
    externalCompanyId.value =
      response.data.successResult.find(
        (company) => company.id.toLowerCase() === companyId.toLowerCase()
      )?.externalCompanyId ?? null
    if (!externalCompanyId.value) throw new Error('The selected company could not be resolved.')
  }

  async function fetchDrivers() {
    if (!externalCompanyId.value) await resolveSelectedCompany()
    const response = await api.get<RouteEldDriverOption[] | ApiEnvelope<RouteEldDriverOption[]>>(
      ApiEndpoints.ROUTE_ELD_DRIVERS
    )
    drivers.value = unwrap(response.data)
      .filter((driver) => driver.externalCompanyId === externalCompanyId.value)
      .sort((a, b) => a.displayName.localeCompare(b.displayName))
  }

  async function fetchDotInspections(silent = false) {
    if (silent) isRefreshing.value = true
    else isLoading.value = true
    error.value = null
    try {
      if (!externalCompanyId.value) await resolveSelectedCompany()
      const params: Record<string, string | boolean> = {
        companyId: externalCompanyId.value as string,
      }
      if (selectedDriver.value !== 'all') params.driverId = selectedDriver.value
      if (selectedStatus.value !== 'all') params.isEnabled = selectedStatus.value === 'enabled'
      const response = await api.get<DotInspection[] | ApiEnvelope<DotInspection[]>>(
        ApiEndpoints.ROUTE_ELD_DOT_INSPECTIONS,
        { params }
      )
      dotInspections.value = unwrap(response.data)
    } catch (exception) {
      error.value = getErrorMessage(exception, 'Failed to load DOT inspections')
    } finally {
      isLoading.value = false
      isRefreshing.value = false
    }
  }

  const filteredDotInspections = computed(() => {
    const search = debouncedSearch.value.trim().toLowerCase()
    const rows = search
      ? dotInspections.value.filter(
          (inspection) =>
            inspection.driverName.toLowerCase().includes(search) ||
            inspection.description?.toLowerCase().includes(search) ||
            inspection.fromDate.includes(search) ||
            inspection.toDate.includes(search)
        )
      : [...dotInspections.value]
    return sortArray(rows, sorting.sortKey.value, sorting.sortOrder.value)
  })

  const totalCount = computed(() => filteredDotInspections.value.length)
  const pagination = usePagination(totalCount, { itemsPerPage: 10 })
  const paginatedDotInspections = computed(() =>
    pagination.paginateData(filteredDotInspections.value)
  )

  watch([selectedDriver, selectedStatus], async () => {
    pagination.resetPage()
    await fetchDotInspections()
  })

  watch([debouncedSearch, () => pagination.itemsPerPage.value], () => pagination.resetPage())

  watch(
    () => pagination.totalPages.value,
    (totalPages) => {
      if (totalPages > 0 && pagination.currentPage.value > totalPages) {
        pagination.goToPage(totalPages)
      }
    }
  )

  async function createDotInspection(request: CreateDotInspectionRequest) {
    await api.post(ApiEndpoints.ROUTE_ELD_DOT_INSPECTIONS, request)
    toast.success('DOT inspection created successfully')
    createModal.close()
    await fetchDotInspections(true)
  }

  function openConfirmModal(type: 'enable' | 'disable' | 'delete', inspectionId: string) {
    const messages = {
      enable: 'Do you want to enable this DOT inspection?',
      disable: 'Do you want to disable this DOT inspection?',
      delete: 'Do you want to delete this DOT inspection?',
    }
    confirmModal.open({ type, inspectionId, message: messages[type] })
  }

  async function handleConfirmAction() {
    const selected = confirmModal.selectedItem.value
    if (!selected) return
    isConfirmLoading.value = true
    try {
      if (selected.type === 'delete') {
        await api.delete(ApiEndpoints.ROUTE_ELD_DOT_INSPECTION(selected.inspectionId))
        toast.success('DOT inspection deleted successfully')
      } else {
        await api.patch(ApiEndpoints.ROUTE_ELD_DOT_INSPECTION_STATUS(selected.inspectionId), {
          isEnabled: selected.type === 'enable',
        })
        toast.success(`DOT inspection ${selected.type}d successfully`)
      }
      confirmModal.close()
      await fetchDotInspections(true)
    } catch (exception) {
      toast.error(getErrorMessage(exception, `Failed to ${selected.type} DOT inspection`))
    } finally {
      isConfirmLoading.value = false
    }
  }

  onMounted(async () => {
    isLoading.value = true
    try {
      await resolveSelectedCompany()
      await Promise.all([fetchDrivers(), fetchDotInspections()])
    } catch (exception) {
      error.value = getErrorMessage(exception, 'Failed to load DOT inspections')
      isLoading.value = false
    }
  })

  return {
    drivers,
    isLoading,
    isRefreshing,
    isConfirmLoading,
    error,
    searchQuery,
    selectedDriver,
    selectedStatus,
    sortKey: sorting.sortKey,
    sortOrder: sorting.sortOrder,
    currentPage: pagination.currentPage,
    itemsPerPage: pagination.itemsPerPage,
    totalPages: pagination.totalPages,
    totalEntries: pagination.totalEntries,
    pageNumbers: pagination.pageNumbers,
    paginatedDotInspections,
    isCreateModalOpen: createModal.isOpen,
    isConfirmModalOpen: confirmModal.isOpen,
    confirmModalConfig: confirmModal.selectedItem,
    handleSort: sorting.handleSort,
    goToPage: pagination.goToPage,
    fetchDotInspections,
    createDotInspection,
    openCreateModal: createModal.open,
    closeCreateModal: createModal.close,
    openConfirmModal,
    closeConfirmModal: confirmModal.close,
    handleConfirmAction,
  }
}
