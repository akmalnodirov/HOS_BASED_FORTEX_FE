/**
 * Service layer for IssuerState API operations
 * Follows SOLID principles - Single Responsibility: handles all API calls for IssuerState
 */

import { useApi } from '@/composables/useAxiosService'
import { ApiEndpoints } from '@/api/endpoints'
import type {
  IssuerStateResponse,
  IssuerStateRequest,
  IssuerStateListResponse,
  IssuerStateParentListResponse,
} from '../types'

class IssuerStateService {
  private api = useApi()

  /**
   * Get paginated list of issuer states
   */
  async getIssuerStates(params?: {
    pageNumber?: number
    pageSize?: number
    search?: string
    sortKey?: string
    sortOrder?: string
  }): Promise<IssuerStateListResponse> {
    const response = await this.api.get<IssuerStateListResponse>(
      ApiEndpoints.ISSUER_STATE_URL,
      { params }
    )
    return response.data
  }

  /**
   * Get parent issuer states (for dropdown/select)
   */
  async getParentIssuerStates(): Promise<IssuerStateParentListResponse> {
    const response = await this.api.get<IssuerStateParentListResponse>(
      ApiEndpoints.ISSUER_STATE_PARENT_URL
    )
    return response.data
  }

  /**
   * Create a new issuer state
   */
  async createIssuerState(data: IssuerStateRequest): Promise<void> {
    await this.api.post(
      ApiEndpoints.ISSUER_STATE_URL,
      data,
      {
        _showSuccessToast: true,
        _successMessage: 'Issuer state created successfully',
      }
    )
  }

  /**
   * Update an existing issuer state
   */
  async updateIssuerState(id: string, data: IssuerStateRequest): Promise<void> {
    await this.api.put(
      `${ApiEndpoints.ISSUER_STATE_URL}/${id}`,
      data,
      {
        _showSuccessToast: true,
        _successMessage: 'Issuer state updated successfully',
      }
    )
  }

  /**
   * Delete an issuer state
   */
  async deleteIssuerState(id: string): Promise<void> {
    await this.api.delete(
      `${ApiEndpoints.ISSUER_STATE_URL}/${id}`,
      {
        _showSuccessToast: true,
        _successMessage: 'Issuer state deleted successfully',
      }
    )
  }
}

// Export singleton instance
export const issuerStateService = new IssuerStateService()
