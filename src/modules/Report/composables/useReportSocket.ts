import { computed, ref, watch } from 'vue'
import { createGlobalState } from '@vueuse/core'
import { useAuthStore } from '@/modules/Auth/store/authStore'
import { hasPermission } from '@/router/permissions'
import { toast } from 'vue-sonner'

const separator = '\x1e'

const useGlobalReportSocket = createGlobalState(() => {
  const authStore = useAuthStore()
  const token = computed(() => authStore.getTokens())
  const enabled = computed(() => authStore.loggedIn && !!token.value && (
    hasPermission(token.value, 'report.notifications')
  ))
  const taskVersion = ref(0)
  const assistantVersion = ref(0)
  const checkerVersion = ref(0)
  const activityVersion = ref(0)

  let socket: WebSocket | null = null
  let buffer = ''
  let retry = 0
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let pingTimer: ReturnType<typeof setInterval> | null = null

  function close() {
    if (reconnectTimer) clearTimeout(reconnectTimer)
    if (pingTimer) clearInterval(pingTimer)
    reconnectTimer = null
    pingTimer = null
    if (socket) {
      socket.onopen = null
      socket.onmessage = null
      socket.onclose = null
      socket.onerror = null
      socket.close()
      socket = null
    }
  }

  function reconnect() {
    close()
    if (!enabled.value) return
    const delay = Math.min(1000 * 2 ** retry, 15000)
    retry += 1
    reconnectTimer = setTimeout(connect, delay)
  }

  function process(message: string) {
    if (!message) return
    let event: { type?: number; target?: string }
    try {
      event = JSON.parse(message)
    } catch {
      return
    }
    if (event.type === undefined) {
      retry = 0
      return
    }
    if (event.type === 6) {
      socket?.send(`${JSON.stringify({ type: 6 })}${separator}`)
      return
    }
    if (event.type === 7) {
      reconnect()
      return
    }
    if (event.type !== 1) return
    if (event.target === 'NewTaskQueued' || event.target === 'TaskUpdated' || event.target === 'TaskDeleted') {
      if (!hasPermission(token.value, 'report.tasks.view')) return
      taskVersion.value += 1
      toast.info(event.target === 'NewTaskQueued' ? 'Report task created' : event.target === 'TaskDeleted' ? 'Report task deleted' : 'Report task updated')
    }
    if (event.target === 'NewTaskAssistant' || event.target === 'TaskAssistantUpdate') {
      if (!hasPermission(token.value, 'report.assistant.view')) return
      assistantVersion.value += 1
      toast.info(event.target === 'NewTaskAssistant' ? 'Assistant task created' : 'Assistant task updated')
    }
    if (event.target?.startsWith('CheckerTask')) {
      if (!hasPermission(token.value, 'report.checker.view')) return
      checkerVersion.value += 1
      toast.info(event.target === 'CheckerTaskCreated' ? 'Checker task created' : event.target === 'CheckerTaskDeleted' ? 'Checker task deleted' : 'Checker task updated')
    }
    if (event.target?.startsWith('DriverActivity') && hasPermission(token.value, 'report.activity.view')) {
      activityVersion.value += 1
    }
  }

  function connect() {
    close()
    if (!enabled.value) return
    const base = (import.meta.env.VITE_APP_BASE_URL || window.location.origin).replace(/\/$/, '')
    const websocketBase = base.replace(/^https/, 'wss').replace(/^http/, 'ws')
    buffer = ''
    try {
      socket = new WebSocket(`${websocketBase}/hubs/notifications?access_token=${encodeURIComponent(token.value ?? '')}`)
    } catch {
      reconnect()
      return
    }
    socket.onopen = () => {
      socket?.send(`${JSON.stringify({ protocol: 'json', version: 1 })}${separator}`)
      pingTimer = setInterval(() => socket?.send(`${JSON.stringify({ type: 6 })}${separator}`), 15000)
    }
    socket.onmessage = (message) => {
      buffer += String(message.data)
      const parts = buffer.split(separator)
      buffer = parts.pop() ?? ''
      parts.forEach(process)
    }
    socket.onclose = reconnect
    socket.onerror = reconnect
  }

  watch([token, enabled], () => {
    if (enabled.value) connect()
    else close()
  }, { immediate: true })

  return { taskVersion, assistantVersion, checkerVersion, activityVersion }
})

export function useReportSocket() {
  return useGlobalReportSocket()
}
