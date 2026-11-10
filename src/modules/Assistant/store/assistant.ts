import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { isAxiosError } from 'axios'
import { getApiErrorMessage, useApi } from '@/composables/useAxiosService'
import { ApiEndpoints } from '@/api/endpoints'
import {
  AssistantItemKind,
  CONVERSATION_FULL_CODE,
  type AssistantConversation,
  type AssistantDecisionRequest,
  type AssistantFocusRequest,
  type AssistantItem,
  type AssistantNavigation,
  type AssistantStartTurnRequest,
  type AssistantTurn,
} from '../types'

interface ApiEnvelope<T> {
  successResult: T
}

interface PendingSend {
  conversationId: string
  text: string
  clientTurnId: string
}

/** The event selected on a draft's graph; it is sent only while that draft and tab are in focus. */
export interface AssistantSelectedEvent {
  sessionId: string
  tabId: string
  eventId: string
}

const POLL_INTERVAL_MS = 1000
const POLL_TIMEOUT_MS = 300_000
const POLL_MAX_CONSECUTIVE_FAILURES = 3
const REQUEST_TIMEOUT_MS = 15_000
const NETWORK_MESSAGE = 'Could not reach the server. Try again.'
const TIMEOUT_MESSAGE = 'The assistant is taking too long. Try again.'

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

function isConversationFull(error: unknown) {
  if (!isAxiosError(error) || error.response?.status !== 409) return false
  const data = error.response.data as { code?: unknown } | undefined
  return data?.code === CONVERSATION_FULL_CODE
}

function errorText(error: unknown, fallback: string) {
  if (!isAxiosError(error)) return fallback
  if (!error.response) return NETWORK_MESSAGE
  if (error.response.status === 401) return 'Your session expired. Sign in again.'
  if (error.response.status === 403) {
    return getApiErrorMessage(error, 'You do not have access to the assistant.')
  }
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

/**
 * The user's one app-wide assistant chat. Every page shows this same conversation; each message carries the page it
 * was sent from (its focus), and the server decides which driver and draft the assistant works on.
 */
export const useAssistantStore = defineStore('assistant', () => {
  const api = useApi()
  const conversationId = ref<string | null>(null)
  const items = ref<AssistantItem[]>([])
  const activeTurn = ref<AssistantTurn | null>(null)
  const isLoaded = ref(false)
  const isLoading = ref(false)
  const isSending = ref(false)
  const isDeciding = ref(false)
  const error = ref<string | null>(null)
  const resendText = ref<string | null>(null)
  const isOpen = ref(false)
  const selectedEvent = ref<AssistantSelectedEvent | null>(null)
  /** A draft the assistant opened during a reply the user is waiting for; the app opens it once, then clears it. */
  const pendingNavigation = ref<AssistantNavigation | null>(null)
  /** The signed-in user this chat belongs to; another user (logout without a page reload) gets a clean store. */
  const ownerId = ref<string | null>(null)

  let pollController: AbortController | null = null
  let pollGeneration = 0
  let loadSequence = 0
  let pendingSend: PendingSend | null = null
  let acceptedTurn: { turnId: string; text: string } | null = null
  // Bumped whenever the shown conversation changes, so a late reply for the previous one is ignored.
  let conversationVersion = 0

  const isBusy = computed(
    () => isSending.value || isLoading.value || isDeciding.value || activeTurn.value !== null
  )
  const isProcessing = computed(
    () => isSending.value || Boolean(activeTurn.value && isActiveStatus(activeTurn.value.status))
  )
  const confirmation = computed(() =>
    activeTurn.value?.status === 'AWAITING_CONFIRMATION'
      ? (activeTurn.value.confirmation ?? null)
      : null
  )
  const appliedCorrections = computed(() =>
    items.value.flatMap((item) =>
      item.action?.correction?.status === 'applied' ? [item.action.correction] : []
    )
  )

  function stopPolling() {
    pollGeneration += 1
    pollController?.abort()
    pollController = null
  }

  function show(conversation: AssistantConversation | null) {
    stopPolling()
    conversationVersion += 1
    conversationId.value = conversation?.id ?? null
    items.value = conversation?.items ?? []
    activeTurn.value = null
    pendingNavigation.value = null
    acceptedTurn = null
    if (conversation?.openTurn) {
      applyTurn(conversation.openTurn, false)
      if (isActiveStatus(conversation.openTurn.status)) startPolling(conversation.openTurn)
    }
  }

  function setError(message: string, resend: string | null = null) {
    error.value = message
    resendText.value = resend
  }

  function lastUserText() {
    for (let index = items.value.length - 1; index >= 0; index--) {
      const item = items.value[index]
      if (item.kind === AssistantItemKind.User && item.text) return item.text
    }
    return null
  }

  function resendTextFor(turn: AssistantTurn) {
    return acceptedTurn?.turnId === turn.turnId ? acceptedTurn.text : lastUserText()
  }

  /** Merges a turn's items; returns the drafts opened by items that were not shown before. */
  function mergeItems(incoming: AssistantItem[]) {
    const opened: AssistantNavigation[] = []
    if (!incoming.length) return opened
    const updated = new Map(items.value.map((item) => [item.id, item]))
    for (const item of incoming) {
      if (!updated.has(item.id) && item.kind === AssistantItemKind.Navigation && item.navigation) {
        opened.push(item.navigation)
      }
      updated.set(item.id, item)
    }
    items.value = [...updated.values()]
    return opened
  }

  /** Shows a turn; live is true for a reply the user is waiting for, false for history. */
  function applyTurn(turn: AssistantTurn, live: boolean) {
    const opened = mergeItems(turn.items ?? [])
    if (live && opened.length) pendingNavigation.value = opened[opened.length - 1]
    if (isActiveStatus(turn.status) || turn.status === 'AWAITING_CONFIRMATION') {
      activeTurn.value = turn
      if (turn.status === 'AWAITING_CONFIRMATION' && !turn.confirmation) {
        setError('The change preview is unavailable. Reload the chat to check its status.')
      }
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
    }
  }

  function startPolling(turn: AssistantTurn) {
    stopPolling()
    const controller = new AbortController()
    pollController = controller
    const generation = pollGeneration
    const version = conversationVersion
    const startedAt = Date.now()
    const isStale = () => generation !== pollGeneration || version !== conversationVersion

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
          const response = await api.get<AssistantTurn | ApiEnvelope<AssistantTurn>>(
            ApiEndpoints.ASSISTANT_TURN(turn.conversationId, turn.turnId),
            { signal: controller.signal, timeout: REQUEST_TIMEOUT_MS, _skipErrorToast: true }
          )
          if (isStale()) return
          const next = response.data ? unwrap(response.data) : null
          if (!next) throw new Error('Empty turn response')
          failures = 0
          applyTurn(next, true)
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

  /** Loads the user's current chat; a user without one sees an empty chat until the first message. */
  async function load() {
    if (isSending.value || isDeciding.value) return
    const sequence = ++loadSequence
    isLoading.value = true
    error.value = null
    try {
      const response = await api.get<
        AssistantConversation | ApiEnvelope<AssistantConversation> | ''
      >(ApiEndpoints.ASSISTANT_CURRENT_CONVERSATION, {
        timeout: REQUEST_TIMEOUT_MS,
        _skipErrorToast: true,
      })
      if (sequence !== loadSequence) return
      show(response.data ? unwrap(response.data) : null)
      isLoaded.value = true
    } catch (err) {
      if (sequence !== loadSequence) return
      if (statusOf(err) === 404) {
        show(null)
        isLoaded.value = true
        return
      }
      setError(errorText(err, 'Could not load the assistant chat.'))
    } finally {
      if (sequence === loadSequence) isLoading.value = false
    }
  }

  /** Forgets everything shown and stops every request in flight, so nothing of it can reach another user. */
  function reset() {
    loadSequence += 1
    show(null)
    pendingSend = null
    isLoaded.value = false
    isLoading.value = false
    isSending.value = false
    isDeciding.value = false
    error.value = null
    resendText.value = null
    isOpen.value = false
    selectedEvent.value = null
  }

  /** Binds the chat to the signed-in user; a different user (or none) clears it first. */
  function claim(userId: string | null) {
    if (ownerId.value === userId) return
    reset()
    ownerId.value = userId
  }

  function ensureLoaded(userId: string | null) {
    claim(userId)
    if (userId && !isLoaded.value && !isLoading.value) void load()
  }

  async function createConversation() {
    const response = await api.post<AssistantConversation | ApiEnvelope<AssistantConversation>>(
      ApiEndpoints.ASSISTANT_CONVERSATIONS,
      undefined,
      { timeout: REQUEST_TIMEOUT_MS, _skipErrorToast: true }
    )
    const conversation = response.data ? unwrap(response.data) : null
    if (!conversation?.id) throw new Error('Empty conversation response')
    loadSequence += 1
    show(conversation)
    isLoaded.value = true
    return conversation.id
  }

  async function postTurn(id: string, text: string, focus: AssistantFocusRequest) {
    if (!pendingSend || pendingSend.conversationId !== id || pendingSend.text !== text) {
      pendingSend = { conversationId: id, text, clientTurnId: newClientTurnId() }
    }
    const attempt = pendingSend
    const response = await api.post<
      AssistantTurn | ApiEnvelope<AssistantTurn>,
      AssistantStartTurnRequest
    >(
      ApiEndpoints.ASSISTANT_TURNS(id),
      { clientTurnId: attempt.clientTurnId, text, focus },
      { _skipErrorToast: true }
    )
    if (pendingSend === attempt) pendingSend = null
    const turn = response.data ? unwrap(response.data) : null
    if (!turn) throw new Error('Empty turn response')
    return turn
  }

  /** Sends one message with the page it is sent from; true when the server accepted it. */
  async function send(text: string, focus: AssistantFocusRequest) {
    const trimmed = text.trim()
    if (!trimmed || isBusy.value) return false
    isSending.value = true
    error.value = null
    resendText.value = null
    let version = conversationVersion
    try {
      let id = conversationId.value ?? (await createConversation())
      version = conversationVersion
      let turn: AssistantTurn
      try {
        turn = await postTurn(id, trimmed, focus)
      } catch (err) {
        if (!isConversationFull(err)) throw err
        // A full chat takes no more messages: start a new chat and send this message there once.
        id = await createConversation()
        version = conversationVersion
        turn = await postTurn(id, trimmed, focus)
      }
      if (version !== conversationVersion) return false
      acceptedTurn = { turnId: turn.turnId, text: trimmed }
      applyTurn(turn, true)
      if (activeTurn.value && isActiveStatus(activeTurn.value.status)) startPolling(turn)
      return true
    } catch (err) {
      if (version === conversationVersion) {
        setError(
          errorText(err, 'Could not send the message.'),
          statusOf(err) === 409 ? null : trimmed
        )
      }
      return false
    } finally {
      isSending.value = false
    }
  }

  /**
   * Approves or declines the open card. Approval follows the card's own gates: the attestation only when the card
   * requires it, and never when the server says the current user cannot apply it or the card has expired.
   */
  async function decide(approve: boolean, factualAttestation = false) {
    const turn = activeTurn.value
    const preview = confirmation.value
    if (!turn || !preview || isDeciding.value || isLoading.value || isSending.value) return false
    const expiry = Date.parse(preview.expiresAt)
    if (
      approve &&
      (preview.canApply === false ||
        (preview.isAttestationRequired !== false && !factualAttestation) ||
        !Number.isFinite(expiry) ||
        expiry <= Date.now())
    )
      return false
    const version = conversationVersion
    isDeciding.value = true
    error.value = null
    resendText.value = null
    try {
      const response = await api.post<
        AssistantTurn | ApiEnvelope<AssistantTurn>,
        AssistantDecisionRequest
      >(
        ApiEndpoints.ASSISTANT_DECISION(turn.conversationId, turn.turnId),
        { confirmationId: preview.id, approve, factualAttestation: approve && factualAttestation },
        { timeout: REQUEST_TIMEOUT_MS, _skipErrorToast: true }
      )
      if (version !== conversationVersion) return false
      const next = response.data ? unwrap(response.data) : null
      if (!next) throw new Error('Empty decision response')
      applyTurn(next, true)
      if (isActiveStatus(next.status)) startPolling(next)
      return true
    } catch (err) {
      if (version === conversationVersion) {
        setError(errorText(err, 'Could not record the decision. Check status and try again.'))
      }
      return false
    } finally {
      isDeciding.value = false
    }
  }

  /** Starts a new chat; the server reuses the current one while it has no message yet. */
  async function newChat() {
    if (isSending.value || isDeciding.value) return false
    error.value = null
    resendText.value = null
    try {
      await createConversation()
      return true
    } catch (err) {
      setError(errorText(err, 'Could not start a new chat.'))
      return false
    }
  }

  function takeNavigation() {
    const navigation = pendingNavigation.value
    pendingNavigation.value = null
    return navigation
  }

  return {
    conversationId,
    items,
    activeTurn,
    isLoaded,
    isLoading,
    isSending,
    isDeciding,
    isBusy,
    isProcessing,
    confirmation,
    appliedCorrections,
    error,
    resendText,
    isOpen,
    selectedEvent,
    pendingNavigation,
    load,
    ensureLoaded,
    claim,
    send,
    decide,
    newChat,
    takeNavigation,
    stopPolling,
  }
})
