/**
 * Service layer for CargoType API operations
 * Follows SOLID principles - Single Responsibility: handles all API calls for CargoTypes
 */

import { useApi } from '@/composables/useAxiosService'
import { ApiEndpoints } from '@/api/endpoints'
import type {
  CargoTypeResponse,
  CargoTypeRequest,
  CargoTypeListResponse,
} from '../types'

class CargoTypeService {
  private api = useApi()

  /**
   * Get paginated list of cargo types
   */
  async getCargoTypes(params?: {
    pageNumber?: number
    pageSize?: number
    search?: string
    sortKey?: string
    sortOrder?: string
  }): Promise<CargoTypeListResponse> {
    const response = await this.api.get<CargoTypeListResponse>(
      ApiEndpoints.CARGO_TYPE_URL,
      { params }
    )
    return response.data
  }

  /**
   * Create a new cargo type
   */
  async createCargoType(data: CargoTypeRequest): Promise<void> {
    await this.api.post(
      ApiEndpoints.CARGO_TYPE_URL,
      data,
      {
        _showSuccessToast: true,
        _successMessage: 'Cargo type created successfully',
      }
    )
  }

  /**
   * Update an existing cargo type
   */
  async updateCargoType(id: string, data: CargoTypeRequest): Promise<void> {
    await this.api.put(
      `${ApiEndpoints.CARGO_TYPE_URL}/${id}`,
      data,
      {
        _showSuccessToast: true,
        _successMessage: 'Cargo type updated successfully',
      }
    )
  }

  /**
   * Delete a cargo type
   */
  async deleteCargoType(id: string): Promise<void> {
    await this.api.delete(
      `${ApiEndpoints.CARGO_TYPE_URL}/${id}`,
      {
        _showSuccessToast: true,
        _successMessage: 'Cargo type deleted successfully',
      }
    )
  }
}

// Export singleton instance
export const cargoTypeService = new CargoTypeService()
