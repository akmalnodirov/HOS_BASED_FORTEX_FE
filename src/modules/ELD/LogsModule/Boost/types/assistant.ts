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
  confirmation?: unknown | null
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
