// Wire protocol of the logistics dispatcher agent (eld-logistic-agent, a WebSocket server).
// The agent edits the draft through the backend's ai-actions endpoints with the user's own token.

export type EldAgentRole = 'user' | 'agent'

export interface EldAgentMessage {
  id: string
  role: EldAgentRole
  text: string
  pending?: boolean
  isError?: boolean
}

export interface EldAgentSelectedEvent {
  id: string
  timestamp: number
}

export interface EldAgentContext {
  sessionId: string
  tabId: string
  token: string
  fromDate?: string
  toDate?: string
  selectedEvent?: EldAgentSelectedEvent | null
}

export type EldAgentReplyType = 'connection_established' | 'response' | 'ack' | 'final' | 'error'

export interface EldAgentReply {
  type: EldAgentReplyType
  message?: string | null
}

/**
 * The agent URL from VITE_APP_AI_AGENT_WS_URL, or null (agent hidden). Every message carries the user's Bearer
 * token, so only wss:// is accepted, except plain ws:// to this machine for local development.
 */
export function eldAgentUrl(configured: unknown): string | null {
  const value = String(configured ?? '').trim()
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }
  if (url.protocol === 'wss:') return value
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  return url.protocol === 'ws:' && local ? value : null
}

/** One chat message, in the shape the agent reads (it forwards `token` as the backend Bearer token). */
export function buildAgentMessage(context: EldAgentContext, message: string, audio = false) {
  const event = context.selectedEvent
  return {
    // The agent sends this as `sessionId`; on HOS it is the RouteEld event session id.
    tabSessionId: context.sessionId,
    tabId: context.tabId,
    message,
    token: context.token,
    eventSelected: Boolean(event),
    event: event ? { id: event.id, date: new Date(event.timestamp).toISOString() } : null,
    fromDate: context.fromDate ?? null,
    toDate: context.toDate ?? null,
    audio_input: audio,
  }
}

export function parseAgentReply(raw: unknown): EldAgentReply | null {
  if (typeof raw !== 'string') return null
  try {
    const value = JSON.parse(raw) as { type?: unknown; message?: unknown }
    const types: EldAgentReplyType[] = [
      'connection_established',
      'response',
      'ack',
      'final',
      'error',
    ]
    if (!types.includes(value.type as EldAgentReplyType)) return null
    return {
      type: value.type as EldAgentReplyType,
      message: typeof value.message === 'string' ? value.message : null,
    }
  } catch {
    return null
  }
}

let sequence = 0
const nextId = () => `agent-${Date.now()}-${++sequence}`

/** Adds the user's message and the agent's pending bubble. */
export function startTurn(messages: EldAgentMessage[], text: string): EldAgentMessage[] {
  return [
    ...messages.filter((item) => !item.pending),
    { id: nextId(), role: 'user', text },
    { id: nextId(), role: 'agent', text: '', pending: true },
  ]
}

export interface AppliedReply {
  messages: EldAgentMessage[]
  /** The turn is over; the user can send again. */
  done: boolean
  /** The agent ran an action that may have changed the draft, so the workspace must be reloaded. */
  refresh: boolean
}

/**
 * Applies one reply. `ack` means the agent started an action: its text replaces the pending bubble and a new
 * pending bubble waits for `final`, which ends the turn and signals a workspace reload.
 */
export function applyAgentReply(messages: EldAgentMessage[], reply: EldAgentReply): AppliedReply {
  if (reply.type === 'connection_established') return { messages, done: false, refresh: false }

  const text =
    reply.message?.trim() ||
    (reply.type === 'error' ? 'The agent could not process the request.' : '')
  const settled = messages.filter((item) => !item.pending)
  const answer: EldAgentMessage = {
    id: nextId(),
    role: 'agent',
    text,
    isError: reply.type === 'error',
  }
  if (reply.type === 'ack') {
    return {
      messages: [
        ...settled,
        ...(text ? [answer] : []),
        { id: nextId(), role: 'agent', text: '', pending: true },
      ],
      done: false,
      refresh: false,
    }
  }

  return {
    messages: text ? [...settled, answer] : settled,
    done: true,
    refresh: reply.type === 'final',
  }
}

/** Strips the data-URL prefix: the agent expects plain base64 audio. */
export function audioBase64(dataUrl: string) {
  const comma = dataUrl.indexOf(',')
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl
}
