import type { RoleType } from '../types'


export const RoleTypeEnum = {
  1: 'SystemAdmin',
  2: 'Client',
  3: 'Manager',
  4: 'LogChecker',
  5: 'Support',
  6: 'PortalUser',
  7: 'Assistant',
  8: 'Checker',
} as const


export function getRoleTypes(userRoleType: number = 1): RoleType[] {
  const rank = (type: number) => type === 1 ? 0 : type === 2 ? 1 : type === 3 ? 2
    : type === 4 || type === 5 ? 3 : 4
  return Object.entries(RoleTypeEnum)
    .filter(([key]) => parseInt(key) > 2 && rank(userRoleType) < rank(parseInt(key)))
    .map(([key, value]) => ({
      type: parseInt(key),
      name: value,
    }))
}
