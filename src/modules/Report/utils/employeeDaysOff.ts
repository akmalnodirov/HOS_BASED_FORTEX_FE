export function parseEmployeeDaysOff(value: string): number[] {
  try {
    const days: unknown = JSON.parse(value)
    return Array.isArray(days)
      ? [...new Set(days.filter((day): day is number => Number.isInteger(day) && day >= 0 && day <= 6))].sort((a, b) => a - b)
      : []
  } catch {
    return []
  }
}

export function serializeEmployeeDaysOff(days: number[]): string {
  return JSON.stringify([...new Set(days)].sort((a, b) => a - b))
}
