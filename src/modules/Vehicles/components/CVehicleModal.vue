<template>
  <Modal :open="open" @update:open="handleClose">
    <ModalContent max-width="3xl">
      <ModalHeader>
        <ModalTitle class="text-2xl">
          {{ isEditMode ? 'Edit vehicle' : 'Add vehicle' }}
        </ModalTitle>
      </ModalHeader>

      <form @submit.prevent="handleSubmit" class="space-y-5">
        <!-- Row 1: Unit & Year -->
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="unit">Unit #</Label>
            <Input
              id="unit"
              v-model="formData.unit"
              placeholder="Unit number"
              :class="errors.unit && 'border-red-500'"
              :disabled="isSubmitting"
              @input="clearError('unit')"
            />
            <p v-if="errors.unit" class="text-sm text-red-600 dark:text-red-400">{{ errors.unit }}</p>
          </div>

          <div class="space-y-2">
            <Label for="year">Year</Label>
            <Input
              id="year"
              v-model="formData.year"
              placeholder="e.g. 2024"
              maxlength="4"
              :class="errors.year && 'border-red-500'"
              :disabled="isSubmitting"
              @input="clearError('year')"
            />
            <p v-if="errors.year" class="text-sm text-red-600 dark:text-red-400">{{ errors.year }}</p>
          </div>
        </div>

        <!-- Row 2: Make & Model -->
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="make">Make</Label>
            <Input
              id="make"
              v-model="formData.make"
              placeholder="Make"
              :class="errors.make && 'border-red-500'"
              :disabled="isSubmitting"
              @input="clearError('make')"
            />
            <p v-if="errors.make" class="text-sm text-red-600 dark:text-red-400">{{ errors.make }}</p>
          </div>

          <div class="space-y-2">
            <Label for="model">Model</Label>
            <Input
              id="model"
              v-model="formData.model"
              placeholder="Model"
              :class="errors.model && 'border-red-500'"
              :disabled="isSubmitting"
              @input="clearError('model')"
            />
            <p v-if="errors.model" class="text-sm text-red-600 dark:text-red-400">{{ errors.model }}</p>
          </div>
        </div>

        <!-- Row 3: VIN (with auto-decode) -->
        <div class="space-y-2">
          <Label for="vin">VIN</Label>
          <div class="relative">
            <Input
              id="vin"
              v-model="formData.vin"
              placeholder="17-character VIN"
              maxlength="17"
              :class="[errors.vin && 'border-red-500', 'uppercase']"
              :disabled="isSubmitting || isEditMode"
              @input="handleVinInput"
            />
            <span
              v-if="vinDecodingLoading"
              class="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <svg class="animate-spin h-4 w-4 text-primary" viewBox="0 0 24 24" fill="none">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            </span>
          </div>
          <p v-if="errors.vin" class="text-sm text-red-600 dark:text-red-400">{{ errors.vin }}</p>
          <p v-if="vinError" class="text-sm text-red-600 dark:text-red-400">{{ vinError }}</p>
          <p v-if="isEditMode" class="text-sm text-muted-foreground">
            VIN cannot be changed on an existing vehicle. Create a new vehicle to change the VIN.
          </p>
          <p v-else class="text-sm text-muted-foreground">
            {{ 17 - formData.vin.length }} characters remaining. Fields auto-fill when VIN is complete.
          </p>
        </div>

        <!-- Row 4: Fuel & ELD Connection -->
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="vehicleFuelId">Fuel type</Label>
            <Select
              v-model="formData.vehicleFuelId"
              :disabled="isSubmitting"
              @update:model-value="clearError('vehicleFuelId')"
            >
              <SelectTrigger id="vehicleFuelId" :class="errors.vehicleFuelId && 'border-red-500'">
                <SelectValue placeholder="Select fuel type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="fuel in fuels"
                  :key="fuel.id"
                  :value="String(fuel.id)"
                >
                  {{ fuel.name }}
                </SelectItem>
              </SelectContent>
            </Select>
            <p v-if="errors.vehicleFuelId" class="text-sm text-red-600 dark:text-red-400">{{ errors.vehicleFuelId }}</p>
          </div>

          <div class="space-y-2">
            <Label for="eldVehicleConnectionId">ELD connection</Label>
            <Select
              v-model="formData.eldVehicleConnectionId"
              :disabled="isSubmitting"
            >
              <SelectTrigger id="eldVehicleConnectionId">
                <SelectValue placeholder="Select ELD connection" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="eld in eldConnections"
                  :key="eld.id"
                  :value="String(eld.id)"
                >
                  {{ eld.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <!-- Row 5: License Plate State & Number -->
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="licensePlateState">License plate state</Label>
            <Select
              v-model="formData.licensePlateState"
              :disabled="isSubmitting"
              @update:model-value="clearError('licensePlateState')"
            >
              <SelectTrigger id="licensePlateState" :class="errors.licensePlateState && 'border-red-500'">
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="state in issuerStates"
                  :key="state.id"
                  :value="state.id"
                >
                  {{ state.name }}
                </SelectItem>
              </SelectContent>
            </Select>
            <p v-if="errors.licensePlateState" class="text-sm text-red-600 dark:text-red-400">{{ errors.licensePlateState }}</p>
          </div>

          <div class="space-y-2">
            <Label for="licensePlateNumber">License plate number</Label>
            <Input
              id="licensePlateNumber"
              v-model="formData.licensePlateNumber"
              placeholder="License plate number"
              maxlength="10"
              :class="errors.licensePlateNumber && 'border-red-500'"
              :disabled="isSubmitting"
              @input="clearError('licensePlateNumber')"
            />
            <p v-if="errors.licensePlateNumber" class="text-sm text-red-600 dark:text-red-400">{{ errors.licensePlateNumber }}</p>
          </div>
        </div>

        <!-- Row 6: Sleep mode -->
        <div class="flex items-center gap-3">
          <Switch id="isAllowedSleep" v-model:checked="formData.isAllowedSleep" :disabled="isSubmitting" />
          <Label for="isAllowedSleep" class="cursor-pointer">Allow sleep mode</Label>
        </div>

        <!-- Actions -->
        <ModalFooter>
          <Button type="button" variant="outline" @click="handleClose" :disabled="isSubmitting">
            Cancel
          </Button>
          <Button
            type="submit"
            class="bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-gray-200 dark:text-gray-900"
            :disabled="isSubmitting || vinDecodingLoading"
          >
            <span v-if="!isSubmitting">Save</span>
            <span v-else class="flex items-center gap-2">
              <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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
import { ref, watch, computed } from 'vue'
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
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Vehicle, VehicleSingleResponse, FuelOption, EldConnectionOption, IssuerStateOption } from '@/modules/Vehicles/types'

interface FormData {
  unit: string
  year: string
  make: string
  model: string
  vin: string
  vehicleFuelId: string
  eldVehicleConnectionId: string
  licensePlateState: string
  licensePlateNumber: string
  isAllowedSleep: boolean
}

interface Props {
  open: boolean
  vehicle?: Vehicle | null
  vehicleDetails?: VehicleSingleResponse | null
  fuels: FuelOption[]
  eldConnections: EldConnectionOption[]
  issuerStates: IssuerStateOption[]
  vinDecodingLoading?: boolean
  vinError?: string
  decodeVin: (vin: string) => Promise<{ isValid: boolean; year?: number; make?: string; model?: string; fuelType?: string; eldConnectionId?: number | string } | null>
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', data: FormData): void
}>()

const isEditMode = computed(() => !!props.vehicle)

const formData = ref<FormData>({
  unit: '',
  year: '',
  make: '',
  model: '',
  vin: '',
  vehicleFuelId: '',
  eldVehicleConnectionId: '',
  licensePlateState: '',
  licensePlateNumber: '',
  isAllowedSleep: true,
})

const errors = ref<Partial<Record<keyof FormData, string>>>({})
const isSubmitting = ref(false)

// Populate form from vehicleDetails (edit mode)
watch(
  () => props.vehicleDetails,
  (details) => {
    if (!details) return
    formData.value = {
      unit: details.unit || '',
      year: details.manufactureYear ? String(details.manufactureYear) : '',
      make: details.make || '',
      model: details.model || '',
      vin: details.vin || '',
      vehicleFuelId: details.vehicleFuel ? String(details.vehicleFuel.id) : '',
      eldVehicleConnectionId: details.eldVehicleConnection ? String(details.eldVehicleConnection.id) : '',
      licensePlateState: details.licensePlate?.issuerState?.id || '',
      licensePlateNumber: details.licensePlate?.plateNumber || '',
      isAllowedSleep: details.isAllowedSleep ?? true,
    }
  }
)

// Reset form when modal opens for add
watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) {
      resetForm()
    } else if (!props.vehicle) {
      resetForm()
    }
  }
)

const resetForm = () => {
  formData.value = {
    unit: '',
    year: '',
    make: '',
    model: '',
    vin: '',
    vehicleFuelId: '',
    eldVehicleConnectionId: '',
    licensePlateState: '',
    licensePlateNumber: '',
    isAllowedSleep: true,
  }
  errors.value = {}
}

// VIN auto-decode: trigger when 17 chars entered
const handleVinInput = async () => {
  clearError('vin')
  const vin = formData.value.vin.toUpperCase()
  formData.value.vin = vin

  if (vin.length !== 17) return

  const result = await props.decodeVin(vin)
  if (!result) return

  if (result.year) formData.value.year = String(result.year)
  if (result.make) formData.value.make = result.make
  if (result.model) formData.value.model = result.model

  // Match fuel by name
  if (result.fuelType) {
    const fuelMatch = props.fuels.find((f) =>
      f.name.toLowerCase().includes(result.fuelType!.toLowerCase())
    )
    if (fuelMatch) formData.value.vehicleFuelId = String(fuelMatch.id)
  }

  // Set ELD connection
  if (result.eldConnectionId) {
    formData.value.eldVehicleConnectionId = String(result.eldConnectionId)
  }
}

const clearError = (field: keyof FormData) => {
  delete errors.value[field]
}

const validateForm = (): boolean => {
  errors.value = {}
  let isValid = true

  if (!formData.value.unit.trim()) {
    errors.value.unit = 'Unit is required'
    isValid = false
  }

  if (!formData.value.year.trim()) {
    errors.value.year = 'Year is required'
    isValid = false
  } else if (!/^\d{4}$/.test(formData.value.year)) {
    errors.value.year = 'Year must be 4 digits'
    isValid = false
  }

  if (!formData.value.make.trim()) {
    errors.value.make = 'Make is required'
    isValid = false
  }

  if (!formData.value.model.trim()) {
    errors.value.model = 'Model is required'
    isValid = false
  }

  if (!isEditMode.value) {
    if (!formData.value.vin.trim()) {
      errors.value.vin = 'VIN is required'
      isValid = false
    } else if (formData.value.vin.length !== 17) {
      errors.value.vin = 'VIN must be exactly 17 characters'
      isValid = false
    }
  }

  if (!formData.value.vehicleFuelId) {
    errors.value.vehicleFuelId = 'Fuel type is required'
    isValid = false
  }

  if (!formData.value.licensePlateState) {
    errors.value.licensePlateState = 'License plate state is required'
    isValid = false
  }

  if (!formData.value.licensePlateNumber.trim()) {
    errors.value.licensePlateNumber = 'License plate number is required'
    isValid = false
  }

  return isValid
}

const handleSubmit = async () => {
  if (!validateForm()) return

  isSubmitting.value = true
  try {
    emit('save', { ...formData.value })
  } catch (error) {
    console.error('Error saving vehicle:', error)
  } finally {
    isSubmitting.value = false
  }
}

const handleClose = () => {
  if (!isSubmitting.value) emit('close')
}
</script>
