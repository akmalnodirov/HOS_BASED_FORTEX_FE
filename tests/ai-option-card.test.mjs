import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createSSRApp, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import Card from '../src/modules/ELD/LogsModule/Ai/components/CAiOptionCard.vue'
import { applyOptionMessage } from '../src/modules/ELD/LogsModule/Ai/utils/aiOptions.ts'

const at = Date.UTC(2026, 9, 15, 14, 0)
const summary = {
  optionId: 'o1',
  rank: 1,
  title: 'Split shift',
  explanation: 'We will get 5 hours of off duty.',
  fullySatisfies: true,
  targetViolationRemoved: true,
}
const option = (status, overrides = {}) => ({
  id: 'o1',
  status,
  title: 'Split shift',
  explanation: 'We will get 5 hours of off duty.',
  rank: 1,
  fullySatisfies: true,
  operations: [
    { order: 0, type: 'ShiftTimestamp', eventId: 'e1', beforeTimestamp: at, afterTimestamp: at + 1_800_000, beforeEventCode: 'DS_D', afterEventCode: 'DS_D' },
    { order: 1, type: 'ChangeToOffDuty', eventId: 'e2', beforeTimestamp: at, afterTimestamp: null, beforeEventCode: 'DS_ON', afterEventCode: 'DS_OFF' },
  ],
  preview: null,
  ...overrides,
})
const props = (overrides = {}) => ({
  summary,
  option: option('Available'),
  repairId: 'r1',
  fromDate: '2026-10-15',
  toDate: '2026-10-15',
  timeZone: 'ET',
  sessionCreatedAt: null,
  inProgress: false,
  busy: false,
  ...overrides,
})
const DISABLED = /\sdisabled(?:="[^"]*")?(?=[\s>])/
const render = (cardProps) => renderToString(createSSRApp({ render: () => h(Card, cardProps) }))
const useButton = (html) => {
  const button = [...html.matchAll(/<button[^>]*>[\s\S]*?<\/button>/g)].find((match) => match[0].includes('Use this option'))?.[0]
  assert.ok(button, 'the Use this option button is rendered')
  return button.slice(0, button.indexOf('>') + 1)
}

test('a collapsed card shows rank, title, result and its status', async () => {
  const html = await render(props())
  assert.match(html, /1\. Split shift/)
  assert.match(html, /We will get 5 hours of off duty\./)
  assert.match(html, />\s*Pending\s*</)
})

test('an out-of-date option is Invalid and cannot be used', async () => {
  const html = await render(props({ option: option('Stale'), expanded: true }))
  assert.match(html, />\s*Invalid\s*</)
  assert.match(useButton(html), DISABLED)
})

test('an option that does not fully clear its goal cannot be used', async () => {
  const html = await render(props({ summary: { ...summary, fullySatisfies: false }, expanded: true }))
  assert.match(useButton(html), DISABLED)
})

test('the changes view lists one row per change', async () => {
  const html = await render(props({ expanded: true, view: 'changes' }))
  assert.equal((html.match(/<tr data-change-row/g) ?? []).length, 2)
  assert.match(html, /DS_ON → DS_OFF/)
})

test('using an option emits the pinned apply message', async () => {
  let emitted = null
  const { createApp } = await import('vue')
  const vnode = h(Card, { ...props({ expanded: true }), onUse: (message) => (emitted = message) })
  const html = await renderToString(createSSRApp({ render: () => vnode }))
  assert.doesNotMatch(useButton(html), DISABLED)
  vnode.component.exposed.use()
  assert.equal(emitted, applyOptionMessage(1, 'Split shift', 'r1', 'o1'))
  void createApp
})
