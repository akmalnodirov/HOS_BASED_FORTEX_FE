import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { isAxiosError } from 'axios'
import { getApiErrorMessage, useApi } from '@/composables/useAxiosService'
import { ApiEndpoints } from '@/api/endpoints'
import {
  RouteEldAssistantItemKind,
  type RouteEldAssistantConversation,
  type RouteEldAssistantItem,
  type RouteEldAssistantStartTurnRequest,
  type RouteEldAssistantTurn,
} from '../types/assistant'

interface ApiEnvelope<T> {
  successResult: T
}

interface PendingSend {
  sessionId: string
  tabId: string
  text: string
  clientTurnId: string
}

const POLL_INTERVAL_MS = 1000
const POLL_TIMEOUT_MS = 300_000
const POLL_MAX_CONSECUTIVE_FAILURES = 3
const REQUEST_TIMEOUT_MS = 15_000
const NETWORK_MESSAGE = 'Could not reach the server. Try again.'
const TIMEOUT_MESSAGE = 'The assistant is taking too long. Try again.'
const CONFIRMATION_MESSAGE =
  'The assistant is waiting for a confirmation this version cannot show. Clear the chat to continue.'

function unwrap<T>(value: T | ApiEnvelope<T>): T {
  if (value && typeof value === 'object' && 'successResult' in value) {
    return value.successResult
  }
  return value
}

function isActiveStatus(status: string) {
  return status === 'QUEUED' || status === 'RUNNING'
}

function statusOf(error: unknown) {
  return isAxiosError(error) ? error.response?.status : undefined
}

function errorText(error: unknown, fallback: string) {
  if (!isAxiosError(error)) return fallback
  if (!error.response) return NETWORK_MESSAGE
  if (error.response.status === 403) return 'You do not have access to the assistant.'
  return getApiErrorMessage(error, fallback)
}

function newClientTurnId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const value = Math.floor(Math.random() * 16)
    return (char === 'x' ? value : (value & 0x3) | 0x8).toString(16)
  })
}

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    if (signal.aborted) {
      resolve()
      return
    }
    const timer = setTimeout(done, ms)
    function done() {
      clearTimeout(timer)
      signal.removeEventListener('abort', done)
      resolve()
    }
    signal.addEventListener('abort', done)
  })
}

export const useRouteEldAssistantStore = defineStore('routeEldAssistant', () => {
  const api = useApi()
  const sessionId = ref('')
  const conversationId = ref<string | null>(null)
  const items = ref<RouteEldAssistantItem[]>([])
  const activeTurn = ref<RouteEldAssistantTurn | null>(null)
  const isLoading = ref(false)
  const isSending = ref(false)
  const error = ref<string | null>(null)
  const resendText = ref<string | null>(null)

  let pollController: AbortController | null = null
  let pollGeneration = 0
  let loadSequence = 0
  let pendingSend: PendingSend | null = null
  let acceptedTurn: { turnId: string; text: string } | null = null

  const isBusy = computed(() => isSending.value || isLoading.value || activeTurn.value !== null)

  function stopPolling() {
    pollGeneration += 1
    pollController?.abort()
    pollController = null
  }

  function resetFor(id: string) {
    stopPolling()
    loadSequence += 1
    sessionId.value = id
    conversationId.value = null
    items.value = []
    activeTurn.value = null
    isLoading.value = false
    isSending.value = false
    error.value = null
    resendText.value = null
    pendingSend = null
    acceptedTurn = null
  }

  function setError(message: string, resend: string | null = null) {
    error.value = message
    resendText.value = resend
  }

  function lastUserText() {
    for (let index = items.value.length - 1; index >= 0; index--) {
      const item = items.value[index]
      if (item.kind === RouteEldAssistantItemKind.User && item.text) return item.text
    }
    return null
  }

  function resendTextFor(turn: RouteEldAssistantTurn) {
    return acceptedTurn?.turnId === turn.turnId ? acceptedTurn.text : lastUserText()
  }

  function mergeItems(incoming: RouteEldAssistantItem[]) {
    if (!incoming.length) return
    const known = new Set(items.value.map((item) => item.id))
    const added = incoming.filter((item) => !known.has(item.id))
    if (added.length) items.value = [...items.value, ...added]
  }

  function applyTurn(turn: RouteEldAssistantTurn) {
    conversationId.value = turn.conversationId
    mergeItems(turn.items ?? [])
    if (isActiveStatus(turn.status)) {
      activeTurn.value = turn
      return
    }
    activeTurn.value = null
    if (turn.status === 'FAILED') {
      setError(
        turn.errorMessage || 'The assistant could not answer. Try again.',
        resendTextFor(turn)
      )
    } else if (turn.status === 'EXPIRED') {
      setError(turn.errorMessage || 'The request expired. Try again.', resendTextFor(turn))
    } else if (turn.status === 'CANCELLED') {
      setError(turn.errorMessage || 'The request was cancelled.', resendTextFor(turn))
    } else if (turn.status === 'AWAITING_CONFIRMATION') {
      setError(CONFIRMATION_MESSAGE)
    }
  }

  function startPolling(turn: RouteEldAssistantTurn) {
    stopPolling()
    const controller = new AbortController()
    pollController = controller
    const generation = pollGeneration
    const polledSessionId = sessionId.value
    const startedAt = Date.now()
    const isStale = () => generation !== pollGeneration || sessionId.value !== polledSessionId

    void (async () => {
      let failures = 0
      while (true) {
        await wait(POLL_INTERVAL_MS, controller.signal)
        if (isStale()) return
        if (Date.now() - startedAt >= POLL_TIMEOUT_MS) {
          stopPolling()
          activeTurn.value = null
          setError(TIMEOUT_MESSAGE)
          return
        }
        try {
          const response = await api.get<
            RouteEldAssistantTurn | ApiEnvelope<RouteEldAssistantTurn>
          >(ApiEndpoints.ROUTE_ELD_EVENT_SESSION_ASSISTANT_TURN(polledSessionId, turn.turnId), {
            signal: controller.signal,
            timeout: REQUEST_TIMEOUT_MS,
            _skipErrorToast: true,
          })
          if (isStale()) return
          const next = response.data ? unwrap(response.data) : null
          if (!next) throw new Error('Empty turn response')
          failures = 0
          applyTurn(next)
          if (!isActiveStatus(next.status)) {
            pollController = null
            return
          }
        } catch (err) {
          if (isStale()) return
          failures += 1
          const status = statusOf(err)
          const fatal =
            (status !== undefined && status >= 400 && status < 500) ||
            failures >= POLL_MAX_CONSECUTIVE_FAILURES
          if (fatal) {
            stopPolling()
            activeTurn.value = null
            setError(errorText(err, 'Could not get the assistant reply.'))
            return
          }
        }
      }
    })()
  }

  async function load(id: string) {
    if (sessionId.value !== id) resetFor(id)
    if (isSending.value) return
    const sequence = ++loadSequence
    isLoading.value = true
    error.value = null
    try {
      const response = await api.get<
        RouteEldAssistantConversation | ApiEnvelope<RouteEldAssistantConversation> | ''
      >(ApiEndpoints.ROUTE_ELD_EVENT_SESSION_ASSISTANT(id), {
        timeout: REQUEST_TIMEOUT_MS,
        _skipErrorToast: true,
      })
      if (sequence !== loadSequence || sessionId.value !== id) return
      const conversation = response.data ? unwrap(response.data) : null
      stopPolling()
      if (!conversation) {
        conversationId.value = null
        items.value = []
        activeTurn.value = null
        return
      }
      conversationId.value = conversation.id
      items.value = conversation.items ?? []
      activeTurn.value = null
      if (conversation.openTurn) {
        applyTurn(conversation.openTurn)
        if (activeTurn.value) startPolling(conversation.openTurn)
      }
    } catch (err) {
      if (sequence !== loadSequence || sessionId.value !== id) return
      setError(errorText(err, 'Could not load the assistant chat.'))
    } finally {
      if (sequence === loadSequence && sessionId.value === id) isLoading.value = false
    }
  }

  async function send(id: string, tabId: string, text: string) {
    const trimmed = text.trim()
    if (!trimmed) return false
    if (sessionId.value !== id) resetFor(id)
    if (isBusy.value) return false

    isSending.value = true
    error.value = null
    try {
      if (
        !pendingSend ||
        pendingSend.sessionId !== id ||
        pendingSend.tabId !== tabId ||
        pendingSend.text !== trimmed
      ) {
        pendingSend = { sessionId: id, tabId, text: trimmed, clientTurnId: newClientTurnId() }
      }
      const attempt = pendingSend
      const response = await api.post<
        RouteEldAssistantTurn | ApiEnvelope<RouteEldAssistantTurn>,
        RouteEldAssistantStartTurnRequest
      >(
        ApiEndpoints.ROUTE_ELD_EVENT_SESSION_ASSISTANT_TURNS(id),
        { tabId, clientTurnId: attempt.clientTurnId, text: trimmed },
        { _skipErrorToast: true }
      )
      if (sessionId.value !== id) return false
      const turn = response.data ? unwrap(response.data) : null
      if (!turn) throw new Error('Empty turn response')
      if (pendingSend === attempt) pendingSend = null
      acceptedTurn = { turnId: turn.turnId, text: trimmed }
      applyTurn(turn)
      if (activeTurn.value) startPolling(turn)
      return true
    } catch (err) {
      if (sessionId.value === id) {
        setError(
          errorText(err, 'Could not send the message.'),
          statusOf(err) === 409 ? null : trimmed
        )
      }
      return false
    } finally {
      if (sessionId.value === id) isSending.value = false
    }
  }

  async function clear(id: string) {
    try {
      await api.delete(ApiEndpoints.ROUTE_ELD_EVENT_SESSION_ASSISTANT(id), {
        _skipErrorToast: true,
      })
    } catch (err) {
      if (sessionId.value === id) setError(errorText(err, 'Could not clear the chat.'))
      return false
    }
    if (sessionId.value === id) resetFor(id)
    return true
  }

  return {
    sessionId,
    conversationId,
    items,
    activeTurn,
    isLoading,
    isSending,
    isBusy,
    error,
    resendText,
    load,
    send,
    stopPolling,
    clear,
  }
})
