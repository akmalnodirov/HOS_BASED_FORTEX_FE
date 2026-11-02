import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createSSRApp, createRenderer, h } from 'vue'
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
  expiresAt: '2026-11-03T00:00:00Z',
  correction: preview,
}
const render = (component, props) =>
  renderToString(createSSRApp({ render: () => h(component, props) }))

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
    'Send to driver',
    'Reject correction',
  ])
    assert.ok(html.includes(value), value)
  assert.match(html, /driver must accept/i)
  assert.doesNotMatch(html, /<button[^>]*\sdisabled(?:=|[ >])/)
})

test('busy confirmation disables both decisions', async () => {
  const html = await render(Confirmation, { confirmation, busy: true })
  assert.equal((html.match(/<button[^>]*\sdisabled(?:=|[ >])/g) || []).length, 2)
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

test('confirmation buttons emit the explicit approve or reject choice', () => {
  const nodes = []
  const renderer = createRenderer({
    createElement: (tag) => {
      const node = { tag, children: [], props: {} }
      nodes.push(node)
      return node
    },
    createText: (text) => ({ text }),
    createComment: (text) => ({ text }),
    insert: (node, parent) => {
      parent.children.push(node)
      node.parent = parent
    },
    remove: () => {},
    setText: (node, text) => {
      node.text = text
    },
    setElementText: (node, text) => {
      node.text = text
    },
    parentNode: (node) => node.parent,
    nextSibling: () => null,
    patchProp: (node, key, _previous, value) => {
      node.props[key] = value
    },
  })
  const choices = []
  const app = renderer.createApp({
    render: () => h(Confirmation, { confirmation, onDecide: (choice) => choices.push(choice) }),
  })
  app.mount({ children: [] })
  const buttons = nodes.filter((node) => node.tag === 'button')
  assert.equal(buttons.length, 2)
  buttons[0].props.onClick()
  buttons[1].props.onClick()
  assert.deepEqual(choices, [true, false])
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
