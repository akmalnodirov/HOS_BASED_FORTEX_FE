// src/types/activity.ts

export interface ActivityOperator {
  firstName: string
  lastName: string
}

export interface ActivityRecord {
  id: string

  // Used for duration calculations
  startDate: string
  endDate: string

  // Used for "created" field
  currentTime: string

  // Used for "tool"
  type: number

  // Used for UI columns
  carrierName: string
  driverName: string

  // Used for name column
  operator: ActivityOperator
}

export interface ActivityTableItem {
  id: string
  no: number
  name: string
  tool: string
  company: string
  driver: string
  period: string
  shiftRepair: string
  created: string
}

/**
 * Your request object is used like:
 * params.StartDate / EndDate / pageNumber / pageSize
 * plus optional OperatorId and type
 */
export interface ActivityRequest {
  StartDate: string
  EndDate: string
  pageNumber: number
  pageSize: number
  OperatorId?: string
  type?: number
}

/**
 * Your response is used like:
 * response.data.successResult.data
 * response.data.successResult.totalCount
 */
export interface ActivityListResponse {
  successResult?: {
    data: ActivityRecord[]
    totalCount?: number
  }
  // keep it flexible in case API returns other fields
  [key: string]: unknown
}
