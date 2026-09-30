/**
 * Service layer for VehicleFuel API operations
 * Follows SOLID principles - Single Responsibility: handles all API calls for VehicleFuels
 */

import { useApi } from '@/composables/useAxiosService'
import { ApiEndpoints } from '@/api/endpoints'
import type {
  VehicleFuelResponse,
  VehicleFuelRequest,
  VehicleFuelListResponse,
} from '../types'

class VehicleFuelService {
  private api = useApi()

  /**
   * Get paginated list of vehicle fuels
   */
  async getVehicleFuels(params?: {
    pageNumber?: number
    pageSize?: number
    search?: string
    sortKey?: string
    sortOrder?: string
  }): Promise<VehicleFuelListResponse> {
    const response = await this.api.get<VehicleFuelListResponse>(
      ApiEndpoints.VEHICLE_FUEL_URL,
      { params }
    )
    return response.data
  }

  /**
   * Create a new vehicle fuel
   */
  async createVehicleFuel(data: VehicleFuelRequest): Promise<void> {
    await this.api.post(
      ApiEndpoints.VEHICLE_FUEL_URL,
      data,
      {
        _showSuccessToast: true,
        _successMessage: 'Vehicle fuel created successfully',
      }
    )
  }

  /**
   * Update an existing vehicle fuel
   */
  async updateVehicleFuel(id: string, data: VehicleFuelRequest): Promise<void> {
    await this.api.put(
      `${ApiEndpoints.VEHICLE_FUEL_URL}/${id}`,
      data,
      {
        _showSuccessToast: true,
        _successMessage: 'Vehicle fuel updated successfully',
      }
    )
  }

  /**
   * Delete a vehicle fuel
   */
  async deleteVehicleFuel(id: string): Promise<void> {
    await this.api.delete(
      `${ApiEndpoints.VEHICLE_FUEL_URL}/${id}`,
      {
        _showSuccessToast: true,
        _successMessage: 'Vehicle fuel deleted successfully',
      }
    )
  }
}

// Export singleton instance
export const vehicleFuelService = new VehicleFuelService()
