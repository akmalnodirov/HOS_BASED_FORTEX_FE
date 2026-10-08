import { useApi } from '@/composables/useAxiosService.ts'
import { ApiEndpoints } from '@/api/endpoints.ts'
import type {
  DriverDailyFormResponse,
  EditDriverDailyFormRequest,
  EditDriverDailyForm,
} from '../types/driverDailyForm.ts'
import type { Dayjs } from 'dayjs'
import { capitalizeKeys } from '@/utils/object.ts'

export class DriverDailyFormService {
  private api = useApi()

  async getDriverDailyFormByDate(
    driverId: string,
    dateTime: Dayjs | string,
    signal?: AbortSignal
  ): Promise<DriverDailyFormResponse | null> {
    try {
      const model = {
        driverId,
        dateTime,
      }

      const response = await this.api.get<{ successResult: DriverDailyFormResponse }>(
        ApiEndpoints.DRIVER_DAILY_FORMS_BY_DATE(driverId),
        {
          params: capitalizeKeys(model),
          signal,
        }
      )

      return response.data?.successResult || null
    } catch (error) {
      console.error('Error fetching driver daily form:', error)
      throw error
    }
  }

  async updateDriverDailyForm(
    model: EditDriverDailyFormRequest
  ): Promise<DriverDailyFormResponse | null> {
    try {
      const response = await this.api.post<{ successResult: DriverDailyFormResponse }>(
        ApiEndpoints.DRIVER_DAILY_FORMS_UPDATE,
        capitalizeKeys(model)
      )

      return response.data?.successResult || null
    } catch (error) {
      console.error('Error updating driver daily form:', error)
      throw error
    }
  }

  validateEditDriverDailyForm(form: EditDriverDailyForm): Array<{ path: string; message: string }> {
    const errors: Array<{ path: string; message: string }> = []

    if (!form.coDrivers) {
      errors.push({ path: 'co-drivers', message: 'Co-Drivers is required' })
    }

    if (!form.shippingDocs || form.shippingDocs.trim() === '') {
      errors.push({ path: 'shipping-docs', message: 'Shipping Docs is required' })
    }

    if (!form.trailers || form.trailers.trim() === '') {
      errors.push({ path: 'trailers', message: 'Trailers is required' })
    }

    if (!form.signaturePath || form.signaturePath.trim() === '') {
      errors.push({ path: 'signature', message: 'Signature Path is required' })
    } else if (!form.signaturePath.endsWith('.jpg')) {
      errors.push({ path: 'signature', message: 'Signature Path must end with .jpg' })
    }

    return errors
  }

  prepareEditForm(
    driverDailyForm: DriverDailyFormResponse | null
  ): EditDriverDailyForm {
    return {
      coDrivers: driverDailyForm?.coDriver?.id || null,
      shippingDocs: driverDailyForm?.shippingDocuments.join(',') || '',
      trailers: driverDailyForm?.trailers.join(',') || '',
      signaturePath: driverDailyForm?.signaturePath || '',
      signaturePaths: driverDailyForm?.signaturePaths || [],
    }
  }

  prepareRequestModel(
    form: EditDriverDailyForm,
    driverId: string,
    formDate: Dayjs | string,
    certifiedDate: Dayjs | string
  ): EditDriverDailyFormRequest {
    return {
      driverId,
      formDate,
      certifiedDate,
      coDriverId: form.coDrivers || null,
      shippingDocuments: form.shippingDocs
        ? form.shippingDocs.split(',').filter((s) => s.trim() !== '')
        : [],
      trailers: form.trailers
        ? form.trailers.split(',').filter((t) => t.trim() !== '')
        : [],
      signaturePath: form.signaturePath || '',
    }
  }
}

export const driverDailyFormService = new DriverDailyFormService()
