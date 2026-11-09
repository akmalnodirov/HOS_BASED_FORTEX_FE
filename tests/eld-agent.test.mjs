import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  applyAgentReply,
  audioBase64,
  buildAgentMessage,
  eldAgentUrl,
  parseAgentReply,
  startTurn,
} from '../src/modules/ELD/LogsModule/Ai/utils/eldAgent.ts'

const context = {
  sessionId: 's1',
  tabId: 't1',
  token: 'jwt',
  fromDate: '2026-10-20',
  toDate: '2026-11-02',
  selectedEvent: { id: 'e1', timestamp: Date.UTC(2026, 9, 21, 13, 0) },
}

test('the token is only sent over wss, or plain ws to this machine', () => {
  assert.equal(eldAgentUrl(' wss://agent.example.com '), 'wss://agent.example.com')
  assert.equal(eldAgentUrl('ws://localhost:8765'), 'ws://localhost:8765')
  assert.equal(eldAgentUrl('ws://127.0.0.1:8765'), 'ws://127.0.0.1:8765')
  assert.equal(eldAgentUrl('ws://[::1]:8765'), 'ws://[::1]:8765')
  assert.equal(eldAgentUrl('ws://agent.example.com'), null)
  assert.equal(eldAgentUrl('ws://localhost.example.com'), null)
  assert.equal(eldAgentUrl('https://agent.example.com'), null)
  assert.equal(eldAgentUrl('not a url'), null)
  assert.equal(eldAgentUrl(undefined), null)
})

test('a message carries the draft, the token and the selected event in the agent shape', () => {
  assert.deepEqual(buildAgentMessage(context, 'New shift'), {
    tabSessionId: 's1',
    tabId: 't1',
    message: 'New shift',
    token: 'jwt',
    eventSelected: true,
    event: { id: 'e1', date: '2026-10-21T13:00:00.000Z' },
    fromDate: '2026-10-20',
    toDate: '2026-11-02',
    audio_input: false,
  })
  const plain = buildAgentMessage({ ...context, selectedEvent: null }, 'abc', true)
  assert.equal(plain.eventSelected, false)
  assert.equal(plain.event, null)
  assert.equal(plain.audio_input, true)
})

test('replies are parsed defensively', () => {
  assert.deepEqual(parseAgentReply('{"type":"final","message":"Done","tool_results":[]}'), {
    type: 'final',
    message: 'Done',
  })
  assert.equal(parseAgentReply('{"type":"other"}'), null)
  assert.equal(parseAgentReply('not json'), null)
})

test('ack keeps the turn open and final ends it with a workspace reload', () => {
  let messages = startTurn([], 'Add a break')
  assert.deepEqual(messages.map((item) => [item.role, item.pending ?? false]), [
    ['user', false],
    ['agent', true],
  ])

  const ack = applyAgentReply(messages, { type: 'ack', message: 'On it.' })
  assert.equal(ack.done, false)
  assert.equal(ack.refresh, false)
  assert.deepEqual(ack.messages.map((item) => [item.text, item.pending ?? false]), [
    ['Add a break', false],
    ['On it.', false],
    ['', true],
  ])

  const final = applyAgentReply(ack.messages, { type: 'final', message: 'Break added.' })
  assert.equal(final.done, true)
  assert.equal(final.refresh, true)
  assert.deepEqual(final.messages.map((item) => item.text), ['Add a break', 'On it.', 'Break added.'])
  messages = final.messages
  assert.ok(messages.every((item) => !item.pending))
})

test('a plain response ends the turn without a reload, and an error is marked', () => {
  const response = applyAgentReply(startTurn([], 'hi'), { type: 'response', message: 'When?' })
  assert.equal(response.done, true)
  assert.equal(response.refresh, false)

  const error = applyAgentReply(startTurn([], 'hi'), { type: 'error', message: null })
  assert.equal(error.done, true)
  assert.equal(error.refresh, false)
  assert.equal(error.messages.at(-1).isError, true)
  assert.equal(error.messages.at(-1).text, 'The agent could not process the request.')
})

test('the greeting does not change the conversation', () => {
  const messages = startTurn([], 'hi')
  assert.equal(applyAgentReply(messages, { type: 'connection_established', message: 'Hello' }).messages, messages)
})

test('audio is sent as plain base64', () => {
  assert.equal(audioBase64('data:audio/webm;codecs=opus;base64,AAAB'), 'AAAB')
  assert.equal(audioBase64('AAAB'), 'AAAB')
})
