/**
 * Service layer for HOSRule API operations
 * Follows SOLID principles - Single Responsibility: handles all API calls for HOSRules
 */

import { useApi } from '@/composables/useAxiosService'
import { ApiEndpoints } from '@/api/endpoints'
import type {
  HOSRuleResponse,
  HOSRuleRequest,
  HOSRuleListResponse,
} from '../types'

class HOSRuleService {
  private api = useApi()

  /**
   * Get paginated list of HOS rules
   */
  async getHOSRules(params?: {
    pageNumber?: number
    pageSize?: number
    search?: string
    sortKey?: string
    sortOrder?: string
  }): Promise<HOSRuleListResponse> {
    const response = await this.api.get<HOSRuleListResponse>(
      ApiEndpoints.HOS_RULE_URL,
      { params }
    )
    return response.data
  }

  /**
   * Create a new HOS rule
   */
  async createHOSRule(data: HOSRuleRequest): Promise<void> {
    await this.api.post(
      ApiEndpoints.HOS_RULE_URL,
      data,
      {
        _showSuccessToast: true,
        _successMessage: 'HOS rule created successfully',
      }
    )
  }

  /**
   * Update an existing HOS rule
   */
  async updateHOSRule(id: string, data: HOSRuleRequest): Promise<void> {
    await this.api.put(
      `${ApiEndpoints.HOS_RULE_URL}/${id}`,
      data,
      {
        _showSuccessToast: true,
        _successMessage: 'HOS rule updated successfully',
      }
    )
  }

  /**
   * Delete a HOS rule
   */
  async deleteHOSRule(id: string): Promise<void> {
    await this.api.delete(
      `${ApiEndpoints.HOS_RULE_URL}/${id}`,
      {
        _showSuccessToast: true,
        _successMessage: 'HOS rule deleted successfully',
      }
    )
  }
}

// Export singleton instance
export const hosRuleService = new HOSRuleService()
