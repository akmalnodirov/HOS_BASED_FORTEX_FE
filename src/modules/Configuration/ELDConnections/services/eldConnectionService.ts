/**
 * Service layer for ELDConnection API operations
 * Follows SOLID principles - Single Responsibility: handles all API calls for ELDConnections
 */

import { useApi } from '@/composables/useAxiosService'
import { ApiEndpoints } from '@/api/endpoints'
import type {
  ELDConnectionResponse,
  ELDConnectionRequest,
  ELDConnectionListResponse,
} from '../types'

class ELDConnectionService {
  private api = useApi()

  /**
   * Get paginated list of ELD connections
   */
  async getELDConnections(params?: {
    pageNumber?: number
    pageSize?: number
    search?: string
    sortKey?: string
    sortOrder?: string
  }): Promise<ELDConnectionListResponse> {
    const response = await this.api.get<ELDConnectionListResponse>(
      ApiEndpoints.ELD_CONNECTION_URL,
      { params }
    )
    return response.data
  }

  /**
   * Create a new ELD connection
   */
  async createELDConnection(data: ELDConnectionRequest): Promise<void> {
    await this.api.post(
      ApiEndpoints.ELD_CONNECTION_URL,
      data,
      {
        _showSuccessToast: true,
        _successMessage: 'ELD connection created successfully',
      }
    )
  }

  /**
   * Update an existing ELD connection
   */
  async updateELDConnection(id: string, data: ELDConnectionRequest): Promise<void> {
    await this.api.put(
      `${ApiEndpoints.ELD_CONNECTION_URL}/${id}`,
      data,
      {
        _showSuccessToast: true,
        _successMessage: 'ELD connection updated successfully',
      }
    )
  }

  /**
   * Delete an ELD connection
   */
  async deleteELDConnection(id: string): Promise<void> {
    await this.api.delete(
      `${ApiEndpoints.ELD_CONNECTION_URL}/${id}`,
      {
        _showSuccessToast: true,
        _successMessage: 'ELD connection deleted successfully',
      }
    )
  }
}

// Export singleton instance
export const eldConnectionService = new ELDConnectionService()
