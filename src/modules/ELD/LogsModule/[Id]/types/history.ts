import type { Dayjs } from 'dayjs'

// Session types
export interface HistorySessionRequest {
  driverId: string
  type: number // 4 for history
  startDate: string
  endDate: string
  status: number
}

export interface HistorySessionResponse {
  id: string
  driverId: string
  type: number
  startDate: string
  endDate: string
  status: number
  createdAt?: string
  updatedAt?: string
}

// Tab types
export interface HistoryTabRequest {
  sessionId: string
  name?: string
}

export interface HistoryTabResponse {
  id: string
  sessionId: string
  name?: string
  createdAt?: string
  updatedAt?: string
}

// Transfer types
export interface TransferReassignRequest {
  driverId: string
  startDate: string
  endDate: string
  assignedDriverId: string
  eventIds: string[]
}

export interface TransferByIdsRequest {
  tabId: string
  sessionId: string
  eventIds: string[]
}

export interface TransferByDateRangeRequest {
  tabId: string
  sessionId: string
  startDate: string
  endDate: string
}

export interface TransferEventParams {
  tabId: string
  sessionId: string
}

export interface TransferGraphParams extends TransferEventParams {
  screenResolution: number
}

// History state
export interface HistoryModals {
  transferEvents: boolean
  transferByPeriod: boolean
}

export interface HistoryTransferForm {
  dateRange: [Dayjs | null, Dayjs | null]
  dateRangeSubmit: boolean
}

export interface HistoryState {
  isActive: boolean
  modals: HistoryModals
  transferForm: HistoryTransferForm
  selectedRows: any[]
}

// Constants
export const HISTORY_SESSION_TYPE = 4