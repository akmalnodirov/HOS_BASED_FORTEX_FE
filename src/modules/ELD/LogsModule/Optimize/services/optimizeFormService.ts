import type { OptimizeEditStatus, OptimizeFormValidationError } from '../types/optimize'

/**
 * Optimize Form Service
 * Handles form validation logic
 * Following Single Responsibility Principle
 */
export class OptimizeFormService {
  /**
   * Validate the optimize status form
   * Returns array of validation errors
   */
  static validateStatusForm(editStatus: OptimizeEditStatus): OptimizeFormValidationError[] {
    const errors: OptimizeFormValidationError[] = []

    // Event validation
    if (!editStatus.event.eventCode || !editStatus.event.eventType) {
      errors.push({
        field: 'event',
        message: 'Event is required',
      })
    }

    // Vehicle validation
    if (!editStatus.vehicleId) {
      errors.push({
        field: 'vehicle',
        message: 'Vehicle is required',
      })
    }

    // Date validation
    if (!editStatus.startDate) {
      errors.push({
        field: 'startDate',
        message: 'Start date is required',
      })
    }

    // Location validation for automatic location origin
    if (editStatus.location_origin === 1) {
      if (!editStatus.latitude || !editStatus.longitude) {
        errors.push({
          field: 'location',
          message: 'Latitude and Longitude are required for automatic location',
        })
      }
    }

    // Location note validation for manual location origin
    if (editStatus.location_origin === 2) {
      if (!editStatus.location_note || editStatus.location_note.trim() === '') {
        errors.push({
          field: 'location_note',
          message: 'Location note is required for manual location',
        })
      }
    }

    // Odometer validation
    if (editStatus.odometer < 0) {
      errors.push({
        field: 'odometer',
        message: 'Odometer must be a positive number',
      })
    }

    // Engine hours validation
    if (editStatus.engine_hours < 0) {
      errors.push({
        field: 'engine_hours',
        message: 'Engine hours must be a positive number',
      })
    }

    return errors
  }

  /**
   * Check if form is valid
   */
  static isFormValid(editStatus: OptimizeEditStatus): boolean {
    return this.validateStatusForm(editStatus).length === 0
  }

  /**
   * Get first error message
   */
  static getFirstError(editStatus: OptimizeEditStatus): string | null {
    const errors = this.validateStatusForm(editStatus)
    return errors.length > 0 ? errors[0].message : null
  }
}
