export function currentOwnerMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function currentOwnerMonthRange(): { startTime: string; endTime: string } {
  const month = currentOwnerMonth()
  const [year, monthNumber] = month.split('-').map(Number)
  const lastDay = new Date(year, monthNumber, 0).getDate()
  return { startTime: `${month}-01`, endTime: `${month}-${String(lastDay).padStart(2, '0')}` }
}
