import { test } from 'node:test'
import assert from 'node:assert/strict'
import { originForEvent, requestOriginFor } from '../src/modules/ELD/LogsModule/Boost/utils/recordOrigin.ts'

// Origins as the edit form stores them: 1 Auto (ELD), 2 Driver, 3 Other user, 4 Unidentified driver.
test('driving is always Auto, even for a device event that was changed', () => {
  assert.equal(originForEvent('DS_D', { modifiedProviderEvent: true }), 1)
  assert.equal(originForEvent('DS_D', { modifiedProviderEvent: false }), 1)
})

test('other statuses keep the existing origin rules', () => {
  assert.equal(originForEvent('DS_ON', { modifiedProviderEvent: true }), 3)
  assert.equal(originForEvent('DS_ON', { modifiedProviderEvent: false }), 2)
  assert.equal(originForEvent('ENG_UP_NORMAL', { modifiedProviderEvent: false }), 1)
  assert.equal(originForEvent('DR_CERT_1', { modifiedProviderEvent: false }), null)
})

test('a status changed to driving is saved as ELD instead of forcing Other user', () => {
  assert.equal(requestOriginFor('DS_D', 'OTHER_USER', { modifiedProviderEvent: true, previousEventCode: 'DS_ON' }), 'ELD')
  assert.equal(requestOriginFor('DS_D', 'DRIVER', { modifiedProviderEvent: false, previousEventCode: undefined }), 'ELD')
  assert.equal(requestOriginFor('DS_ON', 'ELD', { modifiedProviderEvent: true, previousEventCode: 'DS_OFF' }), 'OTHER_USER')
  assert.equal(requestOriginFor('DS_ON', 'DRIVER', { modifiedProviderEvent: true, previousEventCode: 'DS_OFF' }), 'DRIVER')
  assert.equal(requestOriginFor('DR_CERT_2', 'DRIVER', { modifiedProviderEvent: false, previousEventCode: undefined }), null)
})

test('editing an event that already was driving keeps the chosen origin', () => {
  assert.equal(requestOriginFor('DS_D', 'UNIDENTIFIED_DRIVER', { modifiedProviderEvent: false, previousEventCode: 'DS_D' }), 'UNIDENTIFIED_DRIVER')
  assert.equal(requestOriginFor('DS_D', 'DRIVER', { modifiedProviderEvent: false, previousEventCode: 'DS_D' }), 'DRIVER')
})

test('the origin field is locked to Auto for driving', async () => {
  const { fixedOriginFor } = await import('../src/modules/ELD/LogsModule/Boost/utils/recordOrigin.ts')
  assert.equal(fixedOriginFor('DS_D', { modifiedProviderEvent: true }), 1)
  assert.equal(fixedOriginFor('DS_ON', { modifiedProviderEvent: true }), 3)
  assert.equal(fixedOriginFor('DS_SB', { modifiedProviderEvent: false }), 2)
  assert.equal(fixedOriginFor('INTERMEDIATE', { modifiedProviderEvent: false }), null)
})
