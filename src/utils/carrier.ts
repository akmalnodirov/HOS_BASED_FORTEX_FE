/**
 * Utility functions for managing carrierId and timezone in localStorage
 */

const CARRIER_ID_KEY = 'carrierId'
const CARRIER_TIMEZONE_KEY = 'carrier_timezoneid'

/**
 * Get carrierId from localStorage
 * @returns carrierId string or null if not found
 */
export function getCarrierId(): string | null {
  return localStorage.getItem(CARRIER_ID_KEY)
}

/**
 * Set carrierId to localStorage
 * @param carrierId - The carrier ID to store
 */
export function setCarrierId(carrierId: string): void {
  localStorage.setItem(CARRIER_ID_KEY, carrierId)
}

/**
 * Remove carrierId from localStorage
 */
export function removeCarrierId(): void {
  localStorage.removeItem(CARRIER_ID_KEY)
}

/**
 * Get carrierId from localStorage or throw error if not found
 * @returns carrierId string
 * @throws Error if carrierId is not found
 */
export function getCarrierIdOrThrow(): string {
  const carrierId = getCarrierId()
  if (!carrierId) {
    throw new Error('Carrier ID not found in localStorage')
  }
  return carrierId
}

/**
 * Get carrier timezone from localStorage
 * @returns timezone IANA ID string or null if not found
 */
export function getCarrierTimeZoneId(): string | null {
  return localStorage.getItem(CARRIER_TIMEZONE_KEY)
}

/**
 * Set carrier timezone to localStorage
 * @param ianaId - The IANA timezone ID (e.g., 'America/Chicago')
 */
export function setCarrierTimeZoneId(ianaId: string): void {
  localStorage.setItem(CARRIER_TIMEZONE_KEY, ianaId)
}

/**
 * Remove carrier timezone from localStorage
 */
export function removeCarrierTimeZoneId(): void {
  localStorage.removeItem(CARRIER_TIMEZONE_KEY)
}
