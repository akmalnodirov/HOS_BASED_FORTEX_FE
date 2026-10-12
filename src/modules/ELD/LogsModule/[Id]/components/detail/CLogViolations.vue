<template>
  <Dialog v-model:open="dialogOpen">
    <DialogTrigger as-child>
      <Button
        variant="outline"
        size="sm"
        class="h-8 border-red-200 px-2.5 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/70 dark:hover:bg-red-950/30"
      >
        <ShieldAlert class="h-4 w-4" />
        Violations {{ violations.length }}
      </Button>
    </DialogTrigger>

    <DialogContent class="max-h-[85vh] overflow-hidden sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>HOS violations</DialogTitle>
        <DialogDescription>
          Violations calculated for this log. Select one to locate its event.
        </DialogDescription>
      </DialogHeader>

      <div class="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
        <button
          v-for="violation in sortedViolations"
          :key="`${violation.type}-${violation.eventId}-${violation.startedAt}`"
          type="button"
          class="flex w-full cursor-pointer items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 p-3 text-left transition-colors hover:border-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 dark:border-red-900 dark:bg-red-950/25"
          @click="selectViolation(violation.eventId)"
        >
          <span>
            <span class="block text-xs text-red-600 dark:text-red-400">
              {{ formatViolationTime(violation) }}
            </span>
            <span class="mt-0.5 block text-sm font-medium text-foreground">
              {{ violation.title }}
            </span>
          </span>
          <ChevronRight class="h-4 w-4 shrink-0 text-red-500" />
        </button>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="dialogOpen = false">Close</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronRight, ShieldAlert } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import type { RouteEldCalculatedViolation, RouteEldEvent } from '../../types/routeEldDetail'

const props = defineProps<{
  violations: RouteEldCalculatedViolation[]
  events: RouteEldEvent[]
}>()

const emit = defineEmits<{
  selectEvent: [eventId: string]
}>()

const dialogOpen = ref(false)
const sortedViolations = computed(() =>
  [...props.violations].sort(
    (first, second) => first.startedAt - second.startedAt || first.title.localeCompare(second.title)
  )
)

function selectViolation(eventId: string) {
  dialogOpen.value = false
  emit('selectEvent', eventId)
}

function formatViolationTime(violation: RouteEldCalculatedViolation) {
  const timeZone = props.events.find((event) => event.id === violation.eventId)?.timeZone
  return new Intl.DateTimeFormat('en-US', {
    timeZone: zoneName(timeZone),
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(violation.startedAt)
}

function zoneName(code?: string | null) {
  return (
    (
      {
        ET: 'America/New_York',
        CT: 'America/Chicago',
        MT: 'America/Denver',
        PT: 'America/Los_Angeles',
        AT: 'America/Halifax',
        NT: 'America/St_Johns',
        AKT: 'America/Anchorage',
        HT: 'Pacific/Honolulu',
        AZ: 'America/Phoenix',
        SK: 'America/Regina',
      } as Record<string, string>
    )[code?.trim().toUpperCase() ?? ''] ?? 'America/Chicago'
  )
}
</script>
