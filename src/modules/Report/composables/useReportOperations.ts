import { ApiEndpoints } from '@/api/endpoints'
import { useApi } from '@/composables/useAxiosService'
import type { ReportCheckerTask, ReportDriverActivityTable, ReportOperationCompany, ReportOperationDriver, ReportOperationUser, ReportTaskState, ReportTaskStatistics } from '@/modules/Report/types'

type Query = Record<string, string | number | null | undefined>
type ReportResponse<T> = { successResult: T }

export function useReportOperations() {
  const api = useApi()

  const getTasks = async (request: Query) =>
    (await api.post<ReportResponse<ReportTaskState[]>>(ApiEndpoints.REPORT_TASKS, request)).data.successResult
  const getTaskStatistics = async (query: Query) =>
    (await api.get<ReportResponse<ReportTaskStatistics>>(ApiEndpoints.REPORT_TASK_STATISTICS, { params: query })).data.successResult
  const getActivity = async (query: Query) =>
    (await api.get<ReportResponse<ReportDriverActivityTable>>(ApiEndpoints.REPORT_ACTIVITY, { params: query })).data.successResult
  const getChecker = async (query: Query) =>
    (await api.get<ReportResponse<ReportCheckerTask[]>>(ApiEndpoints.REPORT_CHECKER, { params: query })).data.successResult
  const getAssistant = async (query: Query) =>
    (await api.get<ReportResponse<ReportTaskState[]>>(ApiEndpoints.REPORT_ASSISTANT, { params: query })).data.successResult

  const getLookups = async () => {
    const [companies, drivers, users] = await Promise.all([
      api.get<ReportResponse<ReportOperationCompany[]>>(ApiEndpoints.REPORT_COMPANIES),
      api.get<ReportResponse<ReportOperationDriver[]>>(ApiEndpoints.REPORT_DRIVERS),
      api.get<ReportResponse<ReportOperationUser[]>>(ApiEndpoints.REPORT_USERS),
    ])
    return {
      companies: companies.data.successResult,
      drivers: drivers.data.successResult,
      users: users.data.successResult,
    }
  }

  const createTask = (body: Record<string, unknown>) => api.post(ApiEndpoints.REPORT_TASK_CREATE, body)
  const updateTask = (id: string, body: Record<string, unknown>) => api.put(ApiEndpoints.REPORT_TASK_UPDATE(id), body)
  const deleteTask = (id: string) => api.delete(ApiEndpoints.REPORT_TASK_UPDATE(id))
  const createAssistantTask = (body: Record<string, unknown>) => api.post(ApiEndpoints.REPORT_ASSISTANT_CREATE, body)
  const updateAssistantTask = (id: string, body: Record<string, unknown>) => api.put(ApiEndpoints.REPORT_ASSISTANT_UPDATE(id), body)
  const createCheckerTask = (body: Record<string, unknown>) => api.post(ApiEndpoints.REPORT_CHECKER_TASKS, body)
  const updateCheckerTask = (id: string, body: Record<string, unknown>) => api.put(ApiEndpoints.REPORT_CHECKER_TASK(id), body)
  const deleteCheckerTask = (id: string) => api.delete(ApiEndpoints.REPORT_CHECKER_TASK(id))
  const createActivity = (body: Record<string, unknown>) => api.post(ApiEndpoints.REPORT_DRIVER_ACTIVITIES, body)
  const updateActivity = (id: string, body: Record<string, unknown>) => api.put(ApiEndpoints.REPORT_DRIVER_ACTIVITY(id), body)
  const deleteActivity = (id: string) => api.delete(ApiEndpoints.REPORT_DRIVER_ACTIVITY(id))

  return { getTasks, getTaskStatistics, getActivity, getChecker, getAssistant, getLookups, createTask, updateTask, deleteTask, createAssistantTask, updateAssistantTask, createCheckerTask, updateCheckerTask, deleteCheckerTask, createActivity, updateActivity, deleteActivity }
}

