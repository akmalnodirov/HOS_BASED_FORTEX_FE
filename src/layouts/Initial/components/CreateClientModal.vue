<!-- src/components/modals/AddClientModal.vue -->
<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { Eye, EyeOff } from 'lucide-vue-next'
import {
  Modal,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from '@/components/custom/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useApi } from '@/composables/useAxiosService'
import { toast } from 'vue-sonner'

interface Props {
  open: boolean
}

interface FormData {
  companyName: string
  phone: string
  email: string
  password: string
  permissions: {
    all: boolean
    monitoring: boolean
    audit: boolean
    statisticsAdmin: boolean
    activity: boolean
    dotInspection: boolean
    users: boolean
    statisticsCompany: boolean
  }
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submit'): void
}>()

const api = useApi()

const formData = ref<FormData>({
  companyName: '',
  phone: '',
  email: '',
  password: '',
  permissions: {
    all: false,
    monitoring: false,
    audit: false,
    statisticsAdmin: false,
    activity: false,
    dotInspection: false,
    users: false,
    statisticsCompany: false,
  },
})

const errors = ref<Partial<Record<keyof FormData | 'permissions', string>>>({})
const isSubmitting = ref(false)
const showPassword = ref(false)

// Reset form when modal opens/closes
watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) {
      resetForm()
    }
  }
)

// Track if we're updating from "All" toggle to prevent infinite loop
const isUpdatingFromAll = ref(false)

// Watch "All" toggle and sync all other toggles
watch(
  () => formData.value.permissions.all,
  (newValue) => {
    if (isUpdatingFromAll.value) return

    isUpdatingFromAll.value = true
    // Use nextTick to ensure the change is applied after the current update
    nextTick(() => {
      formData.value.permissions.monitoring = newValue
      formData.value.permissions.audit = newValue
      formData.value.permissions.statisticsAdmin = newValue
      formData.value.permissions.activity = newValue
      formData.value.permissions.dotInspection = newValue
      formData.value.permissions.users = newValue
      formData.value.permissions.statisticsCompany = newValue
      clearError('permissions')
      isUpdatingFromAll.value = false
    })
  }
)

const resetForm = () => {
  formData.value = {
    companyName: '',
    phone: '',
    email: '',
    password: '',
    permissions: {
      all: false,
      monitoring: false,
      audit: false,
      statisticsAdmin: false,
      activity: false,
      dotInspection: false,
      users: false,
      statisticsCompany: false,
    },
  }
  errors.value = {}
  showPassword.value = false
}

const validateForm = (): boolean => {
  errors.value = {}
  let isValid = true

  // Company name validation
  if (!formData.value.companyName.trim()) {
    errors.value.companyName = 'Company name is required'
    isValid = false
  }

  // Phone validation - US format: +1 (XXX) XXX-XXXX or (XXX) XXX-XXXX
  if (!formData.value.phone.trim()) {
    errors.value.phone = 'Phone is required'
    isValid = false
  } else if (!/^(\+1 )?\(\d{3}\) \d{3}-\d{4}$/.test(formData.value.phone)) {
    errors.value.phone = 'Phone must be in format +1 (XXX) XXX-XXXX or (XXX) XXX-XXXX'
    isValid = false
  }

  // Email validation
  if (!formData.value.email.trim()) {
    errors.value.email = 'Email is required'
    isValid = false
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.value.email)) {
    errors.value.email = 'Invalid email format'
    isValid = false
  }

  // Password validation
  if (!formData.value.password) {
    errors.value.password = 'Password is required'
    isValid = false
  } else if (formData.value.password.length < 6) {
    errors.value.password = 'Password must be at least 6 characters'
    isValid = false
  }

  // Home terminal validation - at least one must be selected
  const hasPermission = Object.values(formData.value.permissions).some((p) => p === true)
  if (!hasPermission) {
    errors.value.permissions = 'At least one home terminal permission must be selected'
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
    // Remove formatting from phone number
    const phoneNumber = formData.value.phone.replace(/\D/g, '')

    // Prepare API payload
    const payload = {
      companyName: formData.value.companyName,
      phone: phoneNumber,
      email: formData.value.email,
      password: formData.value.password,
      permissions: formData.value.permissions,
    }

    // Make API call
    await api.post('/api/providers', payload, {
      _showSuccessToast: true,
      _successMessage: 'Client created successfully',
    })

    // Success
    emit('submit')
    handleClose()
  } catch (error: any) {
    console.error('Error creating client:', error)

    // Handle API errors
    const errorMessage =
      error.response?.data?.message || 'Failed to create client. Please try again.'
    toast.error(errorMessage)

    if (error.response?.data?.message) {
      errors.value.email = error.response.data.message
    }
  } finally {
    isSubmitting.value = false
  }
}

const handleClose = () => {
  if (!isSubmitting.value) {
    emit('close')
  }
}

const clearError = (field: keyof FormData | 'permissions') => {
  delete errors.value[field]
}

const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value
}

// Format phone number to US format: +1 (XXX) XXX-XXXX
const formatPhoneNumber = (value: string): string => {
  // Remove all non-digit characters
  const digits = value.replace(/\D/g, '')

  // Remove leading 1 if present (country code)
  let phoneDigits = digits
  if (digits.length > 0 && digits[0] === '1') {
    phoneDigits = digits.slice(1)
  }

  // Limit to 10 digits for phone number
  const limitedDigits = phoneDigits.slice(0, 10)

  // Always format with +1 prefix
  if (limitedDigits.length === 0) {
    return '+1 '
  } else if (limitedDigits.length <= 3) {
    return `+1 (${limitedDigits}`
  } else if (limitedDigits.length <= 6) {
    return `+1 (${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3)}`
  } else {
    return `+1 (${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3, 6)}-${limitedDigits.slice(6)}`
  }
}

const handlePhoneInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  const formatted = formatPhoneNumber(target.value)
  formData.value.phone = formatted
  clearError('phone')
}

// Handle "All" toggle - when All is toggled, toggle all others
// Note: This is now handled by watch, but we keep it for clarity
const handleAllToggle = () => {
  clearError('permissions')
}

// Handle individual toggle - update "All" based on other toggles
const handlePermissionToggle = () => {
  if (isUpdatingFromAll.value) return

  const { all, ...others } = formData.value.permissions
  formData.value.permissions.all = Object.values(others).every((p) => p === true)
  clearError('permissions')
}
</script>

<template>
  <Modal :open="open" @update:open="handleClose">
    <ModalContent max-width="4xl">
      <ModalHeader>
        <ModalTitle class="text-2xl font-semibold text-foreground">Add client</ModalTitle>
      </ModalHeader>

      <form @submit.prevent="handleSubmit" class="space-y-6 mt-4">
        <!-- Row 1: Company name & Phone -->
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="companyName">Company name</Label>
            <Input
              id="companyName"
              v-model="formData.companyName"
              placeholder="Company name"
              :class="errors.companyName && 'border-destructive'"
              :disabled="isSubmitting"
              @input="clearError('companyName')"
            />
            <p v-if="errors.companyName" class="text-sm text-destructive">
              {{ errors.companyName }}
            </p>
          </div>

          <div class="space-y-2">
            <Label for="phone">Phone</Label>
            <Input
              id="phone"
              v-model="formData.phone"
              placeholder="+1 (XXX) XXX-XXXX"
              type="tel"
              maxlength="17"
              :class="errors.phone && 'border-destructive'"
              :disabled="isSubmitting"
              @input="handlePhoneInput"
            />
            <p v-if="errors.phone" class="text-sm text-destructive">
              {{ errors.phone }}
            </p>
          </div>
        </div>

        <!-- Row 2: Email & Password -->
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="email">Email</Label>
            <Input
              id="email"
              v-model="formData.email"
              type="email"
              placeholder="Email"
              :class="errors.email && 'border-destructive'"
              :disabled="isSubmitting"
              @input="clearError('email')"
            />
            <p v-if="errors.email" class="text-sm text-destructive">{{ errors.email }}</p>
          </div>

          <div class="space-y-2">
            <Label for="password">Password</Label>
            <div class="relative">
              <Input
                id="password"
                v-model="formData.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Password"
                :class="errors.password && 'border-destructive'"
                :disabled="isSubmitting"
                @input="clearError('password')"
                class="pr-10"
              />
              <button
                type="button"
                @click="togglePasswordVisibility"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                :disabled="isSubmitting"
              >
                <Eye v-if="!showPassword" class="w-4 h-4" />
                <EyeOff v-else class="w-4 h-4" />
              </button>
            </div>
            <p v-if="errors.password" class="text-sm text-destructive">{{ errors.password }}</p>
          </div>
        </div>

        <!-- Home terminal permissions -->
        <div class="space-y-3">
          <Label>Home terminal</Label>

          <!-- Row 1 -->
          <div class="grid grid-cols-4 gap-3">
            <div class="flex items-center justify-between p-3 border border-border rounded-lg">
              <Label for="all" class="cursor-pointer text-sm font-normal">All</Label>
              <Switch
                id="all"
                v-model:checked="formData.permissions.all"
                :disabled="isSubmitting"
                @update:checked="handleAllToggle"
              />
            </div>

            <div class="flex items-center justify-between p-3 border border-border rounded-lg">
              <Label for="monitoring" class="cursor-pointer text-sm font-normal">Monitoring</Label>
              <Switch
                id="monitoring"
                v-model:checked="formData.permissions.monitoring"
                :disabled="isSubmitting"
                @update:checked="handlePermissionToggle"
              />
            </div>

            <div class="flex items-center justify-between p-3 border border-border rounded-lg">
              <Label for="audit" class="cursor-pointer text-sm font-normal">Audit</Label>
              <Switch
                id="audit"
                v-model:checked="formData.permissions.audit"
                :disabled="isSubmitting"
                @update:checked="handlePermissionToggle"
              />
            </div>

            <div class="flex items-center justify-between p-3 border border-border rounded-lg">
              <Label for="statisticsAdmin" class="cursor-pointer text-sm font-normal">
                Statistics admin
              </Label>
              <Switch
                id="statisticsAdmin"
                v-model:checked="formData.permissions.statisticsAdmin"
                :disabled="isSubmitting"
                @update:checked="handlePermissionToggle"
              />
            </div>
          </div>

          <!-- Row 2 -->
          <div class="grid grid-cols-4 gap-3">
            <div class="flex items-center justify-between p-3 border border-border rounded-lg">
              <Label for="activity" class="cursor-pointer text-sm font-normal">Activity</Label>
              <Switch
                id="activity"
                v-model:checked="formData.permissions.activity"
                :disabled="isSubmitting"
                @update:checked="handlePermissionToggle"
              />
            </div>

            <div class="flex items-center justify-between p-3 border border-border rounded-lg">
              <Label for="dotInspection" class="cursor-pointer text-sm font-normal">
                Dot Inspection
              </Label>
              <Switch
                id="dotInspection"
                v-model:checked="formData.permissions.dotInspection"
                :disabled="isSubmitting"
                @update:checked="handlePermissionToggle"
              />
            </div>

            <div class="flex items-center justify-between p-3 border border-border rounded-lg">
              <Label for="users" class="cursor-pointer text-sm font-normal">Users</Label>
              <Switch
                id="users"
                v-model:checked="formData.permissions.users"
                :disabled="isSubmitting"
                @update:checked="handlePermissionToggle"
              />
            </div>

            <div class="flex items-center justify-between p-3 border border-border rounded-lg">
              <Label for="statisticsCompany" class="cursor-pointer text-sm font-normal">
                Statistics company
              </Label>
              <Switch
                id="statisticsCompany"
                v-model:checked="formData.permissions.statisticsCompany"
                :disabled="isSubmitting"
                @update:checked="handlePermissionToggle"
              />
            </div>
          </div>

          <p v-if="errors.permissions" class="text-sm text-destructive">
            {{ errors.permissions }}
          </p>
        </div>

        <!-- Actions -->
        <ModalFooter class="pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            @click="handleClose"
            :disabled="isSubmitting"
            class="border-border"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            class="bg-primary text-primary-foreground hover:bg-primary/90"
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
