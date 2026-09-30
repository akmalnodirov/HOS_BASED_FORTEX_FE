import type { Dayjs } from 'dayjs'
import type { BoostEventResponse } from '../../Boost/types/boost'

export interface OptimizeEditStatus {
  id: number
  eventId: string
  event: { eventCode: number | null; eventType: number | null }
  startDate: Dayjs
  origin: number
  vehicle: { id: string; unit: string } | null
  vehicles: { id: string; unit: string }[]
  vehicleId: string | null
  odometer: number
  engine_hours: number
  location_origin: number
  latitude: number | string | null
  longitude: number | string | null
  location: string
  location_note: string
  notes: string
  trailer: string | null
  doc: string | null
}

export interface OptimizeEventTableRow {
  id: string
  count: number
  est: string
  event: { eventType: number; eventCode: number }
  duration: string
  location: string
  system: string
  odometer: number
  hours: number
  notes: string
  recordStatus: number
  recordOrigin: number
  status: number
  isDOTInspected?: boolean
  errorTitles?: string[]
  warningTitles?: string[]
  class?: string
}

export interface SelectionPosition {
  parentIndex: number
  childIndex: number
  flatIndex: number
}

export interface BoostSelectedState {
  lastChecked: SelectionPosition | null
  firstChecked: SelectionPosition | null
  selectedOptimizeCategories: { [key: string]: boolean }
  selectAllOptimizeCategories: boolean
  selectedDriver: string
}

export interface OptimizeFormValidationError {
  field: string
  message: string
}

export interface OptimizeNotificationResult {
  failedOptimizations: Array<{ key: string; value: string }>
  fulFilledOptimizations: string[]
}
