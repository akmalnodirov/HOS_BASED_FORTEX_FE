// src/types/company.ts
export interface TimeZoneInfo {
  id: string
  offset: number
  displayName: string
  daylightName: string
  shortName: string
  ianaId: string
}

export interface Company {
  companyId: string
  name: string
  usdotNumber: string
  phoneNumber: string
  email: string
  timeZoneInfo: TimeZoneInfo
}

export interface Client {
  clientId: string
  clientName: string
  companies: Company[]
}

export interface ClientsResponse {
  successResult: Client[]
}
