<template>
  <Sheet :open="open" @update:open="emit('update:open', $event)">
    <SheetContent side="right" class="w-full gap-0 p-0 sm:max-w-2xl">
      <SheetHeader class="border-b border-border px-6 py-4">
        <SheetTitle class="flex items-center gap-2">
          <Sparkles class="h-4 w-4 text-blue-600" /> AI Review
        </SheetTitle>
        <SheetDescription>
          Checks this draft's edits against the provider's original log. Nothing changes until you
          apply a fix.
        </SheetDescription>
      </SheetHeader>

      <div class="flex items-center gap-2 border-b border-border px-6 py-2">
        <button
          v-for="view in views"
          :key="view.value"
          type="button"
          class="rounded-md px-3 py-1 text-xs font-medium transition-colors"
          :class="
            activeView === view.value
              ? 'bg-foreground text-background'
              : 'text-muted-foreground hover:bg-muted'
          "
          @click="selectView(view.value)"
        >
          {{ view.label }}
        </button>
        <Button
          size="sm"
          variant="outline"
          class="ml-auto h-8 text-xs"
          :disabled="loading || !canRun"
          @click="emit('run')"
        >
          <RefreshCw class="mr-1.5 h-3.5 w-3.5" :class="loading ? 'animate-spin' : ''" />
          {{ review ? 'Re-run review' : 'Run review' }}
        </Button>
      </div>

      <div class="flex-1 overflow-y-auto px-6 py-4">
        <template v-if="activeView === 'findings'">
          <div v-if="loading && !review" class="py-16 text-center text-sm text-muted-foreground">
            Reviewing the draft…
          </div>
          <div
            v-else-if="error"
            class="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
          >
            {{ error }}
          </div>
          <div v-else-if="!review" class="py-16 text-center text-sm text-muted-foreground">
            Run the review to check this tab's edits.
          </div>
          <template v-else>
            <div class="mb-4 space-y-2">
              <div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{{ review.fromDate }} → {{ review.toDate }}</span>
                <span>·</span>
                <span
                  >{{ review.findingCount }}
                  {{ review.findingCount === 1 ? 'finding' : 'findings' }}</span
                >
                <span>·</span>
                <span>{{ review.fixedCount }} fixed by the edits</span>
                <span>·</span>
                <span>{{ formatDateTime(review.createdAt) }}</span>
                <span v-if="readonly" class="rounded bg-muted px-1.5 py-0.5">History</span>
              </div>
              <div
                v-if="review.isStale"
                class="flex items-center justify-between rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
              >
                <span>The draft changed since this review.</span>
                <Button
                  v-if="canRun"
                  size="sm"
                  variant="outline"
                  class="h-7 text-xs"
                  :disabled="loading"
                  @click="emit('run')"
                >
                  Re-run
                </Button>
              </div>
              <div
                v-if="!review.cycleContextFromDate"
                class="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground"
              >
                The 7 days before the draft could not be read, so the 70-hour cycle was checked on
                the draft's days only.
              </div>
              <div v-if="review.isTruncated" class="text-xs text-muted-foreground">
                Showing the first {{ review.findings.length }} of
                {{ review.findingCount }} findings.
              </div>
            </div>

            <div
              v-if="review.findings.length === 0"
              class="py-12 text-center text-sm text-muted-foreground"
            >
              No problems found in this tab's edits.
            </div>

            <section v-for="group in groups" :key="group.category" class="mb-5">
              <h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {{ categoryLabels[group.category] }} ({{ group.findings.length }})
              </h3>
              <article
                v-for="finding in group.findings"
                :key="finding.id"
                class="mb-3 cursor-pointer rounded-lg border border-border bg-card p-4 transition-colors hover:border-blue-300"
                :class="isClosed(finding) ? 'opacity-60' : ''"
                @click="emit('select-event', finding.eventId)"
              >
                <div class="mb-2 flex flex-wrap items-center gap-1.5">
                  <span
                    class="rounded px-1.5 py-0.5 text-[11px] font-semibold"
                    :class="
                      finding.severity === 'ERROR'
                        ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                    "
                  >
                    {{ finding.severity === 'ERROR' ? 'Error' : 'Warning' }}
                  </span>
                  <span class="rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium">
                    {{ originLabels[finding.origin] }}
                  </span>
                  <span class="rounded border border-border px-1.5 py-0.5 text-[11px]">
                    {{ statusLabels[finding.status] }}
                  </span>
                  <span
                    v-if="finding.occurrenceCount > 1"
                    class="text-[11px] text-muted-foreground"
                  >
                    ×{{ finding.occurrenceCount }}
                  </span>
                  <span class="ml-auto text-[11px] text-muted-foreground">
                    {{
                      finding.editedByName
                        ? `Edited by ${finding.editedByName}`
                        : finding.editChangeType
                          ? 'Unknown editor'
                          : ''
                    }}
                    <template v-if="finding.editChangeType">
                      ({{ finding.editChangeType.toLowerCase() }})</template
                    >
                  </span>
                </div>

                <dl class="space-y-1.5 text-sm">
                  <div v-for="field in fields" :key="field.key">
                    <dt
                      class="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      {{ field.label }}
                      <span
                        v-if="field.key === 'recommendation' && finding.isAiNarrated"
                        class="normal-case text-blue-600"
                        >· AI</span
                      >
                    </dt>
                    <dd class="leading-snug">{{ finding[field.key] }}</dd>
                  </div>
                </dl>

                <p
                  v-if="finding.fixCycleCheck === 'REMAINS'"
                  class="mt-2 text-xs text-amber-700 dark:text-amber-300"
                >
                  This fix clears the violation inside the draft, but the 7 days before it still
                  count.
                </p>

                <div v-if="!readonly" class="mt-3 flex flex-wrap gap-2" @click.stop>
                  <Button
                    v-if="finding.canRepair && allowRepair && finding.status !== 'APPLIED'"
                    size="sm"
                    class="h-8 text-xs"
                    :disabled="busyFindingId === finding.id || loading"
                    @click="emit('generate-fix', finding)"
                  >
                    {{
                      busyFindingId === finding.id
                        ? 'Generating…'
                        : finding.repairRequestId
                          ? 'Show fix again'
                          : 'Show fix'
                    }}
                  </Button>
                  <template v-if="allowDecide && finding.status !== 'APPLIED'">
                    <Button
                      v-if="!finding.decision"
                      size="sm"
                      variant="outline"
                      class="h-8 text-xs"
                      :disabled="busyFindingId === finding.id"
                      @click="emit('decide', finding, 'DECLINED')"
                    >
                      Decline
                    </Button>
                    <Button
                      v-if="!finding.decision"
                      size="sm"
                      variant="ghost"
                      class="h-8 text-xs"
                      :disabled="busyFindingId === finding.id"
                      @click="emit('decide', finding, 'DISMISSED')"
                    >
                      Dismiss
                    </Button>
                    <Button
                      v-else
                      size="sm"
                      variant="ghost"
                      class="h-8 text-xs"
                      :disabled="busyFindingId === finding.id"
                      @click="emit('decide', finding, null)"
                    >
                      Reopen
                    </Button>
                  </template>
                </div>
              </article>
            </section>
          </template>
        </template>

        <template v-else>
          <div v-if="historyLoading" class="py-16 text-center text-sm text-muted-foreground">
            Loading…
          </div>
          <div
            v-else-if="history.length === 0"
            class="py-16 text-center text-sm text-muted-foreground"
          >
            No reviews yet for this draft.
          </div>
          <template v-else>
            <button
              v-for="item in history"
              :key="item.id"
              type="button"
              class="mb-2 flex w-full items-center justify-between rounded-md border border-border px-3 py-2 text-left text-xs hover:bg-muted"
              @click="emit('open-history', item)"
            >
              <span>{{ formatDateTime(item.createdAt) }}</span>
              <span class="text-muted-foreground">
                {{ item.findingCount }} findings · {{ item.fixedCount }} fixed
                <template v-if="item.isStale"> · outdated</template>
              </span>
            </button>
          </template>
        </template>
      </div>
    </SheetContent>
  </Sheet>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import dayjs from 'dayjs'
import { RefreshCw, Sparkles } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type {
  RouteEldReview,
  RouteEldReviewCategory,
  RouteEldReviewDecision,
  RouteEldReviewFinding,
  RouteEldReviewFindingStatus,
  RouteEldReviewOrigin,
  RouteEldReviewSummary,
} from '../types/boost'

const props = withDefaults(
  defineProps<{
    open: boolean
    loading?: boolean
    error?: string
    review?: RouteEldReview | null
    readonly?: boolean
    canRun?: boolean
    allowRepair?: boolean
    allowDecide?: boolean
    busyFindingId?: string
    history?: RouteEldReviewSummary[]
    historyLoading?: boolean
  }>(),
  {
    loading: false,
    error: '',
    review: null,
    readonly: false,
    canRun: true,
    allowRepair: false,
    allowDecide: false,
    busyFindingId: '',
    history: () => [],
    historyLoading: false,
  }
)

const emit = defineEmits<{
  'update:open': [value: boolean]
  run: []
  'generate-fix': [finding: RouteEldReviewFinding]
  decide: [finding: RouteEldReviewFinding, decision: RouteEldReviewDecision | null]
  'select-event': [eventId: string]
  'load-history': []
  'open-history': [item: RouteEldReviewSummary]
}>()

type View = 'findings' | 'history'
const views: Array<{ value: View; label: string }> = [
  { value: 'findings', label: 'Findings' },
  { value: 'history', label: 'History' },
]
const activeView = ref<View>('findings')

const selectView = (view: View) => {
  activeView.value = view
  if (view === 'history') emit('load-history')
}

const fields: Array<{
  key: 'issue' | 'recommendation' | 'reason' | 'proposedFix' | 'expectedResult'
  label: string
}> = [
  { key: 'issue', label: 'Detected issue' },
  { key: 'recommendation', label: 'Recommendation' },
  { key: 'reason', label: 'Reason' },
  { key: 'proposedFix', label: 'Proposed fix' },
  { key: 'expectedResult', label: 'Expected result' },
]

const categoryLabels: Record<RouteEldReviewCategory, string> = {
  HOS_VIOLATION: 'HOS violations',
  DUTY_STATUS: 'Duty status',
  TIME_DISTANCE: 'Time and distance',
  RECORD_CONSISTENCY: 'Contradicting records',
  MISSING_RECORDS: 'Missing records',
  OTHER: 'Other',
}

const originLabels: Record<RouteEldReviewOrigin, string> = {
  INTRODUCED_BY_EDIT: 'Introduced by edit',
  WORSENED_BY_EDIT: 'Made worse by edit',
  PARTIALLY_FIXED: 'Partly fixed',
  LEFT_UNFIXED: 'Left unfixed',
}

const statusLabels: Record<RouteEldReviewFindingStatus, string> = {
  OPEN: 'Open',
  FIX_PROPOSED: 'Fix proposed',
  NO_FIX_FOUND: 'No automatic fix',
  APPLIED: 'Applied',
  DECLINED: 'Declined',
  DISMISSED: 'Dismissed',
}

const categoryOrder: RouteEldReviewCategory[] = [
  'HOS_VIOLATION',
  'DUTY_STATUS',
  'TIME_DISTANCE',
  'RECORD_CONSISTENCY',
  'MISSING_RECORDS',
  'OTHER',
]

const groups = computed(() =>
  categoryOrder
    .map((category) => ({
      category,
      findings: (props.review?.findings ?? []).filter((finding) => finding.category === category),
    }))
    .filter((group) => group.findings.length > 0)
)

const isClosed = (finding: RouteEldReviewFinding) =>
  finding.status === 'APPLIED' || finding.status === 'DECLINED' || finding.status === 'DISMISSED'

const formatDateTime = (value: string) => dayjs(value).format('MMM D, HH:mm')
</script>
