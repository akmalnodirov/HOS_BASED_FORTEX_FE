import { Dayjs } from 'dayjs';

/**
 * Message type for events
 */
export type MessageType = 'error' | 'warning' | 'info' | null;

/**
 * Event code description types
 */
export type EventCodeDescription = 
  | 'DS_OFF' | 'DS_SB' | 'DS_D' | 'DS_ON' | 'DS_WT'
  | 'DR_IND_YM' | 'DR_LOGIN' | 'DR_IND_PC' | 'DR_LOGOUT' | 'DR_IND_CLEARED'
  | 'ELD_DIAG_CLEARED' | 'ELD_DIAG' | 'ELD_MALF_CLEARED' | 'ELD_MALF'
  | 'ENG_DOWN_REDUCED' | 'ENG_DOWN_NORMAL' | 'ENG_UP_REDUCED' | 'ENG_UP_NORMAL'
  | 'INTER_REDUCED_PERCISION' | 'INTER_NORMAL_PRECISION'
  | 'DR_CERT_1' | 'DR_CERT_2' | 'DR_CERT_3' | 'DR_CERT_4' | 'DR_CERT_5'
  | 'DR_CERT_6' | 'DR_CERT_7' | 'DR_CERT_8' | 'DR_CERT_9'
  | string;

/**
 * Base event interface for ELD events
 */
export interface EldEvent {
  id: string;
  sequenceId?: number;
  eventType: number;
  eventCode: number;
  eventCodeDescription: EventCodeDescription;
  dateTime: string | Dayjs;
  certifiedDate?: string | Dayjs;
  calculatedLocation?: string;
  manualLocation?: string;
  latitude?: number;
  longitude?: number;
  totalVehicleMiles?: number;
  odometer?: number;
  totalEngineHours?: number;
  duration?: number;
  annotation?: string;
  
  // Message fields (will be added by validators)
  messageType?: MessageType;
  errorMessages?: string[];
  errorTitles?: string[];
  warningMessages?: string[];
  warningTitles?: string[];
}

/**
 * Pin time interface for power up/shut down and PTI checks
 */
export interface PinTime {
  date: string | Dayjs;
  time?: string;
  [key: string]: any;
}

/**
 * Event validator interface - Single Responsibility Principle
 */
export interface IEventValidator {
  validate(events: EldEvent[], ...args: any[]): void;
}

/**
 * Message handler interface - Interface Segregation Principle
 */
export interface IMessageHandler {
  addError(event: EldEvent, title: string, ...messages: string[]): void;
  addWarning(event: EldEvent, title: string, ...messages: string[]): void;
}
