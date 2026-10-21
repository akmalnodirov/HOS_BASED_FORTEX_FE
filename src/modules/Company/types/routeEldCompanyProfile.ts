export interface RouteEldCompanyTerminal {
  id: string
  street: string | null
  city: string | null
  stateCode: string | null
  zipCode: string | null
  timeZoneId: string | null
  logStartOffset: number | null
}

export interface RouteEldCompanyProfile {
  externalCompanyId: string
  name: string
  dotNumber: string | null
  street: string | null
  city: string | null
  stateCode: string | null
  zipCode: string | null
  timeZoneId: string | null
  cycleRuleId: string | null
  cargoTypeId: string | null
  restartId: string | null
  restBreakId: string | null
  shortHaulExceptionAllowed: boolean | null
  personalConveyanceAllowed: boolean | null
  yardMovesAllowed: boolean | null
  exemptDriver: boolean | null
  complianceModeId: string | null
  allowTracking: boolean | null
  allowIFTA: boolean | null
  terminals: RouteEldCompanyTerminal[]
}

export interface RouteEldCompanyProfileResponse {
  id: string
  profile: RouteEldCompanyProfile
}
