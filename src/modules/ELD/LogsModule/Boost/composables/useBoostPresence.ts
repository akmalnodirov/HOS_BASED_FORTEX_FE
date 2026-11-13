import { computed, onActivated, onBeforeUnmount, onDeactivated, ref, watch, type Ref } from 'vue'
import { useAuthStore } from '@/modules/Auth/store/authStore'

const RECORD_SEPARATOR = '\x1e'
const MAX_RECONNECT_DELAY_MS = 10_000
const EDITING_IDLE_DELAY_MS = 2_000

export interface BoostPresenceUser {
  userId: string
  displayName: string
  accessedAt: string
  editingStartedAt: string | null
  action: 'Viewing' | 'Editing'
  fromDate: string
  toDate: string
}

interface BoostPresenceSnapshot {
  sessionId: string
  driverId: string
  version: number
  users: BoostPresenceUser[]
}

export function useBoostPresence(sessionId: Ref<string | null>, driverId: Ref<string | null>) {
  const authStore = useAuthStore()
  const token = computed(() => authStore.getTokens())
  const users = ref<BoostPresenceUser[]>([])
  const connected = ref(false)
  const editing = ref(false)
  const enabled = ref(true)
  let socket: WebSocket | null = null
  let handshakeComplete = false
  let messageBuffer = ''
  let reconnectAttempt = 0
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let pingTimer: ReturnType<typeof setInterval> | null = null
  let editingIdleTimer: ReturnType<typeof setTimeout> | null = null
  let invocationId = 0
  let lastVersion = -1

  function send(target: string, args: unknown[]) {
    if (!handshakeComplete || socket?.readyState !== WebSocket.OPEN) return
    socket.send(`${JSON.stringify({ type: 1, target, arguments: args, invocationId: String(++invocationId) })}${RECORD_SEPARATOR}`)
  }

  function stop() {
    if (reconnectTimer) clearTimeout(reconnectTimer)
    if (pingTimer) clearInterval(pingTimer)
    reconnectTimer = null
    pingTimer = null
    const previous = socket
    socket = null
    if (previous) {
      previous.onopen = null
      previous.onmessage = null
      previous.onclose = null
      previous.onerror = null
      previous.close()
    }
    handshakeComplete = false
    messageBuffer = ''
    lastVersion = -1
    connected.value = false
    users.value = []
  }

  function clearEditingIdleTimer() {
    if (editingIdleTimer) clearTimeout(editingIdleTimer)
    editingIdleTimer = null
  }

  function scheduleReconnect() {
    if (!enabled.value || !sessionId.value || !driverId.value || !token.value || reconnectTimer) return
    const delay = Math.min(1_000 * 2 ** reconnectAttempt++, MAX_RECONNECT_DELAY_MS)
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      connect()
    }, delay)
  }

  function processMessage(raw: string) {
    if (!raw) return
    let message: Record<string, any>
    try { message = JSON.parse(raw) } catch { return }
    if (message.type === undefined && !handshakeComplete) {
      if (message.error) {
        console.warn('Boost presence handshake failed:', message.error)
        socket?.close()
        return
      }
      handshakeComplete = true
      reconnectAttempt = 0
      connected.value = true
      send('JoinBoostSession', [sessionId.value, driverId.value, editing.value])
      return
    }
    if (message.type === 1 && message.target === 'BoostPresenceChanged') {
      const snapshot = message.arguments?.[0] as BoostPresenceSnapshot | undefined
      if (snapshot && snapshot.sessionId?.toLowerCase() === sessionId.value?.toLowerCase() &&
          snapshot.driverId?.toLowerCase() === driverId.value?.toLowerCase() &&
          snapshot.version > lastVersion) {
        lastVersion = snapshot.version
        users.value = snapshot.users ?? []
      }
    }
    if (message.type === 3 && message.error) {
      console.warn('Could not update Boost workspace presence:', message.error)
    }
  }

  function connect() {
    stop()
    if (!enabled.value || !sessionId.value || !driverId.value || !token.value) return
    const baseUrl = (import.meta.env.VITE_APP_BASE_URL || window.location.origin).replace(/\/$/, '')
    const websocketBase = baseUrl.replace(/^https/, 'wss').replace(/^http/, 'ws')
    let current: WebSocket
    try {
      current = new WebSocket(`${websocketBase}/hubs/notifications?access_token=${encodeURIComponent(token.value)}`)
    } catch {
      scheduleReconnect()
      return
    }
    socket = current
    current.onopen = () => {
      current.send(`${JSON.stringify({ protocol: 'json', version: 1 })}${RECORD_SEPARATOR}`)
      pingTimer = setInterval(() => {
        if (current.readyState === WebSocket.OPEN)
          current.send(`${JSON.stringify({ type: 6 })}${RECORD_SEPARATOR}`)
      }, 15_000)
    }
    current.onmessage = (event: MessageEvent) => {
      messageBuffer += String(event.data)
      const messages = messageBuffer.split(RECORD_SEPARATOR)
      messageBuffer = messages.pop() ?? ''
      for (const message of messages) processMessage(message)
    }
    current.onclose = () => {
      if (socket !== current) return
      socket = null
      connected.value = false
      handshakeComplete = false
      users.value = []
      if (pingTimer) clearInterval(pingTimer)
      pingTimer = null
      scheduleReconnect()
    }
    current.onerror = () => current.close()
  }

  function setEditing(value: boolean) {
    if (value) {
      clearEditingIdleTimer()
      if (editing.value) return
      editing.value = true
      if (sessionId.value) send('SetBoostSessionEditing', [sessionId.value, true])
      return
    }
    if (!editing.value || editingIdleTimer) return
    editingIdleTimer = setTimeout(() => {
      editingIdleTimer = null
      editing.value = false
      if (sessionId.value) send('SetBoostSessionEditing', [sessionId.value, false])
    }, EDITING_IDLE_DELAY_MS)
  }

  watch([sessionId, driverId], () => {
    clearEditingIdleTimer()
    editing.value = false
    connect()
  }, { immediate: true })
  watch(token, (value) => {
    if (!value) stop()
    else if (enabled.value && !socket) connect()
  })
  onActivated(() => { enabled.value = true; if (!socket) connect() })
  onDeactivated(() => { enabled.value = false; stop() })
  onBeforeUnmount(() => { clearEditingIdleTimer(); stop() })

  return { users, connected, setEditing }
}
