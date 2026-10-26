export function parseDecimal(text: string): number | null {
  const value = text.trim().replace(',', '.')
  return /^[+-]?(\d+\.?\d*|\.\d+)$/.test(value) ? Number(value) : null
}

export function parseMeasurement(text: string): number | null {
  const value = parseDecimal(text)
  return value !== null && value >= 0 ? value : null
}

export function isMeasurementDraft(text: string) {
  return /^\.?$/.test(text.trim())
}
