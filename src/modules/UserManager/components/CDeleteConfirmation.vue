<script setup lang="ts">
import { Button } from '@/components/ui/button'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalFooter,
} from '@/components/custom/modal'

interface Props {
  open: boolean
  title?: string
  description?: string
  isDeleting?: boolean
}

withDefaults(defineProps<Props>(), {
  title: 'Delete confirmation',
  description: 'Are you sure you want to delete this item? This action cannot be undone.',
  isDeleting: false,
})

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'confirm'): void
}>()
</script>

<template>
  <Modal :open="open" @update:open="emit('close')">
    <ModalContent class="max-w-100">
      <ModalHeader>
        <ModalTitle class="text-xl font-semibold">{{ title }}</ModalTitle>
      </ModalHeader>

      <div class="py-4">
        <p class="text-gray-600 dark:text-gray-400">
          {{ description }}
        </p>
      </div>

      <div class="flex justify-end gap-3 pt-2">
        <Button variant="outline" @click="emit('close')" :disabled="isDeleting"> Cancel </Button>
        <Button
          variant="destructive"
          @click="emit('confirm')"
          :disabled="isDeleting"
          class="bg-[#AF4B4B] hover:bg-red-900 text-white"
        >
          <span v-if="!isDeleting">Delete</span>

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
            Deleting...
          </span>
        </Button>
      </div>
    </ModalContent>
  </Modal>
</template>
