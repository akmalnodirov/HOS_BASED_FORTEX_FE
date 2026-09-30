/**
 * Service layer for Restart API operations
 * Follows SOLID principles - Single Responsibility: handles all API calls for Restarts
 */

import { useApi } from '@/composables/useAxiosService'
import { ApiEndpoints } from '@/api/endpoints'
import type {
  RestartResponse,
  RestartRequest,
  RestartListResponse,
} from '../types'

class RestartService {
  private api = useApi()

  /**
   * Get paginated list of restarts
   */
  async getRestarts(params?: {
    pageNumber?: number
    pageSize?: number
    search?: string
    sortKey?: string
    sortOrder?: string
  }): Promise<RestartListResponse> {
    const response = await this.api.get<RestartListResponse>(
      ApiEndpoints.RESTART_URL,
      { params }
    )
    return response.data
  }

  /**
   * Create a new restart
   */
  async createRestart(data: RestartRequest): Promise<void> {
    await this.api.post(
      ApiEndpoints.RESTART_URL,
      data,
      {
        _showSuccessToast: true,
        _successMessage: 'Restart created successfully',
      }
    )
  }

  /**
   * Update an existing restart
   */
  async updateRestart(id: string, data: RestartRequest): Promise<void> {
    await this.api.put(
      `${ApiEndpoints.RESTART_URL}/${id}`,
      data,
      {
        _showSuccessToast: true,
        _successMessage: 'Restart updated successfully',
      }
    )
  }

  /**
   * Delete a restart
   */
  async deleteRestart(id: string): Promise<void> {
    await this.api.delete(
      `${ApiEndpoints.RESTART_URL}/${id}`,
      {
        _showSuccessToast: true,
        _successMessage: 'Restart deleted successfully',
      }
    )
  }
}

// Export singleton instance
export const restartService = new RestartService()
