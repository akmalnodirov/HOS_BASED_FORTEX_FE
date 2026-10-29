<template>
  <Dialog :open="open" @update:open="handleOpenChange">
    <DialogContent
      class="flex max-h-[92dvh] w-[96vw] max-w-[96vw] flex-col gap-0 overflow-hidden p-0"
    >
      <DialogHeader class="shrink-0 border-b px-6 pb-4 pt-6 pr-12">
        <DialogTitle>{{ result ? 'Repair options' : 'Repair event' }}</DialogTitle>
        <DialogDescription>
          {{
            result
              ? 'Compare complete repair previews before applying one to the working tab.'
              : 'Use the selected event to locate a shift, cycle or break period, or change that exact event duration.'
          }}
        </DialogDescription>
      </DialogHeader>

      <div class="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <div class="mb-5 grid gap-3 rounded-lg border bg-muted/20 p-4 sm:grid-cols-3">
          <SummaryValue label="Selected event" :value="selectedEvent?.eventName || '—'" />
          <SummaryValue label="Event code" :value="selectedEvent?.eventCode || '—'" mono />
          <SummaryValue label="Date and time" :value="selectedEventTime" />
        </div>

        <div v-if="!result" class="mx-auto max-w-3xl space-y-5">
          <div class="space-y-2">
            <label class="text-xs font-medium text-muted-foreground">Repair method</label>
            <Select v-model="kind">
              <SelectTrigger class="w-full">
                <SelectValue placeholder="Select a repair method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="item in repairKinds" :key="item.value" :value="item.value">
                  {{ item.label }}
                </SelectItem>
              </SelectContent>
            </Select>
            <p v-if="selectedKindDescription" class="text-xs text-muted-foreground">
              {{ selectedKindDescription }}
            </p>
          </div>

          <div v-if="requiresDuration" class="space-y-3">
            <label class="text-xs font-medium text-muted-foreground">
              Requested duration{{ allowsAutomaticDuration ? ' (optional)' : '' }}
            </label>
            <div class="grid grid-cols-3 gap-3">
              <div>
                <label class="text-xs text-muted-foreground">Hours</label>
                <Input v-model.number="hours" type="number" min="0" />
              </div>
              <div>
                <label class="text-xs text-muted-foreground">Minutes</label>
                <Input v-model.number="minutes" type="number" min="0" max="59" />
              </div>
              <div>
                <label class="text-xs text-muted-foreground">Seconds</label>
                <Input v-model.number="seconds" type="number" min="0" max="59" />
              </div>
            </div>
            <p v-if="allowsAutomaticDuration" class="text-xs text-muted-foreground">
              Leave the duration at zero to automatically reduce the
              {{
                kind === 'ReduceShiftDriving'
                  ? 'driving time above 11 hours'
                  : 'elapsed time above 14 hours'
              }}
              in the anchored shift.
            </p>
          </div>

          <div class="rounded-md border p-3">
            <div class="flex items-start gap-3">
              <Checkbox
                id="boost-repair-consider-alpr"
                :model-value="considerAlpr"
                :disabled="loading"
                @update:model-value="considerAlpr = Boolean($event)"
              />
              <div class="space-y-1">
                <Label for="boost-repair-consider-alpr" class="cursor-pointer text-sm">
                  Consider ALPR warnings
                </Label>
                <p class="text-xs text-muted-foreground">
                  Exclude repair options that transfer time across an event detected near an ALPR
                  camera.
                </p>
              </div>
            </div>
          </div>

          <p
            v-if="displayError"
            class="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700"
          >
            {{ displayError }}
          </p>
        </div>

        <div v-else class="space-y-5">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p class="text-sm font-semibold">{{ repairKindLabel(result.kind) }}</p>
              <p class="text-xs text-muted-foreground">
                {{ result.options.length }} complete repair
                {{ result.options.length === 1 ? 'option' : 'options' }} found
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              :disabled="Boolean(applyingOptionId)"
              @click="$emit('change-request')"
            >
              Change request
            </Button>
          </div>

          <div
            v-if="!result.options.length"
            class="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground"
          >
            No complete repair option was found for this request.
          </div>

          <article
            v-for="option in result.options"
            :key="option.id"
            class="overflow-hidden rounded-xl border border-border bg-background"
          >
            <div class="flex flex-wrap items-start justify-between gap-4 border-b bg-muted/20 p-4">
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="text-sm font-semibold">
                    Option {{ option.rank }} — {{ option.title }}
                  </h3>
                  <span
                    class="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-700"
                  >
                    Complete
                  </span>
                </div>
                <p class="mt-1 text-xs text-muted-foreground">{{ option.explanation }}</p>
              </div>
              <Button
                size="sm"
                :disabled="Boolean(applyingOptionId) || !option.preview"
                @click="$emit('apply', option.id)"
              >
                <Loader2 v-if="applyingOptionId === option.id" class="mr-2 h-4 w-4 animate-spin" />
                {{ applyingOptionId === option.id ? 'Applying...' : 'Apply this option' }}
              </Button>
            </div>

            <div class="grid grid-cols-2 gap-px border-b bg-border sm:grid-cols-4 lg:grid-cols-6">
              <Metric label="Requested" :value="formatDuration(option.requestedDurationMs)" />
              <Metric label="Achieved" :value="formatDuration(option.achievedDurationMs)" />
              <Metric label="Changed" :value="String(option.changedEventCount)" />
              <Metric label="Deleted" :value="String(option.deletedEventCount)" />
              <Metric label="Moved time" :value="formatDuration(option.totalMovedMilliseconds)" />
              <Metric
                label="Violation"
                :value="option.targetViolationRemoved ? 'Removed' : 'Unchanged'"
              />
            </div>

            <template v-if="option.preview">
              <div class="border-b p-4">
                <CBoostGraph
                  :events="graphEvents(option)"
                  :from-date="fromDate"
                  :to-date="toDate"
                  :time-zone="timeZone"
                  :session-created-at="sessionCreatedAt"
                  :selected-event-id="selectedEvent?.id"
                  :free-times="option.preview.calculations.freeTimes"
                  :violations="option.preview.calculations.violations"
                  :event-issues="option.preview.calculations.eventIssues"
                />
              </div>

              <div v-if="option.preview.profileForms.length" class="border-b bg-muted/10 p-4">
                <h4
                  class="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  Profile forms
                </h4>
                <div class="max-h-48 overflow-auto rounded-md border bg-background">
                  <table class="w-full min-w-150 border-collapse text-left text-xs">
                    <thead class="sticky top-0 z-10 bg-muted">
                      <tr class="border-b">
                        <th class="px-3 py-2 font-medium text-muted-foreground">Date</th>
                        <th class="px-3 py-2 font-medium text-muted-foreground">Trailers</th>
                        <th class="px-3 py-2 font-medium text-muted-foreground">
                          Shipping documents
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="profileForm in option.preview.profileForms"
                        :key="profileForm.logDate"
                        class="border-b last:border-b-0"
                      >
                        <td class="whitespace-nowrap px-3 py-2 font-medium">
                          {{ profileForm.logDate }}
                        </td>
                        <td class="px-3 py-2">
                          {{ profileForm.trailers.join(', ') || '—' }}
                        </td>
                        <td class="px-3 py-2">
                          {{ profileForm.shippingDocuments.join(', ') || '—' }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div class="max-h-96 overflow-auto">
                <table class="w-full min-w-225 border-collapse text-left text-xs">
                  <thead class="sticky top-0 z-10 bg-muted">
                    <tr class="border-b">
                      <th class="px-3 py-2 font-medium text-muted-foreground">Date and time</th>
                      <th class="px-3 py-2 font-medium text-muted-foreground">Duration</th>
                      <th class="px-3 py-2 font-medium text-muted-foreground">Event</th>
                      <th class="px-3 py-2 font-medium text-muted-foreground">Location</th>
                      <th class="px-3 py-2 font-medium text-muted-foreground">Record status</th>
                      <th class="px-3 py-2 font-medium text-muted-foreground">Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="row in previewRows(option)"
                      :key="row.event.id"
                      class="border-b last:border-b-0"
                      :class="{
                        'bg-amber-50/70': row.changeStatus === 'CHANGED',
                        'bg-red-50/70 text-muted-foreground line-through': row.isDeleted,
                      }"
                    >
                      <td class="whitespace-nowrap px-3 py-2 font-medium">
                        {{ formatEventTime(row.event) }}
                      </td>
                      <td class="whitespace-nowrap px-3 py-2 font-mono">
                        {{ row.durationMs == null ? '—' : formatDuration(row.durationMs) }}
                      </td>
                      <td class="px-3 py-2">
                        <div class="flex items-center gap-1.5">
                          <span class="font-medium">{{ row.event.eventName }}</span>
                          <span class="font-mono text-[10px] text-muted-foreground">{{
                            row.event.eventCode
                          }}</span>
                          <span
                            v-if="row.hasAlprCamera"
                            class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded bg-red-50 text-red-600 dark:bg-red-950/35 dark:text-red-400"
                            title="ALPR camera near this event"
                            aria-label="ALPR camera near this event"
                          >
                            <Camera class="h-4 w-4" />
                          </span>
                        </div>
                      </td>
                      <td
                        class="max-w-80 truncate px-3 py-2"
                        :title="row.event.location || row.event.driverLocationDescription || ''"
                      >
                        {{ row.event.location || row.event.driverLocationDescription || '—' }}
                      </td>
                      <td class="px-3 py-2">{{ row.event.recordStatus }}</td>
                      <td class="px-3 py-2">
                        <span
                          class="rounded px-2 py-0.5 text-[10px] font-semibold"
                          :class="changeClass(row.changeStatus)"
                        >
                          {{ row.changeStatus }}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </template>

            <p v-else class="p-6 text-center text-sm text-muted-foreground">
              This preview is no longer available because the underlying event timeline changed.
            </p>
          </article>

          <p
            v-if="displayError"
            class="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700"
          >
            {{ displayError }}
          </p>
        </div>
      </div>

      <DialogFooter class="shrink-0 border-t px-6 py-4">
        <Button
          variant="outline"
          :disabled="loading || Boolean(applyingOptionId)"
          @click="$emit('update:open', false)"
        >
          {{ result ? 'Close' : 'Cancel' }}
        </Button>
        <Button v-if="!result" :disabled="loading" @click="submit">
          <Loader2 v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
          {{ loading ? 'Generating...' : 'Find repair options' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, ref, watch } from 'vue'
import { Camera, Loader2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import CBoostGraph from '../CBoostGraph.vue'
import type {
  GenerateRouteEldRepairRequest,
  RouteEldHosEvent,
  RouteEldRepairOption,
  RouteEldRepairPreviewEvent,
  RouteEldRepairRequestKind,
  RouteEldRepairRequestResponse,
  RouteEldScheduleCalculations,
} from '../../types/boost'
import { resolveRouteEldScheduleTimeZone } from '../../composables/useScheduleBoost'

const props = withDefaults(
  defineProps<{
    open: boolean
    loading?: boolean
    applyingOptionId?: string
    selectedEvent?: RouteEldHosEvent | null
    violations?: RouteEldScheduleCalculations['violations']
    result?: RouteEldRepairRequestResponse | null
    error?: string
    fromDate: string
    toDate: string
    timeZone?: string | null
    sessionCreatedAt?: string | null
  }>(),
  {
    loading: false,
    applyingOptionId: '',
    selectedEvent: null,
    violations: () => [],
    result: null,
    error: '',
    timeZone: 'CT',
    sessionCreatedAt: null,
  }
)

const emit = defineEmits<{
  'update:open': [value: boolean]
  'reset-error': []
  'change-request': []
  generate: [request: GenerateRouteEldRepairRequest]
  apply: [optionId: string]
}>()

const repairKinds: Array<{ value: RouteEldRepairRequestKind; label: string; description: string }> =
  [
    {
      value: 'ReduceShiftDriving',
      label: 'Reduce shift driving',
      description:
        'Reduce accumulated driving time in the anchored shift by an optional duration, or automatically remove its excess above 11 hours.',
    },
    {
      value: 'ReduceShiftElapsed',
      label: 'Reduce shift elapsed',
      description:
        'Reduce elapsed shift time by an optional duration, or automatically remove its excess above 14 hours.',
    },
    {
      value: 'RepairShiftViolation',
      label: 'Repair shift violation',
      description:
        'Remove every 11-hour driving and 14-hour shift-window violation within the anchored shift.',
    },
    {
      value: 'RepairCycleViolation',
      label: 'Repair cycle violation',
      description: 'Remove cycle violations within the period identified by the selected anchor.',
    },
    {
      value: 'RepairBreakViolation',
      label: 'Repair break violation',
      description:
        'Remove break violations within the driving period identified by the selected anchor.',
    },
    {
      value: 'AddEventDuration',
      label: 'Add event duration',
      description:
        'Increase the selected event duration by transferring time from eligible events.',
    },
    {
      value: 'ReduceEventDuration',
      label: 'Reduce event duration',
      description:
        'Reduce the selected event duration and transfer that time to an eligible rest period.',
    },
  ]

const durationKinds = new Set<RouteEldRepairRequestKind>([
  'ReduceShiftDriving',
  'ReduceShiftElapsed',
  'AddEventDuration',
  'ReduceEventDuration',
])
const automaticDurationKinds = new Set<RouteEldRepairRequestKind>([
  'ReduceShiftDriving',
  'ReduceShiftElapsed',
])

const kind = ref<RouteEldRepairRequestKind | ''>('')
const submitAttempted = ref(false)
const hours = ref(0)
const minutes = ref(0)
const seconds = ref(0)
const considerAlpr = ref(false)
const requiresDuration = computed(() => Boolean(kind.value && durationKinds.has(kind.value)))
const allowsAutomaticDuration = computed(() =>
  Boolean(kind.value && automaticDurationKinds.has(kind.value))
)
const durationSeconds = computed(() => hours.value * 3600 + minutes.value * 60 + seconds.value)
const selectedKindDescription = computed(
  () => repairKinds.find((item) => item.value === kind.value)?.description ?? ''
)
const selectedEventTime = computed(() =>
  props.selectedEvent ? formatEventTime(props.selectedEvent) : '—'
)

const validationError = computed(() => {
  if (!props.selectedEvent) return 'Select an event from the graph or events table first.'
  if (!kind.value) return 'Select a repair method.'
  if (requiresDuration.value) {
    if (
      ![hours.value, minutes.value, seconds.value].every(Number.isInteger) ||
      hours.value < 0 ||
      minutes.value < 0 ||
      minutes.value > 59 ||
      seconds.value < 0 ||
      seconds.value > 59
    ) {
      return 'Enter whole hours, with minutes and seconds between 0 and 59.'
    }
    if (!allowsAutomaticDuration.value && durationSeconds.value < 1)
      return 'Requested duration must be greater than zero.'
  }
  return ''
})
const displayError = computed(
  () => (submitAttempted.value ? validationError.value : '') || props.error
)

watch(kind, () => {
  submitAttempted.value = false
  emit('reset-error')
})
watch([hours, minutes, seconds], () => emit('reset-error'))
watch(considerAlpr, () => emit('reset-error'))
watch(
  () => props.open,
  (open) => {
    if (!open) return
    submitAttempted.value = false
    emit('reset-error')
    kind.value = ''
    hours.value = 0
    minutes.value = 0
    seconds.value = 0
    considerAlpr.value = false
  }
)

const submit = () => {
  if (props.loading) return
  submitAttempted.value = true
  if (validationError.value || !kind.value || !props.selectedEvent) return
  const violationType =
    kind.value === 'RepairCycleViolation'
      ? 'CYCLE'
      : kind.value === 'RepairBreakViolation'
        ? 'BREAK'
        : null
  emit('generate', {
    kind: kind.value,
    targetViolationType: violationType,
    targetEventId: props.selectedEvent.id,
    targetTimestamp: props.selectedEvent.timestamp,
    requestedDurationSeconds: requiresDuration.value ? durationSeconds.value : 0,
    considerAlpr: considerAlpr.value,
  })
}

const handleOpenChange = (value: boolean) => {
  if (!value && (props.loading || props.applyingOptionId)) return
  emit('update:open', value)
}
const repairKindLabel = (value: RouteEldRepairRequestKind) =>
  repairKinds.find((item) => item.value === value)?.label ?? value
const formatDuration = (milliseconds: number) => {
  const totalSeconds = Math.max(0, Math.round(milliseconds / 1_000))
  const hoursPart = Math.floor(totalSeconds / 3600)
  const minutesPart = Math.floor((totalSeconds % 3600) / 60)
  const secondsPart = totalSeconds % 60
  return `${String(hoursPart).padStart(2, '0')}:${String(minutesPart).padStart(2, '0')}:${String(secondsPart).padStart(2, '0')}`
}
function formatEventTime(event: RouteEldHosEvent) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: resolveRouteEldScheduleTimeZone(event.timeZone ?? props.timeZone),
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(event.timestamp))
}
const graphEvents = (option: RouteEldRepairOption) =>
  option.preview?.events.filter((row) => !row.isDeleted).map((row) => row.event) ?? []
type PreviewRow = RouteEldRepairPreviewEvent & { durationMs: number | null }
function previewRows(option: RouteEldRepairOption): PreviewRow[] {
  if (!option.preview) return []
  const rows = [...option.preview.events].sort(
    (left, right) =>
      left.event.timestamp - right.event.timestamp || left.event.id.localeCompare(right.event.id)
  )
  const duties = rows.filter(
    (row) =>
      !row.isDeleted &&
      ['ACTIVE', 'UNKNOWN'].includes(row.event.recordStatus.toUpperCase()) &&
      ['OFF', 'SB', 'D', 'ON'].includes(row.event.eventCategory.toUpperCase())
  )
  const durationById = new Map<string, number>()
  for (let index = 0; index + 1 < duties.length; index++) {
    durationById.set(
      duties[index]!.event.id,
      Math.max(0, duties[index + 1]!.event.timestamp - duties[index]!.event.timestamp)
    )
  }
  return rows.map((row) => ({ ...row, durationMs: durationById.get(row.event.id) ?? null }))
}
const changeClass = (status: string) => {
  if (status === 'CHANGED') return 'bg-amber-100 text-amber-700'
  if (status === 'DELETED') return 'bg-red-100 text-red-700'
  return 'bg-muted text-muted-foreground'
}

const SummaryValue = defineComponent({
  props: {
    label: { type: String, required: true },
    value: { type: String, required: true },
    mono: Boolean,
  },
  setup(componentProps) {
    return () =>
      h('div', [
        h(
          'p',
          { class: 'text-[10px] font-medium uppercase text-muted-foreground' },
          componentProps.label
        ),
        h(
          'p',
          { class: ['mt-1 truncate text-sm font-medium', componentProps.mono ? 'font-mono' : ''] },
          componentProps.value
        ),
      ])
  },
})
const Metric = defineComponent({
  props: { label: { type: String, required: true }, value: { type: String, required: true } },
  setup(componentProps) {
    return () =>
      h('div', { class: 'bg-background px-3 py-2.5' }, [
        h(
          'p',
          { class: 'text-[10px] font-medium uppercase text-muted-foreground' },
          componentProps.label
        ),
        h('p', { class: 'mt-1 text-sm font-semibold' }, componentProps.value),
      ])
  },
})
</script>
