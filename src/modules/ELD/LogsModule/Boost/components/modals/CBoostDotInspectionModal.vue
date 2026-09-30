<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="sm:max-w-[460px]">
      <DialogHeader>
        <DialogTitle>DOT Inspection Details</DialogTitle>
      </DialogHeader>

      <div v-if="inspection" class="space-y-3 text-sm">
        <div class="grid grid-cols-2 gap-2">
          <div>
            <p class="text-xs text-muted-foreground">Start Date</p>
            <p class="font-medium">{{ formatDate(inspection.startDate) }}</p>
          </div>
          <div>
            <p class="text-xs text-muted-foreground">End Date</p>
            <p class="font-medium">{{ formatDate(inspection.endDate) }}</p>
          </div>
        </div>
        <div>
          <p class="text-xs text-muted-foreground">Set Time</p>
          <p class="font-medium">{{ formatDate(inspection.dateTime, true) }}</p>
        </div>
        <div>
          <p class="text-xs text-muted-foreground">Driver</p>
          <p class="font-medium">{{ inspection.driverName }}</p>
        </div>
        <div>
          <p class="text-xs text-muted-foreground">Description</p>
          <p class="font-medium">{{ inspection.description || 'N/A' }}</p>
        </div>
      </div>

      <div v-else class="text-sm text-muted-foreground py-4 text-center">
        No inspection data available.
      </div>

      <DialogFooter>
        <Button @click="$emit('update:open', false)">Close</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import dayjs from 'dayjs'

defineProps<{
  open: boolean
  inspection: any | null
}>()

defineEmits<{
  'update:open': [value: boolean]
}>()

function formatDate(value: string | undefined, withTime = false) {
  if (!value) return 'N/A'
  return withTime ? dayjs(value).format('MMM D, YYYY h:mm A') : dayjs(value).format('MMM D, YYYY')
}
</script>
