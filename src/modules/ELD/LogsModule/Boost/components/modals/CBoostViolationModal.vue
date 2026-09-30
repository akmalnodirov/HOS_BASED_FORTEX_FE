<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="sm:max-w-125 p-0 gap-0 overflow-hidden">
      <!-- Header -->
      <DialogHeader class="px-6 py-4 border-b">
        <DialogTitle class="text-xl font-bold">Violation</DialogTitle>
      </DialogHeader>

      <!-- Content (List of violations) -->
      <div class="px-6 py-6 space-y-3">
        <div
          v-if="violations.length === 0"
          class="flex flex-col items-center justify-center py-8 text-center"
        >
          <div class="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <CheckCircle class="w-6 h-6 text-muted-foreground" />
          </div>
          <p class="text-sm font-medium text-foreground">No violations found</p>
          <p class="text-xs text-muted-foreground mt-1">This driver has no recorded violations.</p>
        </div>
        <div
          v-for="(item, index) in violations"
          :key="item.violationEventId ?? index"
          class="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-100 cursor-pointer hover:bg-red-100/80 transition-colors"
          @click="$emit('select-violation', item.violationEventId)"
        >
          <div>
            <div class="text-xs text-red-500 font-medium mb-1">
              {{ formatDate(item.startedAt) }}
            </div>
            <div class="text-sm font-bold text-foreground">
              {{ item.description?.description || item.description?.shortName || 'Violation' }}
            </div>
          </div>
          <ChevronRight class="w-5 h-5 text-red-400" />
        </div>
      </div>

      <!-- Footer -->
      <div class="px-6 py-4 border-t flex items-center justify-end gap-2 bg-white dark:bg-card">
        <Button variant="outline" @click="$emit('update:open', false)">Cancel</Button>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ChevronRight, CheckCircle } from 'lucide-vue-next'
import { formatTime } from '@/utils/time.ts'
import type { BoostViolationResponse } from '../../types/boost.ts'

defineProps<{
  open: boolean
  violations: BoostViolationResponse[]
}>()

defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'select-violation', violationEventId: string): void
}>()

const formatDate = (value: string) => formatTime(value, 'MMM D, YYYY hh:mm A')
</script>
