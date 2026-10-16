import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useApi } from '@/composables/useAxiosService'
import { ApiEndpoints } from '@/api/endpoints'
import type {
  RouteEldAiAdvice,
  RouteEldDriverOption,
  RouteEldEventSession,
  RouteEldEventSessionListItem,
  RouteEldEventSessionPage,
  RouteEldProfileForm,
  RouteEldSchedule,
  RouteEldEventEditOptions,
  RouteEldResponsibleUser,
  RouteEldWorkspace,
  RouteEldWorkspaceEvent,
  RouteEldSessionOperation,
  RouteEldCoDriverSchedule,
  RouteEldNormalizeResponse,
  RouteEldNormalizeType,
} from '../types/boost'

interface ApiEnvelope<T> {
  successResult: T
}

function unwrap<T>(value: T | ApiEnvelope<T>): T {
  if (value && typeof value === 'object' && 'successResult' in value) {
    return value.successResult
  }
  return value
}

export const useBoostWorkspaceStore = defineStore('routeEldBoostWorkspace', () => {
  const api = useApi()
  const sessions = ref<RouteEldEventSessionListItem[]>([])
  const session = ref<RouteEldEventSession | null>(null)
  const workspace = ref<RouteEldWorkspace | null>(null)
  const profileForms = ref<RouteEldProfileForm[]>([])
  const schedule = ref<RouteEldSchedule | null>(null)
  const eventEditOptions = ref<RouteEldEventEditOptions>({ vehicles: [], elds: [] })
  const responsibleUsers = ref<RouteEldResponsibleUser[]>([])
  const coDrivers = ref<RouteEldResponsibleUser[]>([])
  const reassignTargets = ref<RouteEldDriverOption[]>([])
  const coDriverSchedule = ref<RouteEldCoDriverSchedule | null>(null)
  const coDriverScheduleLoading = ref(false)
  const profileFormEditRequest = ref<string | null>(null)
  const isLoading = ref(false)
  const isMutating = ref(false)
  const activeTabId = ref<string | null>(null)
  const workspaceCache = new Map<string, RouteEldWorkspace>()
  const profileFormsCache = new Map<string, RouteEldProfileForm[]>()
  const coDriverScheduleCache = new Map<string, RouteEldCoDriverSchedule>()
  const coDriverSchedulePending = new Map<string, Promise<RouteEldCoDriverSchedule>>()
  let requestedCoDriverScheduleKey = ''

  const tabCacheKey = (sessionId: string, tabId: string) => `${sessionId}:${tabId}`

  function cacheWorkspace(value: RouteEldWorkspace) {
    workspaceCache.set(tabCacheKey(value.session.id, value.tabId), value)
  }

  const activeTab = computed(
    () => session.value?.tabs.find((tab) => tab.id === activeTabId.value) ?? null
  )
  const canEditWorkingSession = computed(
    () => session.value?.status === 'DRAFT' && workspace.value?.canEdit === true && activeTab.value?.kind === 'WORKING'
  )

  function assertDraftSession() {
    if (session.value?.status !== 'DRAFT') {
      throw new Error('Only draft sessions can have their tabs changed.')
    }
  }

  function assertEditableSession() {
    if (!canEditWorkingSession.value) {
      throw new Error('Only the working tab of a draft session can be changed.')
    }
  }

  async function fetchSessions(driverId: string) {
    const response = await api.get<
      RouteEldEventSessionPage | ApiEnvelope<RouteEldEventSessionPage>
    >(ApiEndpoints.ROUTE_ELD_EVENT_SESSIONS, {
      params: {
        driverId,
        pageNumber: 1,
        pageSize: 100,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      },
    })
    sessions.value = unwrap(response.data).data ?? []
    return sessions.value
  }

  async function fetchProfileForms(sessionId: string, tabId?: string | null) {
    const response = await api.get<RouteEldProfileForm[] | ApiEnvelope<RouteEldProfileForm[]>>(
      ApiEndpoints.ROUTE_ELD_EVENT_SESSION_PROFILE_FORMS(sessionId),
      { params: tabId ? { tabId } : undefined }
    )
    profileForms.value = unwrap(response.data) ?? []
    if (tabId) profileFormsCache.set(tabCacheKey(sessionId, tabId), profileForms.value)
    return profileForms.value
  }

  async function fetchSchedule(driverId: string, fromDate: string, toDate: string) {
    const response = await api.get<RouteEldSchedule | ApiEnvelope<RouteEldSchedule>>(
      ApiEndpoints.ROUTE_ELD_DRIVER_SCHEDULE(driverId),
      { params: { fromDate, toDate } }
    )
    schedule.value = unwrap(response.data)
    eventEditOptions.value = schedule.value.editOptions ?? { vehicles: [], elds: [] }
    return schedule.value
  }

  async function fetchEventEditOptions(driverId: string) {
    const response = await api.get<
      RouteEldEventEditOptions | ApiEnvelope<RouteEldEventEditOptions>
    >(ApiEndpoints.ROUTE_ELD_DRIVER_SCHEDULE_OPTIONS(driverId))
    eventEditOptions.value = unwrap(response.data) ?? { vehicles: [], elds: [] }
    return eventEditOptions.value
  }

  async function loadWorkspace(sessionId: string, tabId: string) {
    const response = await api.get<RouteEldWorkspace | ApiEnvelope<RouteEldWorkspace>>(
      ApiEndpoints.ROUTE_ELD_EVENT_SESSION_EVENTS(sessionId, tabId)
    )
    const result = unwrap(response.data)
    workspace.value = result
    session.value = result.session
    activeTabId.value = result.tabId
    cacheWorkspace(result)
    return result
  }

  async function loadSession(sessionId: string, preferredTabId?: string | null) {
    isLoading.value = true
    try {
      const response = await api.get<RouteEldEventSession | ApiEnvelope<RouteEldEventSession>>(
        ApiEndpoints.ROUTE_ELD_EVENT_SESSION(sessionId)
      )
      session.value = unwrap(response.data)
      const tab =
        session.value.tabs.find((item) => item.id === preferredTabId) ??
        session.value.tabs.find((item) => item.kind === 'WORKING') ??
        session.value.tabs[0]
      if (!tab) {
        workspace.value = null
        profileForms.value = []
        activeTabId.value = null
        return null
      }
      await Promise.all([
        loadWorkspace(sessionId, tab.id),
        fetchProfileForms(sessionId, tab.id),
        fetchSchedule(session.value.driverId, session.value.fromDate, session.value.toDate),
      ])
      return workspace.value
    } finally {
      isLoading.value = false
    }
  }

  async function createSession(driverId: string, fromDate: string, toDate: string) {
    isMutating.value = true
    try {
      const response = await api.post<RouteEldWorkspace | ApiEnvelope<RouteEldWorkspace>>(
        ApiEndpoints.ROUTE_ELD_DRIVER_EVENT_SESSIONS(driverId),
        { fromDate, toDate }
      )
      const result = unwrap(response.data)
      workspace.value = result
      session.value = result.session
      activeTabId.value = result.tabId
      cacheWorkspace(result)
      await Promise.all([
        fetchSessions(driverId),
        fetchProfileForms(result.session.id, result.tabId),
        fetchSchedule(driverId, result.session.fromDate, result.session.toDate),
      ])
      return result
    } finally {
      isMutating.value = false
    }
  }

  async function selectTab(tabId: string) {
    if (!session.value) return null
    if (activeTabId.value === tabId && workspace.value) return workspace.value
    const currentSession = session.value
    const key = tabCacheKey(currentSession.id, tabId)
    const cachedWorkspace = workspaceCache.get(key)
    const cachedProfileForms = profileFormsCache.get(key)
    if (cachedWorkspace && cachedProfileForms) {
      workspace.value = { ...cachedWorkspace, session: currentSession }
      profileForms.value = cachedProfileForms
      activeTabId.value = tabId
      return workspace.value
    }
    isLoading.value = true
    try {
      await Promise.all([
        loadWorkspace(currentSession.id, tabId),
        fetchProfileForms(currentSession.id, tabId),
      ])
      return workspace.value
    } finally {
      isLoading.value = false
    }
  }

  async function createTab() {
    if (!session.value) return null
    assertDraftSession()
    isMutating.value = true
    try {
      const response = await api.post<RouteEldWorkspace | ApiEnvelope<RouteEldWorkspace>>(
        ApiEndpoints.ROUTE_ELD_EVENT_SESSION_TABS(session.value.id),
        null
      )
      const result = unwrap(response.data)
      workspace.value = result
      session.value = result.session
      activeTabId.value = result.tabId
      cacheWorkspace(result)
      await fetchProfileForms(result.session.id, result.tabId)
      return result
    } finally {
      isMutating.value = false
    }
  }

  async function deleteTab(tabId: string) {
    if (!session.value) return null
    assertDraftSession()
    const deletedKey = tabCacheKey(session.value.id, tabId)
    isMutating.value = true
    try {
      const response = await api.delete<RouteEldWorkspace | ApiEnvelope<RouteEldWorkspace>>(
        ApiEndpoints.ROUTE_ELD_EVENT_SESSION_TAB(session.value.id, tabId)
      )
      const result = unwrap(response.data)
      workspace.value = result
      session.value = result.session
      activeTabId.value = result.tabId
      workspaceCache.delete(deletedKey)
      profileFormsCache.delete(deletedKey)
      cacheWorkspace(result)
      await fetchProfileForms(result.session.id, result.tabId)
      return result
    } finally {
      isMutating.value = false
    }
  }

  async function refreshWorkspace() {
    if (!session.value || !activeTabId.value) return null
    return loadWorkspace(session.value.id, activeTabId.value)
  }

  async function mutateWorkspace(
    method: 'post' | 'patch',
    url: string,
    body?: Record<string, unknown> | null
  ) {
    assertEditableSession()
    isMutating.value = true
    try {
      const response = await api[method]<RouteEldWorkspace | ApiEnvelope<RouteEldWorkspace>>(
        url,
        body ?? null
      )
      const result = unwrap(response.data)
      workspace.value = result
      session.value = result.session
      activeTabId.value = result.tabId
      cacheWorkspace(result)
      return result
    } finally {
      isMutating.value = false
    }
  }

  async function deleteEvents(eventIds: string[]) {
    if (!session.value || !activeTabId.value) return null
    return mutateWorkspace(
      'post',
      ApiEndpoints.ROUTE_ELD_EVENT_SESSION_DELETE_EVENTS(session.value.id, activeTabId.value),
      { eventIds }
    )
  }

  async function updateEvents(body: Record<string, unknown>) {
    if (!session.value || !activeTabId.value) return null
    return mutateWorkspace(
      'patch',
      ApiEndpoints.ROUTE_ELD_EVENT_SESSION_EVENTS(session.value.id, activeTabId.value),
      body
    )
  }

  async function updateEvent(eventId: string, body: Record<string, unknown>) {
    if (!session.value || !activeTabId.value) return null
    assertEditableSession()
    isMutating.value = true
    try {
      await api.put(
        ApiEndpoints.ROUTE_ELD_EVENT_SESSION_EVENT(session.value.id, activeTabId.value, eventId),
        body
      )
      return await refreshWorkspace()
    } finally {
      isMutating.value = false
    }
  }

  async function insertEvent(body: Record<string, unknown>) {
    if (!session.value || !activeTabId.value) return null
    assertEditableSession()
    isMutating.value = true
    try {
      await api.post(
        ApiEndpoints.ROUTE_ELD_EVENT_SESSION_INSERT_EVENT(session.value.id, activeTabId.value),
        body
      )
      return await refreshWorkspace()
    } finally {
      isMutating.value = false
    }
  }

  async function revertEvent(eventId: string) {
    if (!session.value || !activeTabId.value) return null
    assertEditableSession()
    const sessionId = session.value.id
    const tabId = activeTabId.value
    isMutating.value = true
    try {
      const response = await api.post<RouteEldWorkspaceEvent | ApiEnvelope<RouteEldWorkspaceEvent>>(
        ApiEndpoints.ROUTE_ELD_EVENT_SESSION_REVERT_EVENT(sessionId, tabId, eventId),
        null
      )
      const updated = unwrap(response.data)
      // Rebuild the whole effective workspace. A revert can restore profile data,
      // remove reassignment side effects, and change neighbouring calculations.
      await Promise.all([loadWorkspace(sessionId, tabId), fetchProfileForms(sessionId, tabId)])
      return updated
    } finally {
      isMutating.value = false
    }
  }

  async function boostEvents(eventIds: string[], deltaSeconds: number) {
    if (!session.value || !activeTabId.value) return null
    return mutateWorkspace(
      'post',
      ApiEndpoints.ROUTE_ELD_EVENT_SESSION_BOOST(session.value.id, activeTabId.value),
      { eventIds, deltaSeconds }
    )
  }

  async function boostEventDuration(
    eventId: string,
    durationSeconds: number,
    mode: 'expand' | 'reduce',
    ensurePti: boolean
  ) {
    if (!session.value || !activeTabId.value) return null
    return mutateWorkspace(
      'post',
      ApiEndpoints.ROUTE_ELD_EVENT_SESSION_DURATION_BOOST(session.value.id, activeTabId.value),
      { eventId, durationSeconds, mode, ensurePti }
    )
  }

  async function reassignEvents(eventIds: string[], toDriverId: string, type: string) {
    if (!session.value || !activeTabId.value) return null
    return mutateWorkspace(
      'post',
      ApiEndpoints.ROUTE_ELD_EVENT_SESSION_REASSIGN(session.value.id, activeTabId.value),
      { eventIds, toDriverId, type }
    )
  }

  async function updateProfileForm(form: RouteEldProfileForm) {
    if (!session.value || !activeTabId.value) return null
    assertEditableSession()
    isMutating.value = true
    try {
      const response = await api.put<RouteEldProfileForm | ApiEnvelope<RouteEldProfileForm>>(
        ApiEndpoints.ROUTE_ELD_EVENT_SESSION_PROFILE_FORMS(session.value.id),
        {
          logDate: form.logDate,
          coDriverId: form.coDriverId || null,
          coDriverName: form.coDriverName || null,
          trailers: form.trailers,
          shippingDocuments: form.shippingDocuments,
          signatureFileName: form.signatureFileName || null,
        },
        { params: { tabId: activeTabId.value } }
      )
      const result = unwrap(response.data)
      await fetchProfileForms(session.value.id, activeTabId.value)
      return result
    } finally {
      isMutating.value = false
    }
  }

  async function fetchDriverOptions(driverId: string) {
    const [usersResponse, coDriversResponse] = await Promise.all([
      api.get<RouteEldResponsibleUser[] | ApiEnvelope<RouteEldResponsibleUser[]>>(
        ApiEndpoints.ROUTE_ELD_DRIVER_RESPONSIBLE_USERS(driverId)
      ),
      api.get<RouteEldResponsibleUser[] | ApiEnvelope<RouteEldResponsibleUser[]>>(
        ApiEndpoints.ROUTE_ELD_DRIVER_CO_DRIVERS(driverId)
      ),
    ])
    responsibleUsers.value = unwrap(usersResponse.data) ?? []
    coDrivers.value = unwrap(coDriversResponse.data) ?? []
  }

  async function fetchCoDriverSchedule(
    driverId: string,
    coDriverId: string,
    fromDate: string,
    toDate: string
  ) {
    const key = `${driverId}:${coDriverId}:${fromDate}:${toDate}`
    requestedCoDriverScheduleKey = key
    const cached = coDriverScheduleCache.get(key)
    if (cached) {
      coDriverSchedule.value = cached
      coDriverScheduleLoading.value = false
      return cached
    }
    coDriverScheduleLoading.value = true
    let pending = coDriverSchedulePending.get(key)
    if (!pending) {
      pending = api.get<RouteEldCoDriverSchedule | ApiEnvelope<RouteEldCoDriverSchedule>>(
        ApiEndpoints.ROUTE_ELD_DRIVER_CO_DRIVER_SCHEDULE(driverId),
        { params: { coDriverId, fromDate, toDate } }
      ).then((response) => {
        const result = unwrap(response.data)
        coDriverScheduleCache.set(key, result)
        return result
      }).finally(() => coDriverSchedulePending.delete(key))
      coDriverSchedulePending.set(key, pending)
    }
    try {
      const result = await pending
      if (requestedCoDriverScheduleKey === key) coDriverSchedule.value = result
      return result
    } finally {
      if (requestedCoDriverScheduleKey === key) coDriverScheduleLoading.value = false
    }
  }

  function clearCoDriverSchedule() {
    requestedCoDriverScheduleKey = ''
    coDriverSchedule.value = null
    coDriverScheduleLoading.value = false
  }

  async function fetchReassignTargets(driverId: string) {
    const response = await api.get<RouteEldDriverOption[] | ApiEnvelope<RouteEldDriverOption[]>>(
      ApiEndpoints.ROUTE_ELD_SOURCE_DRIVERS
    )
    reassignTargets.value = (unwrap(response.data) ?? [])
      .filter((driver) => driver.id !== driverId && driver.isActive)
      .sort((first, second) => first.displayName.localeCompare(second.displayName))
    return reassignTargets.value
  }

  async function analyzeAiAdvice(adviceType: string) {
    if (!session.value || !activeTabId.value) return null
    const response = await api.post<RouteEldAiAdvice | ApiEnvelope<RouteEldAiAdvice>>(
      ApiEndpoints.ROUTE_ELD_EVENT_SESSION_AI_ADVICE(session.value.id, activeTabId.value),
      { adviceType }
    )
    return unwrap(response.data)
  }

  async function normalize(normalizeList: RouteEldNormalizeType[], applyCertificationFix: boolean) {
    if (!session.value || !activeTabId.value) return null
    if (!canEditWorkingSession.value) {
      throw new Error('Normalization is only available on the active working tab.')
    }
    if (!normalizeList.length && !applyCertificationFix) {
      throw new Error('Select at least one repair routine.')
    }
    isMutating.value = true
    try {
      const response = await api.post<
        RouteEldNormalizeResponse | ApiEnvelope<RouteEldNormalizeResponse>
      >(ApiEndpoints.ROUTE_ELD_NORMALIZE, {
        sessionId: session.value.id,
        tabId: activeTabId.value,
        normalizeList,
        applyCertificationFix,
      })
      await refreshWorkspace()
      return unwrap(response.data)
    } finally {
      isMutating.value = false
    }
  }

  async function runSessionOperation(
    type: 'submit' | 'rollback',
    onProgress?: (operation: RouteEldSessionOperation) => void
  ) {
    if (!session.value) return null
    isMutating.value = true
    try {
      const url =
        type === 'rollback'
          ? ApiEndpoints.ROUTE_ELD_EVENT_SESSION_START_ROLLBACK(session.value.id)
          : ApiEndpoints.ROUTE_ELD_EVENT_SESSION_START_SUBMIT(session.value.id)
      let operation = unwrap(
        (
          await api.post<RouteEldSessionOperation | ApiEnvelope<RouteEldSessionOperation>>(
            url,
            null
          )
        ).data
      )
      onProgress?.(operation)
      while (operation.status === 'QUEUED' || operation.status === 'RUNNING') {
        await new Promise((resolve) => setTimeout(resolve, 500))
        operation = unwrap(
          (
            await api.get<RouteEldSessionOperation | ApiEnvelope<RouteEldSessionOperation>>(
              ApiEndpoints.ROUTE_ELD_EVENT_SESSION_OPERATION(session.value.id, operation.id)
            )
          ).data
        )
        onProgress?.(operation)
      }
      if (operation.status === 'FAILED') throw new Error(operation.error || 'Operation failed')
      const sessionId = session.value.id
      await loadSession(sessionId)
      const targetKind = type === 'rollback' ? 'ROLLBACK' : 'FINAL'
      const targetTab = [...(session.value?.tabs ?? [])]
        .filter((tab) => tab.kind === targetKind)
        .sort((left, right) => right.position - left.position)[0]
      if (targetTab) await selectTab(targetTab.id)
      return operation
    } finally {
      isMutating.value = false
    }
  }

  async function submitOrRollback() {
    const type = session.value?.status === 'SUBMITTED' ? 'rollback' : 'submit'
    return runSessionOperation(type)
  }

  function requestProfileFormEdit(logDate: string) {
    if (canEditWorkingSession.value) profileFormEditRequest.value = logDate
  }

  function clearProfileFormEditRequest() {
    profileFormEditRequest.value = null
  }

  function clear() {
    sessions.value = []
    session.value = null
    workspace.value = null
    profileForms.value = []
    schedule.value = null
    eventEditOptions.value = { vehicles: [], elds: [] }
    responsibleUsers.value = []
    coDrivers.value = []
    reassignTargets.value = []
    clearCoDriverSchedule()
    profileFormEditRequest.value = null
    activeTabId.value = null
    workspaceCache.clear()
    profileFormsCache.clear()
    coDriverScheduleCache.clear()
    coDriverSchedulePending.clear()
  }

  return {
    sessions,
    session,
    workspace,
    profileForms,
    schedule,
    eventEditOptions,
    responsibleUsers,
    coDrivers,
    reassignTargets,
    coDriverSchedule,
    coDriverScheduleLoading,
    profileFormEditRequest,
    activeTabId,
    activeTab,
    isLoading,
    isMutating,
    fetchSessions,
    fetchProfileForms,
    fetchSchedule,
    fetchEventEditOptions,
    loadSession,
    selectTab,
    createSession,
    createTab,
    deleteTab,
    refreshWorkspace,
    deleteEvents,
    updateEvents,
    updateEvent,
    insertEvent,
    revertEvent,
    boostEvents,
    boostEventDuration,
    reassignEvents,
    updateProfileForm,
    fetchDriverOptions,
    fetchCoDriverSchedule,
    clearCoDriverSchedule,
    fetchReassignTargets,
    analyzeAiAdvice,
    normalize,
    submitOrRollback,
    runSessionOperation,
    requestProfileFormEdit,
    clearProfileFormEditRequest,
    clear,
  }
})
