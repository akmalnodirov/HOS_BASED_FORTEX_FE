/**
 * Service layer for MaintenanceType API operations
 * Follows SOLID principles - Single Responsibility: handles all API calls for MaintenanceTypes
 */

import { useApi } from '@/composables/useAxiosService'
import { ApiEndpoints } from '@/api/endpoints'
import type {
  MaintenanceTypeResponse,
  MaintenanceTypeRequest,
  MaintenanceTypeListResponse,
} from '../types'

class MaintenanceTypeService {
  private api = useApi()

  /**
   * Get paginated list of maintenance types
   */
  async getMaintenanceTypes(params?: {
    pageNumber?: number
    pageSize?: number
    search?: string
    sortKey?: string
    sortOrder?: string
  }): Promise<MaintenanceTypeListResponse> {
    const response = await this.api.get<MaintenanceTypeListResponse>(
      ApiEndpoints.MAINTENANCE_TYPES_URL,
      { params }
    )
    return response.data
  }

  /**
   * Create a new maintenance type
   */
  async createMaintenanceType(data: MaintenanceTypeRequest): Promise<void> {
    await this.api.post(
      ApiEndpoints.MAINTENANCE_TYPES_URL,
      data,
      {
        _showSuccessToast: true,
        _successMessage: 'Maintenance type created successfully',
      }
    )
  }

  /**
   * Update an existing maintenance type
   */
  async updateMaintenanceType(id: string, data: MaintenanceTypeRequest): Promise<void> {
    await this.api.put(
      `${ApiEndpoints.MAINTENANCE_TYPES_URL}/${id}`,
      data,
      {
        _showSuccessToast: true,
        _successMessage: 'Maintenance type updated successfully',
      }
    )
  }

  /**
   * Delete a maintenance type
   */
  async deleteMaintenanceType(id: string): Promise<void> {
    await this.api.delete(
      `${ApiEndpoints.MAINTENANCE_TYPES_URL}/${id}`,
      {
        _showSuccessToast: true,
        _successMessage: 'Maintenance type deleted successfully',
      }
    )
  }
}

// Export singleton instance
export const maintenanceTypeService = new MaintenanceTypeService()
