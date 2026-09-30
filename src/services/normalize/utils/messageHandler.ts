import { EldEvent, IMessageHandler } from '@/types/events';

/**
 * Message handler implementation
 * Follows Single Responsibility Principle - only handles adding messages to events
 */
class MessageHandler implements IMessageHandler {
  /**
   * Add error message to an event
   * @param event - The event to add error to
   * @param title - Error title
   * @param messages - Error messages to add
   */
  addError(event: EldEvent, title: string = 'Default Error Title', ...messages: string[]): void {
    event.messageType = 'error';
    event.errorMessages = event.errorMessages || [];
    
    for (const msg of messages) {
      if (!event.errorMessages.includes(msg)) {
        event.errorMessages.push(msg);
      }
    }
    
    event.errorTitles = event.errorTitles || [];
    if (!event.errorTitles.includes(title)) {
      event.errorTitles.push(title);
    }
  }

  /**
   * Add warning message to an event
   * @param event - The event to add warning to
   * @param title - Warning title
   * @param messages - Warning messages to add
   */
  addWarning(event: EldEvent, title: string = 'Default Warning Title', ...messages: string[]): void {
    // Ensure warnings don't overwrite errors
    if (event.messageType !== 'error') {
      event.messageType = 'warning';
    }
    
    event.warningMessages = event.warningMessages || [];
    
    for (const msg of messages) {
      if (!event.warningMessages.includes(msg)) {
        event.warningMessages.push(msg);
      }
    }
    
    event.warningTitles = event.warningTitles || [];
    if (!event.warningTitles.includes(title)) {
      event.warningTitles.push(title);
    }
  }
}

// Export singleton instance
export const messageHandler = new MessageHandler();

// Export helper functions for backward compatibility
export const addErrorMessage = (event: EldEvent, title: string, ...messages: string[]): void => {
  messageHandler.addError(event, title, ...messages);
};

export const addWarningMessage = (event: EldEvent, title: string, ...messages: string[]): void => {
  messageHandler.addWarning(event, title, ...messages);
};
