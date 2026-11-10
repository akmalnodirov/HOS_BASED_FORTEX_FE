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
