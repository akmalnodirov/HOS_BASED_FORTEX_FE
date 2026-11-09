import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createSSRApp, h, reactive } from 'vue'
import { createAssistantRenderer, flushAssistant } from './assistant-renderer.mjs'
import { renderToString } from '@vue/server-renderer'
import Confirmation from '../src/modules/ELD/LogsModule/Boost/components/assistant/CRouteEldAssistantConfirmation.vue'
import Message from '../src/modules/ELD/LogsModule/Boost/components/assistant/CRouteEldAssistantMessage.vue'

const preview = {
  repairId: 'repair-1',
  optionId: 'option-1',
  sessionId: 'session-1',
  tabId: 'tab-1',
  reason: 'Correct the reported yard time',
  originalRequest: 'The event was two minutes late.',
  operations: [
    {
      order: 1,
      type: 'ShiftTimestamp',
      eventId: 'event-123',
      beforeEventCode: 'YM',
      afterEventCode: 'YM',
      timeZone: 'America/Chicago',
      beforeTimestamp: 1000,
      afterTimestamp: 121000,
    },
  ],
}
const confirmation = {
  id: 'confirmation-1',
  summary: 'Review exact correction',
  details: [],
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  correction: preview,
}
const render = (component, props) =>
  renderToString(createSSRApp({ render: () => h(component, props) }))

test('new actual status preview shows an insertion without nonexistent repair identifiers', async () => {
  const html = await render(Confirmation, {
    confirmation: {
      ...confirmation,
      correction: {
        ...preview,
        repairId: '00000000-0000-0000-0000-000000000000',
        optionId: '00000000-0000-0000-0000-000000000000',
        isNewStatus: true,
        operations: [
          {
            order: 1,
            type: 'InsertDutyStatus',
            eventId: 'new-status',
            beforeTimestamp: null,
            afterTimestamp: 1790816400000,
            beforeEventCode: null,
            afterEventCode: 'DS_ON',
            timeZone: 'UTC',
          },
        ],
      },
    },
  })
  assert.match(html, /New status event/)
  assert.match(html, /Before: No event/)
  assert.match(html, /On Duty/)
  assert.match(html, /2026-10-01T01:00:00\.000Z/)
  assert.match(html, /Reject status event/)
  assert.match(html, /actual events/)
  assert.doesNotMatch(html, /00000000|Repair:|Option:|Event: new-status/)
})

test('confirmation renders the exact reason, original request, event and timestamp operations', async () => {
  const html = await render(Confirmation, { confirmation })
  for (const value of [
    preview.reason,
    preview.originalRequest,
    'event-123',
    'ShiftTimestamp',
    '1000',
    '121000',
    'YM',
    'America/Chicago',
    'Apply to draft',
    'Reject correction',
  ])
    assert.ok(html.includes(value), value)
  assert.match(html, /these exact changes reflect actual events/i)
  assert.doesNotMatch(html, /driver must accept|Send to driver/)
})

test('busy confirmation disables both decisions', async () => {
  const html = await render(Confirmation, { confirmation, busy: true })
  assert.equal((html.match(/<button[^>]*\sdisabled(?:=|[ >])/g) || []).length, 3)
  assert.match(html, /Recording decision/)
})

test('pending driver acceptance displays exact operations and does not claim applied', async () => {
  const html = await render(Message, {
    item: {
      kind: 3,
      action: {
        summary: 'Correction suggestion',
        correction: { id: 'proposal-1', status: 'awaitingDriverAcceptance', preview },
      },
    },
  })
  assert.match(html, /Waiting for driver acceptance/)
  assert.match(html, /event-123/)
  assert.doesNotMatch(html, /Applied to draft/)
})

test('failed proposal preserves the error and never reports applied', async () => {
  const html = await render(Message, {
    item: {
      kind: 3,
      action: {
        summary: 'Correction suggestion',
        correction: {
          id: 'proposal-1',
          status: 'failed',
          preview,
          errorMessage: 'The log has changed.',
        },
      },
    },
  })
  assert.match(html, /The log has changed\./)
  assert.match(html, /Correction could not be applied/)
  assert.doesNotMatch(html, /Applied to draft/)
})

test('apply requires an explicit checkbox and emits attestation; rejection never needs it', async () => {
  const host = createAssistantRenderer()
  const choices = []
  const app = host.renderer.createApp({
    render: () => h(Confirmation, { confirmation, onDecide: (...choice) => choices.push(choice) }),
  })
  app.mount(host.root)
  const apply = host.button('Apply to draft')
  assert.equal(Boolean(apply.props.disabled), true)
  apply.props.onClick()
  assert.deepEqual(choices, [])
  host.find((node) => node.props?.role === 'checkbox').props.onClick()
  await flushAssistant()
  assert.equal(Boolean(apply.props.disabled), false)
  apply.props.onClick()
  host.button('Reject correction').props.onClick()
  assert.deepEqual(choices, [
    [true, true],
    [false, false],
  ])
  app.unmount()
})

test('missing apply permission disables attestation and apply but preserves rejection', async () => {
  const host = createAssistantRenderer()
  const choices = []
  const app = host.renderer.createApp({
    render: () =>
      h(Confirmation, {
        confirmation,
        canApply: false,
        onDecide: (...choice) => choices.push(choice),
      }),
  })
  app.mount(host.root)
  assert.equal(Boolean(host.button('Apply to draft').props.disabled), true)
  host.button('Apply to draft').props.onClick()
  host.button('Reject correction').props.onClick()
  assert.deepEqual(choices, [[false, false]])
  app.unmount()
})

for (const [type, afterEventCode, expected] of [
  ['DeleteEvent', null, 'Event deleted'],
  ['ChangeToOffDuty', 'OFF', 'Timestamp unchanged'],
]) {
  test(`${type} preview describes a null afterTimestamp without inventing a new time`, async () => {
    const operation = { ...preview.operations[0], type, afterTimestamp: null, afterEventCode }
    const html = await render(Confirmation, {
      confirmation: { ...confirmation, correction: { ...preview, operations: [operation] } },
    })
    assert.ok(html.includes(expected))
    assert.doesNotMatch(html, /121000 ms/)
  })
}

for (const [zone, before, after, expectedBefore, expectedAfter] of [
  ['CT', '2026-11-02T15:00:00Z', '2026-11-02T15:02:00Z', '9:00:00 AM CST', '9:02:00 AM CST'],
  ['ET', '2026-11-01T05:59:00Z', '2026-11-01T06:01:00Z', '1:59:00 AM EDT', '1:01:00 AM EST'],
  [
    'America/Los_Angeles',
    '2026-11-02T15:00:00Z',
    '2026-11-02T15:02:00Z',
    '7:00:00 AM PST',
    '7:02:00 AM PST',
  ],
  [
    'Unknown/Zone',
    '2026-11-02T15:00:00Z',
    '2026-11-02T15:02:00Z',
    '3:00:00 PM UTC',
    '3:02:00 PM UTC',
  ],
]) {
  test(`preview resolves ${zone} local before/after times without losing exact UTC values`, async () => {
    const operation = {
      ...preview.operations[0],
      timeZone: zone,
      beforeTimestamp: Date.parse(before),
      afterTimestamp: Date.parse(after),
    }
    const html = await render(Confirmation, {
      confirmation: { ...confirmation, correction: { ...preview, operations: [operation] } },
    })
    assert.ok(html.includes(expectedBefore), expectedBefore)
    assert.ok(html.includes(expectedAfter), expectedAfter)
    assert.ok(html.includes(new Date(before).toISOString()))
    assert.ok(html.includes(String(Date.parse(after))))
  })
}

test('a different confirmation resets the checkbox and never trusts model-provided attestation', async () => {
  const host = createAssistantRenderer()
  const props = reactive({ confirmation })
  const choices = []
  const app = host.renderer.createApp({
    render: () => h(Confirmation, { ...props, onDecide: (...choice) => choices.push(choice) }),
  })
  app.mount(host.root)
  host.find((node) => node.props?.role === 'checkbox').props.onClick()
  await flushAssistant()
  assert.equal(Boolean(host.button('Apply to draft').props.disabled), false)
  props.confirmation = { ...confirmation, id: 'confirmation-2', factualAttestation: true }
  await flushAssistant()
  assert.equal(
    Boolean(host.find((node) => node.props?.role === 'checkbox').props['aria-checked']),
    false
  )
  assert.equal(Boolean(host.button('Apply to draft').props.disabled), true)
  host.button('Apply to draft').props.onClick()
  assert.deepEqual(choices, [])
  app.unmount()
})

test('an expired confirmation disables applying but still permits rejecting without attestation', async () => {
  const host = createAssistantRenderer()
  const choices = []
  const app = host.renderer.createApp({
    render: () =>
      h(Confirmation, {
        confirmation: { ...confirmation, expiresAt: '2020-01-01T00:00:00Z' },
        onDecide: (...choice) => choices.push(choice),
      }),
  })
  app.mount(host.root)
  assert.equal(Boolean(host.button('Apply to draft').props.disabled), true)
  assert.match(host.text(), /expired/)
  host.button('Apply to draft').props.onClick()
  host.button('Reject correction').props.onClick()
  assert.deepEqual(choices, [[false, false]])
  app.unmount()
})
