import type { RoleType } from '../types'


export const RoleTypeEnum = {
  1: 'SystemAdmin',
  2: 'Client',
  3: 'Manager',
  4: 'LogChecker',
  5: 'Support',
  6: 'PortalUser',
} as const


export function getRoleTypes(userRoleType: number = 1): RoleType[] {
  return Object.entries(RoleTypeEnum)
    .filter(([key]) => parseInt(key) > 2)
    .map(([key, value]) => ({
      type: parseInt(key),
      name: value,
    }))
}
