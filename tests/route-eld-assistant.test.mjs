import { setImmediate } from 'node:timers'
import { beforeEach, afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { createPinia, setActivePinia } from 'pinia'
import { useRouteEldAssistantStore } from '../src/modules/ELD/LogsModule/Boost/store/routeEldAssistant.ts'

let store
const turn = (overrides = {}) => ({
  conversationId: 'conversation-1',
  turnId: 'turn-1',
  status: 'COMPLETED',
  items: [],
  ...overrides,
})

beforeEach(() => {
  setActivePinia(createPinia())
  globalThis.assistantTestApi = {
    get: async () => ({ data: null }),
    post: async () => ({ data: turn() }),
    delete: async () => ({}),
  }
  store = useRouteEldAssistantStore()
})
afterEach(() => store.stopPolling())

test('read-only chat keeps the existing start payload and renders returned history', async () => {
  const calls = []
  const item = { id: 'answer-1', kind: 2, text: 'Check the original log.', action: null }
  globalThis.assistantTestApi.post = async (...args) => {
    calls.push(args)
    return { data: { successResult: turn({ items: [item] }) } }
  }
  assert.equal(await store.send('session-1', 'tab-1', ' Explain this log '), true)
  assert.equal(calls[0][0], '/api/route-eld/event-sessions/session-1/assistant/turns')
  assert.deepEqual(Object.keys(calls[0][1]).sort(), ['clientTurnId', 'tabId', 'text'])
  assert.equal(calls[0][1].text, 'Explain this log')
  assert.deepEqual(store.items, [item])
  assert.equal(store.isBusy, false)
})

test('network send retry preserves the same client turn id', async () => {
  const ids = []
  globalThis.assistantTestApi.post = async (_url, body) => {
    ids.push(body.clientTurnId)
    if (ids.length === 1) throw { isAxiosError: true }
    return { data: turn() }
  }
  assert.equal(await store.send('session-1', 'tab-1', 'Explain this log'), false)
  assert.equal(store.resendText, 'Explain this log')
  assert.equal(await store.send('session-1', 'tab-1', store.resendText), true)
  assert.equal(ids[0], ids[1])
})

const preview = {
  repairId: 'repair-1',
  optionId: 'option-1',
  sessionId: 'session-1',
  tabId: 'tab-1',
  reason: 'The yard event was recorded two minutes late.',
  originalRequest: 'Correct the yard event.',
  operations: [
    {
      order: 1,
      type: 'ShiftTimestamp',
      eventId: 'event-1',
      beforeTimestamp: 1000,
      afterTimestamp: 121000,
    },
  ],
}
const confirmation = {
  id: 'confirmation-1',
  toolName: 'prepare_factual_correction',
  summary: 'Review correction',
  details: [],
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  correction: preview,
}
const waitingTurn = () => turn({ status: 'AWAITING_CONFIRMATION', confirmation })
const proposalItem = (status) => ({
  id: 'action-1',
  kind: 3,
  text: null,
  action: {
    summary: 'Correction suggestion',
    decision: 1,
    outcome: 1,
    correction: { id: 'proposal-1', status, preview },
  },
})
async function loadConfirmation() {
  confirmation.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  globalThis.assistantTestApi.get = async () => ({
    data: { id: 'conversation-1', items: [], openTurn: waitingTurn() },
  })
  await store.load('session-1')
  store.setContext('session-1', 'tab-1')
}

test('confirmation remains actionable and blocks a new send without showing Thinking', async () => {
  await loadConfirmation()
  assert.deepEqual(store.confirmation, confirmation)
  assert.equal(store.isBusy, true)
  assert.equal(store.isProcessing, false)
  assert.equal(store.error, null)
  assert.equal(await store.send('session-1', 'tab-1', 'another request'), false)
})

test('attested dispatcher approval uses the exact decision contract and recognizes applied draft', async (context) => {
  context.mock.timers.enable({ apis: ['Date'], now: Date.parse('2027-01-15T12:00:00Z') })
  await loadConfirmation()
  const calls = []
  globalThis.assistantTestApi.post = async (...args) => {
    calls.push(args)
    return {
      data: turn({ status: 'COMPLETED', items: [proposalItem('applied')] }),
    }
  }
  assert.equal(await store.decide('session-1', 'tab-1', true, true), true)
  assert.equal(
    calls[0][0],
    '/api/route-eld/event-sessions/session-1/assistant/turns/turn-1/decision'
  )
  assert.deepEqual(calls[0][1], {
    confirmationId: 'confirmation-1',
    approve: true,
    factualAttestation: true,
  })
  assert.equal(store.confirmation, null)
  assert.equal(store.appliedCorrections.length, 1)
  assert.equal(store.items[0].action.correction.status, 'applied')
})

test('rejection sends approve false and never exposes an applied correction', async () => {
  await loadConfirmation()
  let body
  globalThis.assistantTestApi.post = async (_url, value) => {
    body = value
    return { data: turn({ status: 'CANCELLED' }) }
  }
  assert.equal(await store.decide('session-1', 'tab-1', false), true)
  assert.deepEqual(body, {
    confirmationId: 'confirmation-1',
    approve: false,
    factualAttestation: false,
  })
  assert.equal(store.appliedCorrections.length, 0)
})

test('decision disables duplicate submission and preserves preview after a network failure', async () => {
  await loadConfirmation()
  let fail
  globalThis.assistantTestApi.post = () =>
    new Promise((_resolve, reject) => {
      fail = reject
    })
  const pending = store.decide('session-1', 'tab-1', true, true)
  assert.equal(store.isDeciding, true)
  assert.equal(await store.decide('session-1', 'tab-1', true, true), false)
  fail({ isAxiosError: true })
  assert.equal(await pending, false)
  assert.equal(store.isDeciding, false)
  assert.deepEqual(store.confirmation, confirmation)
  assert.match(store.error, /reach the server/)
})

test('stale decision retains the preview until retry reload resolves the expired turn', async () => {
  await loadConfirmation()
  globalThis.assistantTestApi.post = async () => {
    throw {
      isAxiosError: true,
      response: { status: 409, data: { message: 'The proposal is stale.' } },
    }
  }
  assert.equal(await store.decide('session-1', 'tab-1', true, true), false)
  assert.equal(store.error, 'The proposal is stale.')
  assert.deepEqual(store.confirmation, confirmation)
  globalThis.assistantTestApi.get = async () => ({
    data: { id: 'conversation-1', items: [], openTurn: turn({ status: 'EXPIRED' }) },
  })
  await store.load('session-1')
  assert.equal(store.confirmation, null)
  assert.match(store.error, /expired/)
  assert.equal(store.appliedCorrections.length, 0)
})

test('updated action items replace pending state and only applied status authorizes refresh', async () => {
  globalThis.assistantTestApi.post = async () => ({
    data: turn({ status: 'COMPLETED', items: [proposalItem('awaitingDriverAcceptance')] }),
  })
  await store.send('session-1', 'tab-1', 'Correct my reported facts')
  assert.equal(store.appliedCorrections.length, 0)
  globalThis.assistantTestApi.get = async () => ({
    data: { id: 'conversation-1', items: [proposalItem('applied')], openTurn: null },
  })
  await store.load('session-1')
  assert.equal(store.items.length, 1)
  assert.equal(store.appliedCorrections[0].id, 'proposal-1')
})

test('a late decision response cannot contaminate a different session', async () => {
  await loadConfirmation()
  let finish
  globalThis.assistantTestApi.post = () =>
    new Promise((resolve) => {
      finish = resolve
    })
  const decision = store.decide('session-1', 'tab-1', true, true)
  globalThis.assistantTestApi.get = async () => ({ data: null })
  await store.load('session-2')
  finish({ data: turn({ status: 'COMPLETED', items: [proposalItem('applied')] }) })
  assert.equal(await decision, false)
  assert.equal(store.sessionId, 'session-2')
  assert.equal(store.items.length, 0)
  assert.equal(store.appliedCorrections.length, 0)
})

test('polling stops at confirmation and retains updated action items by id', async (context) => {
  context.mock.timers.enable({ apis: ['setTimeout'] })
  globalThis.assistantTestApi.post = async () => ({
    data: turn({ status: 'RUNNING', items: [proposalItem('awaitingDriverAcceptance')] }),
  })
  let polls = 0
  globalThis.assistantTestApi.get = async () => {
    polls += 1
    return {
      data: turn({
        status: 'AWAITING_CONFIRMATION',
        confirmation,
        items: [proposalItem('applied')],
      }),
    }
  }
  await store.send('session-1', 'tab-1', 'Correct the reported time')
  assert.equal(store.isProcessing, true)
  context.mock.timers.tick(1000)
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(store.isProcessing, false)
  assert.equal(store.confirmation.id, confirmation.id)
  assert.equal(store.items.length, 1)
  assert.equal(store.appliedCorrections.length, 1)
  context.mock.timers.tick(5000)
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(polls, 1)
})

for (const [data, status, expected] of [
  ['The timeline changed.', 409, 'The timeline changed.'],
  [
    {
      code: 'Assistant.Correction.Conflict',
      message: 'A different decision was recorded.',
      traceId: 'trace-1',
    },
    409,
    'A different decision was recorded.',
  ],
  [undefined, 401, 'Your session expired. Sign in again.'],
]) {
  test(`decision error uses ${status} response message without losing the pending preview: ${expected}`, async () => {
    await loadConfirmation()
    globalThis.assistantTestApi.post = async () => {
      throw { isAxiosError: true, response: { status, data } }
    }
    assert.equal(await store.decide('session-1', 'tab-1', true, true), false)
    assert.equal(store.error, expected)
    assert.deepEqual(store.confirmation, confirmation)
  })
}

test('approval cannot reach the decision endpoint without an explicit factual attestation', async () => {
  await loadConfirmation()
  let calls = 0
  globalThis.assistantTestApi.post = async () => {
    calls += 1
    return { data: turn() }
  }
  assert.equal(await store.decide('session-1', 'tab-1', true, false), false)
  assert.equal(calls, 0)
  assert.deepEqual(store.confirmation, confirmation)
})

test('approval cannot reach the decision endpoint for a different selected tab', async () => {
  await loadConfirmation()
  let calls = 0
  globalThis.assistantTestApi.post = async () => {
    calls += 1
    return { data: turn() }
  }
  assert.equal(await store.decide('session-1', 'tab-other', true, true), false)
  assert.equal(calls, 0)
})

test('structured forbidden errors explain the missing apply permission and retain the confirmation', async () => {
  await loadConfirmation()
  globalThis.assistantTestApi.post = async () => {
    throw {
      isAxiosError: true,
      response: {
        status: 403,
        data: {
          code: 'Assistant.Correction.Forbidden',
          message: 'Boost permission is required to apply corrections.',
          traceId: 'trace-1',
        },
      },
    }
  }
  assert.equal(await store.decide('session-1', 'tab-1', true, true), false)
  assert.equal(store.error, 'Boost permission is required to apply corrections.')
  assert.deepEqual(store.confirmation, confirmation)
})
