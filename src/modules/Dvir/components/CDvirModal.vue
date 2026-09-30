<template>
  <Modal :open="open" @update:open="handleClose">
    <ModalContent max-width="4xl">
      <ModalHeader>
        <ModalTitle class="text-2xl font-semibold">{{ mode === 'edit' ? 'Edit DVIR' : 'Add DVIR' }}</ModalTitle>
      </ModalHeader>

      <form @submit.prevent="handleSubmit" class="space-y-6 mt-4">
        <!-- Row 1: Vehicle & Driver -->
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="vehicle">Vehicle</Label>
            <Select
              v-model="formData.vehicleId"
              :disabled="isSubmitting || isLoadingVehicles"
              @update:model-value="clearError('vehicleId')"
            >
              <SelectTrigger id="vehicle" :class="errors.vehicleId && 'border-red-500'">
                <SelectValue placeholder="Select vehicle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="vehicle in vehicles" :key="vehicle.id" :value="vehicle.id">
                  {{ vehicle.unit || `${vehicle.make} ${vehicle.model}` }}
                </SelectItem>
              </SelectContent>
            </Select>
            <p v-if="errors.vehicleId" class="text-sm text-red-600 dark:text-red-400">
              {{ errors.vehicleId }}
            </p>
          </div>

          <div class="space-y-2">
            <Label for="driver">Driver</Label>
            <Select
              v-model="formData.driverId"
              :disabled="isSubmitting || isLoadingDrivers"
              @update:model-value="(val) => handleDriverChange(val as string)"
            >
              <SelectTrigger id="driver" :class="errors.driverId && 'border-red-500'">
                <SelectValue placeholder="Select driver" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="driver in drivers" :key="driver.id" :value="driver.id">
                  {{ driver.name }}
                </SelectItem>
              </SelectContent>
            </Select>
            <p v-if="errors.driverId" class="text-sm text-red-600 dark:text-red-400">
              {{ errors.driverId }}
            </p>
          </div>
        </div>

        <!-- Row 2: Date/Time & Status -->
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="dateTime">Date / Time</Label>
            <Input
              id="dateTime"
              v-model="formData.dateTime"
              type="datetime-local"
              :class="errors.dateTime && 'border-red-500'"
              :disabled="isSubmitting"
              @change="clearError('dateTime')"
            />
            <p v-if="errors.dateTime" class="text-sm text-red-600 dark:text-red-400">
              {{ errors.dateTime }}
            </p>
          </div>

          <div class="space-y-2">
            <Label for="dvirStatusId">Status</Label>
            <Select
              v-model="formData.dvirStatusId"
              :disabled="isSubmitting || isLoadingStatuses"
              @update:model-value="clearError('dvirStatusId')"
            >
              <SelectTrigger id="dvirStatusId" :class="errors.dvirStatusId && 'border-red-500'">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="status in dvirStatuses"
                  :key="status.id"
                  :value="status.id"
                >
                  {{ status.name }}
                </SelectItem>
              </SelectContent>
            </Select>
            <p v-if="errors.dvirStatusId" class="text-sm text-red-600 dark:text-red-400">
              {{ errors.dvirStatusId }}
            </p>
          </div>
        </div>

        <!-- Row 3: Location & Trailer -->
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="location">Location</Label>
            <Input
              id="location"
              v-model="formData.location"
              placeholder="Location"
              :class="errors.location && 'border-red-500'"
              :disabled="isSubmitting"
              @input="clearError('location')"
            />
            <p v-if="errors.location" class="text-sm text-red-600 dark:text-red-400">
              {{ errors.location }}
            </p>
          </div>

          <div class="space-y-2">
            <Label for="trailer">Trailer</Label>
            <Input
              id="trailer"
              v-model="formData.trailer"
              placeholder="Trailer"
              :disabled="isSubmitting"
            />
          </div>
        </div>

        <!-- Row 4: Odometer & Signature -->
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="odometer">Odometer</Label>
            <Input
              id="odometer"
              v-model="formData.odometer"
              type="number"
              min="0"
              step="1"
              placeholder="Odometer"
              :class="errors.odometer && 'border-red-500'"
              :disabled="isSubmitting"
              @keydown="preventNonNumeric"
              @input="clearError('odometer')"
            />
            <p v-if="errors.odometer" class="text-sm text-red-600 dark:text-red-400">
              {{ errors.odometer }}
            </p>
          </div>

          <!-- Signature — enabled after driver is selected -->
          <div class="space-y-2">
            <Label for="signature">Signature</Label>
            <Select
              v-model="formData.signature"
              :disabled="isSubmitting || isLoadingSignatures || !formData.driverId"
              @update:model-value="clearError('signature')"
            >
              <SelectTrigger id="signature" :class="errors.signature && 'border-red-500'">
                <SelectValue placeholder="Select signature" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="(sig, idx) in signatures"
                  :key="sig + idx"
                  :value="sig"
                >
                  {{ sig }}
                </SelectItem>
              </SelectContent>
            </Select>
            <p v-if="errors.signature" class="text-sm text-red-600 dark:text-red-400">
              {{ errors.signature }}
            </p>
            <p v-if="!formData.driverId" class="text-xs text-gray-400">
              Select a driver first to load signatures
            </p>
          </div>
        </div>

        <!-- Row 5: Remarks & Vehicle defects -->
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="remarks">Remarks</Label>
            <Input
              id="remarks"
              v-model="formData.remarks"
              placeholder="Remarks"
              :disabled="isSubmitting"
            />
          </div>

          <div class="space-y-2">
            <Label>Add vehicle defects</Label>
            <Select
              v-model="selectedVehicleDefect"
              :disabled="isSubmitting || isLoadingDefects"
              @update:model-value="(val) => addVehicleDefect(val as string)"
            >
              <SelectTrigger>
                <SelectValue placeholder="Select defect" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="defect in availableVehicleDefects"
                  :key="defect.id"
                  :value="defect.id"
                >
                  {{ defect.name }}
                </SelectItem>
              </SelectContent>
            </Select>
            <div v-if="formData.vehicleDefectIds.length > 0" class="flex flex-wrap gap-2 mt-2">
              <span
                v-for="id in formData.vehicleDefectIds"
                :key="id"
                class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
              >
                {{ getVehicleDefectName(id) }}
                <button
                  type="button"
                  @click="removeVehicleDefect(id)"
                  class="ml-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  &times;
                </button>
              </span>
            </div>
          </div>
        </div>

        <!-- Row 6: Trailer defects -->
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label>Add trailer defects</Label>
            <Select
              v-model="selectedTrailerDefect"
              :disabled="isSubmitting || isLoadingDefects"
              @update:model-value="(val) => addTrailerDefect(val as string)"
            >
              <SelectTrigger>
                <SelectValue placeholder="Select defect" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="defect in availableTrailerDefects"
                  :key="defect.id"
                  :value="defect.id"
                >
                  {{ defect.name }}
                </SelectItem>
              </SelectContent>
            </Select>
            <div v-if="formData.trailerDefectIds.length > 0" class="flex flex-wrap gap-2 mt-2">
              <span
                v-for="id in formData.trailerDefectIds"
                :key="id"
                class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
              >
                {{ getTrailerDefectName(id) }}
                <button
                  type="button"
                  @click="removeTrailerDefect(id)"
                  class="ml-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  &times;
                </button>
              </span>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <ModalFooter class="pt-4">
          <Button type="button" variant="outline" @click="handleClose" :disabled="isSubmitting">
            Cancel
          </Button>
          <Button
            type="submit"
            class="bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
            :disabled="isSubmitting"
          >
            <span v-if="!isSubmitting">Save</span>
            <span v-else class="flex items-center gap-2">
              <svg
                class="animate-spin h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Saving...
            </span>
          </Button>
        </ModalFooter>
      </form>
    </ModalContent>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalFooter,
} from '@/components/custom/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useApi } from '@/composables/useAxiosService'
import { ApiEndpoints } from '@/api/endpoints'
import { toast } from 'vue-sonner'
import type {
  Vehicle,
  DriverOption,
  DefectApiResponse,
  DvirStatus,
  CreateDvirRequest,
  DvirApiResponse,
} from '@/modules/Dvir/types'

interface Props {
  open: boolean
  vehicles: Vehicle[]
  drivers: DriverOption[]
  vehicleDefects: DefectApiResponse[]
  trailerDefects: DefectApiResponse[]
  dvirStatuses: DvirStatus[]
  signatures: string[]
  isLoadingVehicles: boolean
  isLoadingDrivers: boolean
  isLoadingDefects: boolean
  isLoadingStatuses: boolean
  isLoadingSignatures: boolean
  mode?: 'create' | 'edit'
  editDvir?: DvirApiResponse | null
}

interface FormData {
  vehicleId: string
  driverId: string
  dateTime: string    // datetime-local value → converted to UTC ISO on submit
  dvirStatusId: string
  location: string
  odometer: string    // string in form, parsed to number on submit
  trailer: string     // single trailer, submitted as trailers: [trailer]
  remarks: string
  signature: string   // maps to signaturePath on submit
  vehicleDefectIds: string[]
  trailerDefectIds: string[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submit'): void
  (e: 'update'): void
  (e: 'driver-change', driverId: string): void
}>()

const api = useApi()

// Default dateTime: current local time in datetime-local format
const getLocalDateTime = (): string => {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60000
  return new Date(now.getTime() - offset).toISOString().slice(0, 16)
}

const formData = ref<FormData>({
  vehicleId: '',
  driverId: '',
  dateTime: getLocalDateTime(),
  dvirStatusId: '',
  location: '',
  odometer: '',
  trailer: '',
  remarks: '',
  signature: '',
  vehicleDefectIds: [],
  trailerDefectIds: [],
})

const errors = ref<Partial<Record<keyof FormData, string>>>({})
const isSubmitting = ref(false)
const selectedVehicleDefect = ref<string | undefined>(undefined)
const selectedTrailerDefect = ref<string | undefined>(undefined)

// Handle driver selection — clear signature and fetch new ones
const handleDriverChange = (driverId: string) => {
  formData.value.signature = ''
  clearError('driverId')
  if (driverId) emit('driver-change', driverId)
}

// Defects helpers
const availableVehicleDefects = computed(() =>
  props.vehicleDefects.filter((d) => !formData.value.vehicleDefectIds.includes(d.id))
)
const availableTrailerDefects = computed(() =>
  props.trailerDefects.filter((d) => !formData.value.trailerDefectIds.includes(d.id))
)

const getVehicleDefectName = (id: string) =>
  props.vehicleDefects.find((d) => d.id === id)?.name || id

const getTrailerDefectName = (id: string) =>
  props.trailerDefects.find((d) => d.id === id)?.name || id

const addVehicleDefect = (id: string) => {
  if (id && !formData.value.vehicleDefectIds.includes(id)) {
    formData.value.vehicleDefectIds.push(id)
  }
  nextTick(() => {
    selectedVehicleDefect.value = undefined
  })
}

const removeVehicleDefect = (id: string) => {
  formData.value.vehicleDefectIds = formData.value.vehicleDefectIds.filter((d) => d !== id)
}

const addTrailerDefect = (id: string) => {
  if (id && !formData.value.trailerDefectIds.includes(id)) {
    formData.value.trailerDefectIds.push(id)
  }
  nextTick(() => {
    selectedTrailerDefect.value = undefined
  })
}

const removeTrailerDefect = (id: string) => {
  formData.value.trailerDefectIds = formData.value.trailerDefectIds.filter((d) => d !== id)
}

// Block e, E, +, -, . for odometer
const preventNonNumeric = (event: KeyboardEvent) => {
  if (['e', 'E', '+', '-', '.'].includes(event.key)) {
    event.preventDefault()
  }
}

// Pre-populate form when editDvir changes (edit mode)
watch(
  () => props.editDvir,
  (dvir) => {
    if (dvir && props.mode === 'edit') {
      const driverId = dvir.driver?.id || ''
      formData.value = {
        vehicleId: dvir.vehicle?.id || '',
        driverId,
        dateTime: (() => {
          const d = new Date(dvir.dateTime)
          const offset = d.getTimezoneOffset() * 60000
          return new Date(d.getTime() - offset).toISOString().slice(0, 16)
        })(),
        dvirStatusId: dvir.dvirStatus?.id || '',
        location: dvir.location || '',
        odometer: String(dvir.odometer ?? ''),
        trailer: dvir.trailers?.[0] || '',
        remarks: dvir.remarks || '',
        signature: dvir.signaturePath || '',
        vehicleDefectIds: dvir.vehicleDefects?.map((d) => d.id).filter(Boolean) as string[],
        trailerDefectIds: dvir.trailerDefects?.map((d) => d.id).filter(Boolean) as string[],
      }
      if (driverId) emit('driver-change', driverId)
    }
  },
  { immediate: true }
)

// Reset form when modal closes
watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) resetForm()
  }
)

const resetForm = () => {
  formData.value = {
    vehicleId: '',
    driverId: '',
    dateTime: getLocalDateTime(),
    dvirStatusId: '',
    location: '',
    odometer: '',
    trailer: '',
    remarks: '',
    signature: '',
    vehicleDefectIds: [],
    trailerDefectIds: [],
  }
  errors.value = {}
  selectedVehicleDefect.value = undefined
  selectedTrailerDefect.value = undefined
}

const validateForm = (): boolean => {
  errors.value = {}
  let isValid = true

  if (!formData.value.vehicleId) {
    errors.value.vehicleId = 'Vehicle is required'
    isValid = false
  }
  if (!formData.value.driverId) {
    errors.value.driverId = 'Driver is required'
    isValid = false
  }
  if (!formData.value.dateTime) {
    errors.value.dateTime = 'Date/Time is required'
    isValid = false
  }
  if (!formData.value.dvirStatusId) {
    errors.value.dvirStatusId = 'Status is required'
    isValid = false
  }
  if (!formData.value.location.trim()) {
    errors.value.location = 'Location is required'
    isValid = false
  }
  if (!String(formData.value.odometer ?? '').trim()) {
    errors.value.odometer = 'Odometer is required'
    isValid = false
  }
  if (!formData.value.signature) {
    errors.value.signature = 'Signature is required'
    isValid = false
  }

  return isValid
}

const handleSubmit = async () => {
  if (!validateForm()) return

  isSubmitting.value = true

  try {
    const payload: CreateDvirRequest = {
      driverId: formData.value.driverId,
      dateTime: new Date(formData.value.dateTime).toISOString(),
      location: formData.value.location,
      odometer: Number(formData.value.odometer),
      remarks: formData.value.remarks,
      dvirStatusId: formData.value.dvirStatusId,
      vehicleId: formData.value.vehicleId,
      vehicleDefectIds: formData.value.vehicleDefectIds,
      trailerDefectIds: formData.value.trailerDefectIds,
      trailers: formData.value.trailer ? [formData.value.trailer] : [],
      signaturePath: formData.value.signature,
    }

    if (props.mode === 'edit' && props.editDvir) {
      await api.put(ApiEndpoints.DVIRS_BY_ID(props.editDvir.id), payload, {
        _showSuccessToast: true,
        _successMessage: 'DVIR updated successfully',
      } as any)
      emit('update')
    } else {
      await api.post(ApiEndpoints.DVIRS, payload, {
        _showSuccessToast: true,
        _successMessage: 'DVIR created successfully',
      })
      emit('submit')
    }
    handleClose()
  } catch (error: any) {
    console.error('Error creating DVIR:', error)
    const errorMessage =
      error.response?.data?.message || 'Failed to create DVIR. Please try again.'
    toast.error(errorMessage)
  } finally {
    isSubmitting.value = false
  }
}

const handleClose = () => {
  if (!isSubmitting.value) {
    emit('close')
  }
}

const clearError = (field: keyof FormData) => {
  delete errors.value[field]
}
</script>
