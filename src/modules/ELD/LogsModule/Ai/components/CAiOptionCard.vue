<template>
  <article class="border border-border bg-background">
    <button
      type="button"
      class="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-muted/40"
      :aria-expanded="isOpen"
      @click="isOpen = !isOpen"
    >
      <span class="min-w-0 flex-1">
        <span class="block text-base text-foreground">{{ summary.rank }}. {{ summary.title }}</span>
        <span class="block truncate text-base text-muted-foreground">{{ summary.explanation }}</span>
      </span>
      <span class="shrink-0 rounded px-2 py-0.5 text-sm" :class="BADGE_CLASSES[badge]">{{ badge }}</span>
      <ChevronUp v-if="isOpen" class="h-5 w-5 shrink-0" />
      <ChevronDown v-else class="h-5 w-5 shrink-0" />
    </button>

    <div v-if="isOpen" class="space-y-3 border-t border-border px-4 py-3">
      <div class="flex items-center justify-between gap-3">
        <div class="inline-flex rounded-md border border-border p-0.5 text-sm" role="tablist">
          <button
            v-for="choice in VIEWS"
            :key="choice.value"
            type="button"
            role="tab"
            :aria-selected="currentView === choice.value"
            class="rounded px-3 py-1"
            :class="currentView === choice.value ? 'bg-foreground text-background' : 'text-muted-foreground'"
            @click="currentView = choice.value"
          >
            {{ choice.label }}
          </button>
        </div>
        <Button size="sm" :disabled="!canUse" @click="use">Use this option</Button>
      </div>

      <template v-if="currentView === 'chart'">
        <CBoostGraph
          v-if="option?.preview"
          compact
          :events="graphEvents"
          :from-date="fromDate"
          :to-date="toDate"
          :time-zone="timeZone"
          :session-created-at="sessionCreatedAt"
          :free-times="option.preview.calculations.freeTimes"
          :violations="option.preview.calculations.violations"
          :event-issues="option.preview.calculations.eventIssues"
        />
        <p v-else class="py-6 text-center text-sm text-muted-foreground">
          {{ option ? 'No chart preview for this option.' : 'Loading the preview…' }}
        </p>
      </template>

      <table v-else class="w-full text-sm">
        <thead class="bg-muted/60 text-left text-muted-foreground">
          <tr>
            <th class="px-3 py-2 font-normal">No</th>
            <th class="px-3 py-2 font-normal">Event</th>
            <th class="px-3 py-2 font-normal">Date</th>
            <th class="px-3 py-2 font-normal">Before</th>
            <th class="px-3 py-2 font-normal">After</th>
            <th class="px-3 py-2 font-normal">Change</th>
            <th class="px-3 py-2 font-normal">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.no" data-change-row class="border-t border-border">
            <td class="px-3 py-2">{{ row.no }}</td>
            <td class="px-3 py-2">{{ row.event }}</td>
            <td class="px-3 py-2">{{ row.date }}</td>
            <td class="px-3 py-2">{{ row.before }}</td>
            <td class="px-3 py-2">{{ row.after }}</td>
            <td class="px-3 py-2">{{ row.changeMinutes == null ? '—' : `${row.changeMinutes > 0 ? '+' : ''}${row.changeMinutes} min` }}</td>
            <td class="px-3 py-2">
              <span class="rounded px-2 py-0.5" :class="BADGE_CLASSES[badge]">{{ badge }}</span>
            </td>
          </tr>
          <tr v-if="!rows.length">
            <td colspan="7" class="px-3 py-6 text-center text-muted-foreground">
              {{ option ? 'This option changes no events.' : 'Loading the changes…' }}
            </td>
          </tr>
        </tbody>
      </table>

      <p v-if="notPrepared" role="alert" class="text-sm text-destructive">
        The assistant did not prepare this option. Try again.
      </p>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronDown, ChevronUp } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import CBoostGraph from '@/modules/ELD/LogsModule/Boost/components/CBoostGraph.vue'
import type { RouteEldAssistantRepairOptionSummary } from '@/modules/ELD/LogsModule/Boost/types/assistant'
import type { RouteEldRepairOption } from '@/modules/ELD/LogsModule/Boost/types/boost'
import { applyOptionMessage, changeRows, optionBadge, type AiOptionBadge } from '../utils/aiOptions'

type CardView = 'chart' | 'changes'

const VIEWS: { value: CardView; label: string }[] = [
  { value: 'chart', label: 'Chart' },
  { value: 'changes', label: 'Changes' },
]
const BADGE_CLASSES: Record<AiOptionBadge, string> = {
  Pending: 'bg-orange-50 text-orange-500 dark:bg-orange-500/15',
  'In Progress': 'bg-blue-50 text-blue-500 dark:bg-blue-500/15',
  Completed: 'bg-green-50 text-green-600 dark:bg-green-500/15',
  Invalid: 'bg-red-50 text-red-500 dark:bg-red-500/15',
}

const props = withDefaults(
  defineProps<{
    summary: RouteEldAssistantRepairOptionSummary
    /** Live option with preview from the repair endpoint; null while it loads. */
    option: RouteEldRepairOption | null
    repairId: string
    fromDate: string
    toDate: string
    timeZone: string
    sessionCreatedAt?: string | null
    inProgress: boolean
    busy: boolean
    notPrepared?: boolean
    /** Initial state; the card toggles itself afterwards. */
    expanded?: boolean
    view?: CardView
  }>(),
  { sessionCreatedAt: null, notPrepared: false, expanded: false, view: 'chart' }
)
const emit = defineEmits<{ (e: 'use', message: string): void }>()

const isOpen = ref(props.expanded)
const currentView = ref<CardView>(props.view)

const badge = computed(() => optionBadge(props.option?.status, props.inProgress))
const rows = computed(() => (props.option ? changeRows(props.option, props.timeZone) : []))
const graphEvents = computed(
  () => props.option?.preview?.events.filter((row) => !row.isDeleted).map((row) => row.event) ?? []
)
// Only a ready option that fully clears its goal may go to the confirmation.
const canUse = computed(
  () => badge.value === 'Pending' && Boolean(props.option) && props.summary.fullySatisfies && !props.busy
)

function use() {
  if (!canUse.value) return
  emit('use', applyOptionMessage(props.summary.rank, props.summary.title, props.repairId, props.summary.optionId))
}

defineExpose({ use })
</script>
