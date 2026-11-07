import type { User } from '@/modules/Auth/types'
import { canAccessPath } from '@/router/permissions'

const ownerPages = [
  '/report/owner/dashboard',
  '/report/owner/inspections',
  '/report/owner/time',
  '/report/owner/teams',
  '/report/owner/salary',
  '/report/owner/expenses',
  '/report/owner/settings',
]

export function isOwnerUser(user: User | null): boolean {
  const roles = user?.roles ?? []
  return roles.some((role) => role.type === 9) && !roles.some((role) => role.type === 1)
}

export function ownerLandingPath(user: User | null, token: string | null): string | null {
  if (!isOwnerUser(user)) return null
  return ownerPages.find((path) => canAccessPath(path, token)) ?? null
}
