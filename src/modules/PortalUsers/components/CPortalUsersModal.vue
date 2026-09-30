<template>
  <Modal :open="open" @update:open="handleClose">
    <ModalContent class="max-w-[800px]">
      <ModalHeader>
        <ModalTitle class="text-2xl font-semibold">
          {{ isEditMode ? 'Edit user' : 'Add user' }}
        </ModalTitle>
      </ModalHeader>

      <form @submit.prevent="handleSubmit" class="space-y-6 mt-4">
        <div class="grid grid-cols-2 gap-4">
          <!-- Left Column -->
          <div class="space-y-4">
            <div class="space-y-2">
              <Label for="name">Name</Label>
              <Input
                id="name"
                v-model="formData.name"
                placeholder="Name"
                :class="errors.name && 'border-red-500'"
                :disabled="isSubmitting"
                @input="clearError('name')"
              />
              <p v-if="errors.name" class="text-sm text-red-600 dark:text-red-400">{{ errors.name }}</p>
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
              <p v-if="errors.password" class="text-sm text-red-600 dark:text-red-400">
                {{ errors.password }}
              </p>
            </div>
          </div>

          <!-- Right Column -->
          <div class="space-y-4">
            <div class="space-y-2">
              <Label for="phoneNumber">Phone number</Label>
              <Input
                id="phoneNumber"
                v-model="formData.phoneNumber"
                type="tel"
                placeholder="Phone number"
                :class="errors.phoneNumber && 'border-red-500'"
                :disabled="isSubmitting"
                @input="clearError('phoneNumber')"
              />
              <p v-if="errors.phoneNumber" class="text-sm text-red-600 dark:text-red-400">
                {{ errors.phoneNumber }}
              </p>
            </div>

            <div class="space-y-2">
              <Label for="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                v-model="formData.confirmPassword"
                type="password"
                placeholder="Confirm password"
                :class="errors.confirmPassword && 'border-red-500'"
                :disabled="isSubmitting || isEditMode"
                @input="clearError('confirmPassword')"
              />
              <p v-if="errors.confirmPassword" class="text-sm text-red-600 dark:text-red-400">
                {{ errors.confirmPassword }}
              </p>
            </div>

            <div class="space-y-2">
              <Label for="role">Role</Label>
              <Select
                v-model="formData.role"
                :disabled="isSubmitting || isLoadingRoles"
                @update:model-value="clearError('role')"
              >
                <SelectTrigger id="role" :class="errors.role && 'border-red-500'">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="role in roles" :key="role.id" :value="role.name">
                    {{ role.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
              <p v-if="errors.role" class="text-sm text-red-600 dark:text-red-400">{{ errors.role }}</p>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" @click="handleClose" :disabled="isSubmitting">
            Cancel
          </Button>
          <Button
            type="submit"
            class="bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-gray-200 dark:text-gray-900"
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
        </div>
      </form>
    </ModalContent>
  </Modal>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
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
import { Modal, ModalContent, ModalHeader, ModalTitle } from '@/components/custom/modal'
import type { PortalUser, PortalUserFormData, Role } from '@/modules/PortalUsers/types'

interface Props {
  open: boolean
  user?: PortalUser | null
  roles?: Role[]
  isLoadingRoles?: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', data: PortalUserFormData): void
}>()

const isEditMode = computed(() => !!props.user)

const formData = ref<PortalUserFormData>({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: '',
  phoneNumber: '',
})

const errors = ref<Partial<Record<keyof PortalUserFormData, string>>>({})
const isSubmitting = ref(false)

// Load form data when user prop changes
watch(
  () => props.user,
  (user) => {
    if (user) {
      formData.value = {
        name: user.name,
        email: user.email,
        password: '',
        confirmPassword: '',
        role: user.role,
        phoneNumber: user.phoneNumber,
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
    } else if (!props.user) {
      resetForm()
    }
  }
)

const resetForm = () => {
  formData.value = {
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: '',
    phoneNumber: '',
  }
  errors.value = {}
}

const validateForm = (): boolean => {
  errors.value = {}
  let isValid = true

  // Name validation
  if (!formData.value.name.trim()) {
    errors.value.name = 'Name is required'
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

  // Password validation (only for new users)
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

  // Phone number validation
  if (formData.value.phoneNumber && !/^[\d\s\-()]+$/.test(formData.value.phoneNumber)) {
    errors.value.phoneNumber = 'Invalid phone number format'
    isValid = false
  }

  // Role validation
  if (!formData.value.role) {
    errors.value.role = 'Role is required'
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
    await new Promise((resolve) => setTimeout(resolve, 1000))
    emit('save', { ...formData.value })
  } catch (error) {
    console.error('Error saving user:', error)
  } finally {
    isSubmitting.value = false
  }
}

const handleClose = () => {
  if (!isSubmitting.value) {
    emit('close')
  }
}

const clearError = (field: keyof PortalUserFormData) => {
  delete errors.value[field]
}
</script>

