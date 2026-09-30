import { EldEvent, IEventValidator, PinTime } from '@/types/events'
import { loginLogoutValidator } from './validators/LoginLogoutValidator'
import { engineHoursLoginLogoutValidator } from './validators/EngineHoursLoginLogoutValidator'
import { certificationValidator } from './validators/CertificationValidator'
import { engineHoursValidator } from './validators/EngineHoursValidator'
import { incorrectEventPlacementValidator } from './validators/IncorrectEventPlacementValidator'
import { intermediateMissingValidator } from './validators/IntermediateMissingValidator'
import { odometerValidator, odometerJumpLocationValidator } from './validators/OdometerValidator'
import { powerUpShutDownValidator } from './validators/PowerUpShutDownValidator'
import { ptiCheckValidator } from './validators/PtiCheckValidator'
import { speedLimitValidator } from './validators/SpeedLimitValidator'
import { twoIdenticalEventsValidator } from './validators/TwoIdenticalEventsValidator'

/**
 * Event normalization service
 * Orchestrates all validators following the Single Responsibility Principle
 * Each validator is responsible for one specific type of validation
 *
 * This service follows SOLID principles:
 * - Single Responsibility: Each validator handles one type of validation
 * - Open/Closed: New validators can be added without modifying existing code
 * - Liskov Substitution: All validators implement IEventValidator interface
 * - Interface Segregation: Simple, focused IEventValidator interface
 * - Dependency Inversion: Depends on abstractions (IEventValidator) not concrete classes
 */
class EventNormalizationService {
  private validators: IEventValidator[] = []
  private validatorsWithPinTimes: Array<{
    validator: IEventValidator
    requiresPinTimes: boolean
  }> = []

  constructor() {
    this.initializeValidators()
  }

  /**
   * Initialize all validators in the correct order
   * Order matters for some validations
   */
  private initializeValidators(): void {
    // Validators that don't require pin times
    this.validators = [
      loginLogoutValidator,
      engineHoursLoginLogoutValidator,
      certificationValidator,
      engineHoursValidator,
      incorrectEventPlacementValidator,
      intermediateMissingValidator,
      odometerValidator,
      odometerJumpLocationValidator,
      speedLimitValidator,
      twoIdenticalEventsValidator,
    ]

    // Validators that require pin times
    this.validatorsWithPinTimes = [
      { validator: powerUpShutDownValidator, requiresPinTimes: true },
      { validator: ptiCheckValidator, requiresPinTimes: true },
    ]
  }

  /**
   * Collect warnings and errors for all events
   * @param events - Array of events to validate
   * @param pinTimes - Optional array of pin times for certain validators
   * @returns Modified events array with errors and warnings
   */
  collectEventWarningAndErrors(events: EldEvent[], pinTimes: PinTime[] = []): EldEvent[] {
    try {
      console.time('collectEventWarningAndErrors')

      // Run validators that don't require pin times
      this.validators.forEach((validator) => {
        const validatorName = validator.constructor.name
        console.time(validatorName)
        validator.validate(events)
        console.timeEnd(validatorName)
      })

      // Run validators that require pin times
      this.validatorsWithPinTimes.forEach(({ validator, requiresPinTimes }) => {
        const validatorName = validator.constructor.name
        console.time(validatorName)

        if (requiresPinTimes) {
          validator.validate(events, pinTimes)
        } else {
          validator.validate(events)
        }

        console.timeEnd(validatorName)
      })

      console.timeEnd('collectEventWarningAndErrors')
      return events
    } catch (error) {
      console.error('Error collecting warnings and errors:', error)
      throw error
    }
  }

  /**
   * Add a custom validator
   * Follows Open/Closed Principle - open for extension
   * @param validator - Custom validator implementing IEventValidator
   */
  addValidator(validator: IEventValidator): void {
    this.validators.push(validator)
  }

  /**
   * Remove a validator by type
   * @param validatorType - Constructor of the validator to remove
   */
  removeValidator(validatorType: new () => IEventValidator): void {
    this.validators = this.validators.filter((v) => !(v instanceof validatorType))
  }

  /**
   * Get all registered validators
   * @returns Array of validator names
   */
  getValidators(): string[] {
    return [
      ...this.validators.map((v) => v.constructor.name),
      ...this.validatorsWithPinTimes.map(({ validator }) => validator.constructor.name),
    ]
  }
}

// Export singleton instance
const eventNormalizationService = new EventNormalizationService()

/**
 * Main function to collect event warnings and errors
 * @param events - Array of events to validate
 * @param pinTimes - Optional array of pin times
 * @returns Modified events array with errors and warnings
 */
export function collectEventWarningAndErrors(
  events: EldEvent[],
  pinTimes: PinTime[] = []
): EldEvent[] {
  return eventNormalizationService.collectEventWarningAndErrors(events, pinTimes)
}

// Export the service for advanced use cases
export { eventNormalizationService, EventNormalizationService }

// Export all validators for direct use if needed
export * from './validators/LoginLogoutValidator'
export * from './validators/EngineHoursLoginLogoutValidator'
export * from './validators/CertificationValidator'
export * from './validators/EngineHoursValidator'
export * from './validators/IncorrectEventPlacementValidator'
export * from './validators/IntermediateMissingValidator'
export * from './validators/OdometerValidator'
export * from './validators/PowerUpShutDownValidator'
export * from './validators/PtiCheckValidator'
export * from './validators/SpeedLimitValidator'
export * from './validators/TwoIdenticalEventsValidator'

// Export utility functions
export * from './utils/messageHandler'
export * from './utils/dateUtils'
export * from './utils/eventUtils'
