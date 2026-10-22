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
  const activeOperation = ref<{
    sessionId: string
    type: 'submit' | 'rollback'
    operation: RouteEldSessionOperation
  } | null>(null)
  const isSessionLocked = computed(
    () => activeOperation.value !== null && activeOperation.value.sessionId === session.value?.id
  )
  const isBusy = computed(() => isMutating.value || isLoading.value || isSessionLocked.value)
  function assertCanMutate() {
    if (isMutating.value) throw new Error('Wait for the current workspace change to finish.')
    if (isSessionLocked.value)
      throw new Error('This session is being submitted. Wait for it to finish.')
  }
  const activeTabId = ref<string | null>(null)
  const workspaceCache = new Map<string, RouteEldWorkspace>()
  const profileFormsCache = new Map<string, RouteEldProfileForm[]>()
  const coDriverScheduleCache = new Map<string, RouteEldCoDriverSchedule>()
  const coDriverSchedulePending = new Map<string, Promise<RouteEldCoDriverSchedule>>()
  let requestedCoDriverScheduleKey = ''
  let sessionLoadVersion = 0
  let synchronizationVersion = 0

  const tabCacheKey = (sessionId: string, tabId: string) => `${sessionId}:${tabId}`

  function clearSessionTabCache(sessionId: string) {
    const prefix = `${sessionId}:`
    for (const key of workspaceCache.keys()) {
      if (key.startsWith(prefix)) workspaceCache.delete(key)
    }
    for (const key of profileFormsCache.keys()) {
      if (key.startsWith(prefix)) profileFormsCache.delete(key)
    }
  }

  function cacheWorkspace(value: RouteEldWorkspace) {
    workspaceCache.set(tabCacheKey(value.session.id, value.tabId), value)
  }

  function applyEventResponse(changed: RouteEldWorkspaceEvent, insert = false) {
    const current = workspace.value
    if (
      !current || !session.value || current.session.id !== session.value.id ||
      current.tabId !== activeTabId.value
    ) return
    const index = current.events.findIndex((item) => item.event.id === changed.event.id)
    if (index < 0 && !insert) return
    const events = [...current.events]
    if (index >= 0 && changed.isInserted && changed.isDeleted) events.splice(index, 1)
    else if (index >= 0) events[index] = changed
    else events.push(changed)
    workspace.value = { ...current, events }
    cacheWorkspace(workspace.value)
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

  async function synchronizeWorkspace(
    sessionId: string,
    tabId: string,
    invalidateOtherTabs = false,
    refreshForms = true
  ) {
    const version = ++synchronizationVersion
    const workspaceResponse = await api.get<RouteEldWorkspace | ApiEnvelope<RouteEldWorkspace>>(
      ApiEndpoints.ROUTE_ELD_EVENT_SESSION_EVENTS(sessionId, tabId)
    )
    const snapshot = unwrap(workspaceResponse.data)
    if (snapshot.session.id !== sessionId || snapshot.tabId !== tabId) {
      throw new Error('The workspace response did not match the active tab.')
    }
    if (version !== synchronizationVersion) return snapshot
    if (invalidateOtherTabs) clearSessionTabCache(sessionId)
    cacheWorkspace(snapshot)
    if (session.value?.id === sessionId && activeTabId.value === tabId) {
      workspace.value = snapshot
      session.value = snapshot.session
    }
    if (refreshForms) await fetchProfileForms(sessionId, tabId, version).catch(() => {})
    return snapshot
  }

  async function acceptWorkspaceResponse(snapshot: RouteEldWorkspace) {
    const sessionId = snapshot.session.id
    const tabId = snapshot.tabId
    const version = ++synchronizationVersion
    clearSessionTabCache(sessionId)
    cacheWorkspace(snapshot)
    if (session.value?.id === sessionId && activeTabId.value === tabId) {
      workspace.value = snapshot
      session.value = snapshot.session
    }
    await fetchProfileForms(sessionId, tabId, version).catch(() => {})
    void fetchSessions(snapshot.session.driverId).catch(() => {})
    return snapshot
  }

  async function fetchProfileForms(sessionId: string, tabId: string, version: number) {
    const response = await api.get<RouteEldProfileForm[] | ApiEnvelope<RouteEldProfileForm[]>>(
      ApiEndpoints.ROUTE_ELD_EVENT_SESSION_PROFILE_FORMS(sessionId),
      { params: { tabId } }
    )
    const forms = unwrap(response.data) ?? []
    if (version !== synchronizationVersion) return forms
    profileFormsCache.set(tabCacheKey(sessionId, tabId), forms)
    if (session.value?.id === sessionId && activeTabId.value === tabId) profileForms.value = forms
    return forms
  }

  async function fetchSchedule(driverId: string, fromDate: string, toDate: string) {
    const response = await api.get<RouteEldSchedule | ApiEnvelope<RouteEldSchedule>>(
      ApiEndpoints.ROUTE_ELD_DRIVER_SCHEDULE(driverId),
      { params: { fromDate, toDate } }
    )
    const result = unwrap(response.data)
    if (session.value?.driverId === driverId && session.value.fromDate === fromDate && session.value.toDate === toDate) {
      schedule.value = result
      eventEditOptions.value = result.editOptions ?? { vehicles: [], elds: [] }
    }
    return result
  }

  async function fetchEventEditOptions(driverId: string) {
    const response = await api.get<
      RouteEldEventEditOptions | ApiEnvelope<RouteEldEventEditOptions>
    >(ApiEndpoints.ROUTE_ELD_DRIVER_SCHEDULE_OPTIONS(driverId))
    eventEditOptions.value = unwrap(response.data) ?? { vehicles: [], elds: [] }
    return eventEditOptions.value
  }

  async function loadSession(sessionId: string, preferredTabId?: string | null) {
    const version = ++sessionLoadVersion
    isLoading.value = true
    try {
      const response = await api.get<RouteEldEventSession | ApiEnvelope<RouteEldEventSession>>(
        ApiEndpoints.ROUTE_ELD_EVENT_SESSION(sessionId)
      )
      if (version !== sessionLoadVersion) return null
      session.value = unwrap(response.data)
      workspace.value = null
      schedule.value = null
      profileForms.value = []
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
      activeTabId.value = tab.id
      await synchronizeWorkspace(sessionId, tab.id, true)
      void fetchSchedule(session.value.driverId, session.value.fromDate, session.value.toDate).catch(() => {})
      return version === sessionLoadVersion ? workspace.value : null
    } finally {
      if (version === sessionLoadVersion) isLoading.value = false
    }
  }

  async function createSession(driverId: string, fromDate: string, toDate: string) {
    assertCanMutate()
    isMutating.value = true
    try {
      const response = await api.post<RouteEldWorkspace | ApiEnvelope<RouteEldWorkspace>>(
        ApiEndpoints.ROUTE_ELD_DRIVER_EVENT_SESSIONS(driverId),
        { fromDate, toDate }
      )
      const result = unwrap(response.data)
      ++sessionLoadVersion
      isLoading.value = false
      workspace.value = null
      profileForms.value = []
      session.value = result.session
      activeTabId.value = result.tabId
      const synchronized = await acceptWorkspaceResponse(result)
      void fetchSchedule(driverId, result.session.fromDate, result.session.toDate).catch(() => {})
      return synchronized
    } finally {
      isMutating.value = false
    }
  }

  async function selectTab(tabId: string) {
    if (!session.value) return null
    assertCanMutate()
    if (activeTabId.value === tabId && workspace.value) return workspace.value
    const currentSession = session.value
    if (!currentSession.tabs.some((tab) => tab.id === tabId)) {
      throw new Error('This tab is no longer part of the session.')
    }
    const key = tabCacheKey(currentSession.id, tabId)
    const cachedWorkspace = workspaceCache.get(key)
    const cachedProfileForms = profileFormsCache.get(key)
    const previousTabId = activeTabId.value
    const previousWorkspace = workspace.value
    const previousProfileForms = profileForms.value
    activeTabId.value = tabId
    if (cachedWorkspace && cachedProfileForms) {
      workspace.value = { ...cachedWorkspace, session: currentSession }
      profileForms.value = cachedProfileForms
      return workspace.value
    }
    isLoading.value = true
    workspace.value = null
    profileForms.value = []
    try {
      await synchronizeWorkspace(currentSession.id, tabId)
      return workspace.value
    } catch (error) {
      if (session.value?.id === currentSession.id && activeTabId.value === tabId) {
        activeTabId.value = previousTabId
        workspace.value = previousWorkspace
        profileForms.value = previousProfileForms
      }
      throw error
    } finally {
      isLoading.value = false
    }
  }

  async function createTab() {
    if (!session.value) return null
    assertDraftSession()
    assertCanMutate()
    isMutating.value = true
    try {
      const response = await api.post<RouteEldWorkspace | ApiEnvelope<RouteEldWorkspace>>(
        ApiEndpoints.ROUTE_ELD_EVENT_SESSION_TABS(session.value.id),
        null
      )
      const result = unwrap(response.data)
      workspace.value = null
      profileForms.value = []
      session.value = result.session
      activeTabId.value = result.tabId
      return await acceptWorkspaceResponse(result)
    } finally {
      isMutating.value = false
    }
  }

  async function deleteTab(tabId: string) {
    if (!session.value) return null
    assertDraftSession()
    assertCanMutate()
    isMutating.value = true
    try {
      const response = await api.delete<RouteEldWorkspace | ApiEnvelope<RouteEldWorkspace>>(
        ApiEndpoints.ROUTE_ELD_EVENT_SESSION_TAB(session.value.id, tabId)
      )
      const result = unwrap(response.data)
      workspace.value = null
      profileForms.value = []
      session.value = result.session
      activeTabId.value = result.tabId
      return await acceptWorkspaceResponse(result)
    } finally {
      isMutating.value = false
    }
  }

  async function refreshWorkspace() {
    if (!session.value || !activeTabId.value) return null
    assertCanMutate()
    isLoading.value = true
    try {
      return await synchronizeWorkspace(session.value.id, activeTabId.value, true)
    } finally {
      isLoading.value = false
    }
  }

  function validateEventResponse(changed: RouteEldWorkspaceEvent, expectedEventId?: string) {
    if (!changed?.event?.id || (expectedEventId && changed.event.id !== expectedEventId)) {
      throw new Error('The workspace action returned a different event.')
    }
    return changed
  }

  async function refreshEventDependencies(sessionId: string, tabId: string, refreshForms = true) {
    return synchronizeWorkspace(sessionId, tabId, true, refreshForms)
  }

  async function mutateWorkspace(
    method: 'post' | 'patch',
    url: string,
    body?: Record<string, unknown> | null
  ) {
    assertEditableSession()
    assertCanMutate()
    const sessionId = session.value!.id
    const tabId = activeTabId.value!
    isMutating.value = true
    try {
      const response = await api[method]<RouteEldWorkspace | ApiEnvelope<RouteEldWorkspace>>(
        url,
        body ?? null
      )
      const result = unwrap(response.data)
      if (result.session.id !== sessionId || result.tabId !== tabId) {
        throw new Error('The workspace action returned a different tab.')
      }
      return await acceptWorkspaceResponse(result)
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
    assertCanMutate()
    const sessionId = session.value.id
    const tabId = activeTabId.value
    isMutating.value = true
    try {
      const response = await api.put<RouteEldWorkspaceEvent | ApiEnvelope<RouteEldWorkspaceEvent>>(
        ApiEndpoints.ROUTE_ELD_EVENT_SESSION_EVENT(sessionId, tabId, eventId),
        body
      )
      const updated = validateEventResponse(unwrap(response.data), eventId)
      applyEventResponse(updated)
      await refreshEventDependencies(sessionId, tabId).catch(() => {})
      return updated
    } finally {
      isMutating.value = false
    }
  }

  async function insertEvent(body: Record<string, unknown>) {
    if (!session.value || !activeTabId.value) return null
    assertEditableSession()
    assertCanMutate()
    const sessionId = session.value.id
    const tabId = activeTabId.value
    isMutating.value = true
    try {
      const response = await api.post<RouteEldWorkspaceEvent | ApiEnvelope<RouteEldWorkspaceEvent>>(
        ApiEndpoints.ROUTE_ELD_EVENT_SESSION_INSERT_EVENT(sessionId, tabId),
        body
      )
      const created = validateEventResponse(unwrap(response.data))
      applyEventResponse(created, true)
      await refreshEventDependencies(sessionId, tabId).catch(() => {})
      return created
    } finally {
      isMutating.value = false
    }
  }

  async function deleteEvent(eventId: string) {
    if (!session.value || !activeTabId.value) return null
    assertEditableSession()
    assertCanMutate()
    const sessionId = session.value.id
    const tabId = activeTabId.value
    isMutating.value = true
    try {
      const response = await api.post<RouteEldWorkspaceEvent | ApiEnvelope<RouteEldWorkspaceEvent>>(
        ApiEndpoints.ROUTE_ELD_EVENT_SESSION_DELETE_EVENT(sessionId, tabId, eventId),
        null
      )
      const deleted = validateEventResponse(unwrap(response.data), eventId)
      applyEventResponse(deleted)
      await refreshEventDependencies(sessionId, tabId).catch(() => {})
      return deleted
    } finally {
      isMutating.value = false
    }
  }

  async function revertEvent(eventId: string) {
    if (!session.value || !activeTabId.value) return null
    assertEditableSession()
    assertCanMutate()
    if (workspace.value?.events.filter((item) => item.event.id === eventId).length !== 1) {
      throw new Error('The selected event could not be uniquely identified.')
    }
    const sessionId = session.value.id
    const tabId = activeTabId.value
    isMutating.value = true
    try {
      const response = await api.post<RouteEldWorkspaceEvent | ApiEnvelope<RouteEldWorkspaceEvent>>(
        ApiEndpoints.ROUTE_ELD_EVENT_SESSION_REVERT_EVENT(sessionId, tabId, eventId),
        null
      )
      const updated = validateEventResponse(unwrap(response.data), eventId)
      applyEventResponse(updated)
      await refreshEventDependencies(sessionId, tabId).catch(() => {})
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

  async function applyCertificationFix() {
    if (!session.value || !activeTabId.value) return null
    return mutateWorkspace(
      'post',
      ApiEndpoints.ROUTE_ELD_EVENT_SESSION_CERTIFICATION_FIX(session.value.id, activeTabId.value)
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
    assertCanMutate()
    const sessionId = session.value.id
    const tabId = activeTabId.value
    isMutating.value = true
    try {
      const response = await api.put<RouteEldProfileForm | ApiEnvelope<RouteEldProfileForm>>(
        ApiEndpoints.ROUTE_ELD_EVENT_SESSION_PROFILE_FORMS(sessionId),
        {
          logDate: form.logDate,
          coDriverId: form.coDriverId || null,
          coDriverName: form.coDriverName || null,
          trailers: form.trailers,
          shippingDocuments: form.shippingDocuments,
          signatureFileName: form.signatureFileName || null,
        },
        { params: { tabId } }
      )
      const result = unwrap(response.data)
      await refreshEventDependencies(sessionId, tabId).catch(() => {})
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
      .filter((driver) => driver.id !== driverId)
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
    assertCanMutate()
    const sessionId = session.value.id
    const tabId = activeTabId.value
    isMutating.value = true
    try {
      const response = await api.post<
        RouteEldNormalizeResponse | ApiEnvelope<RouteEldNormalizeResponse>
      >(ApiEndpoints.ROUTE_ELD_NORMALIZE, {
        sessionId,
        tabId,
        normalizeList,
        applyCertificationFix,
      })
      await refreshEventDependencies(sessionId, tabId).catch(() => {})
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
    assertCanMutate()
    if (activeOperation.value) throw new Error('Wait for the running session operation to finish.')
    const sessionId = session.value.id
    const driverId = session.value.driverId
    const originalTabId = activeTabId.value
    const url =
      type === 'rollback'
        ? ApiEndpoints.ROUTE_ELD_EVENT_SESSION_START_ROLLBACK(sessionId)
        : ApiEndpoints.ROUTE_ELD_EVENT_SESSION_START_SUBMIT(sessionId)
    let operation: RouteEldSessionOperation
    isMutating.value = true
    try {
      operation = unwrap(
        (
          await api.post<RouteEldSessionOperation | ApiEnvelope<RouteEldSessionOperation>>(
            url,
            null,
            { _skipErrorHandling: true }
          )
        ).data
      )
    } finally {
      isMutating.value = false
    }
    activeOperation.value = { sessionId, type, operation }
    onProgress?.(operation)
    const isCurrentSession = () => session.value?.id === sessionId
    let refreshed = false
    try {
      while (operation.status === 'QUEUED' || operation.status === 'RUNNING') {
        await new Promise((resolve) => setTimeout(resolve, 500))
        operation = unwrap(
          (
            await api.get<RouteEldSessionOperation | ApiEnvelope<RouteEldSessionOperation>>(
              ApiEndpoints.ROUTE_ELD_EVENT_SESSION_OPERATION(sessionId, operation.id),
              { _skipErrorHandling: true }
            )
          ).data
        )
        activeOperation.value = { sessionId, type, operation }
        onProgress?.(operation)
      }
      if (operation.status === 'FAILED') {
        if (isCurrentSession()) {
          await loadSession(sessionId, originalTabId)
          refreshed = true
        }
        throw new Error(operation.error || 'Operation failed')
      }
      const targetKind = type === 'rollback' ? 'ROLLBACK' : 'FINAL'
      clearSessionTabCache(sessionId)
      if (isCurrentSession()) {
        const response = await api.get<RouteEldEventSession | ApiEnvelope<RouteEldEventSession>>(
          ApiEndpoints.ROUTE_ELD_EVENT_SESSION(sessionId)
        )
        const updatedSession = unwrap(response.data)
        const targetTab = [...updatedSession.tabs]
          .filter((tab) => tab.kind === targetKind)
          .sort((left, right) => right.position - left.position)[0]
        await loadSession(sessionId, targetTab?.id)
        refreshed = true
      }
      void fetchSessions(driverId).catch(() => {})
      return operation
    } catch (error) {
      if (!refreshed && isCurrentSession()) {
        await loadSession(sessionId, originalTabId).catch(() => {})
      }
      throw error
    } finally {
      activeOperation.value = null
    }
  }

  async function retryEventDelivery(eventId: string) {
    if (!session.value || !activeTabId.value || !activeTab.value) return null
    assertCanMutate()
    const tabKind = activeTab.value.kind
    if (tabKind !== 'FINAL' && tabKind !== 'ROLLBACK') {
      throw new Error('Event delivery can only be retried from a final or rollback tab.')
    }
    const sessionId = session.value.id
    const tabId = activeTabId.value
    const driverId = session.value.driverId
    isMutating.value = true
    try {
      await api.post(
        tabKind === 'ROLLBACK'
          ? ApiEndpoints.ROUTE_ELD_EVENT_SESSION_ROLLBACK_EVENT(sessionId, eventId)
          : ApiEndpoints.ROUTE_ELD_EVENT_SESSION_SUBMIT_EVENT(sessionId, eventId),
        null
      )
      await loadSession(sessionId, tabId)
      void fetchSessions(driverId).catch(() => {})
      return tabKind
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
    ++sessionLoadVersion
    ++synchronizationVersion
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
    deleteEvent,
    revertEvent,
    boostEvents,
    applyCertificationFix,
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
    activeOperation,
    isSessionLocked,
    isBusy,
    runSessionOperation,
    retryEventDelivery,
    requestProfileFormEdit,
    clearProfileFormEditRequest,
    clear,
  }
})
