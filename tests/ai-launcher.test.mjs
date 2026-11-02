import { beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { createSSRApp, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { createPinia, setActivePinia } from 'pinia'
import { matchDrivers } from '../src/modules/ELD/LogsModule/Ai/utils/aiDrivers.ts'
import { useAiHandoffStore } from '../src/modules/ELD/LogsModule/Ai/store/aiHandoff.ts'
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
