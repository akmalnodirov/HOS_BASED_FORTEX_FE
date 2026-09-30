/**
 * Types for HOSRules module
 */

export interface HOSRule {
  id: number | string
  no: number
  name: string
}

export type SortKey = 'name'
export type SortOrder = 'asc' | 'desc'

export interface HOSRuleFormData {
  name: string
}

export interface HOSRuleResponse {
  id: string
  name: string
}

export interface HOSRuleRequest {
  name: string
}

export interface HOSRuleListResponse {
  successResult: {
    data: HOSRuleResponse[]
    totalCount: number
    pageNumber: number
    pageSize: number
    isFirst: boolean
    isLast: boolean
  }
}
