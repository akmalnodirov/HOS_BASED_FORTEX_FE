/** Record origins as the edit form stores them. */
export const Origin = { Eld: 1, Driver: 2, OtherUser: 3, UnidentifiedDriver: 4 } as const

const DRIVER_ORIGIN_CODES = ['DS_OFF', 'DS_WT', 'DS_SB', 'DS_ON', 'DR_IND_PC', 'DR_IND_YM']
const AUTO_ORIGIN_CODES = [
  'LOG_NORMAL_PRECISION', 'LOG_REDUCED_PRECISION', 'DR_LOGIN', 'DR_LOGOUT',
  'ENG_UP_NORMAL', 'ENG_UP_REDUCED', 'ENG_DOWN_NORMAL', 'ENG_DOWN_REDUCED',
]

interface OriginContext {
  /** An event recorded by the device whose status is being changed by another user. */
  modifiedProviderEvent: boolean
}

const isCertification = (code: string) => /^DR_CERT_\d+$/.test(code)

/** The origin the field is locked to for this event, or null when the user may choose. Driving is always Auto. */
export function fixedOriginFor(eventCode: string, context: OriginContext): number | null {
  if (eventCode === 'DS_D') return Origin.Eld
  if (context.modifiedProviderEvent) return Origin.OtherUser
  if (DRIVER_ORIGIN_CODES.includes(eventCode)) return Origin.Driver
  if (AUTO_ORIGIN_CODES.includes(eventCode)) return Origin.Eld
  return null
}

/** The origin the form switches to when the event type changes. */
export function originForEvent(eventCode: string, context: OriginContext): number | null {
  if (isCertification(eventCode)) return null
  return fixedOriginFor(eventCode, context) ?? Origin.Eld
}

/** True when the status is changed to driving (or a driving event is added): its origin is then always Auto. */
export function drivingOriginLocked(eventCode: string, previousEventCode: string | undefined) {
  return eventCode === 'DS_D' && previousEventCode !== 'DS_D'
}

/**
 * The origin sent to the server. A status changed to driving (or a new driving event) is ELD; an event that
 * already was driving keeps the chosen origin. A changed device event never claims ELD otherwise.
 */
export function requestOriginFor(
  eventCode: string,
  requested: string | null,
  context: OriginContext & { previousEventCode: string | undefined }
): string | null {
  if (isCertification(eventCode)) return null
  if (drivingOriginLocked(eventCode, context.previousEventCode)) return 'ELD'
  if (context.modifiedProviderEvent && requested === 'ELD') return 'OTHER_USER'
  return requested
}
