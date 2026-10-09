import type { SortOrder } from '@/utils/sort'

export interface DotInspection {
  id: string
  driverId: string
  driverName: string
  companyId: string
  companyName: string
  fromDate: string
  toDate: string
  description: string | null
  isEnabled: boolean
  createdAt: string
}

export interface RouteEldDriverOption {
  id: string
  externalCompanyId: string
  externalCompanyName: string
  externalDriverId: string
  displayName: string
  email: string | null
  phoneNumber: string | null
}

export interface CreateDotInspectionRequest {
  driverId: string
  fromDate: string
  toDate: string
  description: string | null
}

export type DotInspectionStatusFilter = 'all' | 'enabled' | 'disabled'
export type DotInspectionSortKey =
  'driverName' | 'fromDate' | 'toDate' | 'description' | 'isEnabled' | 'createdAt'
export type { SortOrder }
