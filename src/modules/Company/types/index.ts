// ============ API Response Types ============

export interface TimeZoneInfoResponse {
  id: string
  offset: number
  displayName: string
  daylightName: string
  shortName: string
  ianaId: string
}

export interface IssuerStateResponse {
  id: string
  name: string
  parentId: string | null
  stateCode: string
}

export interface ClientResponse {
  id: string
  name: string
}

export interface CompanyTerminalApiResponse {
  id: string
  timeZoneInfo: TimeZoneInfoResponse
  street: string
  city: string
  zipCode: string
  issuerState: IssuerStateResponse
}

export interface NamedEntity {
  id: string
  name: string
}

export interface CompanyDriverLogSetting {
  id: string
  exemptDriver: boolean
  hosRule: NamedEntity | null
  cargoType: NamedEntity | null
  restart: NamedEntity | null
  restBreak: NamedEntity | null
  shortHaulException: boolean
  allowYardMoves: boolean
  allowPersonalUse: boolean
  startingTime24HourPeriod: string | null
  allowIFTA: boolean
  allowTracking: boolean
  isAllowedSleep: boolean
}

export interface CompanyApiResponse {
  id: string
  name: string
  usdotNumber: string
  phoneNumber: string
  email: string
  street: string | null
  city: string | null
  zipCode: string | null
  issuerState: IssuerStateResponse
  timeZoneInfo: TimeZoneInfoResponse
  carrierTerminals: CompanyTerminalApiResponse[]
  carrierDriverLogSetting: CompanyDriverLogSetting | null
  provider: ClientResponse
}

// ============ API Request Types ============

export interface CompanyTerminalRequest {
  id?: string | null
  timeZoneId: string
  street: string
  city: string
  zipCode: string
  issuerStateId: string
}

export interface DriverLogSettingsRequest {
  exemptDriver?: boolean | null
  hosRuleId: string
  cargoTypeId: string
  restartId: string
  restBreakId: string
  shortHaulException?: boolean | null
  allowYardMoves?: boolean | null
  allowPersonalUse?: boolean | null
  startingTime24HourPeriod: string | null
  allowIFTA: boolean
  allowTracking: boolean
  isAllowedSleep: boolean
}

export interface CompanyRequest {
  clientId: string
  name: string
  usdotNumber: string
  timeZoneId: string
  phoneNumber: string
  email: string
  street: string
  city: string
  zipCode: string
  issuerStateId: string
  carrierTerminals: CompanyTerminalRequest[]
  carrierDriverLogSetting: DriverLogSettingsRequest | null
}

// ============ UI Display Types ============

export interface Terminal {
  id: string
  name: string
  timeZone: string
  timeZoneId: string
  address: string
  address2?: string
  country: string
  countryId: string
  state: string
  stateId: string
  cityCode: string
  zipCode?: string
  periodStartingTime?: string
}

export interface Company {
  id: string
  companyId: string
  companyName: string
  dotNumber: string
  timeZone: string
  timeZoneId: string
  phoneNumber: string
  email: string
  address: string
  address2?: string
  country: string
  countryId: string
  state: string
  stateId: string
  cityCode: string
  zipCode: string
  // Company Settings
  exemptDriver: boolean
  periodStartingTime: string
  hosRoles: string
  hosRuleId: string
  cargoType: string
  cargoTypeId: string
  restart: string
  restartId: string
  restBreak: string
  restBreakId: string
  shortHaulException: boolean
  allowPersonalUse: boolean
  allowYardMoves: boolean
  unlimitedShippingDocs: boolean
  unlimitedTrailer: boolean
  isAllowedSleep: boolean
  // Plan Features
  allowTracking: boolean
  allowIFTA: boolean
  // Client
  clientId: string
  // Terminals
  terminals: Terminal[]
}

export interface CompanyFormData {
  companyName: string
  dotNumber: string
  timeZone: string
  timeZoneId: string
  phoneNumber: string
  email: string
  address: string
  address2?: string
  country: string
  countryId: string
  state: string
  stateId: string
  cityCode: string
  zipCode: string
  // Company Settings
  exemptDriver: boolean
  periodStartingTime: string
  hosRoles: string
  hosRuleId: string
  cargoType: string
  cargoTypeId: string
  restart: string
  restartId: string
  restBreak: string
  restBreakId: string
  shortHaulException: boolean
  allowPersonalUse: boolean
  allowYardMoves: boolean
  unlimitedShippingDocs: boolean
  unlimitedTrailer: boolean
  isAllowedSleep: boolean
  // Plan Features
  allowTracking: boolean
  allowIFTA: boolean
}

export interface TerminalFormData {
  name: string
  timeZone: string
  timeZoneId: string
  address: string
  address2?: string
  country: string
  countryId: string
  state: string
  stateId: string
  cityCode: string
  zipCode?: string
  periodStartingTime?: string
}
