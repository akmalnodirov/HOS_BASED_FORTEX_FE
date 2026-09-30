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
import CCustomCheckbox from '@/components/custom/CCustomCheckbox.vue'
import { Modal, ModalContent, ModalHeader, ModalTitle } from '@/components/custom/modal'
import type { PermissionResponse, RoleType, RoleFormData } from '../types'

interface Props {
  open: boolean
  role?: {
    id?: string | number
    name: string
    type?: number
    permissions?: PermissionResponse[]
  } | null
  roleTypes?: RoleType[]
  permissions?: PermissionResponse[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', data: RoleFormData): void
}>()

const isEditMode = computed(() => !!props.role)

const formData = ref<RoleFormData>({
  name: '',
  type: '',
  permissions: [],
})

const errors = ref<Partial<Record<keyof RoleFormData, string>>>({})
const isSubmitting = ref(false)

// Load form data when role prop changes
watch(
  () => props.role,
  (role) => {
    if (role) {
      formData.value = {
        name: role.name,
        type: role.type?.toString() || '',
        permissions: role.permissions?.map((p) => p.id) || [],
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
    } else if (!props.role) {
      resetForm()
    }
  }
)

const resetForm = () => {
  formData.value = {
    name: '',
    type: '',
    permissions: [],
  }
  errors.value = {}
}

const validateForm = (): boolean => {
  errors.value = {}
  let isValid = true

  if (!formData.value.name.trim()) {
    errors.value.name = 'Name is required'
    isValid = false
  }

  if (!formData.value.type) {
    errors.value.type = 'Type is required'
    isValid = false
  }

  return isValid
}

const togglePermission = (permissionId: string) => {
  const index = formData.value.permissions.indexOf(permissionId)
  if (index > -1) {
    formData.value.permissions.splice(index, 1)
  } else {
    formData.value.permissions.push(permissionId)
  }
}

const isPermissionSelected = (permissionId: string) => {
  return formData.value.permissions.includes(permissionId)
}

const handleSubmit = async () => {
  if (!validateForm()) {
    return
  }

  isSubmitting.value = true

  try {
    // Create a deep copy to prevent issues with array reference being cleared on modal close
    const dataToEmit: RoleFormData = {
      name: formData.value.name,
      type: formData.value.type,
      permissions: [...formData.value.permissions], // Copy array to avoid reference issues
    }
    emit('save', dataToEmit)
  } catch (error) {
    console.error('Error saving role:', error)
  } finally {
    isSubmitting.value = false
  }
}

const handleClose = () => {
  if (!isSubmitting.value) {
    emit('close')
  }
}

const clearError = (field: keyof RoleFormData) => {
  delete errors.value[field]
}
</script>

<template>
  <Modal :open="open" @update:open="handleClose">
    <ModalContent class="max-w-145 max-h-[90vh] overflow-y-auto">
      <ModalHeader>
        <ModalTitle class="text-xl font-semibold">
          {{ isEditMode ? 'Edit role' : 'Add role' }}
        </ModalTitle>
      </ModalHeader>

      <form @submit.prevent="handleSubmit" class="space-y-6 mt-4">
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
            <p v-if="errors.name" class="text-sm text-red-600 dark:text-red-400">
              {{ errors.name }}
            </p>
          </div>

          <div class="space-y-2">
            <Label for="type">Select type</Label>
            <Select
              v-model="formData.type"
              :disabled="isSubmitting"
              @update:model-value="clearError('type')"
            >
              <SelectTrigger id="type" :class="errors.type && 'border-red-500'">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="roleType in roleTypes"
                  :key="roleType.type"
                  :value="roleType.type.toString()"
                >
                  {{ roleType.name }}
                </SelectItem>
              </SelectContent>
            </Select>
            <p v-if="errors.type" class="text-sm text-red-600 dark:text-red-400">
              {{ errors.type }}
            </p>
          </div>

          <div class="space-y-2">
            <Label>Select permissions</Label>
            <div class="border rounded-md p-4 max-h-60 overflow-y-auto space-y-4">
              <div
                v-for="permission in permissions"
                :key="permission.id"
                class="flex items-center space-x-2 cursor-pointer"
                @click="togglePermission(permission.id)"
              >
                <CCustomCheckbox
                  :checked="isPermissionSelected(permission.id)"
                  @update:checked="togglePermission(permission.id)"
                />
                <span class="text-sm font-medium leading-none">
                  {{ permission.name }}
                </span>
              </div>
              <p v-if="!permissions || permissions.length === 0" class="text-sm text-gray-500">
                No permissions available
              </p>
            </div>
          </div>
        </div>

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
