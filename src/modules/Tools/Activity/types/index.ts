// src/types/activity.ts
export interface Operator {
  id: string
  firstName: string
  lastName: string
}

export interface ActivityRecord {
  id: string
  type: number
  carrierId: string
  carrierName: string
  driverId: string
  driverName: string
  status: number
  operator: Operator
  currentTime: string
  startDate: string
  endDate: string
  isSubmitted: boolean
  changes: string
}

export interface ActivityListResponse {
  successResult: {
    data: ActivityRecord[]
    totalCount: number
  }
}

export interface ActivityRequest {
  OperatorId?: string
  CarrierId?: string
  DriverId?: string
  StartDate: string
  EndDate: string
  pageNumber: number
  pageSize: number
  type?: number
}

export interface ActivityTableItem {
  id: string
  no: number
  name: string
  tool: string
  toolType: number
  company: string
  carrierId: string
  driver: string
  driverId: string
  period: string
  shiftRepair: string
  created: string
  startDate: string
  endDate: string
  status: number
  isSubmitted: boolean
}
