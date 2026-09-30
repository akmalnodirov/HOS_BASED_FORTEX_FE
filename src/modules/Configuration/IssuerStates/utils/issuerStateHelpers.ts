/**
 * Helper functions for IssuerState operations
 */

import type { IssuerStateResponse } from '../types'

/**
 * Get issuer state name by ID
 */
export function getIssuerStateName(
  id: string,
  issuerStates: IssuerStateResponse[]
): string {
  const issuerState = issuerStates.find((state) => state.id === id)
  return issuerState?.name ?? ''
}

/**
 * Filter issuer states by parent ID
 */
export function filterIssuerStatesByParent(
  parentId: string,
  issuerStates: IssuerStateResponse[]
): IssuerStateResponse[] {
  if (!parentId) {
    return issuerStates
  }
  return issuerStates.filter((item) => item.parentId === parentId)
}

/**
 * Transform issuer state for display
 */
export function transformIssuerState(
  issuerStates: IssuerStateResponse[]
): Array<{ id: string; name: string }> {
  return issuerStates.map(({ id, name, parentId, stateCode }) => {
    const parentName = getIssuerStateName(parentId, issuerStates)
    const displayName: string = parentName ? `${parentName}, ${name}` : name
    return {
      id,
      name: `${displayName}${stateCode ? ` (${stateCode})` : ''}`,
    }
  })
}
