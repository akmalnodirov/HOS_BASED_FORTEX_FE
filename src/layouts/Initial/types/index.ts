// src/types/company.ts
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
