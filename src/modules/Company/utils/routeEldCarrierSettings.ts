export function codeName(id: string | null) {
  return id ? id.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()) : '—'
}

export function cycleRule(id: string | null) {
  const match = /^US_(\d+)_(\d+)$/.exec(id || '')
  return match ? `US ${match[1]} hours / ${match[2]} days` : codeName(id)
}

export function hours(id: string | null) {
  const match = /^H(\d+)$/.exec(id || '')
  return match ? `${match[1]} hours` : codeName(id)
}

export function minutes(id: string | null) {
  const match = /^M(\d+)$/.exec(id || '')
  return match ? `${match[1]} minutes` : codeName(id)
}
