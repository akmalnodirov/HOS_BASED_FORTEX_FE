import { computed, onBeforeUnmount, ref, shallowRef } from 'vue'
import {
  applyAgentReply,
  audioBase64,
  buildAgentMessage,
  parseAgentReply,
  startTurn,
  type EldAgentContext,
  type EldAgentMessage,
} from '../utils/eldAgent'

type ConnectionState = 'idle' | 'connecting' | 'open' | 'closed'

// Longer than the agent's backend timeout (120 s) plus its two model calls.
const TURN_TIMEOUT_MS = 180_000

/**
 * One WebSocket conversation with the dispatcher agent. The agent keeps the chat history per connection, so
 * the caller reconnects when the draft session changes. `onChanged` runs after any turn in which the agent may
 * have changed the draft: a completed action, or one that failed or timed out after it started (`ack`).
 */
export function useEldAgentChat(url: string, onChanged: () => void | Promise<void>) {
  const messages = ref<EldAgentMessage[]>([])
  const state = ref<ConnectionState>('idle')
  const isBusy = ref(false)
  const error = ref('')
  const socket = shallowRef<WebSocket | null>(null)
  let actionStarted = false
  let turnTimer: ReturnType<typeof setTimeout> | null = null

  const isOpen = computed(() => state.value === 'open')

  function endTurn(refresh: boolean) {
    if (turnTimer) clearTimeout(turnTimer)
    turnTimer = null
    const changed = refresh || actionStarted
    isBusy.value = false
    actionStarted = false
    if (changed) void onChanged()
  }

  /** Ends an unfinished turn locally (lost connection, timeout); the draft is reloaded if an action had started. */
  function abandonTurn(message: string) {
    if (!isBusy.value) return
    messages.value = messages.value.filter((item) => !item.pending)
    error.value = message
    endTurn(false)
  }

  function connect() {
    disconnect()
    error.value = ''
    state.value = 'connecting'
    let ws: WebSocket
    try {
      ws = new WebSocket(url)
    } catch {
      state.value = 'closed'
      error.value = 'The dispatcher agent address is invalid or blocked by the browser.'
      return
    }
    socket.value = ws
    ws.onopen = () => {
      if (socket.value === ws) state.value = 'open'
    }
    ws.onmessage = (event) => {
      if (socket.value !== ws) return
      const reply = parseAgentReply(event.data)
      if (!reply) return
      if (reply.type === 'ack') actionStarted = true
      const applied = applyAgentReply(messages.value, reply)
      messages.value = applied.messages
      if (applied.done && isBusy.value) endTurn(applied.refresh)
      else if (applied.refresh) void onChanged()
    }
    ws.onerror = () => {
      if (socket.value === ws) error.value = 'The dispatcher agent is unavailable.'
    }
    ws.onclose = () => {
      if (socket.value !== ws) return
      state.value = 'closed'
      if (isBusy.value) abandonTurn('The connection to the dispatcher agent was lost.')
      else if (!error.value) error.value = 'Disconnected from the dispatcher agent.'
    }
  }

  function disconnect() {
    const ws = socket.value
    socket.value = null
    if (ws && ws.readyState <= WebSocket.OPEN) ws.close()
    state.value = 'idle'
    if (turnTimer) clearTimeout(turnTimer)
    turnTimer = null
    isBusy.value = false
    actionStarted = false
  }

  /** Starts a new conversation (the agent forgets the previous one with its connection). */
  function reset() {
    messages.value = []
    connect()
  }

  function send(context: EldAgentContext, text: string, label = text, audio = false) {
    const ws = socket.value
    if (!ws || ws.readyState !== WebSocket.OPEN || isBusy.value || !text.trim()) return false
    error.value = ''
    messages.value = startTurn(messages.value, label)
    isBusy.value = true
    actionStarted = false
    turnTimer = setTimeout(() => {
      abandonTurn(
        'The dispatcher agent did not answer in time. Check the log before trying again; the conversation was restarted.'
      )
      // A late reply on the old socket would otherwise be taken for the next turn's answer.
      const notice = error.value
      connect()
      error.value = notice
    }, TURN_TIMEOUT_MS)
    ws.send(JSON.stringify(buildAgentMessage(context, text, audio)))
    return true
  }

  const sendText = (context: EldAgentContext, text: string) => send(context, text.trim())

  async function sendAudio(context: EldAgentContext, audio: Blob) {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result ?? ''))
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(audio)
    })
    return send(context, audioBase64(dataUrl), 'Voice message', true)
  }

  onBeforeUnmount(disconnect)

  return { messages, state, isOpen, isBusy, error, connect, disconnect, reset, sendText, sendAudio }
}

/** Records one voice message with the browser's default audio format (the agent transcribes it). */
export function useVoiceRecorder() {
  const isRecording = ref(false)
  const isStarting = ref(false)
  const error = ref('')
  let recorder: MediaRecorder | null = null
  let chunks: Blob[] = []
  let disposed = false

  const isSupported =
    typeof window !== 'undefined' && 'MediaRecorder' in window && !!navigator.mediaDevices

  const release = (stream: MediaStream) => stream.getTracks().forEach((track) => track.stop())

  async function start() {
    if (!isSupported || isRecording.value || isStarting.value) return
    error.value = ''
    isStarting.value = true
    let stream: MediaStream | null = null
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      // The panel may have closed while the permission prompt was open.
      if (disposed) {
        release(stream)
        return
      }
      chunks = []
      const active = new MediaRecorder(stream)
      active.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data)
      }
      active.start()
      recorder = active
      isRecording.value = true
    } catch {
      if (stream) release(stream)
      error.value = 'Microphone access was denied or is unavailable.'
    } finally {
      isStarting.value = false
    }
  }

  /** Stops recording; resolves with the audio, or null when nothing was recorded or recording failed. */
  function stop(): Promise<Blob | null> {
    const active = recorder
    if (!active || !isRecording.value) return Promise.resolve(null)
    return new Promise((resolve) => {
      const finish = (audio: Blob | null) => {
        release(active.stream)
        isRecording.value = false
        recorder = null
        resolve(audio)
      }
      active.onstop = () =>
        finish(chunks.length ? new Blob(chunks, { type: active.mimeType || 'audio/webm' }) : null)
      active.onerror = () => {
        error.value = 'Recording failed.'
        finish(null)
      }
      active.stop()
    })
  }

  function cancel() {
    const active = recorder
    recorder = null
    isRecording.value = false
    if (!active) return
    if (active.state === 'inactive') {
      release(active.stream)
      return
    }
    active.onstop = () => release(active.stream)
    active.onerror = () => release(active.stream)
    try {
      active.stop()
    } catch {
      release(active.stream)
    }
  }

  onBeforeUnmount(() => {
    disposed = true
    cancel()
  })

  return { isSupported, isRecording, isStarting, error, start, stop, cancel }
}
