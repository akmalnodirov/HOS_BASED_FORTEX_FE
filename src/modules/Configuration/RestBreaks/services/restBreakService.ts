/**
 * Service layer for RestBreak API operations
 * Follows SOLID principles - Single Responsibility: handles all API calls for RestBreaks
 */

import { useApi } from '@/composables/useAxiosService'
import { ApiEndpoints } from '@/api/endpoints'
import type {
  RestBreakResponse,
  RestBreakRequest,
  RestBreakListResponse,
} from '../types'

class RestBreakService {
  private api = useApi()

  /**
   * Get paginated list of rest breaks
   */
  async getRestBreaks(params?: {
    pageNumber?: number
    pageSize?: number
    search?: string
    sortKey?: string
    sortOrder?: string
  }): Promise<RestBreakListResponse> {
    const response = await this.api.get<RestBreakListResponse>(
      ApiEndpoints.REST_BREAK_URL,
      { params }
    )
    return response.data
  }

  /**
   * Create a new rest break
   */
  async createRestBreak(data: RestBreakRequest): Promise<void> {
    await this.api.post(
      ApiEndpoints.REST_BREAK_URL,
      data,
      {
        _showSuccessToast: true,
        _successMessage: 'Rest break created successfully',
      }
    )
  }

  /**
   * Update an existing rest break
   */
  async updateRestBreak(id: string, data: RestBreakRequest): Promise<void> {
    await this.api.put(
      `${ApiEndpoints.REST_BREAK_URL}/${id}`,
      data,
      {
        _showSuccessToast: true,
        _successMessage: 'Rest break updated successfully',
      }
    )
  }

  /**
   * Delete a rest break
   */
  async deleteRestBreak(id: string): Promise<void> {
    await this.api.delete(
      `${ApiEndpoints.REST_BREAK_URL}/${id}`,
      {
        _showSuccessToast: true,
        _successMessage: 'Rest break deleted successfully',
      }
    )
  }
}

// Export singleton instance
export const restBreakService = new RestBreakService()
