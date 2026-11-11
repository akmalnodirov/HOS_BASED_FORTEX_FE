import type {
  RouteEldAssistantAction,
  RouteEldAssistantConfirmation,
  RouteEldAssistantItem,
  RouteEldAssistantTurnStatus,
} from '@/modules/ELD/LogsModule/Boost/types/assistant'

/** Item kinds of the app-wide chat; Navigation (5) is a draft the assistant opened or created. */
export const AssistantItemKind = {
  User: 1,
  Assistant: 2,
  Action: 3,
  RepairOptions: 4,
  Navigation: 5,
} as const

export type AssistantPage = 'logs' | 'driverLog' | 'boost' | 'ai' | 'other'

/** What the user is looking at when a message is sent; the server checks every id. */
export interface AssistantFocusRequest {
  page: AssistantPage
  companyId: string | null
  driverId: string | null
  fromDate: string | null
  toDate: string | null
  sessionId: string | null
  tabId: string | null
  selectedEventId: string | null
}

/** The focus a turn worked on, as the server validated it; it moves when the assistant opens a draft. */
export interface AssistantFocusResponse extends AssistantFocusRequest {
  driverName: string | null
}

export interface AssistantNavigation {
  driverId: string
  sessionId: string
  tabId: string
  fromDate: string
  toDate: string
}

/** A submit or rollback an approved card started; the app follows it like the Boost buttons do. */
export interface AssistantSessionOperation {
  id: string
  sessionId: string
  operationType: 'SUBMIT' | 'ROLLBACK'
}

/** An action item; navigation is the draft tab the action concerned (an optimize preview tab, for example). */
export interface AssistantAction extends RouteEldAssistantAction {
  navigation?: AssistantNavigation | null
  operation?: AssistantSessionOperation | null
}

export interface AssistantItem extends Omit<RouteEldAssistantItem, 'action'> {
  action: AssistantAction | null
  navigation?: AssistantNavigation | null
}

export interface AssistantConfirmation extends RouteEldAssistantConfirmation {
  isAttestationRequired?: boolean
  canApply?: boolean
  /** The draft tab the card concerns, such as the optimize preview tab it made its changes on. */
  navigation?: AssistantNavigation | null
}

export interface AssistantTurn {
  conversationId: string
  turnId: string
  status: RouteEldAssistantTurnStatus
  errorMessage?: string | null
  items: AssistantItem[]
  confirmation?: AssistantConfirmation | null
  focus?: AssistantFocusResponse | null
}

export interface AssistantConversation {
  id: string
  title: string
  items: AssistantItem[]
  openTurn?: AssistantTurn | null
}

export interface AssistantStartTurnRequest {
  clientTurnId: string
  text: string
  locale?: string | null
  focus: AssistantFocusRequest
}

export interface AssistantDecisionRequest {
  confirmationId: string
  approve: boolean
  factualAttestation: boolean
}

export const CONVERSATION_FULL_CODE = 'Assistant.Correction.ConversationFull'
