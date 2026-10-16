import { useApi } from '@/composables/useAxiosService'
import { ApiEndpoints } from '@/api/endpoints'
import type {
  RoleResponse,
  RoleRequest,
  RoleListResponse,
  PermissionResponse,
} from '../types'

class RoleService {
  private api = useApi()
  async getRoles(params?: {
    pageNumber?: number
    pageSize?: number
    clientId?: string
  }): Promise<RoleListResponse> {
    const response = await this.api.get<RoleListResponse>(
      ApiEndpoints.ROLES_URL,
      { params }
    )
    return response.data
  }

  async getPermissions(): Promise<{ successResult: PermissionResponse[] }> {
    const response = await this.api.get<{ successResult: PermissionResponse[] }>(
      ApiEndpoints.PERMISSIONS_URL
    )
    return response.data
  }

  async createRole(data: RoleRequest): Promise<void> {
    await this.api.post(
      ApiEndpoints.ROLES_URL,
      data,
      {
        _showSuccessToast: true,
        _successMessage: 'Role created successfully',
      }
    )
  }

  async updateRole(id: string, data: RoleRequest): Promise<void> {
    await this.api.put(
      `${ApiEndpoints.ROLES_URL}/${id}`,
      data,
      {
        _showSuccessToast: true,
        _successMessage: 'Role updated successfully',
      }
    )
  }

  async deleteRole(id: string): Promise<void> {
    await this.api.delete(
      `${ApiEndpoints.ROLES_URL}/${id}`,
      {
        _showSuccessToast: true,
        _successMessage: 'Role deleted successfully',
      }
    )
  }

  async assignPermissionsToRole(roleId: string, permissionIds: string[]): Promise<void> {
    await this.api.post(
      `${ApiEndpoints.ROLES_URL}/${roleId}/permissions`,
      { permissionIds },
      {
        _showSuccessToast: true,
        _successMessage: 'Permissions assigned successfully',
      }
    )
  }
}

export const roleService = new RoleService()
