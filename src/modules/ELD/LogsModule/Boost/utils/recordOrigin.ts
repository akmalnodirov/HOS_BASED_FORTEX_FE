/** Record origins as the edit form stores them. */
export const Origin = { Eld: 1, Driver: 2, OtherUser: 3, UnidentifiedDriver: 4 } as const

const DRIVER_ORIGIN_CODES = ['DS_OFF', 'DS_WT', 'DS_SB', 'DS_ON', 'DR_IND_PC', 'DR_IND_YM']
const AUTO_ORIGIN_CODES = [
  'LOG_NORMAL_PRECISION', 'LOG_REDUCED_PRECISION', 'DR_LOGIN', 'DR_LOGOUT',
  'ENG_UP_NORMAL', 'ENG_UP_REDUCED', 'ENG_DOWN_NORMAL', 'ENG_DOWN_REDUCED',
]

const isCertification = (code: string) => /^DR_CERT_\d+$/.test(code)

export function fixedOriginFor(eventCode: string): number | null {
  if (eventCode === 'DS_D') return Origin.Eld
  if (DRIVER_ORIGIN_CODES.includes(eventCode)) return Origin.Driver
  if (AUTO_ORIGIN_CODES.includes(eventCode)) return Origin.Eld
  return null
}

export function originForEvent(eventCode: string): number | null {
  if (isCertification(eventCode)) return null
  return fixedOriginFor(eventCode) ?? Origin.Eld
}

export function drivingOriginLocked(eventCode: string, previousEventCode: string | undefined) {
  return eventCode === 'DS_D' && previousEventCode !== 'DS_D'
}

export function requestOriginFor(
  eventCode: string,
  requested: string | null,
  previousEventCode: string | undefined
): string | null {
  if (isCertification(eventCode)) return null
  if (drivingOriginLocked(eventCode, previousEventCode)) return 'ELD'
  return requested
}
