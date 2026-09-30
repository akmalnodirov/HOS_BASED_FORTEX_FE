<!-- src/components/dotInspection/ConfirmModal.vue -->
<script setup lang="ts">
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-vue-next'

interface Props {
  open: boolean
  message: string
  loading?: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'confirm'): void
}>()
</script>

<template>
  <Dialog :open="open" @update:open="emit('close')">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle>Confirm Action</DialogTitle>
        <DialogDescription class="pt-4 text-base">
          {{ message }}
        </DialogDescription>
      </DialogHeader>

      <div class="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" :disabled="loading" @click="emit('close')">
          Cancel
        </Button>
        <Button
          :disabled="loading"
          class="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          @click="emit('confirm')"
        >
          <Loader2 v-if="loading" class="w-4 h-4 mr-2 animate-spin" />
          Confirm
        </Button>
      </div>
    </DialogContent>
  </Dialog>
</template>
