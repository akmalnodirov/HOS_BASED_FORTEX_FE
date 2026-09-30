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

export interface ServiceProviderResponse {
  id: string
  name: string
}

export interface CarrierTerminalApiResponse {
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

export interface CarrierDriverLogSetting {
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

export interface CarrierApiResponse {
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
  carrierTerminals: CarrierTerminalApiResponse[]
  carrierDriverLogSetting: CarrierDriverLogSetting | null
  provider: ServiceProviderResponse
}

// ============ API Request Types ============

export interface CarrierTerminalRequest {
  id?: string | null
  timeZoneId: string
  street: string
  city: string
  zipCode: string
  issuerStateId: string
}

export interface DriverLogSettingsRequest {
  exemptDriver?: boolean | null
  hosRuleId?: string | null
  cargoTypeId?: string | null
  restartId?: string | null
  restBreakId?: string | null
  shortHaulException?: boolean | null
  allowYardMoves?: boolean | null
  allowPersonalUse?: boolean | null
  startingTime24HourPeriod: string | null
  allowIFTA: boolean
  allowTracking: boolean
  isAllowedSleep: boolean
}

export interface CarrierRequest {
  providerId: string
  name: string
  usdotNumber: string
  timeZoneId: string
  phoneNumber: string
  email: string
  street: string
  city: string
  zipCode: string
  issuerStateId: string
  carrierTerminals: CarrierTerminalRequest[]
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
  carrierId: string
  carrierName: string
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
  // Carrier Settings
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
  // Provider
  providerId: string
  // Terminals
  terminals: Terminal[]
}

export interface CompanyFormData {
  carrierName: string
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
  // Carrier Settings
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
