// Company/Provider Types

export interface TimeZoneInfo {
  id: string
  offset: number
  displayName: string
  daylightName: string
  shortName: string
  ianaId: string
}

export interface Carrier {
  carrierId: string
  name: string
  usdotNumber: string
  phoneNumber: string
  email: string
  timeZoneInfo: TimeZoneInfo
}

export interface Provider {
  providerId: string
  providerName: string
  carriers: Carrier[]
}

export interface ProvidersResponse {
  successResult: Provider[]
}

// Flattened company for table display
export interface CompanyTableItem {
  id: string
  name: string
  email: string
  phone: string
  company: string
  status: 'Active' | 'Inactive'
  createdAt: Date
  // Original data
  providerId: string
  carrierId?: string
  usdotNumber?: string
  timeZone?: string
}