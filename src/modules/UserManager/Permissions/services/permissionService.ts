/**
 * Service layer for Permission API operations
 * Follows SOLID principles - Single Responsibility: handles all API calls for Permissions
 */

import { useApi } from '@/composables/useAxiosService'
import { ApiEndpoints } from '@/api/endpoints'
import type {
  PermissionResponse,
  PermissionRequest,
  PermissionListResponse,
} from '../types'

class PermissionService {
  private api = useApi()

  /**
   * Get all permissions (no pagination)
   */
  async getPermissions(): Promise<PermissionListResponse> {
    const response = await this.api.get<PermissionListResponse>(
      ApiEndpoints.PERMISSIONS_URL
    )
    return response.data
  }

  /**
   * Create a new permission
   */
  async createPermission(data: PermissionRequest): Promise<void> {
    await this.api.post(
      ApiEndpoints.PERMISSIONS_URL,
      data,
      {
        _showSuccessToast: true,
        _successMessage: 'Permission created successfully',
      }
    )
  }

  /**
   * Update an existing permission
   */
  async updatePermission(id: string, data: PermissionRequest): Promise<void> {
    await this.api.put(
      `${ApiEndpoints.PERMISSIONS_URL}/${id}`,
      data,
      {
        _showSuccessToast: true,
        _successMessage: 'Permission updated successfully',
      }
    )
  }

  /**
   * Delete a permission
   */
  async deletePermission(id: string): Promise<void> {
    await this.api.delete(
      `${ApiEndpoints.PERMISSIONS_URL}/${id}`,
      {
        _showSuccessToast: true,
        _successMessage: 'Permission deleted successfully',
      }
    )
  }
}

// Export singleton instance
export const permissionService = new PermissionService()
