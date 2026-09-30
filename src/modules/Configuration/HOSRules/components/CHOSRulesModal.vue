<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal, ModalContent, ModalHeader, ModalTitle } from '@/components/custom/modal'

export interface HOSRuleFormData {
  name: string
}

interface Props {
  open: boolean
  hosRule?: { name: string } | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', data: HOSRuleFormData): void
}>()

const isEditMode = computed(() => !!props.hosRule)

const formData = ref<HOSRuleFormData>({
  name: '',
})

const errors = ref<Partial<Record<keyof HOSRuleFormData, string>>>({})
const isSubmitting = ref(false)

// Load form data when hosRule prop changes
watch(
  () => props.hosRule,
  (rule) => {
    if (rule) {
      formData.value = {
        name: rule.name,
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
    } else if (!props.hosRule) {
      resetForm()
    }
  }
)

const resetForm = () => {
  formData.value = {
    name: '',
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
  
  return isValid
}

const handleSubmit = async () => {
  if (!validateForm()) {
    return
  }

  isSubmitting.value = true

  try {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500))
    emit('save', { ...formData.value })
  } catch (error) {
    console.error('Error saving HOS rule:', error)
  } finally {
    isSubmitting.value = false
  }
}

const handleClose = () => {
  if (!isSubmitting.value) {
    emit('close')
  }
}

const clearError = (field: keyof HOSRuleFormData) => {
  delete errors.value[field]
}
</script>

<template>
  <Modal :open="open" @update:open="handleClose">
    <ModalContent class="max-w-[500px]">
      <ModalHeader>
        <ModalTitle class="text-xl font-semibold">
          {{ isEditMode ? 'Edit hos rules' : 'Add hos rules' }}
        </ModalTitle>
      </ModalHeader>

      <form @submit.prevent="handleSubmit" class="space-y-6 mt-4">
        <div class="space-y-4">
          <div class="space-y-2">
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
