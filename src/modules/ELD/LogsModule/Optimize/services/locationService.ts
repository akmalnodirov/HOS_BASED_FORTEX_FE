import type { OptimizeEditStatus } from '../types/optimize'

/**
 * Location Service
 * Handles location-related operations (copy/paste coordinates)
 * Following Single Responsibility Principle
 */
export class LocationService {
  /**
   * Copy latitude and longitude to clipboard
   */
  static async copyLongLat(editStatus: OptimizeEditStatus): Promise<boolean> {
    try {
      if (!editStatus.latitude || !editStatus.longitude) {
        throw new Error('No coordinates to copy')
      }

      const coordinates = `${editStatus.latitude}, ${editStatus.longitude}`
      await navigator.clipboard.writeText(coordinates)
      return true
    } catch (error) {
      console.error('Failed to copy coordinates:', error)
      return false
    }
  }

  /**
   * Paste latitude and longitude from clipboard
   */
  static async pasteLongLat(editStatus: OptimizeEditStatus): Promise<boolean> {
    try {
      const text = await navigator.clipboard.readText()
      const coordinates = text.split(',').map((coord) => coord.trim())

      if (coordinates.length !== 2) {
        throw new Error('Invalid coordinates format. Expected: latitude, longitude')
      }

      const latitude = parseFloat(coordinates[0])
      const longitude = parseFloat(coordinates[1])

      if (isNaN(latitude) || isNaN(longitude)) {
        throw new Error('Invalid coordinate values')
      }

      // Validate latitude range (-90 to 90)
      if (latitude < -90 || latitude > 90) {
        throw new Error('Latitude must be between -90 and 90')
      }

      // Validate longitude range (-180 to 180)
      if (longitude < -180 || longitude > 180) {
        throw new Error('Longitude must be between -180 and 180')
      }

      editStatus.latitude = latitude
      editStatus.longitude = longitude

      return true
    } catch (error) {
      console.error('Failed to paste coordinates:', error)
      return false
    }
  }

  /**
   * Format coordinates for display
   */
  static formatCoordinates(latitude: number | string | null, longitude: number | string | null): string {
    if (!latitude || !longitude) return 'N/A'
    return `${Number(latitude).toFixed(6)}, ${Number(longitude).toFixed(6)}`
  }

  /**
   * Validate coordinates
   */
  static isValidCoordinates(latitude: number | string | null, longitude: number | string | null): boolean {
    if (!latitude || !longitude) return false

    const lat = Number(latitude)
    const lng = Number(longitude)

    return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
  }
}
