import { ref } from 'vue'
import { defineStore } from 'pinia'

export interface AiHandoffRequest {
  driverId: string
  fromDate: string
  toDate: string
  text: string
}

/** Carries the launcher's request to the AI tab without putting it in the URL. */
export const useAiHandoffStore = defineStore('aiHandoff', () => {
  const pending = ref<AiHandoffRequest | null>(null)

  function set(request: AiHandoffRequest) {
    pending.value = { ...request }
  }

  function peek(driverId: string) {
    return pending.value?.driverId === driverId ? pending.value.text : null
  }

  /** Returns the text once and forgets it; call only after the message was sent. */
  function take(driverId: string) {
    const text = peek(driverId)
    if (text !== null) pending.value = null
    return text
  }

  return { pending, set, peek, take }
})

export interface AiHandoffSession {
  id: string
  driverId: string
  status: string
  fromDate: string
  toDate: string
}

/**
 * True only when the open draft is the one the launcher asked for: the same driver and dates, a DRAFT,
 * and the session the route points at (a skipped or leftover session can still sit in the store).
 */
export function handoffReady(state: {
  request: AiHandoffRequest | null
  session: AiHandoffSession | null
  querySessionId: string
  tabId: string
  busy: boolean
}) {
  const { request, session } = state
  return Boolean(
    request &&
      session &&
      state.tabId &&
      !state.busy &&
      state.querySessionId === session.id &&
      session.status === 'DRAFT' &&
      session.driverId.toLowerCase() === request.driverId.toLowerCase() &&
      session.fromDate === request.fromDate &&
      session.toDate === request.toDate
  )
}

/** Takes the request before sending so it can never go twice; a failed send puts it in the chat input. */
export async function deliverHandoff(
  handoff: { take(driverId: string): string | null },
  driverId: string,
  chat: { send(text: string): Promise<boolean>; fill(text: string): void }
) {
  const text = handoff.take(driverId)
  if (!text) return
  if (!(await chat.send(text))) chat.fill(text)
}
