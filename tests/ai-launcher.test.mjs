import { beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { createSSRApp, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { createPinia, setActivePinia } from 'pinia'
import { matchDrivers } from '../src/modules/ELD/LogsModule/Ai/utils/aiDrivers.ts'
import { deliverHandoff, handoffReady, useAiHandoffStore } from '../src/modules/ELD/LogsModule/Ai/store/aiHandoff.ts'
import Launcher from '../src/modules/ELD/LogsModule/Ai/components/CLloraLauncher.vue'

let pinia
beforeEach(() => {
  pinia = createPinia()
  setActivePinia(pinia)
})

const drivers = [
  { driverId: 'd1', displayName: 'Joraev Temur' },
  { driverId: 'd2', displayName: 'Temur Aliev' },
  { driverId: 'd3', displayName: 'Bob Smith' },
]

test('a name shared by two drivers offers both and picks neither', () => {
  const matches = matchDrivers('fix temur violation on Aug 24', drivers)
  assert.deepEqual(matches.map((driver) => driver.driverId).sort(), ['d1', 'd2'])
  assert.deepEqual(matchDrivers('hello there', drivers), [])
})

test('a full name ranks its driver first', () => {
  assert.equal(matchDrivers('Joraev Temur needs a break', drivers)[0].driverId, 'd1')
})

test('the handed-off request survives until it is sent, once', () => {
  const handoff = useAiHandoffStore()
  handoff.set({ driverId: 'd1', fromDate: '2026-10-20', toDate: '2026-11-02', text: 'Fix the break' })
  assert.equal(handoff.peek('d2'), null)
  assert.equal(handoff.peek('d1'), 'Fix the break')
  assert.equal(handoff.peek('d1'), 'Fix the break')
  assert.equal(handoff.take('d1'), 'Fix the break')
  assert.equal(handoff.peek('d1'), null)
})

test('the launcher greets the dispatcher by first name and has no voice input', async () => {
  const app = createSSRApp({ render: () => h(Launcher, { drivers, firstName: 'Temur', defaultOpen: true }) })
  app.use(pinia)
  const html = await renderToString(app)
  assert.match(html, /Llora AI/)
  assert.match(html, /Hi Temur, how can I help you\?/)
  assert.match(html, /placeholder="Write your question"/)
  assert.doesNotMatch(html, /aria-label="Voice/i)
})

const request = { driverId: 'd1', fromDate: '2026-10-20', toDate: '2026-11-02', text: 'Fix the break' }
const openDraft = { id: 's1', driverId: 'D1', status: 'DRAFT', fromDate: '2026-10-20', toDate: '2026-11-02' }
const ready = (overrides = {}) =>
  handoffReady({ request, session: openDraft, querySessionId: 's1', tabId: 't1', busy: false, ...overrides })

test('a handed-off request goes only to the draft it was meant for', () => {
  assert.equal(ready(), true)
  assert.equal(ready({ session: { ...openDraft, fromDate: '2026-10-01' } }), false, 'leftover session with other dates')
  assert.equal(ready({ session: { ...openDraft, status: 'SUBMITTED' } }), false, 'fallback to a submitted session')
  assert.equal(ready({ querySessionId: 'other' }), false, 'a skipped draft still loaded in the store')
  assert.equal(ready({ session: { ...openDraft, driverId: 'd9' } }), false, 'another driver')
  assert.equal(ready({ busy: true }), false)
  assert.equal(ready({ tabId: '' }), false)
  assert.equal(ready({ request: null }), false)
})

test('a handed-off request is taken before sending, and a failed send puts it back in the input', async () => {
  const handoff = useAiHandoffStore()
  const filled = []
  const chat = { sent: [], send: async (text) => (chat.sent.push(text), false), fill: (text) => filled.push(text) }
  handoff.set(request)
  await deliverHandoff(handoff, 'd1', chat)
  assert.deepEqual(chat.sent, ['Fix the break'])
  assert.deepEqual(filled, ['Fix the break'])
  assert.equal(handoff.peek('d1'), null)
  await deliverHandoff(handoff, 'd1', chat)
  assert.equal(chat.sent.length, 1, 'never sent twice')
})

test('a delivered request is sent once and not put back', async () => {
  const handoff = useAiHandoffStore()
  const filled = []
  const chat = { sent: [], send: async (text) => (chat.sent.push(text), true), fill: (text) => filled.push(text) }
  handoff.set(request)
  await deliverHandoff(handoff, 'd1', chat)
  assert.deepEqual(chat.sent, ['Fix the break'])
  assert.deepEqual(filled, [])
})
