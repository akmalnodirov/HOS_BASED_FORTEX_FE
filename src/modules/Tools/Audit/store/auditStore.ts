import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useApi } from '@/composables/useAxiosService'
import { ApiEndpoints } from '@/api/endpoints'
import { capitalizeKeys } from '@/utils/object'
import { toast } from 'vue-sonner'
import type { Dayjs } from 'dayjs'
import type {
  AuditRequest,
  AuditDailyEvent,
  AuditWeeklyViolation,
  WeightStation,
  AuditTracking,
} from '../types'
import type { GraphResponse, DailySummaryResponse } from '@/modules/ELD/LogsModule/[Id]/types/chart'

export const useAuditStore = defineStore('audit', () => {
  const api = useApi()

  // State
  const auditChartData = ref<GraphResponse>()
  const auditDailyEvents = ref<AuditDailyEvent[]>([])
  const auditDailySummary = ref<DailySummaryResponse>()
  const auditWeeklyViolations = ref<AuditWeeklyViolation[]>([])
  const auditWeightStations = ref<WeightStation[]>([])
  const auditTrackings = ref<AuditTracking[]>([])

  async function addAudit(model: AuditRequest) {
    const response = await api.post<{ successResult: { auditId: string } }>(
      ApiEndpoints.AUDIT,
      model,
      { _showSuccessToast: false }
    )
    if (response.status === 200) {
      toast.success('Audit created successfully')
      return response.data.successResult
    }
    return null
  }

  async function getAuditEvents(model: {
    driverId: string
    startDate: string | Dayjs
    endDate: string | Dayjs
  }) {
    const response = await api.get<{ successResult: AuditDailyEvent[] }>(
      ApiEndpoints.AUDIT_EVENTS,
      { params: capitalizeKeys(model) }
    )
    if (response.status === 200) {
      auditDailyEvents.value = response.data.successResult
    }
  }

  async function getAuditSummary(model: {
    driverId: string
    startDate: string | Dayjs
    endDate: string | Dayjs
  }) {
    const response = await api.get<{ successResult: DailySummaryResponse }>(
      ApiEndpoints.AUDIT_SUMMARY,
      { params: capitalizeKeys(model) }
    )
    if (response.status === 200) {
      auditDailySummary.value = response.data.successResult
    }
  }

  async function getAuditGraph(model: {
    driverId: string
    startDate: string | Dayjs
    endDate: string | Dayjs
    screenResolution: number
  }) {
    const response = await api.get<{ successResult: GraphResponse }>(ApiEndpoints.AUDIT_GRAPH, {
      params: capitalizeKeys(model),
    })

    if (response.status === 200) {
      auditChartData.value = response.data.successResult
    }
  }

  async function getAuditViolations(model: {
    driverId: string
    startDate: string | Dayjs
    endDate: string | Dayjs
  }) {
    const response = await api.get<{ successResult: AuditWeeklyViolation[] }>(
      ApiEndpoints.AUDIT_VIOLATIONS,
      { params: capitalizeKeys(model) }
    )
    if (response.status === 200) {
      auditWeeklyViolations.value = response.data.successResult
    }
  }

  async function getAuditWeightStations() {
    const response = await api.get<{ successResult: WeightStation[] }>(
      ApiEndpoints.AUDIT_WEIGHT_STATIONS
    )
    if (response.status === 200) {
      auditWeightStations.value = response.data.successResult
    }
  }

  async function getAuditTracking(model: {
    driverId: string
    auditId: string
    tripNumber: number[]
  }) {
    const response = await api.get<{ successResult: AuditTracking[] }>(
      ApiEndpoints.AUDIT_TRACKING,
      { params: capitalizeKeys(model) }
    )
    if (response.status === 200) {
      auditTrackings.value = response.data.successResult
    }
  }

  return {
    // State
    auditChartData,
    auditDailyEvents,
    auditDailySummary,
    auditWeeklyViolations,
    auditWeightStations,
    auditTrackings,

    // Actions
    addAudit,
    getAuditEvents,
    getAuditSummary,
    getAuditGraph,
    getAuditViolations,
    getAuditWeightStations,
    getAuditTracking,
  }
})
