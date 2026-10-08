interface WorkerMessage {
  action: 'selectAll' | 'clearAll'
  eventIds: string[]
}

self.addEventListener('message', (e: MessageEvent<WorkerMessage>) => {
  const { action, eventIds } = e.data
  try {
    const result = action === 'selectAll' ? eventIds : []
    self.postMessage({ success: true, ids: result })
  } catch (err) {
    self.postMessage({ success: false, error: String(err) })
  }
})
