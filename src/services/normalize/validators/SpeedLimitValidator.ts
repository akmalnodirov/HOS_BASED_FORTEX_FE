import dayjs from 'dayjs';
import { EldEvent, IEventValidator } from '@/types/events';
import { addErrorMessage, addWarningMessage } from '../utils/messageHandler';
import { WARNING_GENERATING_EVENTS } from '../utils/eventUtils';

/**
 * Speed limit validator configuration
 */
interface SpeedLimitConfig {
  speedLimit: number;
  speedMargin: number;
}

/**
 * Speed limit validator
 * Checks for speed limit violations between consecutive events
 * 
 * Single Responsibility: Only validates speed limits
 */
export class SpeedLimitValidator implements IEventValidator {
  private config: SpeedLimitConfig;

  constructor(config: Partial<SpeedLimitConfig> = {}) {
    this.config = {
      speedLimit: config.speedLimit ?? 75, // mph
      speedMargin: config.speedMargin ?? 7, // mph
    };
  }

  /**
   * Validate speed limits between consecutive events
   * @param events - Array of events to validate
   */
  validate(events: EldEvent[]): void {
    for (let i = 0; i < events.length - 1; i++) {
      const currentEvent = events[i];
      const nextEvent = events[i + 1];

      // Validate event statuses
      if (!this.isValidEventPair(currentEvent, nextEvent)) {
        continue;
      }

      // Validate location
      if (!this.hasValidLocation(nextEvent)) {
        continue;
      }

      // Calculate speed
      const speed = this.calculateSpeed(currentEvent, nextEvent);
      if (speed === null) {
        continue;
      }

      // Check for high-speed warnings/errors
      this.checkSpeedViolation(nextEvent, speed);
    }
  }

  /**
   * Check if event pair is valid for speed calculation
   */
  private isValidEventPair(currentEvent: EldEvent, nextEvent: EldEvent): boolean {
    return !!(
      currentEvent &&
      nextEvent &&
      WARNING_GENERATING_EVENTS.includes(currentEvent.eventCodeDescription as any) &&
      WARNING_GENERATING_EVENTS.includes(nextEvent.eventCodeDescription as any)
    );
  }

  /**
   * Check if event has valid location
   */
  private hasValidLocation(event: EldEvent): boolean {
    const locationParts = (event?.calculatedLocation || event?.manualLocation)?.split(',');
    const lastLocationPart = locationParts?.[locationParts.length - 1]?.trim();
    return !!lastLocationPart;
  }

  /**
   * Calculate speed between two events
   * @returns Speed in mph or null if invalid
   */
  private calculateSpeed(currentEvent: EldEvent, nextEvent: EldEvent): number | null {
    const distance = Number(nextEvent.totalVehicleMiles) - Number(currentEvent.totalVehicleMiles);
    const timeDifference = dayjs(nextEvent.dateTime).diff(dayjs(currentEvent.dateTime), 'hour', true);

    if (!distance || !timeDifference) {
      return null;
    }

    return distance / timeDifference;
  }

  /**
   * Check for speed violation and add appropriate message
   */
  private checkSpeedViolation(event: EldEvent, speed: number): void {
    if (speed > this.config.speedLimit) {
      const speedDifference = Math.abs(speed - this.config.speedLimit);
      const isError = speedDifference > this.config.speedMargin;
      const message = `Speed: ${Math.round(speed)}mph, Speed Limit: ${this.config.speedLimit}mph`;

      if (isError) {
        addErrorMessage(event, message);
      } else {
        addWarningMessage(event, message);
      }
    }
  }
}

// Export singleton instance with default config
export const speedLimitValidator = new SpeedLimitValidator();
