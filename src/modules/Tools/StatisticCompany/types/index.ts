export interface CompanyName {
  id: string
  name: string
}

export interface CompanyStatData {
  name: string
  quantity: number
}

export interface Company {
  companyName: string
  totalDrivers: number
  totalSessions: number
  currentActiveDrivers: number
  currentActiveSessions: number
  companyAverage: number
  higherThanLastValue: boolean
  data: CompanyStatData[]
}

export interface CompanyNamesResponse {
  successResult: CompanyName[]
}

export interface CompaniesStatisticsResponse {
  successResult: {
    data: Company[]
  }
}

export interface CompanyDetailedResponse {
  successResult: Company
}

export interface AdminProvidersResponse {
  successResult: { id: string; name: string }[]
}
