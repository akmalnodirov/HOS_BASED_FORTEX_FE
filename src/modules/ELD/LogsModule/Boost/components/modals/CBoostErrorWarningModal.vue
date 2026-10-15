<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="gap-0 overflow-hidden p-0 sm:max-w-[800px]">
      <DialogHeader class="border-b px-6 py-4">
        <DialogTitle class="text-xl font-bold uppercase tracking-wide">
          Errors &amp; Warnings
        </DialogTitle>
      </DialogHeader>

      <div class="max-h-[52vh] overflow-y-auto px-6">
        <table class="w-full table-fixed border-collapse text-sm">
          <thead class="sticky top-0 z-10 bg-[#f8f9fd] dark:bg-muted">
            <tr class="border-b">
              <th class="w-24 px-3 py-3 text-left text-xs font-medium text-muted-foreground">
                Seq ID
              </th>
              <th class="w-44 px-3 py-3 text-left text-xs font-medium text-muted-foreground">
                Event
              </th>
              <th class="w-36 px-3 py-3 text-left text-xs font-medium text-muted-foreground">
                Time
              </th>
              <th class="w-28 px-3 py-3 text-left text-xs font-medium text-muted-foreground">
                Type
              </th>
              <th class="px-3 py-3 text-left text-xs font-medium text-muted-foreground">Message</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(item, index) in rows"
              :key="`${item.id}-${item.severity}-${index}`"
              class="cursor-pointer border-b transition-colors"
              :class="
                item.severity === 'ERROR'
                  ? 'bg-red-50/70 hover:bg-red-100/80 dark:bg-red-950/20 dark:hover:bg-red-950/35'
                  : 'bg-amber-50/70 hover:bg-amber-100/80 dark:bg-amber-950/20 dark:hover:bg-amber-950/35'
              "
              @click="$emit('row-click', item.id)"
            >
              <td class="px-3 py-3 font-medium">{{ item.no }}</td>
              <td class="px-3 py-3">{{ item.event }}</td>
              <td class="px-3 py-3">{{ item.time }}</td>
              <td class="px-3 py-3">
                <span
                  class="inline-flex rounded px-2 py-0.5 text-[10px] font-semibold"
                  :class="
                    item.severity === 'ERROR'
                      ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                  "
                >
                  {{ item.severity === 'ERROR' ? 'Error' : 'Warning' }}
                </span>
              </td>
              <td class="px-3 py-3 leading-5">{{ item.message }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex items-center justify-between border-t bg-white px-6 py-4 dark:bg-card">
        <div class="flex items-center gap-4 text-xs font-medium">
          <span class="text-red-600">Errors: {{ errorCount }}</span>
          <span class="text-amber-600">Warnings: {{ warningCount }}</span>
        </div>
        <Button variant="outline" @click="$emit('update:open', false)">Close</Button>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export interface BoostIssueRow {
  id: string
  no: string
  event: string
  time: string
  severity: 'ERROR' | 'WARNING'
  message: string
}

const props = defineProps<{
  open: boolean
  rows: BoostIssueRow[]
}>()

defineEmits<{
  'update:open': [value: boolean]
  'row-click': [eventId: string]
}>()

const errorCount = computed(() => props.rows.filter((row) => row.severity === 'ERROR').length)
const warningCount = computed(() => props.rows.filter((row) => row.severity === 'WARNING').length)
</script>
