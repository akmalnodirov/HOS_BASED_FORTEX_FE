// Company/Client Types

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

export interface RouteEldCompany {
  id: string
  externalCompanyId: string
  name: string
  dotNumber: string
  isActive: boolean
  lastSyncedAt?: string | null
}

export interface RouteEldCompaniesResponse {
  successResult: RouteEldCompany[]
}

export interface RouteEldCompanyResponse {
  successResult: RouteEldCompany
}

export interface RouteEldCompaniesPageResponse {
  successResult: {
    data: RouteEldCompany[]
    pagination: {
      pageNumber: number
      pageSize: number
      totalCount: number
      totalPages: number
      hasNextPage: boolean
      hasPreviousPage: boolean
    }
  }
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
  clientId: string
  companyId?: string
  usdotNumber?: string
  timeZone?: string
}
