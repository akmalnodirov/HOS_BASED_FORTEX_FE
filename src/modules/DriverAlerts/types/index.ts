import type { SortOrder } from '@/utils/sort'

export type DutyStatusKey = 'sleep' | 'driving' | 'off' | 'pc' | 'on' | 'ym' | 'unknown'

export interface AlertDriver {
  id: string
  name: string
  unit: string
  odometer: number | null
  updatedAt: number | null
  status: DutyStatusKey
  statusLabel: string
}

export enum AlertMusicType {
  Thunder = 0,
  Noisy = 1,
  Loud = 2,
  HighVolume = 3,
  Silent = 4,
}

export interface AlertSound {
  type: AlertMusicType
  label: string
  bars: number
  src: string | null
}

export interface DriverAlertRequest {
  driverId: string
  dateTime: string
  musicType: AlertMusicType
}

export type SortKey = 'name' | 'unit' | 'odometer' | 'updatedAt' | 'statusLabel'
export type { SortOrder }
