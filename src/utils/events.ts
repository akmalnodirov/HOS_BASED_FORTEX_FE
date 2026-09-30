// ============================================
// Event Types Enum
// ============================================
export enum EventType {
  DutyStatusChange = 1,
  IntermediateLog = 2,
  PersonalUseYardMoves = 3,
  DriverCertification = 4,
  LoginLogout = 5,
  EnginePowerUpShutdown = 6,
  MalfunctionDiagnostic = 7,
}

// ============================================
// Event Codes Enum
// ============================================
export enum EventCode {
  // EventType 1: Duty Status Change
  OffDuty = 1,
  Sleeper = 2,
  Driving = 3,
  OnDuty = 4,

  // EventType 2: Intermediate Log
  IntermediateCLP = 1,
  IntermediateRLP = 2,

  // EventType 3: Personal Use / Yard Moves
  PersonalUseCleared = 0,
  PersonalUse = 1,
  YardMoves = 2,

  // EventType 5: Login/Logout
  Login = 1,
  Logout = 2,

  // EventType 6: Engine Power-up/Shut-down
  EnginePowerUpCLP = 1,
  EnginePowerUpRLP = 2,
  EngineShutdownCLP = 3,
  EngineShutdownRLP = 4,

  // EventType 7: Malfunction/Data Diagnostic
  MalfunctionLogged = 1,
  MalfunctionCleared = 2,
  DataDiagnosticLogged = 3,
  DataDiagnosticCleared = 4,
}

// ============================================
// All Events Definition
// ============================================
export interface EventDefinition {
  key: string
  label: string
  color: string
  badgeClass: string
  eventCode: number
  eventType: number
}

export const allEvents: EventDefinition[] = [
  // EventType 1: Duty Status Change
  {
    key: 'off_duty',
    label: 'Off Duty',
    color: '#A99990',
    badgeClass:
      'bg-gray-100 text-gray-700 dark:bg-secondary dark:text-secondary-foreground border border-gray-200 dark:border-border',
    eventCode: 1,
    eventType: 1,
  },
  {
    key: 'sleeper',
    label: 'Sleeper',
    color: '#5F75B4',
    badgeClass:
      'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400 border border-purple-200 dark:border-purple-800',
    eventCode: 2,
    eventType: 1,
  },
  {
    key: 'driving',
    label: 'Driving',
    color: '#73AE71',
    badgeClass:
      'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 border border-green-200 dark:border-green-800',
    eventCode: 3,
    eventType: 1,
  },
  {
    key: 'on_duty',
    label: 'On Duty',
    color: '#C89D45',
    badgeClass:
      'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800',
    eventCode: 4,
    eventType: 1,
  },

  // EventType 2: Intermediate Log
  {
    key: 'intermediate_clp',
    label: 'Intermediate w/ CLP',
    color: '#06B6D4',
    badgeClass:
      'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800',
    eventCode: 1,
    eventType: 2,
  },
  {
    key: 'intermediate_rlp',
    label: 'Intermediate w/ RLP',
    color: '#06B6D4',
    badgeClass:
      'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800',
    eventCode: 2,
    eventType: 2,
  },

  // EventType 3: Personal Use / Yard Moves
  {
    key: 'personal_use_cleared',
    label: 'Pers.Use Cleared',
    color: '#F59E0B',
    badgeClass:
      'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-300 border border-amber-100 dark:border-amber-900',
    eventCode: 0,
    eventType: 3,
  },
  {
    key: 'personal_use',
    label: 'Personal Use',
    color: '#9E9D9C',
    badgeClass:
      'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800',
    eventCode: 1,
    eventType: 3,
  },
  {
    key: 'yard_moves',
    label: 'Yard Moves',
    color: '#B09152',
    badgeClass:
      'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800',
    eventCode: 2,
    eventType: 3,
  },

  // EventType 4: Driver Certification
  {
    key: 'certification_1',
    label: 'Certification (1)',
    color: '#6366F1',
    badgeClass:
      'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800',
    eventCode: 1,
    eventType: 4,
  },
  {
    key: 'certification_2',
    label: 'Certification (2)',
    color: '#6366F1',
    badgeClass:
      'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800',
    eventCode: 2,
    eventType: 4,
  },
  {
    key: 'certification_3',
    label: 'Certification (3)',
    color: '#6366F1',
    badgeClass:
      'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800',
    eventCode: 3,
    eventType: 4,
  },
  {
    key: 'certification_4',
    label: 'Certification (4)',
    color: '#6366F1',
    badgeClass:
      'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800',
    eventCode: 4,
    eventType: 4,
  },
  {
    key: 'certification_5',
    label: 'Certification (5)',
    color: '#6366F1',
    badgeClass:
      'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800',
    eventCode: 5,
    eventType: 4,
  },
  {
    key: 'certification_6',
    label: 'Certification (6)',
    color: '#6366F1',
    badgeClass:
      'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800',
    eventCode: 6,
    eventType: 4,
  },
  {
    key: 'certification_7',
    label: 'Certification (7)',
    color: '#6366F1',
    badgeClass:
      'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800',
    eventCode: 7,
    eventType: 4,
  },
  {
    key: 'certification_8',
    label: 'Certification (8)',
    color: '#6366F1',
    badgeClass:
      'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800',
    eventCode: 8,
    eventType: 4,
  },
  {
    key: 'certification_9',
    label: 'Certification (>=9)',
    color: '#6366F1',
    badgeClass:
      'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800',
    eventCode: 9,
    eventType: 4,
  },

  // EventType 5: Login/Logout
  {
    key: 'login',
    label: 'Login',
    color: '#14B8A6',
    badgeClass:
      'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400 border border-teal-200 dark:border-teal-800',
    eventCode: 1,
    eventType: 5,
  },
  {
    key: 'logout',
    label: 'Logout',
    color: '#64748B',
    badgeClass:
      'bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-400 border border-slate-200 dark:border-slate-800',
    eventCode: 2,
    eventType: 5,
  },

  // EventType 6: Engine Power-up/Shut-down
  {
    key: 'engine_powerup_clp',
    label: 'Engine Power-up w/ CLP',
    color: '#10B981',
    badgeClass:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800',
    eventCode: 1,
    eventType: 6,
  },
  {
    key: 'engine_powerup_rlp',
    label: 'Engine Power-up w/ RLP',
    color: '#10B981',
    badgeClass:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800',
    eventCode: 2,
    eventType: 6,
  },
  {
    key: 'engine_shutdown_clp',
    label: 'Engine Shut-down w/ CLP',
    color: '#F43F5E',
    badgeClass:
      'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800',
    eventCode: 3,
    eventType: 6,
  },
  {
    key: 'engine_shutdown_rlp',
    label: 'Engine Shut-down w/ RLP',
    color: '#F43F5E',
    badgeClass:
      'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800',
    eventCode: 4,
    eventType: 6,
  },

  // EventType 7: Malfunction/Data Diagnostic
  {
    key: 'malfunction_logged',
    label: 'Malfunc. Logged',
    color: '#EF4444',
    badgeClass:
      'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 border border-red-200 dark:border-red-800',
    eventCode: 1,
    eventType: 7,
  },
  {
    key: 'malfunction_cleared',
    label: 'Malfunc. Cleared',
    color: '#22C55E',
    badgeClass:
      'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-300 border border-green-100 dark:border-green-900',
    eventCode: 2,
    eventType: 7,
  },
  {
    key: 'data_diagnostic_logged',
    label: 'Data Diag. Logged',
    color: '#F97316',
    badgeClass:
      'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400 border border-orange-200 dark:border-orange-800',
    eventCode: 3,
    eventType: 7,
  },
  {
    key: 'data_diagnostic_cleared',
    label: 'Data Diag. Cleared',
    color: '#22C55E',
    badgeClass:
      'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-300 border border-green-100 dark:border-green-900',
    eventCode: 4,
    eventType: 7,
  },
]

// ============================================
// Legacy events array (for backward compatibility)
// ============================================
export const events = allEvents.filter(
  (e) => e.eventType === 1 || (e.eventType === 3 && e.eventCode <= 2)
)

// ============================================
// Event Lookup Functions
// ============================================

/**
 * Find event definition by eventType and eventCode
 */
export const findEventByTypeAndCode = (
  eventType: number,
  eventCode: number
): EventDefinition | undefined => {
  return allEvents.find((event) => event.eventType === eventType && event.eventCode === eventCode)
}

/**
 * Get event key string from eventType and eventCode
 */
export const getEventKey = (eventType: number, eventCode: number): string => {
  const event = findEventByTypeAndCode(eventType, eventCode)
  return event?.key || 'unknown'
}

/**
 * Get event label from eventType and eventCode
 */
export const getEventLabel = (eventType: number, eventCode: number): string => {
  const event = findEventByTypeAndCode(eventType, eventCode)
  return event?.label || 'Unknown'
}

/**
 * Get event badge class from eventType and eventCode
 */
export const getEventBadgeClass = (eventType: number, eventCode: number): string => {
  const event = findEventByTypeAndCode(eventType, eventCode)
  return (
    event?.badgeClass ||
    'bg-gray-100 text-gray-700 dark:bg-secondary dark:text-secondary-foreground border border-gray-200 dark:border-border'
  )
}

/**
 * Get event color from eventType and eventCode
 */
export const getEventColor = (eventType: number, eventCode: number): string => {
  const event = findEventByTypeAndCode(eventType, eventCode)
  return event?.color || '#9CA3AF'
}

// ============================================
// Duty Mapper (for chart/grid calculations)
// ============================================

// TC -> D
// T - Event type
// C - Event Code
// D - Duty number
// TC - decimal number
export const dutyMapper: { [key: number]: number } = {
  31: 6,
  11: 1,
  12: 2,
  13: 3,
  14: 4,
  32: 5,
}

// Yard move come within on duty
// Personal use come within off duty
export const getEventCodeText = (duty: number): string => {
  switch (duty) {
    case 1:
    case 6:
      return 'OffDuty'
    case 2:
      return 'Sleeper'
    case 3:
      return 'Driving'
    case 4:
    case 5:
      return 'OnDuty'
    default:
      return 'Unknown'
  }
}

export const getDutyOrder = (eventType: number, eventCode: number): number => {
  return dutyMapper[10 * eventType + eventCode]
}

// ============================================
// Event Type Check Functions
// ============================================

/**
 * Check if event is a certification event (Type 4)
 */
export const isCertificationEvent = (event: any): boolean => {
  return event?.eventType === EventType.DriverCertification
}

/**
 * Check if event is visible (Duty Status or Personal Use with cleared)
 */
export const isVisibleEvent = (event: any): boolean => {
  return (
    event?.eventType === EventType.DutyStatusChange ||
    (event?.eventType === EventType.PersonalUseYardMoves && event?.eventCode <= 1)
  )
}

/**
 * Check if event is driving or intermediate
 */
export const isDrivingorIntermediateEvent = (event: any): boolean => {
  return isDrivingEvent(event) || isIntermediateEvent(event)
}

/**
 * Check if event is a driving event (Type 1, Code 3)
 */
export const isDrivingEvent = (event: any): boolean => {
  return event?.eventType === EventType.DutyStatusChange && event?.eventCode === EventCode.Driving
}

/**
 * Check if event is an intermediate event (Type 2, Code 1)
 */
export const isIntermediateEvent = (event: any): boolean => {
  return (
    event?.eventType === EventType.IntermediateLog && event?.eventCode === EventCode.IntermediateCLP
  )
}

/**
 * Check if event is a login/logout event (Type 5)
 */
export const isLoginLogoutEvent = (event: any): boolean => {
  return event?.eventType === EventType.LoginLogout
}

/**
 * Check if event is an engine power event (Type 6)
 */
export const isEnginePowerEvent = (event: any): boolean => {
  return event?.eventType === EventType.EnginePowerUpShutdown
}

/**
 * Check if event is a malfunction/diagnostic event (Type 7)
 */
export const isMalfunctionDiagnosticEvent = (event: any): boolean => {
  return event?.eventType === EventType.MalfunctionDiagnostic
}
