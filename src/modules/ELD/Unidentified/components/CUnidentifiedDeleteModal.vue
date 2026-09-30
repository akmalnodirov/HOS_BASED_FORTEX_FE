<script setup lang="ts">
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

interface Props {
  open: boolean
  count: number
  loading?: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'confirm'): void
}>()

const close = () => {
  emit('update:open', false)
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-[520px]">
      <DialogHeader>
        <DialogTitle>Delete unidentified events</DialogTitle>
      </DialogHeader>
      <Separator />
      <p class="text-center font-medium">
        Are you sure you want to delete unidentified events{{ count ? ` (${count})` : '' }}?
      </p>
      <div class="flex items-center justify-end gap-x-3">
        <Button variant="outline" @click="close">Cancel</Button>
        <Button
          variant="destructive"
          :loading="loading"
          :disabled="loading"
          @click="emit('confirm')"
        >
          Delete
        </Button>
      </div>
    </DialogContent>
  </Dialog>
</template>
