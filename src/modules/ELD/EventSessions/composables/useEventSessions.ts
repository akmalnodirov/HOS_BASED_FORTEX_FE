import { ref } from 'vue'
import { useApi } from '@/composables/useAxiosService'
import { ApiEndpoints } from '@/api/endpoints'
import type { RouteEldCompaniesResponse } from '@/types/company'
import type { EventSessionFilters, EventSessionOperation, EventSessionPage } from '../types'

interface ApiEnvelope<T> {
  successResult: T
}

const emptyPage = (): EventSessionPage => ({
  data: [],
  pagination: {
    pageNumber: 1,
    pageSize: 25,
    totalCount: 0,
    totalPages: 0,
  },
  draftCount: 0,
  submittedCount: 0,
  rolledBackCount: 0,
})

function unwrap<T>(value: T | ApiEnvelope<T>): T {
  if (value && typeof value === 'object' && 'successResult' in value) {
    return value.successResult
  }
  return value
}

function errorMessage(error: unknown, fallback: string) {
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

export function useEventSessions() {
  const api = useApi()
  const page = ref<EventSessionPage>(emptyPage())
  const isLoading = ref(false)
  const isRefreshing = ref(false)
  const rollingBackId = ref<string | null>(null)
  const error = ref<string | null>(null)
  let requestVersion = 0

  async function fetchSessions(filters: EventSessionFilters, silent = false) {
    const version = ++requestVersion
    if (silent) isRefreshing.value = true
    else isLoading.value = true
    error.value = null
    try {
      const response = await api.get<EventSessionPage | ApiEnvelope<EventSessionPage>>(
        ApiEndpoints.ROUTE_ELD_EVENT_SESSIONS,
        { params: filters }
      )
      if (version === requestVersion) page.value = unwrap(response.data)
    } catch (exception) {
      if (version === requestVersion) {
        error.value = errorMessage(exception, 'Failed to load event sessions')
        page.value = emptyPage()
      }
    } finally {
      if (version === requestVersion) {
        isLoading.value = false
        isRefreshing.value = false
      }
    }
  }

  async function fetchSelectedCompanyExternalId(companyId: string) {
    const response = await api.get<RouteEldCompaniesResponse>(ApiEndpoints.ROUTE_ELD_COMPANIES)
    return (
      response.data.successResult.find(
        (company) => company.id.toLowerCase() === companyId.toLowerCase()
      )?.externalCompanyId ?? null
    )
  }

  async function rollbackSession(sessionId: string) {
    rollingBackId.value = sessionId
    try {
      let operation = unwrap(
        (
          await api.post<EventSessionOperation | ApiEnvelope<EventSessionOperation>>(
            ApiEndpoints.ROUTE_ELD_EVENT_SESSION_START_ROLLBACK(sessionId),
            null,
            { _skipErrorHandling: true }
          )
        ).data
      )
      while (operation.status === 'QUEUED' || operation.status === 'RUNNING') {
        await new Promise((resolve) => setTimeout(resolve, 500))
        operation = unwrap(
          (
            await api.get<EventSessionOperation | ApiEnvelope<EventSessionOperation>>(
              ApiEndpoints.ROUTE_ELD_EVENT_SESSION_OPERATION(sessionId, operation.id),
              { _skipErrorHandling: true }
            )
          ).data
        )
      }
      if (operation.status === 'FAILED') {
        throw new Error(operation.error || 'The session rollback operation failed')
      }
      if (operation.failed > 0) {
        throw new Error(
          `Rollback completed with ${operation.failed} pending change(s). Open the session to retry them.`
        )
      }
    } catch (exception) {
      throw new Error(errorMessage(exception, 'The session could not be rolled back'))
    } finally {
      rollingBackId.value = null
    }
  }

  return {
    page,
    isLoading,
    isRefreshing,
    rollingBackId,
    error,
    fetchSessions,
    fetchSelectedCompanyExternalId,
    rollbackSession,
  }
}
