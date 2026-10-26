
export interface DateRange {
  startTime: string
  endTime: string
  teamId?: string
}

export interface ReportOperationRole {
  id: string
  name: string
  code: number
}

export interface ReportOperationUser {
  id: string
  userName: string
  firstName?: string
  lastName?: string
  role?: ReportOperationRole
}

export interface ReportOperationCompany {
  id: string
  name: string
}

export interface ReportOperationDriver {
  id: string
  name: string
  company?: ReportOperationCompany
}

export interface ReportRouteTask {
  id: string
  driver?: ReportOperationDriver
  company?: ReportOperationCompany
  status: number
  logBooker?: ReportOperationUser
  assistant?: ReportOperationUser
  startTime?: string
  endTime?: string
  notes?: string
  createdDate?: string
  taskCount?: number
}

export interface ReportTaskState {
  dateTime: string
  routeTask: ReportRouteTask
  shiftStatus?: {
    id: string
    shiftType: number
    dateTime: string
    shiftTaskCount: number
  }
}

export interface ReportTaskStatistics {
  totalTime: number
  averageTimeHold: number
  averageTimeCompleted: number
  totalCompleted: number
  totalWorking: number
  totalHold: number
}

export interface ReportDriverActivity {
  id?: string
  driverId: string
  driverName?: string
  date: string
  status?: number
  colNumber: number
  logBooker?: ReportOperationUser
}

export interface ReportDriverActivityTable {
  columns: Array<{ date: string; colNumber: number }>
  rows: Array<{
    companyId?: string
    companyName?: string
    driverId?: string
    driverName?: string
    dateStatuses: Record<string, ReportDriverActivity>
  }>
  totalCount: number
  pageNumber: number
  pageSize: number
  isFirst: boolean
  isLast: boolean
}

export interface ReportCheckerTask {
  id: string
  logBooker?: ReportOperationUser
  checker?: ReportOperationUser
  driver?: ReportOperationDriver
  company?: ReportOperationCompany
  status: number
  startTime?: string
  endTime?: string
  note?: string
  createdDate: string
  uploads: Array<{ id: string; url: string; fileType?: string }>
  relatedRouteTask?: {
    id: string
    status: number
    startTime?: string
    notes?: string
  }
}
export interface TaskHistoryActor {
  firstName?: string | null
  lastName?: string | null
}

export interface TaskHistoryItem {
  id: string
  status: number
  actor?: TaskHistoryActor | null
  startTime?: string | null
  endTime?: string | null
  notes?: string | null
}


