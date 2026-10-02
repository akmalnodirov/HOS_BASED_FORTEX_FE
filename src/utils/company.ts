/**
 * Utility functions for managing companyId and timezone in localStorage
 */

const COMPANY_ID_KEY = 'companyId'
const COMPANY_TIMEZONE_KEY = 'company_timezoneid'

/**
 * Get companyId from localStorage
 * @returns companyId string or null if not found
 */
export function getCompanyId(): string | null {
  return localStorage.getItem(COMPANY_ID_KEY)
}

/**
 * Set companyId to localStorage
 * @param companyId - The carrier ID to store
 */
export function setCompanyId(companyId: string): void {
  localStorage.setItem(COMPANY_ID_KEY, companyId)
}

/**
 * Remove companyId from localStorage
 */
export function removeCompanyId(): void {
  localStorage.removeItem(COMPANY_ID_KEY)
}

/**
 * Get companyId from localStorage or throw error if not found
 * @returns companyId string
 * @throws Error if companyId is not found
 */
export function getCompanyIdOrThrow(): string {
  const companyId = getCompanyId()
  if (!companyId) {
    throw new Error('Company ID not found in localStorage')
  }
  return companyId
}

/**
 * Get carrier timezone from localStorage
 * @returns timezone IANA ID string or null if not found
 */
export function getCompanyTimeZoneId(): string | null {
  return localStorage.getItem(COMPANY_TIMEZONE_KEY)
}

/**
 * Set carrier timezone to localStorage
 * @param ianaId - The IANA timezone ID (e.g., 'America/Chicago')
 */
export function setCompanyTimeZoneId(ianaId: string): void {
  localStorage.setItem(COMPANY_TIMEZONE_KEY, ianaId)
}

/**
 * Remove carrier timezone from localStorage
 */
export function removeCompanyTimeZoneId(): void {
  localStorage.removeItem(COMPANY_TIMEZONE_KEY)
}
