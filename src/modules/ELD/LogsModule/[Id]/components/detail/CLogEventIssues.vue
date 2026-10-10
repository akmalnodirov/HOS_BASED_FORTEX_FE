<template>
  <div v-if="issueCounts.errors || issueCounts.warnings" class="flex flex-wrap items-center gap-2">
    <button
      v-if="issueCounts.errors"
      type="button"
      class="inline-flex cursor-pointer items-center gap-1 rounded border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 transition-colors hover:border-red-400 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-950/50"
      @click="openIssueList('ERROR')"
    >
      <CircleAlert class="h-3.5 w-3.5" />
      {{ issueCounts.errors }} {{ issueCounts.errors === 1 ? 'error' : 'errors' }}
    </button>

    <button
      v-if="issueCounts.warnings"
      type="button"
      class="inline-flex cursor-pointer items-center gap-1 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 transition-colors hover:border-amber-400 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300 dark:hover:bg-amber-950/50"
      @click="openIssueList('WARNING')"
    >
      <TriangleAlert class="h-3.5 w-3.5" />
      {{ issueCounts.warnings }} {{ issueCounts.warnings === 1 ? 'warning' : 'warnings' }}
    </button>
  </div>

  <Dialog v-model:open="dialogOpen">
    <DialogContent class="max-h-[85vh] overflow-hidden sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>
          {{ selectedSeverity === 'ERROR' ? 'Event errors' : 'Event warnings' }}
        </DialogTitle>
        <DialogDescription>
          Issues calculated from the current event table. Select one to locate its event.
        </DialogDescription>
      </DialogHeader>

      <div class="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
        <button
          v-for="item in dialogItems"
          :key="`${item.issue.severity}-${item.issue.code}-${item.event.id}`"
          type="button"
          class="flex w-full cursor-pointer items-center justify-between gap-3 rounded-md border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2"
          :class="
            selectedSeverity === 'ERROR'
              ? 'border-red-200 bg-red-50 hover:border-red-400 focus-visible:ring-red-400 dark:border-red-900 dark:bg-red-950/25'
              : 'border-amber-200 bg-amber-50 hover:border-amber-400 focus-visible:ring-amber-400 dark:border-amber-900 dark:bg-amber-950/25'
          "
          @click="selectIssue(item.event.id)"
        >
          <span class="flex min-w-0 items-start gap-2">
            <CircleAlert
              v-if="selectedSeverity === 'ERROR'"
              class="mt-0.5 h-4 w-4 shrink-0 text-red-500"
            />
            <TriangleAlert v-else class="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <span class="min-w-0">
              <span
                class="block text-xs"
                :class="
                  selectedSeverity === 'ERROR'
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-amber-700 dark:text-amber-400'
                "
              >
                {{ formatEventTime(item.event) }} · {{ item.event.eventName }}
              </span>
              <span class="mt-0.5 block text-sm font-medium text-foreground">
                {{ item.issue.title }}
              </span>
              <span class="mt-0.5 block font-mono text-[10px] text-muted-foreground">
                Seq {{ sequenceIdHexToDecimal(item.event.sequenceId) || '—' }} ·
                {{ item.event.eventCode }}
              </span>
            </span>
          </span>
          <ChevronRight
            class="h-4 w-4 shrink-0"
            :class="selectedSeverity === 'ERROR' ? 'text-red-500' : 'text-amber-500'"
          />
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
import { ChevronRight, CircleAlert, TriangleAlert } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { RouteEldEvent, RouteEldEventIssue } from '../../types/routeEldDetail'

type IssueSeverity = 'ERROR' | 'WARNING'

interface DisplayEvent {
  id?: string
  eventId?: string
  dateTime?: string
}

const props = defineProps<{
  eventIssues: RouteEldEventIssue[]
  events: RouteEldEvent[]
  displayEvents: DisplayEvent[]
  formatTime: (date: string | Date, format: string) => string
}>()

const emit = defineEmits<{
  selectEvent: [eventId: string]
}>()

const dialogOpen = ref(false)
const selectedSeverity = ref<IssueSeverity>('ERROR')

const eventById = computed(() => new Map(props.events.map((event) => [event.id, event])))
const displayEventById = computed(
  () =>
    new Map<string, DisplayEvent>(
      props.displayEvents.flatMap((event) => {
        const eventId = event.id || event.eventId
        return eventId ? [[eventId, event] as [string, DisplayEvent]] : []
      })
    )
)

const visibleIssues = computed(() =>
  props.eventIssues
    .map((issue) => {
      const event = eventById.value.get(issue.eventId)
      return event ? { issue, event } : null
    })
    .filter((item): item is { issue: RouteEldEventIssue; event: RouteEldEvent } => item !== null)
    .sort(
      (first, second) =>
        first.event.timestamp - second.event.timestamp ||
        first.issue.title.localeCompare(second.issue.title)
    )
)

const issueCounts = computed(() =>
  visibleIssues.value.reduce(
    (counts, item) => {
      if (normalizeSeverity(item.issue.severity) === 'ERROR') counts.errors += 1
      else if (normalizeSeverity(item.issue.severity) === 'WARNING') counts.warnings += 1
      return counts
    },
    { errors: 0, warnings: 0 }
  )
)

const dialogItems = computed(() =>
  visibleIssues.value.filter(
    (item) => normalizeSeverity(item.issue.severity) === selectedSeverity.value
  )
)

function openIssueList(severity: IssueSeverity) {
  selectedSeverity.value = severity
  dialogOpen.value = true
}

function selectIssue(eventId: string) {
  dialogOpen.value = false
  emit('selectEvent', eventId)
}

function formatEventTime(event: RouteEldEvent) {
  const displayEvent = displayEventById.value.get(event.id)
  return props.formatTime(displayEvent?.dateTime || new Date(event.timestamp), 'MMM D, h:mm:ss a')
}

function normalizeSeverity(severity: string): IssueSeverity | null {
  const normalized = severity.toUpperCase()
  return normalized === 'ERROR' || normalized === 'WARNING' ? normalized : null
}

function sequenceIdHexToDecimal(value?: string | null) {
  const normalized = value?.trim().replace(/^0x/i, '')
  if (!normalized || !/^[0-9a-f]+$/i.test(normalized)) return value ?? ''
  try {
    return BigInt(`0x${normalized}`).toString(10)
  } catch {
    return value
  }
}
</script>
