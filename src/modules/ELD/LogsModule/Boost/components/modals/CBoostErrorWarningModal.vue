<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="gap-0 overflow-hidden p-0 sm:max-w-[800px]">
      <DialogHeader class="border-b px-5 py-4">
        <DialogTitle class="flex items-center gap-2 text-lg font-semibold">
          <CircleAlert class="h-5 w-5 text-amber-500" />
          Errors &amp; Warnings
        </DialogTitle>
      </DialogHeader>

      <div class="mx-5 my-4 max-h-[56vh] overflow-y-auto rounded-lg border bg-background">
        <table class="w-full table-fixed border-separate border-spacing-0 text-sm">
          <thead class="sticky top-0 z-10 bg-slate-50/95 shadow-sm backdrop-blur dark:bg-muted/95">
            <tr>
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
              class="group cursor-pointer bg-background transition-colors hover:bg-slate-50 dark:hover:bg-muted/40"
              @click="$emit('row-click', item.id)"
            >
              <td
                class="border-t px-3 py-3 font-mono text-xs font-semibold"
                :class="item.severity === 'ERROR' ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-amber-400'"
              >
                {{ item.no }}
              </td>
              <td class="border-t px-3 py-3 font-medium">{{ item.event }}</td>
              <td class="border-t px-3 py-3 text-xs text-muted-foreground">{{ item.time }}</td>
              <td class="border-t px-3 py-3">
                <span
                  class="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold"
                  :class="
                    item.severity === 'ERROR'
                      ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                  "
                >
                  <span class="h-1.5 w-1.5 rounded-full bg-current" />
                  {{ item.severity === 'ERROR' ? 'Error' : 'Warning' }}
                </span>
              </td>
              <td class="border-t px-3 py-3 leading-5 text-foreground">{{ item.message }}</td>
            </tr>
            <tr v-if="!rows.length">
              <td colspan="5" class="px-4 py-12 text-center text-sm text-muted-foreground">
                No errors or warnings in this period.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex items-center justify-between border-t bg-slate-50/70 px-5 py-3.5 dark:bg-card">
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
import { CircleAlert } from 'lucide-vue-next'

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
