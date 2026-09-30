<!-- src/components/drivers/AddDriverModal.vue -->
<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type {
  Driver,
  DriverFormData,
  IssuerStateOption,
  NameWithId,
  VehicleOption,
} from '@/modules/Drivers/types'
import { Modal, ModalContent, ModalHeader, ModalTitle } from '@/components/custom/modal'

interface Props {
  open: boolean
  driver?: Driver | null
  homeTerminals: NameWithId[]
  vehicles: VehicleOption[]
  issuerStateParents: IssuerStateOption[]
  issuerStates: IssuerStateOption[]
  hosRoles: NameWithId[]
  cargoTypes: NameWithId[]
  restarts: NameWithId[]
  restBreaks: NameWithId[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', data: DriverFormData): void
}>()

const isEditMode = computed(() => !!props.driver)

const formData = ref<DriverFormData>({
  username: '',
  password: '',
  confirmPassword: '',
  firstName: '',
  lastName: '',
  phoneNumber: '',
  email: '',
  homeTerminal: '',
  vehicles: [],
  issuerStateParent: '',
  issuerState: '',
  driverLicenseNumber: '',
  exemptDriver: false,
  shortHaulException: false,
  allowPersonalUse: false,
  allowYardMove: false,
  unlimitedTrailers: false,
  unlimitedShippingDocuments: false,
  hosRoles: '',
  cargoType: '',
  restart: '',
  restBreak: '',
})

const errors = ref<Partial<Record<keyof DriverFormData, string>>>({})
const isSubmitting = ref(false)

const filteredIssuerStates = computed(() => {
  if (!formData.value.issuerStateParent) return []
  return props.issuerStates.filter(
    (state) => state.parentId === formData.value.issuerStateParent
  )
})

watch(
  () => formData.value.issuerStateParent,
  () => {
    if (
      formData.value.issuerState &&
      !filteredIssuerStates.value.some((state) => state.id === formData.value.issuerState)
    ) {
      formData.value.issuerState = ''
    }
  }
)

// Load form data when driver prop changes
watch(
  () => props.driver,
  (driver) => {
    if (driver) {
      formData.value = {
        username: driver.username || '',
        password: '',
        confirmPassword: '',
        firstName: driver.firstName || '',
        lastName: driver.lastName || '',
        phoneNumber: driver.phoneNumber || '',
        email: driver.email || '',
        homeTerminal: driver.homeTerminal || '',
        vehicles: driver.vehicles || [],
        issuerStateParent: driver.issuerStateParent || '',
        issuerState: driver.issuerState || '',
        driverLicenseNumber: driver.driverLicenseNumber || '',
        exemptDriver: driver.exemptDriver || false,
        shortHaulException: driver.shortHaulException || false,
        allowPersonalUse: driver.allowPersonalUse || false,
        allowYardMove: driver.allowYardMove || false,
        unlimitedTrailers: driver.unlimitedTrailers || false,
        unlimitedShippingDocuments: driver.unlimitedShippingDocuments || false,
        hosRoles: driver.hosRoles || '',
        cargoType: driver.cargoType || '',
        restart: driver.restart || '',
        restBreak: driver.restBreak || '',
      }
    }
  },
  { immediate: true }
)

// Reset form when modal opens/closes
watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) {
      resetForm()
    } else if (!props.driver) {
      resetForm()
    }
  }
)

const resetForm = () => {
  formData.value = {
    username: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    email: '',
    homeTerminal: '',
    vehicles: [],
    issuerStateParent: '',
    issuerState: '',
    driverLicenseNumber: '',
    exemptDriver: false,
    shortHaulException: false,
    allowPersonalUse: false,
    allowYardMove: false,
    unlimitedTrailers: false,
    unlimitedShippingDocuments: false,
    hosRoles: '',
    cargoType: '',
    restart: '',
    restBreak: '',
  }
  errors.value = {}
}

const validateForm = (): boolean => {
  errors.value = {}
  let isValid = true

  // Username validation
  if (!formData.value.username.trim()) {
    errors.value.username = 'Username is required'
    isValid = false
  } else if (formData.value.username.length < 3) {
    errors.value.username = 'Username must be at least 3 characters'
    isValid = false
  }

  // Password validation (only for new drivers)
  if (!isEditMode.value) {
    if (!formData.value.password) {
      errors.value.password = 'Password is required'
      isValid = false
    } else if (formData.value.password.length < 6) {
      errors.value.password = 'Password must be at least 6 characters'
      isValid = false
    }

    if (!formData.value.confirmPassword) {
      errors.value.confirmPassword = 'Confirm password is required'
      isValid = false
    } else if (formData.value.password !== formData.value.confirmPassword) {
      errors.value.confirmPassword = 'Passwords do not match'
      isValid = false
    }
  }

  // First name validation
  if (!formData.value.firstName.trim()) {
    errors.value.firstName = 'First name is required'
    isValid = false
  }

  // Last name validation
  if (!formData.value.lastName.trim()) {
    errors.value.lastName = 'Last name is required'
    isValid = false
  }

  // Phone number validation
  if (formData.value.phoneNumber && !/^\+?[\d\s-()]+$/.test(formData.value.phoneNumber)) {
    errors.value.phoneNumber = 'Invalid phone number format'
    isValid = false
  }

  // Email validation
  if (formData.value.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.value.email)) {
    errors.value.email = 'Invalid email format'
    isValid = false
  }

  const requiredSelections: Array<[keyof DriverFormData, string]> = [
    ['homeTerminal', 'Home terminal is required'],
    ['issuerStateParent', 'Issuer state parent is required'],
    ['issuerState', 'Issuer state is required'],
    ['hosRoles', 'HOS role is required'],
    ['cargoType', 'Cargo type is required'],
    ['restart', 'Restart rule is required'],
    ['restBreak', 'Rest break rule is required'],
  ]

  requiredSelections.forEach(([field, message]) => {
    const value = formData.value[field]
    if (typeof value !== 'string' || !value) {
      errors.value[field] = message
      isValid = false
    }
  })

  if (!formData.value.driverLicenseNumber.trim()) {
    errors.value.driverLicenseNumber = 'Driver license number is required'
    isValid = false
  }

  return isValid
}

const handleSubmit = async () => {
  if (!validateForm()) {
    return
  }

  isSubmitting.value = true

  try {
    emit('save', { ...formData.value })
  } catch (error) {
    console.error('Error saving driver:', error)
  } finally {
    isSubmitting.value = false
  }
}

const handleClose = () => {
  if (!isSubmitting.value) {
    emit('close')
  }
}

const clearError = (field: keyof DriverFormData) => {
  delete errors.value[field]
}
</script>

<template>
  <Modal :open="open" @update:open="handleClose">
    <ModalContent class="max-w-[892px] max-h-[90vh] overflow-y-auto">
      <ModalHeader>
        <ModalTitle class="text-2xl font-semibold">
          {{ isEditMode ? 'Edit driver' : 'Add driver' }}
        </ModalTitle>
      </ModalHeader>

      <form @submit.prevent="handleSubmit" class="space-y-6 mt-4">
        <!-- Row 1: Username & Password -->
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="username">Username</Label>
            <Input
              id="username"
              v-model="formData.username"
              placeholder="Username"
              :class="errors.username && 'border-red-500'"
              :disabled="isSubmitting"
              @input="clearError('username')"
            />
            <p v-if="errors.username" class="text-sm text-red-600 dark:text-red-400">{{ errors.username }}</p>
          </div>

          <div class="space-y-2">
            <Label for="password">Password</Label>
            <Input
              id="password"
              v-model="formData.password"
              type="password"
              placeholder="Password"
              :class="errors.password && 'border-red-500'"
              :disabled="isSubmitting || isEditMode"
              @input="clearError('password')"
            />
            <p v-if="errors.password" class="text-sm text-red-600 dark:text-red-400">{{ errors.password }}</p>
          </div>
        </div>

        <!-- Row 2: Confirm Password -->
        <div v-if="!isEditMode" class="space-y-2">
          <Label for="confirmPassword">Confirm password</Label>
          <Input
            id="confirmPassword"
            v-model="formData.confirmPassword"
            type="password"
            placeholder="Confirm password"
            :class="errors.confirmPassword && 'border-red-500'"
            :disabled="isSubmitting"
            @input="clearError('confirmPassword')"
          />
          <p v-if="errors.confirmPassword" class="text-sm text-red-600 dark:text-red-400">
            {{ errors.confirmPassword }}
          </p>
        </div>

        <!-- Row 3: First & Last Name -->
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="firstName">First name</Label>
            <Input
              id="firstName"
              v-model="formData.firstName"
              placeholder="First name"
              :class="errors.firstName && 'border-red-500'"
              :disabled="isSubmitting"
              @input="clearError('firstName')"
            />
            <p v-if="errors.firstName" class="text-sm text-red-600 dark:text-red-400">{{ errors.firstName }}</p>
          </div>

          <div class="space-y-2">
            <Label for="lastName">Last name</Label>
            <Input
              id="lastName"
              v-model="formData.lastName"
              placeholder="Last name"
              :class="errors.lastName && 'border-red-500'"
              :disabled="isSubmitting"
              @input="clearError('lastName')"
            />
            <p v-if="errors.lastName" class="text-sm text-red-600 dark:text-red-400">{{ errors.lastName }}</p>
          </div>
        </div>

        <!-- Row 4: Phone & Email -->
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="phoneNumber">Phone number</Label>
            <Input
              id="phoneNumber"
              v-model="formData.phoneNumber"
              placeholder="Phone number"
              :class="errors.phoneNumber && 'border-red-500'"
              :disabled="isSubmitting"
              @input="clearError('phoneNumber')"
            />
            <p v-if="errors.phoneNumber" class="text-sm text-red-600 dark:text-red-400">{{ errors.phoneNumber }}</p>
          </div>

          <div class="space-y-2">
            <Label for="email">Email</Label>
            <Input
              id="email"
              v-model="formData.email"
              type="email"
              placeholder="Email"
              :class="errors.email && 'border-red-500'"
              :disabled="isSubmitting"
              @input="clearError('email')"
            />
            <p v-if="errors.email" class="text-sm text-red-600 dark:text-red-400">{{ errors.email }}</p>
          </div>
        </div>

        <!-- Row 6: Home Terminal & Vehicles -->
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="homeTerminal">Home terminal</Label>
            <Select v-model="formData.homeTerminal" :disabled="isSubmitting" @update:model-value="clearError('homeTerminal')">
              <SelectTrigger id="homeTerminal" :class="errors.homeTerminal && 'border-red-500'">
                <SelectValue placeholder="Select terminal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="option in homeTerminals" :key="option.id" :value="option.id">
                  {{ option.name }}
                </SelectItem>
              </SelectContent>
            </Select>
            <p v-if="errors.homeTerminal" class="text-sm text-red-600 dark:text-red-400">{{ errors.homeTerminal }}</p>
            <p v-else-if="homeTerminals.length === 0" class="text-sm text-amber-600 dark:text-amber-400">
              No home terminal is configured for this carrier. Add one on the Company page first.
            </p>
          </div>

          <div class="space-y-2">
            <Label for="vehicles">Vehicles</Label>
            <select
              id="vehicles"
              v-model="formData.vehicles"
              multiple
              :disabled="isSubmitting"
              class="flex min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option v-for="vehicle in vehicles" :key="vehicle.id" :value="vehicle.id">
                {{ vehicle.unit }}{{ vehicle.make ? ` — ${vehicle.make} ${vehicle.model || ''}` : '' }}
              </option>
            </select>
            <p class="text-xs text-muted-foreground">Hold Ctrl (Windows) or Command (Mac) to select multiple vehicles.</p>
          </div>
        </div>

        <!-- Row 7: Issuer States -->
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="issuerStateParent">Issuer state parent</Label>
            <Select v-model="formData.issuerStateParent" :disabled="isSubmitting" @update:model-value="clearError('issuerStateParent')">
              <SelectTrigger id="issuerStateParent" :class="errors.issuerStateParent && 'border-red-500'">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="option in issuerStateParents" :key="option.id" :value="option.id">
                  {{ option.name }}
                </SelectItem>
              </SelectContent>
            </Select>
            <p v-if="errors.issuerStateParent" class="text-sm text-red-600 dark:text-red-400">{{ errors.issuerStateParent }}</p>
          </div>

          <div class="space-y-2">
            <Label for="issuerState">Issuer state</Label>
            <Select v-model="formData.issuerState" :disabled="isSubmitting || !formData.issuerStateParent" @update:model-value="clearError('issuerState')">
              <SelectTrigger id="issuerState" :class="errors.issuerState && 'border-red-500'">
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="option in filteredIssuerStates" :key="option.id" :value="option.id">
                  {{ option.name }}{{ option.stateCode ? ` (${option.stateCode})` : '' }}
                </SelectItem>
              </SelectContent>
            </Select>
            <p v-if="errors.issuerState" class="text-sm text-red-600 dark:text-red-400">{{ errors.issuerState }}</p>
          </div>
        </div>

        <!-- Row 8: Driver License Number -->
        <div class="space-y-2">
          <Label for="driverLicenseNumber">Driver license number</Label>
          <Input
            id="driverLicenseNumber"
            v-model="formData.driverLicenseNumber"
            placeholder="Driver license number"
            :class="errors.driverLicenseNumber && 'border-red-500'"
            :disabled="isSubmitting"
            @input="clearError('driverLicenseNumber')"
          />
          <p v-if="errors.driverLicenseNumber" class="text-sm text-red-600 dark:text-red-400">{{ errors.driverLicenseNumber }}</p>
        </div>

        <!-- Home Terminal Checkboxes -->
        <div class="space-y-3">
          <Label>Home terminal</Label>
          <div class="grid grid-cols-3 gap-2">
            <div class="flex items-center space-x-2">
              <Label
                for="exemptDriver"
                class="bg-[#F7F7F7] dark:bg-gray-800 cursor-pointer w-full flex items-start gap-3 rounded-lg border dark:border-gray-700 p-3 has-[[aria-checked=true]]:border-blue-600 has-[[aria-checked=true]]:bg-blue-50 dark:has-[[aria-checked=true]]:border-blue-900 dark:has-[[aria-checked=true]]:bg-blue-950"
              >
                <Checkbox
                  id="exemptDriver"
                  v-model:checked="formData.exemptDriver"
                  :disabled="isSubmitting"
                  class="data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white dark:data-[state=checked]:border-blue-700 dark:data-[state=checked]:bg-blue-700"
                />
                <div class="grid gap-1.5 font-normal">
                  <p class="text-sm leading-none font-normal dark:text-gray-200">Exempt driver</p>
                </div>
              </Label>
            </div>

            <div class="flex items-center">
              <Label
                for="shortHaulException"
                class="bg-[#F7F7F7] dark:bg-gray-800 cursor-pointer w-full flex items-start gap-3 rounded-lg border dark:border-gray-700 p-3 has-[[aria-checked=true]]:border-blue-600 has-[[aria-checked=true]]:bg-blue-50 dark:has-[[aria-checked=true]]:border-blue-900 dark:has-[[aria-checked=true]]:bg-blue-950"
              >
                <Checkbox
                  id="shortHaulException"
                  v-model:checked="formData.shortHaulException"
                  :disabled="isSubmitting"
                  class="data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white dark:data-[state=checked]:border-blue-700 dark:data-[state=checked]:bg-blue-700"
                />
                <div class="grid gap-1.5 font-normal">
                  <p class="text-sm leading-none font-normal dark:text-gray-200">Short haul exception</p>
                </div>
              </Label>
            </div>

            <div class="flex items-center space-x-2">
              <Label
                for="allowPersonalUse"
                class="bg-[#F7F7F7] dark:bg-gray-800 cursor-pointer w-full flex items-start gap-3 rounded-lg border dark:border-gray-700 p-3 has-[[aria-checked=true]]:border-blue-600 has-[[aria-checked=true]]:bg-blue-50 dark:has-[[aria-checked=true]]:border-blue-900 dark:has-[[aria-checked=true]]:bg-blue-950"
              >
                <Checkbox
                  id="allowPersonalUse"
                  v-model:checked="formData.allowPersonalUse"
                  :disabled="isSubmitting"
                  class="data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white dark:data-[state=checked]:border-blue-700 dark:data-[state=checked]:bg-blue-700"
                />
                <div class="grid gap-1.5 font-normal">
                  <p class="text-sm leading-none font-normal dark:text-gray-200">Allow personal use</p>
                </div>
              </Label>
            </div>

            <div class="flex items-center space-x-2">
              <Label
                for="allowYardMove"
                class="bg-[#F7F7F7] dark:bg-gray-800 cursor-pointer w-full flex items-start gap-3 rounded-lg border dark:border-gray-700 p-3 has-[[aria-checked=true]]:border-blue-600 has-[[aria-checked=true]]:bg-blue-50 dark:has-[[aria-checked=true]]:border-blue-900 dark:has-[[aria-checked=true]]:bg-blue-950"
              >
                <Checkbox
                  id="allowYardMove"
                  v-model:checked="formData.allowYardMove"
                  :disabled="isSubmitting"
                  class="data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white dark:data-[state=checked]:border-blue-700 dark:data-[state=checked]:bg-blue-700"
                />
                <div class="grid gap-1.5 font-normal">
                  <p class="text-sm leading-none font-normal dark:text-gray-200">Allow yard move</p>
                </div>
              </Label>
            </div>

            <div class="flex items-center space-x-2">
              <Label
                for="unlimitedTrailers"
                class="bg-[#F7F7F7] dark:bg-gray-800 cursor-pointer w-full flex items-start gap-3 rounded-lg border dark:border-gray-700 p-3 has-[[aria-checked=true]]:border-blue-600 has-[[aria-checked=true]]:bg-blue-50 dark:has-[[aria-checked=true]]:border-blue-900 dark:has-[[aria-checked=true]]:bg-blue-950"
              >
                <Checkbox
                  id="unlimitedTrailers"
                  v-model:checked="formData.unlimitedTrailers"
                  :disabled="isSubmitting"
                  class="data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white dark:data-[state=checked]:border-blue-700 dark:data-[state=checked]:bg-blue-700"
                />
                <div class="grid gap-1.5 font-normal">
                  <p class="text-sm leading-none font-normal dark:text-gray-200">Unlimited trailers</p>
                </div>
              </Label>
            </div>

            <div class="flex items-center space-x-2">
              <Label
                for="unlimitedShippingDocuments"
                class="bg-[#F7F7F7] dark:bg-gray-800 cursor-pointer w-full flex items-start gap-3 rounded-lg border dark:border-gray-700 p-3 has-[[aria-checked=true]]:border-blue-600 has-[[aria-checked=true]]:bg-blue-50 dark:has-[[aria-checked=true]]:border-blue-900 dark:has-[[aria-checked=true]]:bg-blue-950"
              >
                <Checkbox
                  id="unlimitedShippingDocuments"
                  v-model:checked="formData.unlimitedShippingDocuments"
                  :disabled="isSubmitting"
                  class="data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white dark:data-[state=checked]:border-blue-700 dark:data-[state=checked]:bg-blue-700"
                />
                <div class="grid gap-1.5 font-normal">
                  <p class="text-sm leading-none font-normal dark:text-gray-200">Unlimited shipping documents</p>
                </div>
              </Label>
            </div>
          </div>
        </div>

        <!-- Row 9: HOS Roles & Cargo Type -->
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="hosRoles">HOS roles</Label>
            <Select v-model="formData.hosRoles" :disabled="isSubmitting" @update:model-value="clearError('hosRoles')">
              <SelectTrigger id="hosRoles" :class="errors.hosRoles && 'border-red-500'">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="option in hosRoles" :key="option.id" :value="option.id">
                  {{ option.name }}
                </SelectItem>
              </SelectContent>
            </Select>
            <p v-if="errors.hosRoles" class="text-sm text-red-600 dark:text-red-400">{{ errors.hosRoles }}</p>
          </div>

          <div class="space-y-2">
            <Label for="cargoType">Cargo type</Label>
            <Select v-model="formData.cargoType" :disabled="isSubmitting" @update:model-value="clearError('cargoType')">
              <SelectTrigger id="cargoType" :class="errors.cargoType && 'border-red-500'">
                <SelectValue placeholder="Select cargo type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="option in cargoTypes" :key="option.id" :value="option.id">
                  {{ option.name }}
                </SelectItem>
              </SelectContent>
            </Select>
            <p v-if="errors.cargoType" class="text-sm text-red-600 dark:text-red-400">{{ errors.cargoType }}</p>
          </div>
        </div>

        <!-- Row 10: Restart & Rest Break -->
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="restart">Restart</Label>
            <Select v-model="formData.restart" :disabled="isSubmitting" @update:model-value="clearError('restart')">
              <SelectTrigger id="restart" :class="errors.restart && 'border-red-500'">
                <SelectValue placeholder="Select restart" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="option in restarts" :key="option.id" :value="option.id">
                  {{ option.name }}
                </SelectItem>
              </SelectContent>
            </Select>
            <p v-if="errors.restart" class="text-sm text-red-600 dark:text-red-400">{{ errors.restart }}</p>
          </div>

          <div class="space-y-2">
            <Label for="restBreak">Rest break</Label>
            <Select v-model="formData.restBreak" :disabled="isSubmitting" @update:model-value="clearError('restBreak')">
              <SelectTrigger id="restBreak" :class="errors.restBreak && 'border-red-500'">
                <SelectValue placeholder="Select break" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="option in restBreaks" :key="option.id" :value="option.id">
                  {{ option.name }}
                </SelectItem>
              </SelectContent>
            </Select>
            <p v-if="errors.restBreak" class="text-sm text-red-600 dark:text-red-400">{{ errors.restBreak }}</p>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" @click="handleClose" :disabled="isSubmitting">
            Cancel
          </Button>
          <Button type="submit" class="bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-gray-200 dark:text-gray-900" :disabled="isSubmitting">
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
        </div>
      </form>
    </ModalContent>
  </Modal>
</template>
