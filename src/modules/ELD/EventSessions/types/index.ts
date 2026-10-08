export type EventSessionStatus = 'DRAFT' | 'SUBMITTED' | 'ROLLED_BACK'

export interface EventSessionListItem {
  id: string
  driverId: string
  driverName: string
  companyName: string
  dispatcherId: string | null
  dispatcherName: string | null
  name: string
  fromDate: string
  toDate: string
  status: EventSessionStatus
  tabCount: number
  changedEventCount: number
  createdAt: string
  submittedAt: string | null
  rolledBackAt: string | null
  isRollbackBlocked: boolean
}

export interface EventSessionPage {
  data: EventSessionListItem[]
  pagination: {
    pageNumber: number
    pageSize: number
    totalCount: number
    totalPages: number
  }
  draftCount: number
  submittedCount: number
  rolledBackCount: number
}

export interface EventSessionFilters {
  search?: string
  companyId?: string
  status?: EventSessionStatus
  createdFrom?: string
  createdTo?: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
  pageNumber: number
  pageSize: number
}

export interface EventSessionOperation {
  id: string
  sessionId: string
  operationType: 'SUBMIT' | 'ROLLBACK'
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'COMPLETED_WITH_ERRORS' | 'FAILED'
  total: number
  completed: number
  succeeded: number
  failed: number
  error: string | null
}
