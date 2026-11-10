import { afterEach, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { createSSRApp, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { createPinia, setActivePinia } from 'pinia'
import { assistantFocusFor } from '../src/modules/Assistant/utils/focus.ts'
import { useAssistantStore } from '../src/modules/Assistant/store/assistant.ts'
import Chat from '../src/modules/Assistant/components/CAssistantChat.vue'
import { useBoostWorkspaceStore } from '../src/modules/ELD/LogsModule/Boost/store/boostWorkspace.ts'
import { createAssistantRouter } from './assistant-router.mjs'

const session = { id: 'session-1', driverId: 'driver-1', fromDate: '2026-10-01', toDate: '2026-10-07' }
const state = (overrides = {}) => ({
  routeName: 'ELDAi',
  driverId: 'driver-1',
  query: {},
  companyId: 'company-1',
  session,
  activeTabId: 'tab-1',
  selectedEvent: null,
  ...overrides,
})

test('focus on the logs list carries only the page and the company', () => {
  assert.deepEqual(assistantFocusFor(state({ routeName: 'ELDLogs', driverId: null })), {
    page: 'logs',
    companyId: 'company-1',
    driverId: null,
    fromDate: null,
    toDate: null,
    sessionId: null,
    tabId: null,
    selectedEventId: null,
  })
})

test("focus on a draft sends the draft's own dates, never the page's", () => {
  const focus = assistantFocusFor(state({ query: { fromDate: '2026-09-01', toDate: '2026-09-03' } }))
  assert.equal(focus.page, 'ai')
  assert.equal(focus.sessionId, 'session-1')
  assert.equal(focus.tabId, 'tab-1')
  assert.equal(focus.fromDate, '2026-10-01')
  assert.equal(focus.toDate, '2026-10-07')
})

test("a draft of another driver left in the workspace is not sent; the page's dates are", () => {
  const focus = assistantFocusFor(
    state({ driverId: 'driver-2', query: { fromDate: '2026-09-01', toDate: '2026-09-03' } })
  )
  assert.equal(focus.sessionId, null)
  assert.equal(focus.tabId, null)
  assert.equal(focus.driverId, 'driver-2')
  assert.deepEqual([focus.fromDate, focus.toDate], ['2026-09-01', '2026-09-03'])
})

test("with a driver in focus the selected carrier is not sent, since the driver may be another company's", () => {
  assert.equal(assistantFocusFor(state()).companyId, null)
  assert.equal(assistantFocusFor(state({ session: null })).companyId, null)
  assert.equal(assistantFocusFor(state({ routeName: 'ELDLogDetail' })).companyId, null)
})

test('a draft is sent only from the Boost and AI pages', () => {
  const focus = assistantFocusFor(state({ routeName: 'ELDLogDetail', query: { date: '2026-10-03' } }))
  assert.equal(focus.page, 'driverLog')
  assert.equal(focus.sessionId, null)
  assert.deepEqual([focus.fromDate, focus.toDate], ['2026-10-03', '2026-10-03'])
})

test('a range longer than 61 days, reversed, or not a date is not sent', () => {
  const page = (query) => assistantFocusFor(state({ session: null, query }))
  assert.equal(page({ fromDate: '2026-01-01', toDate: '2026-03-15' }).fromDate, null)
  assert.equal(page({ fromDate: '2026-03-02', toDate: '2026-03-01' }).fromDate, null)
  assert.equal(page({ fromDate: 'yesterday', toDate: '2026-03-01' }).fromDate, null)
  assert.equal(page({ fromDate: '2026-01-01', toDate: '2026-03-02' }).toDate, '2026-03-02')
})

test('the selected event goes only with its own draft tab', () => {
  const selectedEvent = { sessionId: 'session-1', tabId: 'tab-1', eventId: 'event-9' }
  assert.equal(assistantFocusFor(state({ selectedEvent })).selectedEventId, 'event-9')
  assert.equal(assistantFocusFor(state({ selectedEvent, activeTabId: 'tab-2' })).selectedEventId, null)
})

test('any other page sends the company only', () => {
  const focus = assistantFocusFor(state({ routeName: 'Reports', driverId: null }))
  assert.equal(focus.page, 'other')
  assert.equal(focus.companyId, 'company-1')
  assert.equal(focus.driverId, null)
})

let store
const turn = (overrides = {}) => ({
  conversationId: 'conversation-1',
  turnId: 'turn-1',
  status: 'COMPLETED',
  items: [],
  ...overrides,
})
const conversation = (id = 'conversation-1') => ({ id, title: 'Chat', items: [], openTurn: null })
const focus = assistantFocusFor(state())
const httpError = (status, data) => ({ isAxiosError: true, response: { status, data } })

beforeEach(() => {
  setActivePinia(createPinia())
  globalThis.assistantTestApi = {
    get: async () => {
      throw httpError(404, { code: 'Assistant.Correction.NotFound', message: 'No chat.' })
    },
    post: async () => ({ data: turn() }),
    delete: async () => ({}),
  }
  store = useAssistantStore()
})
afterEach(() => store.stopPolling())

test('a user without a chat loads an empty one and the first message creates it', async () => {
  const calls = []
  globalThis.assistantTestApi.post = async (url, body) => {
    calls.push([url, body])
    return url === '/api/assistant/conversations' ? { data: conversation() } : { data: turn() }
  }
  await store.load()
  assert.equal(store.conversationId, null)
  assert.equal(store.error, null)
  assert.equal(await store.send(' Open a shift ', focus), true)
  assert.deepEqual(
    calls.map(([url]) => url),
    ['/api/assistant/conversations', '/api/assistant/conversations/conversation-1/turns']
  )
  assert.deepEqual(Object.keys(calls[1][1]).sort(), ['clientTurnId', 'focus', 'text'])
  assert.equal(calls[1][1].text, 'Open a shift')
  assert.deepEqual(calls[1][1].focus, focus)
})

test('a network retry of the same message keeps its client turn id', async () => {
  store.conversationId = 'conversation-1'
  const ids = []
  globalThis.assistantTestApi.post = async (_url, body) => {
    ids.push(body.clientTurnId)
    if (ids.length === 1) throw { isAxiosError: true }
    return { data: turn() }
  }
  assert.equal(await store.send('Explain this log', focus), false)
  assert.equal(store.resendText, 'Explain this log')
  assert.equal(await store.send(store.resendText, focus), true)
  assert.equal(ids[0], ids[1])
})

test('a full chat starts a new one and sends the message there exactly once', async () => {
  store.conversationId = 'conversation-1'
  const calls = []
  globalThis.assistantTestApi.post = async (url, body) => {
    calls.push([url, body])
    if (url === '/api/assistant/conversations') return { data: conversation('conversation-2') }
    if (url.includes('conversation-1'))
      throw httpError(409, { code: 'Assistant.Correction.ConversationFull', message: 'This chat is full.' })
    return { data: turn({ conversationId: 'conversation-2' }) }
  }
  assert.equal(await store.send('Next question', focus), true)
  assert.deepEqual(
    calls.map(([url]) => url),
    [
      '/api/assistant/conversations/conversation-1/turns',
      '/api/assistant/conversations',
      '/api/assistant/conversations/conversation-2/turns',
    ]
  )
  assert.notEqual(calls[0][1].clientTurnId, calls[2][1].clientTurnId)
  assert.equal(store.conversationId, 'conversation-2')
})

test('a new chat that is full at once fails without a third attempt', async () => {
  store.conversationId = 'conversation-1'
  let turns = 0
  globalThis.assistantTestApi.post = async (url) => {
    if (url === '/api/assistant/conversations') return { data: conversation('conversation-2') }
    turns += 1
    throw httpError(409, { code: 'Assistant.Correction.ConversationFull', message: 'This chat is full.' })
  }
  assert.equal(await store.send('Next question', focus), false)
  assert.equal(turns, 2)
  assert.equal(store.error, 'This chat is full.')
  assert.equal(store.resendText, null)
})

const card = (overrides = {}) => ({
  id: 'confirmation-1',
  toolName: 'prepare_duty_status',
  summary: 'Add On Duty at 08:00',
  details: [],
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  correction: null,
  isAttestationRequired: true,
  canApply: true,
  ...overrides,
})
const waiting = (confirmation) => {
  store.conversationId = 'conversation-1'
  store.activeTurn = turn({ status: 'AWAITING_CONFIRMATION', confirmation })
}

test("approval follows the card's own gates", async () => {
  const bodies = []
  globalThis.assistantTestApi.post = async (url, body) => {
    bodies.push([url, body])
    return { data: turn() }
  }
  waiting(card())
  assert.equal(await store.decide(true, false), false, 'attested card needs the attestation')
  waiting(card({ canApply: false }))
  assert.equal(await store.decide(true, true), false, 'the server said this user cannot apply it')
  waiting(card({ expiresAt: new Date(Date.now() - 1000).toISOString() }))
  assert.equal(await store.decide(true, true), false, 'an expired card cannot be applied')
  assert.equal(bodies.length, 0)

  waiting(card({ isAttestationRequired: false }))
  assert.equal(await store.decide(true, false), true, 'a card without attestation applies without it')
  waiting(card({ canApply: false }))
  assert.equal(await store.decide(false), true, 'declining needs no permission')
  assert.deepEqual(bodies, [
    [
      '/api/assistant/conversations/conversation-1/turns/turn-1/decision',
      { confirmationId: 'confirmation-1', approve: true, factualAttestation: false },
    ],
    [
      '/api/assistant/conversations/conversation-1/turns/turn-1/decision',
      { confirmationId: 'confirmation-1', approve: false, factualAttestation: false },
    ],
  ])
})

const navigation = { driverId: 'driver-2', sessionId: 'session-2', tabId: 'tab-2', fromDate: '2026-10-01', toDate: '2026-10-02' }
const navigationItem = { id: 'nav-1', kind: 5, text: null, createdAt: '', action: null, navigation }

test('a draft opened during a reply is opened once; history never navigates', async () => {
  store.conversationId = 'conversation-1'
  globalThis.assistantTestApi.post = async () => ({ data: turn({ items: [navigationItem] }) })
  assert.equal(await store.send('Open the draft for Alex, Oct 1 to 2', focus), true)
  assert.deepEqual(store.takeNavigation(), navigation)
  assert.equal(store.takeNavigation(), null)

  globalThis.assistantTestApi.get = async () => ({
    data: { ...conversation(), items: [navigationItem], openTurn: null },
  })
  await store.load()
  assert.equal(store.pendingNavigation, null)
})

const DISABLED = /\sdisabled(?:="[^"]*")?(?=[\s>])/
// SSR wraps slot content in fragment comments.
const buttonTag = (html, label) =>
  html.match(new RegExp(`<button[^>]*>(?:\s|<!--[^>]*-->)*${label}(?:\s|<!--[^>]*-->)*</button>`))?.[0]

const renderChat = async (path, setup) => {
  const pinia = createPinia()
  setActivePinia(pinia)
  setup?.()
  const app = createSSRApp({ render: () => h(Chat, { canApply: true }) })
  app.use(pinia)
  app.use(await createAssistantRouter(path))
  return renderToString(app)
}

test('the chat shows an opened draft with a link to it', async () => {
  const html = await renderChat('/eld/logs', () => {
    useAssistantStore().items = [navigationItem]
  })
  assert.match(html, /Draft 2026-10-01 – 2026-10-02 is open/)
  assert.match(html, />\s*Open draft\s*</)
})

test("a card for another draft cannot be applied from this page but can be declined", async () => {
  const html = await renderChat('/logs/driver-1/ai', () => {
    useBoostWorkspaceStore().session = session
    useBoostWorkspaceStore().activeTabId = 'tab-1'
    const assistant = useAssistantStore()
    assistant.isLoaded = true
    assistant.activeTurn = turn({
      status: 'AWAITING_CONFIRMATION',
      confirmation: card({ isAttestationRequired: false }),
      focus: { ...navigation, page: 'ai', companyId: null, driverName: 'Alex Doe', selectedEventId: null },
    })
  })
  assert.match(html, /belongs to Alex Doe&#39;s draft/)
  const apply = buttonTag(html, 'Apply to draft')
  assert.match(apply, DISABLED)
  const decline = buttonTag(html, 'Decline')
  assert.doesNotMatch(decline, DISABLED)
})

test('a card for the open draft without attestation shows no attestation checkbox', async () => {
  const html = await renderChat('/logs/driver-1/ai', () => {
    useBoostWorkspaceStore().session = session
    useBoostWorkspaceStore().activeTabId = 'tab-1'
    const assistant = useAssistantStore()
    assistant.isLoaded = true
    assistant.activeTurn = turn({
      status: 'AWAITING_CONFIRMATION',
      confirmation: card({ isAttestationRequired: false }),
      focus: { ...navigation, driverId: 'driver-1', sessionId: 'session-1', tabId: 'tab-1', page: 'ai', companyId: null, driverName: 'Sam Roe', selectedEventId: null },
    })
  })
  assert.doesNotMatch(html, /belongs to/)
  assert.doesNotMatch(html, /role="checkbox"/)
  const apply = buttonTag(html, 'Apply to draft')
  assert.doesNotMatch(apply, DISABLED)
})

test("signing in as another user without a reload never shows the previous user's chat", async () => {
  let loads = 0
  globalThis.assistantTestApi.get = async () => {
    loads += 1
    return { data: { ...conversation(), items: [{ id: 'm1', kind: 1, text: 'Private question' }] } }
  }
  store.ensureLoaded('user-a')
  await new Promise((resolve) => setTimeout(resolve, 0))
  assert.equal(store.items.length, 1)
  store.isOpen = true
  store.claim(null)
  assert.deepEqual([store.items.length, store.conversationId, store.isOpen], [0, null, false])
  store.ensureLoaded('user-b')
  assert.equal(loads, 2, 'the new user loads their own chat')
  store.ensureLoaded('user-b')
  assert.equal(loads, 2, 'the same user loads once')
})

const applied = (id) => ({
  id: `action-${id}`,
  kind: 3,
  text: null,
  createdAt: '',
  action: { summary: 'Applied', correction: { id, status: 'applied', preview: { sessionId: 'session-1', tabId: 'tab-1' } } },
})

test('corrections already in the history never trigger a refresh; a new one does, once', async () => {
  globalThis.assistantTestApi.get = async () => ({ data: { ...conversation(), items: [applied('old')] } })
  await store.load()
  assert.deepEqual(store.takeNewlyApplied(), [])
  store.conversationId = 'conversation-1'
  globalThis.assistantTestApi.post = async () => ({ data: turn({ items: [applied('new')] }) })
  assert.equal(await store.send('Apply it', focus), true)
  assert.deepEqual(store.takeNewlyApplied().map((correction) => correction.id), ['new'])
  assert.deepEqual(store.takeNewlyApplied(), [])
})

test('a decision without an answer reloads the chat so its real state shows', async () => {
  let loads = 0
  globalThis.assistantTestApi.get = async () => {
    loads += 1
    return { data: conversation() }
  }
  globalThis.assistantTestApi.post = async () => {
    throw { isAxiosError: true }
  }
  waiting(card())
  assert.equal(await store.decide(true, true), false)
  await new Promise((resolve) => setTimeout(resolve, 0))
  assert.equal(loads, 1)
  assert.equal(store.activeTurn, null)
})

test('a rejected message is not offered again, and a missing chat is replaced on the next message', async () => {
  store.conversationId = 'conversation-1'
  globalThis.assistantTestApi.post = async () => {
    throw httpError(400, { code: 'Assistant.Correction.InvalidInput', message: 'The driver belongs to another company.' })
  }
  assert.equal(await store.send('Hello', focus), false)
  assert.equal(store.resendText, null)
  globalThis.assistantTestApi.post = async () => {
    throw httpError(404, { code: 'Assistant.Correction.NotFound', message: 'The chat was not found.' })
  }
  assert.equal(await store.send('Hello', focus), false)
  assert.equal(store.conversationId, null)
})

test('reloading the same chat lets a correction applied meanwhile refresh the draft', async () => {
  globalThis.assistantTestApi.get = async () => ({ data: { ...conversation(), items: [applied('old')] } })
  await store.load()
  assert.deepEqual(store.takeNewlyApplied(), [])
  globalThis.assistantTestApi.get = async () => ({
    data: { ...conversation(), items: [applied('old'), applied('lost-answer')] },
  })
  await store.load()
  assert.deepEqual(store.takeNewlyApplied().map((correction) => correction.id), ['lost-answer'])
})

test('a new chat that overtakes a reload never leaves the chat loading', async () => {
  globalThis.assistantTestApi.get = async () => ({ data: conversation() })
  await store.load()
  let answer
  globalThis.assistantTestApi.get = () => new Promise((resolve) => (answer = resolve))
  const reload = store.load()
  assert.equal(store.isLoading, true)
  assert.equal(await store.newChat(), false, 'no new chat while the chat reloads')
  globalThis.assistantTestApi.post = async () => ({ data: conversation('conversation-2') })
  store.isLoading = false
  assert.equal(await store.newChat(), true)
  answer({ data: conversation() })
  await reload
  assert.equal(store.isLoading, false)
  assert.equal(store.conversationId, 'conversation-2')
})

const previewTab = { driverId: 'driver-1', sessionId: 'session-1', tabId: 'tab-preview', fromDate: '2026-10-01', toDate: '2026-10-07' }
const decided = (id, decision) => ({
  id,
  kind: 3,
  text: null,
  createdAt: '',
  action: { toolName: 'prepare_optimize', summary: 'Optimize preview', decision, outcome: 1, navigation: previewTab },
})

test('a decided card that named a draft tab reloads that draft once; history never does', async () => {
  globalThis.assistantTestApi.get = async () => ({ data: { ...conversation(), items: [decided('old', 2)] } })
  await store.load()
  assert.deepEqual(store.takeDecidedDrafts(), [])
  store.conversationId = 'conversation-1'
  globalThis.assistantTestApi.post = async () => ({ data: turn({ items: [decided('declined', 3)] }) })
  assert.equal(await store.send('Decline it', focus), true)
  assert.deepEqual(store.takeDecidedDrafts(), [previewTab])
  assert.deepEqual(store.takeDecidedDrafts(), [])
})

test('the latest working tab is the one with the highest position', async () => {
  const { latestWorkingTabId } = await import('../src/modules/Assistant/composables/useAssistantDraftTab.ts')
  assert.equal(
    latestWorkingTabId([
      { id: 'initial', kind: 'INITIAL', position: 0 },
      { id: 'w2', kind: 'WORKING', position: 2 },
      { id: 'w1', kind: 'WORKING', position: 1 },
    ]),
    'w2'
  )
  assert.equal(latestWorkingTabId([{ id: 'initial', kind: 'INITIAL', position: 0 }]), null)
})

test('an optimize card on the open draft can be applied from its base tab and offers to show the preview tab', async () => {
  const html = await renderChat('/logs/driver-1/ai', () => {
    useBoostWorkspaceStore().session = session
    useBoostWorkspaceStore().activeTabId = 'tab-1'
    const assistant = useAssistantStore()
    assistant.isLoaded = true
    assistant.activeTurn = turn({
      status: 'AWAITING_CONFIRMATION',
      confirmation: card({ toolName: 'prepare_optimize', navigation: previewTab }),
      focus: { ...previewTab, tabId: 'tab-1', page: 'ai', companyId: null, driverName: 'Sam Roe', selectedEventId: null },
    })
  })
  assert.match(html, /The changes are on a preview tab of this draft/)
  assert.match(html, />(?:\s|<!--[^>]*-->)*Show the preview tab(?:\s|<!--[^>]*-->)*</)
  assert.doesNotMatch(html, /belongs to/)
})

const startedItem = (id) => ({
  id,
  kind: 3,
  text: null,
  createdAt: '',
  action: {
    toolName: 'prepare_session_operation',
    summary: 'Submit',
    decision: 2,
    outcome: 1,
    operation: { id: 'operation-1', sessionId: 'session-1', type: 'SUBMIT' },
  },
})

test('a submit the assistant started is followed once; history never starts following', async () => {
  globalThis.assistantTestApi.get = async () => ({ data: { ...conversation(), items: [startedItem('old')] } })
  await store.load()
  assert.deepEqual(store.takeStartedOperations(), [])
  store.conversationId = 'conversation-1'
  globalThis.assistantTestApi.post = async () => ({ data: turn({ items: [startedItem('new')] }) })
  assert.equal(await store.send('Yes, submit it', focus), true)
  assert.deepEqual(store.takeStartedOperations(), [{ id: 'operation-1', sessionId: 'session-1', type: 'SUBMIT' }])
  assert.deepEqual(store.takeStartedOperations(), [])
})

test('following a started submit on the open log shows its progress, and only on that log', async () => {
  const workspace = useBoostWorkspaceStore()
  workspace.session = { ...session, status: 'DRAFT', tabs: [{ id: 'tab-1', kind: 'WORKING', position: 1 }] }
  workspace.activeTabId = 'tab-1'
  const seen = []
  globalThis.assistantTestApi.get = async (url) => {
    if (url.endsWith('/operations/operation-1')) {
      seen.push(workspace.activeOperation?.type ?? 'none')
      return {
        data: { id: 'operation-1', status: seen.length < 2 ? 'RUNNING' : 'COMPLETED', total: 2, completed: seen.length, succeeded: 2, failed: 0, failures: [] },
      }
    }
    // Reloading the log afterwards is the Boost buttons' own path; it is not under test here.
    throw new Error('reload')
  }
  assert.equal(await workspace.followSessionOperation('session-other', 'submit', 'operation-1'), null)
  assert.deepEqual(seen, [], 'a submit on another log is not followed here')
  await workspace.followSessionOperation('session-1', 'submit', 'operation-1').catch(() => null)
  assert.deepEqual(seen, ['none', 'submit'], 'the operation is shown as running while it is polled')
  assert.equal(workspace.activeOperation, null, 'nothing stays locked afterwards')
})
