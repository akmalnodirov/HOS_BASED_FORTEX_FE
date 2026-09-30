/**
 * Helper functions for Roles
 */

import type { RoleType } from '../types'

/**
 * Role type definitions
 */
export const RoleTypeEnum = {
  1: 'SystemAdmin',
  2: 'Client',
  3: 'Manager',
  4: 'LogChecker',
  5: 'Support',
  6: 'PortalUser',
} as const

/**
 * Get role types based on current user role
 * Returns role types that are greater than type 2
 */
export function getRoleTypes(userRoleType: number = 1): RoleType[] {
  return Object.entries(RoleTypeEnum)
    .filter(([key]) => parseInt(key) > 2)
    .map(([key, value]) => ({
      type: parseInt(key),
      name: value,
    }))
}
