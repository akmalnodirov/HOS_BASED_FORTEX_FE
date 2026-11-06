import { beforeEach, afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { h } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { useAssistantWorkspaceRefresh } from '../src/modules/ELD/LogsModule/Boost/composables/useAssistantWorkspaceRefresh.ts'
import { useBoostWorkspaceStore } from '../src/modules/ELD/LogsModule/Boost/store/boostWorkspace.ts'
import { useRouteEldAssistantStore } from '../src/modules/ELD/LogsModule/Boost/store/routeEldAssistant.ts'
import Sheet from '../src/modules/ELD/LogsModule/Boost/components/assistant/CRouteEldAssistantSheet.vue'
import { createAssistantRenderer, flushAssistant } from './assistant-renderer.mjs'

let workspace
let app
const scope = { sessionId: 'session-1', tabId: 'tab-A' }
const snapshot = (tabId = 'tab-A') => ({ session: { id: 'session-1' }, tabId, events: [] })
beforeEach(() => {
  setActivePinia(createPinia())
  globalThis.assistantTestApi = { get: async () => ({ data: [] }) }
  globalThis.assistantTestToasts = []
  workspace = useBoostWorkspaceStore()
  workspace.session = { id: 'session-1' }
  workspace.activeTabId = 'tab-A'
  workspace.workspace = snapshot()
})
afterEach(() => {
  app?.unmount()
  app = null
  useRouteEldAssistantStore().stopPolling()
})

test('PBoost refresh boundary ignores events for another session or tab', async () => {
  let requests = 0
  globalThis.assistantTestApi.get = async () => {
    requests += 1
    return { data: [] }
  }
  const refresh = useAssistantWorkspaceRefresh()
  await refresh({ ...scope, sessionId: 'other-session' })
  await refresh({ ...scope, tabId: 'tab-B' })
  assert.equal(requests, 0)
})

test('mounted Sheet calls the real PBoost refresh boundary only once after an applied result', async () => {
  const assistant = useRouteEldAssistantStore()
  const preview = {
    ...scope,
    repairId: 'repair-1',
    optionId: 'option-1',
    reason: 'Actual yard time',
    originalRequest: 'Correct actual yard time',
    operations: [],
  }
  const action = (status) => ({
    id: 'action-1',
    kind: 3,
    action: { summary: 'Correction', correction: { id: 'proposal-1', status, preview } },
  })
  let requests = 0
  globalThis.assistantTestApi.get = async (url) => {
    if (url.endsWith('/assistant'))
      return { data: { id: 'conversation-1', items: [], openTurn: null } }
    if (url.endsWith('/events')) {
      requests += 1
      return { data: { ...snapshot(), marker: 'refreshed' } }
    }
    return { data: [] }
  }
  const host = createAssistantRenderer()
  const refresh = useAssistantWorkspaceRefresh()
  app = host.renderer.createApp({
    render: () => h(Sheet, { ...scope, open: true, onApplied: refresh }),
  })
  app.mount(host.root)
  await flushAssistant()
  for (const status of ['awaitingDriverAcceptance', 'failed', 'expired', 'declined']) {
    assistant.items = [action(status)]
    await flushAssistant()
    assert.equal(requests, 0)
  }
  assistant.items = [action('applied')]
  await flushAssistant()
  assert.equal(requests, 1)
  assert.equal(workspace.workspace.marker, 'refreshed')
  assistant.items = [action('applied')]
  await flushAssistant()
  assert.equal(requests, 1)
})

test('a workspace refresh started for A cannot overwrite B after its network response arrives', async () => {
  let finish
  globalThis.assistantTestApi.get = (url) =>
    url.endsWith('/events')
      ? new Promise((resolve) => {
          finish = resolve
        })
      : Promise.resolve({ data: [] })
  const refresh = useAssistantWorkspaceRefresh()
  const request = refresh(scope)
  workspace.activeTabId = 'tab-B'
  workspace.workspace = snapshot('tab-B')
  finish({ data: { ...snapshot(), marker: 'late-A' } })
  await request
  assert.equal(workspace.workspace.tabId, 'tab-B')
  assert.equal(workspace.workspace.marker, undefined)
  assert.deepEqual(globalThis.assistantTestToasts, [])
})

test('refresh failure preserves applied status and explains only the workspace refresh failed', async () => {
  const assistant = useRouteEldAssistantStore()
  assistant.items = [
    {
      id: 'action-1',
      kind: 3,
      action: { correction: { id: 'proposal-1', status: 'applied', preview: scope } },
    },
  ]
  globalThis.assistantTestApi.get = async () => {
    throw new Error('offline')
  }
  await useAssistantWorkspaceRefresh()(scope)
  assert.equal(assistant.items[0].action.correction.status, 'applied')
  assert.equal(globalThis.assistantTestToasts.length, 1)
  assert.match(
    globalThis.assistantTestToasts[0],
    /applied to the draft.*workspace could not be refreshed/
  )
})

test('a late refresh failure does not display the old tab error on the newly selected workspace', async () => {
  let fail
  globalThis.assistantTestApi.get = () =>
    new Promise((_resolve, reject) => {
      fail = reject
    })
  const request = useAssistantWorkspaceRefresh()(scope)
  workspace.activeTabId = 'tab-B'
  fail(new Error('offline'))
  await request
  assert.deepEqual(globalThis.assistantTestToasts, [])
})
