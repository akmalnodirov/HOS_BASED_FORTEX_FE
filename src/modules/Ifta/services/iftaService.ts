import { ApiEndpoints } from '@/api/endpoints'
import { useApi } from '@/composables/useAxiosService'
import type { RouteEldCompany } from '@/types/company'
import type { IftaGenerateRequest, IftaReport, IftaVehicle } from '../types'

interface SuccessResponse<T> {
  successResult: T
}

// Only JSON responses are wrapped; the file endpoint returns raw CSV text.
export function useIftaService() {
  const api = useApi()

  async function getCompanies(signal?: AbortSignal) {
    const response = await api.get<SuccessResponse<RouteEldCompany[]>>(
      ApiEndpoints.ROUTE_ELD_COMPANIES,
      { signal }
    )
    return response.data.successResult
  }

  async function getReports(companyId: string, signal?: AbortSignal) {
    const response = await api.get<SuccessResponse<IftaReport[]>>(
      ApiEndpoints.ROUTE_ELD_IFTA_REPORTS,
      { params: { companyId }, signal }
    )
    return response.data.successResult
  }

  async function getVehicles(companyId: string, signal?: AbortSignal) {
    const response = await api.get<SuccessResponse<IftaVehicle[]>>(
      ApiEndpoints.ROUTE_ELD_IFTA_VEHICLES,
      { params: { companyId }, signal }
    )
    return response.data.successResult
  }

  async function generate(request: IftaGenerateRequest) {
    await api.post(ApiEndpoints.ROUTE_ELD_IFTA_GENERATE, request)
  }

  async function getFile(companyId: string, url: string) {
    const response = await api.get<string>(ApiEndpoints.ROUTE_ELD_IFTA_FILE, {
      params: { companyId, url },
      responseType: 'text',
      _skipErrorHandling: true,
    })
    return response.data
  }

  return { getCompanies, getReports, getVehicles, generate, getFile }
}
