<template>
  <Dialog :open="open" @update:open="(v) => emit('update:open', v)">
    <DialogContent class="max-w-4xl gap-0 overflow-hidden p-0">
      <DialogHeader class="border-b border-border px-6 py-5">
        <DialogTitle>Task history</DialogTitle>
        <DialogDescription>All status changes recorded for this task.</DialogDescription>
      </DialogHeader>
      <div class="max-h-[65vh] overflow-auto p-5">
        <div class="overflow-hidden rounded-xl border border-border">
          <table class="w-full min-w-[780px] text-sm">
            <thead class="sticky top-0 z-10 bg-muted text-muted-foreground shadow-sm">
              <tr class="border-b border-border text-left">
                <th class="w-14 px-4 py-3 font-medium">#</th>
                <th class="px-4 py-3 font-medium">Logbooker</th>
                <th class="px-4 py-3 font-medium">Status</th>
                <th class="px-4 py-3 font-medium">Start time</th>
                <th class="px-4 py-3 font-medium">End time</th>
                <th class="px-4 py-3 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(item, i) in history ?? []"
                :key="item.id"
                class="border-b border-border/60 last:border-b-0 hover:bg-muted/30"
              >
                <td class="px-4 py-3 text-muted-foreground">{{ i + 1 }}</td>
                <td class="px-4 py-3 font-medium">{{ actorName(item) }}</td>
                <td class="px-4 py-3">
                  <span :class="statusBadge(item.status).class">
                    {{ statusBadge(item.status).label }}
                  </span>
                </td>
                <td class="px-4 py-3 whitespace-nowrap">{{ formatDateTime(item.startTime) }}</td>
                <td class="px-4 py-3 whitespace-nowrap">{{ formatDateTime(item.endTime) }}</td>
                <td class="max-w-72 whitespace-normal px-4 py-3">{{ item.notes || '—' }}</td>
              </tr>
              <tr v-if="isPending">
                <td colspan="6" class="px-4 py-12 text-center text-muted-foreground">
                  <Loader2 class="mx-auto h-5 w-5 animate-spin" />
                </td>
              </tr>
              <tr v-else-if="!(history && history.length)">
                <td colspan="6" class="px-4 py-12 text-center text-muted-foreground">
                  No task history found.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Loader2 } from 'lucide-vue-next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useGetTaskHistory } from '@/modules/Report/composables/useGetTaskHistory'
import type { TaskHistoryItem } from '@/modules/Report/types'
import { operationDate } from '@/modules/Report/utils/operations'

const props = defineProps<{ open: boolean; taskId?: string }>()
const emit = defineEmits<{ (e: 'update:open', value: boolean): void }>()

const activeTaskId = computed(() => (props.open ? props.taskId : undefined))
const { data: history, isPending } = useGetTaskHistory(activeTaskId)

const badgeBase = 'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold'
const STATUS: Record<number, { label: string; class: string }> = {
  0: { label: 'HOLD', class: `${badgeBase} bg-red-500/15 text-red-600` },
  1: { label: 'WORKING', class: `${badgeBase} bg-blue-500/15 text-blue-600` },
  2: { label: 'COMPLETED', class: `${badgeBase} bg-emerald-500/15 text-emerald-600` },
  3: { label: 'ASSISTANT (HOLD)', class: `${badgeBase} bg-amber-500/15 text-amber-600` },
  4: { label: 'ASSISTANT (WORKING)', class: `${badgeBase} bg-indigo-500/15 text-indigo-600` },
  5: { label: 'ASSISTANT (COMPLETED)', class: `${badgeBase} bg-emerald-500/15 text-emerald-600` },
}

function statusBadge(status: number): { label: string; class: string } {
  return (
    STATUS[status] ?? {
      label: String(status),
      class: `${badgeBase} bg-muted text-muted-foreground`,
    }
  )
}

function actorName(item: TaskHistoryItem): string {
  const name = `${item.actor?.firstName ?? ''} ${item.actor?.lastName ?? ''}`.trim()
  return name || '—'
}

function formatDateTime(value?: string | null): string {
  return operationDate(value ?? undefined)
}
</script>

