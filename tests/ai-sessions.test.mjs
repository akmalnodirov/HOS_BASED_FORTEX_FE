import { test } from 'node:test'
import assert from 'node:assert/strict'
import { reusableDrafts } from '../src/modules/ELD/LogsModule/Ai/utils/aiSessions.ts'

const session = (id, status, fromDate, toDate, createdAt) => ({
  id,
  status,
  fromDate,
  toDate,
  createdAt,
  driverId: 'd1',
  driverName: 'Driver',
  companyName: 'Carrier',
  name: id,
  tabCount: 1,
  changedEventCount: 0,
  isRollbackBlocked: false,
})

test('only drafts with the exact dates are reused, newest first', () => {
  const sessions = [
    session('older', 'DRAFT', '2026-10-20', '2026-11-02', '2026-11-01T08:00:00Z'),
    session('submitted', 'SUBMITTED', '2026-10-20', '2026-11-02', '2026-11-02T09:00:00Z'),
    session('newer', 'DRAFT', '2026-10-20', '2026-11-02', '2026-11-02T08:00:00Z'),
    session('other-dates', 'DRAFT', '2026-10-21', '2026-11-02', '2026-11-02T10:00:00Z'),
  ]
  assert.deepEqual(
    reusableDrafts(sessions, '2026-10-20', '2026-11-02').map((item) => item.id),
    ['newer', 'older']
  )
  assert.deepEqual(reusableDrafts(sessions, '2026-10-01', '2026-10-14'), [])
})
