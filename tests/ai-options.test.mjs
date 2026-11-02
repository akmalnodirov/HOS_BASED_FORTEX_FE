import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  applyOptionMessage,
  changeRows,
  latestRepairOptions,
  optionBadge,
  stripApplyMarker,
} from '../src/modules/ELD/LogsModule/Ai/utils/aiOptions.ts'

const optionsItem = (id, tabId, repairId) => ({
  id,
  kind: 4,
  text: null,
  createdAt: '2026-11-02T10:00:00Z',
  action: null,
  repairOptions: { repairId, sessionId: 's1', tabId, kind: 'RepairShiftViolation', options: [] },
})

test('the newest options set for the active tab drives the cards', () => {
  const items = [
    optionsItem('1', 'tab-a', 'older'),
    { id: '2', kind: 2, text: 'Here are options.', createdAt: '', action: null },
    optionsItem('3', 'tab-b', 'other-tab'),
    optionsItem('4', 'tab-a', 'newer'),
  ]
  assert.equal(latestRepairOptions(items, 's1', 'tab-a')?.repairId, 'newer')
  assert.equal(latestRepairOptions(items, 's1', 'tab-c'), null)
  assert.equal(latestRepairOptions(items, 'other-session', 'tab-a'), null)
})

test('the apply message carries a marker that the chat hides', () => {
  const message = applyOptionMessage(2, 'Split shift', 'r1', 'o1')
  assert.equal(message, 'Apply option 2: Split shift [[apply repair=r1 option=o1]]')
  assert.equal(stripApplyMarker(message), 'Apply option 2: Split shift')
  assert.equal(stripApplyMarker('Plain question [[not a marker]]'), 'Plain question [[not a marker]]')
})

const live = (status, preview = { events: [] }) => ({ status, preview })

test('option states map to the four badges', () => {
  assert.equal(optionBadge(live('Available'), false), 'Pending')
  assert.equal(optionBadge(live('Available'), true), 'In Progress')
  assert.equal(optionBadge(live('Applied'), false), 'Completed')
  assert.equal(optionBadge(live('Stale'), false), 'Invalid')
  assert.equal(optionBadge(live('Superseded'), true), 'Invalid')
  assert.equal(optionBadge(null, false), 'Pending')
})

test('an available option without a preview is out of date, because the log changed', () => {
  // The repair GET keeps status Available but drops the preview when the timeline moved on.
  assert.equal(optionBadge(live('Available', null), false), 'Invalid')
  assert.equal(optionBadge(live('Applied', null), false), 'Completed')
})

test('changes rows show the move in minutes, none for a deletion', () => {
  const at = Date.UTC(2026, 9, 15, 14, 0)
  const rows = changeRows(
    {
      operations: [
        { order: 0, type: 'ShiftTimestamp', eventId: 'e1', beforeTimestamp: at, afterTimestamp: at + 3_600_000, beforeEventCode: 'DS_D', afterEventCode: 'DS_D' },
        { order: 1, type: 'DeleteEvent', eventId: 'e2', beforeTimestamp: at, afterTimestamp: null, beforeEventCode: 'DS_OFF' },
        { order: 2, type: 'ChangeToOffDuty', eventId: 'e3', beforeTimestamp: at, afterTimestamp: null, beforeEventCode: 'DS_ON', afterEventCode: 'DS_OFF' },
      ],
    },
    'ET'
  )
  assert.deepEqual(rows.map((row) => row.no), [1, 2, 3])
  assert.equal(rows[0].changeMinutes, 60)
  assert.equal(rows[0].event, 'DS_D')
  assert.equal(rows[1].changeMinutes, null)
  assert.equal(rows[2].event, 'DS_ON → DS_OFF')
  assert.match(rows[0].before, /10:00/)
  assert.match(rows[0].after, /11:00/)
})
