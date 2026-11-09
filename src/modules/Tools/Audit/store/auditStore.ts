import { defineStore } from 'pinia'
import { toast } from 'vue-sonner'
import { useApi } from '@/composables/useAxiosService'
import { ApiEndpoints } from '@/api/endpoints'
import type { AuditRequest } from '../types'

export const useAuditStore = defineStore('audit', () => {
  const api = useApi()

  async function addAudit(model: AuditRequest) {
    const response = await api.post<{ successResult: { auditId: string } }>(
      ApiEndpoints.AUDIT,
      {
        driverId: model.driverId,
        startDate: model.startDate,
        startTime: model.startTime,
        trips: model.trips,
      },
      { _showSuccessToast: false },
    )
    if (response.status === 200) {
      toast.success('Audit draft created')
      return response.data.successResult
    }
    return null
  }

  return { addAudit }
})
