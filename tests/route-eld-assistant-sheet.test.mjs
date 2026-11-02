import { beforeEach, afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { h, reactive } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import Sheet from '../src/modules/ELD/LogsModule/Boost/components/assistant/CRouteEldAssistantSheet.vue'
import { useRouteEldAssistantStore } from '../src/modules/ELD/LogsModule/Boost/store/routeEldAssistant.ts'
import { createAssistantRenderer, flushAssistant } from './assistant-renderer.mjs'

let app
let assistant
const preview = {
  repairId: 'repair-1',
  optionId: 'option-1',
  sessionId: 'session-1',
  tabId: 'tab-A',
  reason: 'Reported yard time',
  originalRequest: 'My actual yard time was earlier',
  operations: [],
}
const confirmation = {
  id: 'confirmation-1',
  summary: 'Review correction',
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  details: [],
  correction: preview,
}
const pending = {
  conversationId: 'conversation-1',
  turnId: 'turn-1',
  status: 'AWAITING_CONFIRMATION',
  confirmation,
  items: [],
}
const proposalItem = (status, overrides = {}) => ({
  id: 'action-1',
  kind: 3,
  text: null,
  action: {
    summary: 'Correction suggestion',
    decision: 1,
    outcome: 1,
    correction: { id: 'proposal-1', status, preview: { ...preview, ...overrides } },
  },
})

beforeEach(() => {
  setActivePinia(createPinia())
  globalThis.assistantTestApi = {
    get: async () => ({ data: { id: 'conversation-1', items: [], openTurn: pending } }),
    post: async () => ({
      data: {
        ...pending,
        status: 'COMPLETED',
        confirmation: null,
        items: [proposalItem('awaitingDriverAcceptance')],
      },
    }),
  }
  assistant = useRouteEldAssistantStore()
})
afterEach(() => {
  app?.unmount()
  app = null
  assistant.stopPolling()
})

async function mountSheet(onApplied = () => {}) {
  const host = createAssistantRenderer()
  const props = reactive({ open: true, sessionId: 'session-1', tabId: 'tab-A' })
  app = host.renderer.createApp({ render: () => h(Sheet, { ...props, onApplied }) })
  app.mount(host.root)
  await flushAssistant()
  return { ...host, props }
}

test('mounted sheet prevents approving tab A after close, switch to B, and reopen but permits explicit rejection', async () => {
  const host = await mountSheet()
  host.find((node) => node.props?.role === 'checkbox').props.onClick()
  await flushAssistant()
  assert.equal(Boolean(host.button('Apply to draft').props.disabled), false)
  host.props.open = false
  await flushAssistant()
  host.props.tabId = 'tab-B'
  await flushAssistant()
  host.props.open = true
  await flushAssistant()
  assert.ok(!host.button('Apply to draft') || host.button('Apply to draft').props.disabled)
  assert.match(host.text(), /tab-A/)
  const calls = []
  globalThis.assistantTestApi.post = async (_url, body) => {
    calls.push(body)
    return { data: { ...pending, status: 'CANCELLED', confirmation: null } }
  }
  host.button('Reject correction').props.onClick()
  await flushAssistant()
  assert.deepEqual(calls, [
    { confirmationId: 'confirmation-1', approve: false, factualAttestation: false },
  ])
})

test('mounted sheet discards a late decision response after switching tabs', async () => {
  const emitted = []
  const host = await mountSheet((value) => emitted.push(value))
  let finish
  globalThis.assistantTestApi.post = () =>
    new Promise((resolve) => {
      finish = resolve
    })
  host.find((node) => node.props?.role === 'checkbox').props.onClick()
  await flushAssistant()
  host.button('Apply to draft').props.onClick()
  await flushAssistant()
  host.props.tabId = 'tab-B'
  await flushAssistant()
  finish({
    data: { ...pending, status: 'COMPLETED', confirmation: null, items: [proposalItem('applied')] },
  })
  await flushAssistant()
  assert.equal(assistant.items.length, 0)
  assert.equal(assistant.confirmation.id, 'confirmation-1')
  assert.deepEqual(emitted, [])
})

test('mounted sheet emits once only for matching applied proposals and waits until visible', async () => {
  const emitted = []
  const host = await mountSheet((value) => emitted.push(value))
  for (const [status, overrides] of [
    ['awaitingDriverAcceptance', {}],
    ['failed', {}],
    ['applied', { sessionId: 'other-session' }],
    ['applied', { tabId: 'tab-B' }],
  ]) {
    assistant.items = [proposalItem(status, overrides)]
    await flushAssistant()
    assert.equal(emitted.length, 0)
  }
  host.props.open = false
  await flushAssistant()
  assistant.items = [proposalItem('applied')]
  await flushAssistant()
  assert.equal(emitted.length, 0)
  globalThis.assistantTestApi.get = async () => ({
    data: { id: 'conversation-1', items: [proposalItem('applied')], openTurn: null },
  })
  host.props.open = true
  await flushAssistant()
  assert.deepEqual(emitted, [{ sessionId: 'session-1', tabId: 'tab-A' }])
  await assistant.load('session-1')
  await flushAssistant()
  assert.equal(emitted.length, 1)
})

test('mounted sheet sends the exact attested direct-apply payload and emits applied only after the response', async () => {
  const emitted = []
  const host = await mountSheet((value) => emitted.push(value))
  const calls = []
  let finish
  globalThis.assistantTestApi.post = (url, body) => {
    calls.push({ url, body })
    return new Promise((resolve) => {
      finish = resolve
    })
  }
  host.button('Apply to draft').props.onClick()
  await flushAssistant()
  assert.equal(calls.length, 0)
  host.find((node) => node.props?.role === 'checkbox').props.onClick()
  await flushAssistant()
  host.button('Apply to draft').props.onClick()
  await flushAssistant()
  assert.deepEqual(calls, [
    {
      url: '/api/route-eld/event-sessions/session-1/assistant/turns/turn-1/decision',
      body: { confirmationId: 'confirmation-1', approve: true, factualAttestation: true },
    },
  ])
  assert.deepEqual(emitted, [])
  finish({
    data: { ...pending, status: 'COMPLETED', confirmation: null, items: [proposalItem('applied')] },
  })
  await flushAssistant()
  assert.deepEqual(emitted, [{ sessionId: 'session-1', tabId: 'tab-A' }])
  assert.match(host.text(), /Applied to draft/)
})
