import type { SortOrder } from '@/utils/sort'

export interface Alert {
  id: number
  driverName: string
  unit: string
  odometer: string
  updatedTime: string
  event: string
}

export interface AlertMessage {
  id: string
  type: 'Silent' | 'High volume' | 'Loud' | 'Noisy' | 'Thunder'
  time: string
}

export type SortKey = keyof Alert
export type VolumeType = 'Silent' | 'High volume' | 'Loud' | 'Noisy' | 'Thunder'
