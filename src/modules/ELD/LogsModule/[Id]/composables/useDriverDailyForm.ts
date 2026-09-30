/**
 * Composable for Driver Daily Form management
 * Follows SOLID principles:
 * - Single Responsibility: Manages only driver daily form state and operations
 * - Dependency Inversion: Depends on service abstraction
 */

import { ref, computed, type Ref } from 'vue'
import type { Dayjs } from 'dayjs'
import { driverDailyFormService } from '../services/driverDailyFormService.ts'
import type {
  DriverDailyFormResponse,
  EditDriverDailyForm,
  DriverOption,
} from '../types/driverDailyForm.ts'

export function useDriverDailyForm() {
  // State
  const driverDailyForm: Ref<DriverDailyFormResponse | null> = ref(null)
  const loading = ref(false)
  const editForm: Ref<EditDriverDailyForm> = ref({
    coDrivers: null,
    shippingDocs: '',
    trailers: '',
    signaturePath: '',
    signaturePaths: [],
  })

  // UI State
  const showPathSelector = ref(false)
  const searchQuery = ref('')

  /**
   * Computed: Filtered signature paths based on search query
   */
  const filteredPaths = computed(() => {
    if (!searchQuery.value) return editForm.value.signaturePaths
    return editForm.value.signaturePaths.filter((p) =>
      p.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
  })

  /**
   * Computed: Disable edit form button
   */
  const disableEditDailyForm = computed(() => {
    return (
      loading.value ||
      driverDailyFormService.validateEditDriverDailyForm(editForm.value).length > 0
    )
  })

  /**
   * Fetch driver daily form by date
   */
  const fetchDriverDailyForm = async (
    driverId: string,
    dateTime: Dayjs | string,
    signal?: AbortSignal
  ) => {
    try {
      loading.value = true
      const result = await driverDailyFormService.getDriverDailyFormByDate(
        driverId,
        dateTime,
        signal
      )
      driverDailyForm.value = result
      return result
    } catch (error) {
      console.error('Error fetching driver daily form:', error)
      driverDailyForm.value = null
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Initialize edit form from driver daily form
   */
  const initializeEditForm = () => {
    if (driverDailyForm.value) {
      editForm.value = driverDailyFormService.prepareEditForm(driverDailyForm.value)
    }
  }

  /**
   * Update driver daily form
   */
  const updateDriverDailyForm = async (
    driverId: string,
    formDate: Dayjs | string,
    certifiedDate: Dayjs | string
  ) => {
    try {
      loading.value = true

      const model = driverDailyFormService.prepareRequestModel(
        editForm.value,
        driverId,
        formDate,
        certifiedDate
      )

      const result = await driverDailyFormService.updateDriverDailyForm(model)

      if (result) {
        // Update local state with the result
        driverDailyForm.value = result
      }

      return result !== null
    } catch (error) {
      console.error('Error updating driver daily form:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Validate edit form
   */
  const validateEditForm = () => {
    return driverDailyFormService.validateEditDriverDailyForm(editForm.value)
  }

  /**
   * Select signature path
   */
  const selectSignature = (path: string) => {
    editForm.value.signaturePath = path
    showPathSelector.value = false
    searchQuery.value = ''
  }

  /**
   * Toggle path selector dropdown
   */
  const togglePathSelector = () => {
    showPathSelector.value = !showPathSelector.value
  }

  return {
    // State
    driverDailyForm,
    editForm,
    loading,
    showPathSelector,
    searchQuery,

    // Computed
    filteredPaths,
    disableEditDailyForm,

    // Methods
    fetchDriverDailyForm,
    initializeEditForm,
    updateDriverDailyForm,
    validateEditForm,
    selectSignature,
    togglePathSelector,
  }
}
