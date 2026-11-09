export interface BoostDurationParts {
  hours: number
  minutes: number
  seconds: number
}

export function areBoostDurationPartsValid({
  hours,
  minutes,
  seconds,
}: BoostDurationParts) {
  return (
    [hours, minutes, seconds].every(Number.isInteger) &&
    hours >= 0 &&
    minutes >= 0 &&
    minutes <= 59 &&
    seconds >= 0 &&
    seconds <= 59
  )
}

export function boostDurationPartsToSeconds({
  hours,
  minutes,
  seconds,
}: BoostDurationParts) {
  return Math.max(0, hours) * 3600 + Math.max(0, minutes) * 60 + Math.max(0, seconds)
}

export function formatBoostDuration(milliseconds: number) {
  const total = Math.max(0, Math.round(milliseconds / 1_000))
  return `${String(Math.floor(total / 3600)).padStart(2, '0')}:${String(Math.floor((total % 3600) / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}
