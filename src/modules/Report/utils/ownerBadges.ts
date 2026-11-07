const base =
  'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap'
const palette = [
  'bg-blue-500/10 text-blue-600 border-blue-500/30',
  'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  'bg-amber-500/10 text-amber-600 border-amber-500/30',
  'bg-purple-500/10 text-purple-600 border-purple-500/30',
  'bg-pink-500/10 text-pink-600 border-pink-500/30',
  'bg-cyan-500/10 text-cyan-600 border-cyan-500/30',
  'bg-orange-500/10 text-orange-600 border-orange-500/30',
  'bg-indigo-500/10 text-indigo-600 border-indigo-500/30',
]
const roleCodes: Record<string, number> = {
  SystemAdmin: 1,
  Owner: 9,
  Manager: 3,
  Logbooker: 4,
  Checker: 8,
  Assistant: 7,
}

export function ownerRoleBadge(name: string | null): string {
  const code = name ? roleCodes[name] : undefined
  return `${base} ${code == null ? 'bg-muted text-muted-foreground border-border' : palette[code % palette.length]}`
}

export function ownerShiftBadge(shift: string | number | null): string {
  const key =
    typeof shift === 'number' ? ['morning', 'afternoon', 'night'][shift] : shift?.toLowerCase()
  const classes: Record<string, string> = {
    morning: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
    afternoon: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
    night: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30',
  }
  return `${base} ${classes[key ?? ''] ?? 'bg-muted text-muted-foreground border-border'}`
}
