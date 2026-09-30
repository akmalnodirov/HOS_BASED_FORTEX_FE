<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal, ModalContent, ModalHeader, ModalTitle } from '@/components/custom/modal'

export interface PermissionFormData {
  name: string
  code: string
}

interface Props {
  open: boolean
  permission?: { id?: string | number; name: string; code?: string } | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', data: PermissionFormData): void
}>()

const isEditMode = computed(() => !!props.permission)

const formData = ref<PermissionFormData>({
  name: '',
  code: '',
})

const errors = ref<Partial<Record<keyof PermissionFormData, string>>>({})
const isSubmitting = ref(false)

// Load form data when permission prop changes
watch(
  () => props.permission,
  (permission) => {
    if (permission) {
      formData.value = {
        name: permission.name,
        code: permission.code || '',
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
    } else if (!props.permission) {
      resetForm()
    }
  }
)

const resetForm = () => {
  formData.value = {
    name: '',
    code: '',
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

  if (!formData.value.code.trim()) {
    errors.value.code = 'Code is required'
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
    console.error('Error saving permission:', error)
  } finally {
    isSubmitting.value = false
  }
}

const handleClose = () => {
  if (!isSubmitting.value) {
    emit('close')
  }
}

const clearError = (field: keyof PermissionFormData) => {
  delete errors.value[field]
}
</script>

<template>
  <Modal :open="open" @update:open="handleClose">
    <ModalContent class="max-w-[500px]">
      <ModalHeader>
        <ModalTitle class="text-xl font-semibold">
          {{ isEditMode ? 'Edit permission' : 'Add permission' }}
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
            <p v-if="errors.name" class="text-sm text-red-600 dark:text-red-400">{{ errors.name }}</p>
          </div>

          <div class="space-y-2">
            <Label for="code">Code</Label>
            <Input
              id="code"
              v-model="formData.code"
              placeholder="Code"
              :class="errors.code && 'border-red-500'"
              :disabled="isSubmitting"
              @input="clearError('code')"
            />
            <p v-if="errors.code" class="text-sm text-red-600 dark:text-red-400">{{ errors.code }}</p>
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
