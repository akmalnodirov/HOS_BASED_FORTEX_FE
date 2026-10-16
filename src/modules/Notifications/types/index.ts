export type NotificationType = 'station' | 'alpr' | 'violation' | 'speed'

export interface NotificationItem {
  id: string
  type: NotificationType
  driverName: string
  companyName: string | null
  title: string
  detail: string
  location: string | null
  occurredAt: string
  resolvedAt: string | null
  isRead: boolean
  latitude: number | null
  longitude: number | null
  targetLatitude: number | null
  targetLongitude: number | null
  targetLocation: string | null
  targetRows: { label: string; value: string | number | null | undefined }[]
}
