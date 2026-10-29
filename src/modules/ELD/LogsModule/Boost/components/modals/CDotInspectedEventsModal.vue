<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="max-h-[85vh] overflow-hidden sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>DOT inspected events</DialogTitle>
        <DialogDescription>
          Frozen events in the current log. Select one to locate it.
        </DialogDescription>
      </DialogHeader>

      <div class="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
        <button
          v-for="item in rows"
          :key="item.id"
          type="button"
          class="flex w-full cursor-pointer items-center justify-between gap-3 rounded-md border border-blue-200 bg-blue-50 p-3 text-left transition-colors hover:border-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:border-blue-900 dark:bg-blue-950/25"
          @click="$emit('select-event', item.id)"
        >
          <span class="flex min-w-0 items-start gap-2">
            <LockKeyhole class="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
            <span class="min-w-0">
              <span class="block text-xs text-blue-700 dark:text-blue-300">{{ item.time }}</span>
              <span class="mt-0.5 block text-sm font-medium text-foreground">{{ item.event }}</span>
              <span class="mt-0.5 block font-mono text-[10px] text-muted-foreground">
                Seq {{ item.sequenceId }} · {{ item.source === 'MANUAL' ? 'Manual inspection' : 'Route ELD' }}
                <template v-if="item.driver"> · {{ item.driver }}</template>
              </span>
            </span>
          </span>
          <ChevronRight class="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
        </button>
        <p v-if="!rows.length" class="py-8 text-center text-sm text-muted-foreground">
          No DOT inspected events in this log.
        </p>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="$emit('update:open', false)">Close</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ChevronRight, LockKeyhole } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

defineProps<{
  open: boolean
  rows: Array<{
    id: string
    event: string
    time: string
    sequenceId: string
    source?: string | null
    driver?: string
  }>
}>()

defineEmits<{
  'update:open': [value: boolean]
  'select-event': [eventId: string]
}>()
</script>
