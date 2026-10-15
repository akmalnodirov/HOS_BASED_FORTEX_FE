import { computed, ref, watch } from 'vue'
import { createGlobalState } from '@vueuse/core'
import { useAuthStore } from '@/modules/Auth/store/authStore'
import type {
  RouteEldAlprCameraApproachMessage,
  RouteEldWeighStationApproachMessage,
} from '../types'

const RECORD_SEPARATOR = '\x1e'
const MAX_RECONNECT_DELAY_MS = 15_000
const MAX_SEEN_ALERTS = 500

type ConnectionState = 'connecting' | 'connected' | 'disconnected'

const _useRouteEldAlertSocket = createGlobalState(() => {
  const authStore = useAuthStore()
  const connectionState = ref<ConnectionState>('disconnected')
  const latestWeighStationAlert = ref<RouteEldWeighStationApproachMessage | null>(null)
  const latestAlprCameraAlert = ref<RouteEldAlprCameraApproachMessage | null>(null)
  const companyId = computed(() => authStore.companyId ?? localStorage.getItem('companyId'))
  const token = computed(() => authStore.getTokens())
  const shouldConnect = computed(() => authStore.loggedIn && !!token.value)
  const connectionScope = computed(() => `${token.value ?? ''}:${companyId.value ?? ''}`)

  let socket: WebSocket | null = null
  let handshakeComplete = false
  let messageBuffer = ''
  let reconnectAttempt = 0
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let pingTimer: ReturnType<typeof setInterval> | null = null
  const seenAlertKeys = new Set<string>()
  const seenAlertQueue: string[] = []

  function buildHubUrl() {
    const baseUrl = (import.meta.env.VITE_APP_BASE_URL || window.location.origin).replace(/\/$/, '')
    const websocketBase = baseUrl.replace(/^https/, 'wss').replace(/^http/, 'ws')
    return `${websocketBase}/hubs/notifications?access_token=${encodeURIComponent(token.value ?? '')}`
  }

  function send(message: object) {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(`${JSON.stringify(message)}${RECORD_SEPARATOR}`)
    }
  }

  function rememberAlert(type: 'station' | 'alpr', alertId: string) {
    const key = `${type}:${alertId}`
    if (seenAlertKeys.has(key)) return false

    seenAlertKeys.add(key)
    seenAlertQueue.push(key)
    if (seenAlertQueue.length > MAX_SEEN_ALERTS) {
      const oldest = seenAlertQueue.shift()
      if (oldest) seenAlertKeys.delete(oldest)
    }
    return true
  }

  function publishWeighStationAlert(message: RouteEldWeighStationApproachMessage) {
    if (!message.alertId || !rememberAlert('station', message.alertId)) return
    latestWeighStationAlert.value = message
  }

  function publishAlprCameraAlert(message: RouteEldAlprCameraApproachMessage) {
    if (!message.alertId || !rememberAlert('alpr', message.alertId)) return
    latestAlprCameraAlert.value = message
  }

  function processMessage(rawMessage: string) {
    if (!rawMessage) return

    let message: any
    try {
      message = JSON.parse(rawMessage)
    } catch {
      return
    }

    if (message.type === undefined && !handshakeComplete) {
      handshakeComplete = true
      reconnectAttempt = 0
      connectionState.value = 'connected'

      if (companyId.value) {
        send({
          type: 1,
          target: 'JoinCompanyGroup',
          arguments: [companyId.value],
          invocationId: 'join-company',
        })
      }
      return
    }

    if (message.type === 1 && Array.isArray(message.arguments) && message.arguments[0]) {
      if (message.target === 'RouteEldWeighStationApproach') {
        publishWeighStationAlert(message.arguments[0] as RouteEldWeighStationApproachMessage)
      } else if (message.target === 'RouteEldAlprCameraApproach') {
        publishAlprCameraAlert(message.arguments[0] as RouteEldAlprCameraApproachMessage)
      }
      return
    }

    if (message.type === 3 && message.invocationId === 'join-company' && message.error) {
      console.warn('Could not join the selected company notification group:', message.error)
      return
    }

    if (message.type === 6) send({ type: 6 })
    if (message.type === 7) scheduleReconnect()
  }

  function clearTimers() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    if (pingTimer) {
      clearInterval(pingTimer)
      pingTimer = null
    }
  }

  function closeSocket() {
    if (!socket) return
    socket.onopen = null
    socket.onmessage = null
    socket.onclose = null
    socket.onerror = null
    if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
      socket.close()
    }
    socket = null
  }

  function scheduleReconnect() {
    closeSocket()
    if (!shouldConnect.value || reconnectTimer) {
      connectionState.value = 'disconnected'
      return
    }

    connectionState.value = 'disconnected'
    const delay = Math.min(1_000 * 2 ** reconnectAttempt, MAX_RECONNECT_DELAY_MS)
    reconnectAttempt += 1
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      connect()
    }, delay)
  }

  function connect() {
    clearTimers()
    closeSocket()
    if (!shouldConnect.value) {
      connectionState.value = 'disconnected'
      return
    }

    connectionState.value = 'connecting'
    handshakeComplete = false
    messageBuffer = ''

    try {
      socket = new WebSocket(buildHubUrl())
    } catch {
      scheduleReconnect()
      return
    }

    socket.onopen = () => {
      socket?.send(`${JSON.stringify({ protocol: 'json', version: 1 })}${RECORD_SEPARATOR}`)
      pingTimer = setInterval(() => send({ type: 6 }), 15_000)
    }
    socket.onmessage = (event: MessageEvent) => {
      messageBuffer += String(event.data)
      const messages = messageBuffer.split(RECORD_SEPARATOR)
      messageBuffer = messages.pop() ?? ''
      for (const message of messages) processMessage(message)
    }
    socket.onclose = scheduleReconnect
    socket.onerror = scheduleReconnect
  }

  function disconnect() {
    clearTimers()
    closeSocket()
    reconnectAttempt = 0
    handshakeComplete = false
    messageBuffer = ''
    connectionState.value = 'disconnected'
  }

  watch(
    connectionScope,
    () => {
      if (shouldConnect.value) connect()
      else disconnect()
    },
    { immediate: true }
  )

  return {
    connectionState,
    latestWeighStationAlert,
    latestAlprCameraAlert,
    connect,
    disconnect,
  }
})

export function useRouteEldAlertSocket() {
  return _useRouteEldAlertSocket()
}
