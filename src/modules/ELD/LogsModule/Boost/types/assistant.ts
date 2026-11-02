export const RouteEldAssistantItemKind = {
  User: 1,
  Assistant: 2,
  Action: 3,
} as const

export type RouteEldAssistantItemKindValue =
  (typeof RouteEldAssistantItemKind)[keyof typeof RouteEldAssistantItemKind]

export type RouteEldAssistantTurnStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'AWAITING_CONFIRMATION'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'EXPIRED'
  | (string & Record<never, never>)

export interface RouteEldAssistantAction {
  toolName: string
  summary: string
  decision: number
  outcome: number
  correction?: RouteEldAssistantCorrectionProposal | null
}

export interface RouteEldAssistantItem {
  id: string
  kind: number
  text: string | null
  createdAt: string
  action: RouteEldAssistantAction | null
}

export interface RouteEldAssistantTurn {
  conversationId: string
  turnId: string
  status: RouteEldAssistantTurnStatus
  errorMessage?: string | null
  items: RouteEldAssistantItem[]
  confirmation?: RouteEldAssistantConfirmation | null
}

export interface RouteEldAssistantConversation {
  id: string
  title: string
  items: RouteEldAssistantItem[]
  openTurn?: RouteEldAssistantTurn | null
}

export interface RouteEldAssistantStartTurnRequest {
  tabId: string
  clientTurnId: string
  text: string
  locale?: string | null
}

export interface RouteEldAssistantCorrectionOperation {
  order: number
  type: 'ShiftTimestamp' | 'DeleteEvent' | 'ChangeToOffDuty'
  eventId: string
  beforeTimestamp: number | null
  afterTimestamp: number | null
  beforeEventCode?: string | null
  afterEventCode?: string | null
  timeZone?: string | null
}

export interface RouteEldAssistantCorrectionPreview {
  repairId: string
  optionId: string
  sessionId: string
  tabId: string
  reason: string
  originalRequest: string
  operations: RouteEldAssistantCorrectionOperation[]
}

export interface RouteEldAssistantConfirmation {
  id: string
  toolName: string
  summary: string
  details: { label: string; value: string }[]
  expiresAt: string
  correction?: RouteEldAssistantCorrectionPreview | null
}

export interface RouteEldAssistantCorrectionProposal {
  id: string
  confirmationId: string
  turnId: string
  status: 'awaitingDriverAcceptance' | 'applied' | 'declined' | 'expired' | 'failed'
  preview: RouteEldAssistantCorrectionPreview
  expiresAt: string
  errorMessage?: string | null
}

export interface RouteEldAssistantDecisionRequest {
  confirmationId: string
  approve: boolean
  factualAttestation: boolean
}
