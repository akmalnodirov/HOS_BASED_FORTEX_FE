import { computed, onMounted, onScopeDispose, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { getCompanyId } from '@/utils/company'
import { useModalState } from '@/composables/useModalState'
import { useIftaCompany } from './useIftaCompany'
import { useIftaService } from '../services/iftaService'
import type { IftaGenerateForm, IftaReport, IftaSortKey, IftaVehicle } from '../types'

export function useIfta() {
  const activeCompany = useIftaCompany()
  const service = useIftaService()
  const iftaRecords = ref<IftaReport[]>([])
  const vehicles = ref<IftaVehicle[]>([])
  const isLoading = ref(false)
  const isFetching = ref(false)
  const isLoadingVehicles = ref(false)
  const isSubmitting = ref(false)
  const error = ref<string | null>(null)
  const vehicleError = ref<string | null>(null)
  const statusFilter = ref<string[]>([])
  const sortKey = ref<IftaSortKey>('timeSubmitted')
  const sortOrder = ref<'asc' | 'desc'>('desc')
  const visibleCount = ref(20)
  const selectedIds = ref<Set<string>>(new Set())
  const anchorIndex = ref<number | null>(null)
  const addModal = useModalState()
  let reportController: AbortController | null = null
  let vehicleController: AbortController | null = null
  let pollTimer: ReturnType<typeof setTimeout> | undefined
  let lastVehiclesFetched = 0
  let lastFetched = 0
  let disposed = false

  const pending = computed(() =>
    iftaRecords.value.some((report) => ['PROCESSING', 'WAITING'].includes(report.status))
  )
  const isCurrentCompany = (companyId: string) =>
    !disposed &&
    companyId === activeCompany.companyId.value &&
    activeCompany.company.value?.id === getCompanyId() &&
    getCompanyId() === activeCompany.localCompanyId.value

  function stopPolling() {
    clearTimeout(pollTimer)
    pollTimer = undefined
  }

  function schedulePolling() {
    stopPolling()
    if (!pending.value || !activeCompany.companyId.value || disposed) return
    pollTimer = setTimeout(() => {
      if (document.visibilityState === 'hidden') schedulePolling()
      else void fetchIfta()
    }, 5000)
  }

  async function fetchIfta() {
    const companyId = activeCompany.companyId.value
    if (!companyId || isFetching.value || !isCurrentCompany(companyId)) return
    stopPolling()
    const request = new AbortController()
    reportController = request
    isFetching.value = true
    isLoading.value = !lastFetched
    error.value = null
    try {
      const reports = await service.getReports(companyId, request.signal)
      if (request.signal.aborted || !isCurrentCompany(companyId)) return
      iftaRecords.value = reports
      lastFetched = Date.now()
    } catch (exception: any) {
      if (!request.signal.aborted && isCurrentCompany(companyId)) {
        error.value = exception.response?.data?.message || 'Could not load IFTA reports. Please retry.'
      }
    } finally {
      if (reportController === request) {
        isLoading.value = false
        isFetching.value = false
        if (!error.value) schedulePolling()
      }
    }
  }

  async function fetchVehicles() {
    const companyId = activeCompany.companyId.value
    if (!companyId || isLoadingVehicles.value || !isCurrentCompany(companyId)) return
    const request = new AbortController()
    vehicleController = request
    isLoadingVehicles.value = true
    vehicleError.value = null
    try {
      const result = await service.getVehicles(companyId, request.signal)
      if (!request.signal.aborted && isCurrentCompany(companyId)) {
        vehicles.value = result
        lastVehiclesFetched = Date.now()
      }
    } catch (exception: any) {
      if (!request.signal.aborted && isCurrentCompany(companyId)) {
        vehicleError.value = exception.response?.data?.message || 'Could not load vehicles. Please retry.'
      }
    } finally {
      if (vehicleController === request) isLoadingVehicles.value = false
    }
  }

  async function generateIfta(form: IftaGenerateForm) {
    const companyId = activeCompany.companyId.value
    if (!companyId || !isCurrentCompany(companyId) || isSubmitting.value) return
    const chosen = vehicles.value.filter((vehicle) => form.vehicleIds.includes(vehicle.id))
    if (!form.fromDate || !form.toDate || !chosen.length) return
    isSubmitting.value = true
    try {
      await service.generate({
        companyId,
        companyName: activeCompany.companyName.value,
        fromDate: form.fromDate,
        toDate: form.toDate,
        timeZoneId: 'CT',
        vehicles: chosen,
        states: form.states,
      })
      if (!isCurrentCompany(companyId)) return
      toast.success('Report generation requested')
      addModal.close()
      // Supersede a poll already in flight so generation always refreshes the list.
      reportController?.abort()
      reportController = null
      isFetching.value = false
      await fetchIfta()
    } catch (exception: any) {
      if (isCurrentCompany(companyId))
        toast.error(exception.response?.data?.message || 'Could not request report generation')
    } finally {
      isSubmitting.value = false
    }
  }

  const counts = computed(() => ({
    ready: iftaRecords.value.filter((report) => report.status === 'READY').length,
    processing: iftaRecords.value.filter((report) => report.status === 'PROCESSING').length,
    waiting: iftaRecords.value.filter((report) => report.status === 'WAITING').length,
  }))
  const filteredReports = computed(() => {
    const statuses = new Set(statusFilter.value)
    const list = iftaRecords.value.filter((report) => !statuses.size || statuses.has(report.status))
    const factor = sortOrder.value === 'asc' ? 1 : -1
    return [...list].sort((a, b) => {
      const key = sortKey.value
      if (key === 'timeSubmitted') return (a.timeSubmitted - b.timeSubmitted) * factor
      const av = key === 'vehicleName' ? a.vehicleName || a.vehicleId : a[key]
      const bv = key === 'vehicleName' ? b.vehicleName || b.vehicleId : b[key]
      return String(av).localeCompare(String(bv)) * factor
    })
  })
  const visibleReports = computed(() => filteredReports.value.slice(0, visibleCount.value))
  const selectedReadyReports = computed(() =>
    filteredReports.value.filter(
      (report) => selectedIds.value.has(report.id) && report.status === 'READY' && report.csvUrl
    )
  )
  const allSelected = computed(
    () =>
      visibleReports.value.length > 0 &&
      visibleReports.value.every((report) => selectedIds.value.has(report.id))
  )

  function resetSelection() {
    visibleCount.value = 20
    selectedIds.value = new Set()
    anchorIndex.value = null
  }

  function handleSort(key: IftaSortKey) {
    if (sortKey.value === key) sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
    else {
      sortKey.value = key
      sortOrder.value = key === 'timeSubmitted' ? 'desc' : 'asc'
    }
    anchorIndex.value = null
  }

  function toggleRow(index: number, shiftKey = false) {
    const report = visibleReports.value[index]
    if (!report) return
    const next = new Set(selectedIds.value)
    if (shiftKey && anchorIndex.value !== null) {
      const start = Math.min(index, anchorIndex.value)
      const end = Math.min(Math.max(index, anchorIndex.value), visibleReports.value.length - 1)
      for (let i = start; i <= end; i++) next.add(visibleReports.value[i].id)
    } else {
      if (next.has(report.id)) next.delete(report.id)
      else next.add(report.id)
      anchorIndex.value = index
    }
    selectedIds.value = next
  }

  function toggleSelectAll() {
    selectedIds.value = allSelected.value
      ? new Set()
      : new Set(visibleReports.value.map((report) => report.id))
  }

  watch(statusFilter, resetSelection)
  watch(activeCompany.companyId, () => {
    stopPolling()
    reportController?.abort()
    vehicleController?.abort()
    reportController = null
    vehicleController = null
    iftaRecords.value = []
    vehicles.value = []
    error.value = null
    vehicleError.value = null
    isFetching.value = false
    isLoading.value = false
    isLoadingVehicles.value = false
    lastFetched = 0
    lastVehiclesFetched = 0
    addModal.close()
    resetSelection()
    void Promise.allSettled([fetchIfta(), fetchVehicles()])
  })

  function openAddModal() {
    if (!activeCompany.companyId.value || isSubmitting.value) return
    addModal.open()
    if (Date.now() - lastVehiclesFetched >= 10 * 60 * 1000) void fetchVehicles()
  }

  function refreshOnFocus() {
    if (Date.now() - lastFetched >= (pending.value ? 5000 : 5 * 60 * 1000)) void fetchIfta()
  }
  function refreshOnVisible() {
    if (document.visibilityState === 'visible') refreshOnFocus()
  }
  onMounted(() => {
    window.addEventListener('focus', refreshOnFocus)
    document.addEventListener('visibilitychange', refreshOnVisible)
  })
  onScopeDispose(() => {
    disposed = true
    stopPolling()
    reportController?.abort()
    vehicleController?.abort()
    window.removeEventListener('focus', refreshOnFocus)
    document.removeEventListener('visibilitychange', refreshOnVisible)
  })

  return {
    companyId: activeCompany.companyId,
    companyName: activeCompany.companyName,
    localCompanyId: activeCompany.localCompanyId,
    isLoadingCompany: activeCompany.isLoading,
    companyError: activeCompany.error,
    resolveCompany: activeCompany.resolveCompany,
    iftaRecords,
    vehicles,
    counts,
    isLoading,
    isFetching,
    isLoadingVehicles,
    isSubmitting,
    error,
    vehicleError,
    statusFilter,
    sortKey,
    visibleCount,
    filteredReports,
    visibleReports,
    selectedIds,
    selectedReadyReports,
    allSelected,
    handleSort,
    toggleRow,
    toggleSelectAll,
    isAddModalOpen: addModal.isOpen,
    openAddModal,
    closeAddModal: addModal.close,
    fetchIfta,
    fetchVehicles,
    generateIfta,
  }
}
