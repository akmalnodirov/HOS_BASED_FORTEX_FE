<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="sm:max-w-125">
      <DialogHeader>
        <DialogTitle>Expand / Reduce Event</DialogTitle>
        <DialogDescription
          >Change the duration of the selected duty-status event.</DialogDescription
        >
      </DialogHeader>
      <div class="space-y-4">
        <div
          v-if="selectedEvent"
          class="grid grid-cols-2 gap-2 rounded-md border border-border p-3 text-xs"
        >
          <div>
            <div class="text-[10px] font-medium uppercase text-muted-foreground">Sequence ID</div>
            <div class="mt-0.5 font-mono font-medium">{{ selectedEvent.sequenceId || '—' }}</div>
          </div>
          <div>
            <div class="text-[10px] font-medium uppercase text-muted-foreground">Event code</div>
            <div class="mt-0.5 font-mono font-medium">{{ selectedEvent.eventCode }}</div>
          </div>
          <div class="col-span-2">
            <div class="text-[10px] font-medium uppercase text-muted-foreground">Date and time</div>
            <div class="mt-0.5 font-medium">{{ selectedEventTime }}</div>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <Button :variant="mode === 'expand' ? 'default' : 'outline'" @click="mode = 'expand'">
            Expand
          </Button>
          <Button :variant="mode === 'reduce' ? 'default' : 'outline'" @click="mode = 'reduce'">
            Reduce
          </Button>
        </div>
        <div class="flex items-center justify-between gap-3">
          <span class="text-xs font-medium text-muted-foreground">
            {{ mode === 'expand' ? 'Expanding time' : 'Reducing time' }}
          </span>
          <span class="font-mono text-xs text-muted-foreground">
            {{ mode === 'expand' ? 'available' : 'max' }} {{ formatDuration(maximumDurationMs) }}
          </span>
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="text-xs font-medium text-muted-foreground">Hours</label>
            <Input v-model.number="hours" type="number" min="0" />
          </div>
          <div>
            <label class="text-xs font-medium text-muted-foreground">Minutes</label>
            <Input v-model.number="minutes" type="number" min="0" max="59" />
          </div>
          <div>
            <label class="text-xs font-medium text-muted-foreground">Seconds</label>
            <Input v-model.number="seconds" type="number" min="0" max="59" />
          </div>
        </div>
        <div class="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
          <span class="text-xs text-muted-foreground">
            {{ mode === 'expand' ? 'Transferable rest remaining' : 'Selected duration after reduction' }}
          </span>
          <span class="font-mono text-sm font-semibold">{{ formatDuration(remainingDurationMs) }}</span>
        </div>
        <label v-if="mode === 'expand'" class="flex items-start gap-2 text-sm">
          <Checkbox v-model:checked="ensurePti" />
          <span>
            <span class="font-medium">Ensure PTI event</span>
            <span class="mt-0.5 block text-xs text-muted-foreground">
              The selected OFF/SB congestion must reach at least 10 hours.
            </span>
          </span>
        </label>
        <p v-if="displayError" class="text-xs text-red-600">{{ displayError }}</p>
      </div>
      <DialogFooter>
        <Button variant="outline" @click="$emit('update:open', false)">Cancel</Button>
        <Button :disabled="loading || Boolean(validationError)" @click="submit">
          {{ loading ? 'Applying...' : 'Apply' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { RouteEldHosEvent } from '../../types/boost'
import { resolveRouteEldScheduleTimeZone } from '../../composables/useScheduleBoost'

const props = withDefaults(
  defineProps<{
    open: boolean
    loading?: boolean
    selectedEvent?: RouteEldHosEvent | null
    selectedDurationMs?: number
    availableExpandMs?: number
    availableReduceMs?: number
    selectedRestDurationMs?: number | null
    hasReduceReceiver?: boolean
    selectionError?: string
    externalError?: string
  }>(),
  {
    loading: false,
    selectedEvent: null,
    selectedDurationMs: 0,
    availableExpandMs: 0,
    availableReduceMs: 0,
    selectedRestDurationMs: null,
    hasReduceReceiver: false,
    selectionError: '',
    externalError: '',
  }
)
const emit = defineEmits<{
  'update:open': [value: boolean]
  'reset-error': []
  submit: [payload: { durationSeconds: number; mode: 'expand' | 'reduce'; ensurePti: boolean }]
}>()
const mode = ref<'expand' | 'reduce'>('expand')
const hours = ref(0)
const minutes = ref(0)
const seconds = ref(0)
const ensurePti = ref(false)
const durationSeconds = computed(() => hours.value * 3600 + minutes.value * 60 + seconds.value)
const requestedDurationMs = computed(() => durationSeconds.value * 1_000)
const maximumDurationMs = computed(() =>
  mode.value === 'expand' ? props.availableExpandMs : props.availableReduceMs
)
const remainingDurationMs = computed(() =>
  mode.value === 'expand'
    ? Math.max(0, props.availableExpandMs - requestedDurationMs.value)
    : Math.max(0, props.selectedDurationMs - requestedDurationMs.value)
)
const selectedEventTime = computed(() => {
  const event = props.selectedEvent
  if (!event) return '—'
  return new Intl.DateTimeFormat('en-US', {
    timeZone: resolveRouteEldScheduleTimeZone(event.timeZone),
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(event.timestamp))
})
const validationError = computed(() => {
  if (props.selectionError) return props.selectionError
  if (
    ![hours.value, minutes.value, seconds.value].every(Number.isInteger) ||
    hours.value < 0 ||
    minutes.value < 0 ||
    minutes.value > 59 ||
    seconds.value < 0 ||
    seconds.value > 59
  )
    return 'Enter whole hours, with minutes and seconds between 0 and 59.'
  if (durationSeconds.value < 1) return 'Boost duration must be greater than zero.'
  if (requestedDurationMs.value > maximumDurationMs.value)
    return mode.value === 'expand'
      ? 'The requested duration exceeds the available transferable rest time.'
      : 'The requested duration exceeds the selected event’s available donor duration.'
  if (mode.value === 'reduce' && !props.hasReduceReceiver)
    return 'No other OFF/SB congestion lasting at least 10 hours can receive the removed duration.'
  if (
    mode.value === 'expand' &&
    ensurePti.value &&
    (props.selectedRestDurationMs == null ||
      props.selectedRestDurationMs + requestedDurationMs.value < 10 * 60 * 60_000)
  )
    return 'PTI requires the expanded OFF/SB congestion to last at least 10 hours.'
  return ''
})
const displayError = computed(() => validationError.value || props.externalError)
const formatDuration = (milliseconds: number) => {
  const total = Math.max(0, Math.round(milliseconds / 1_000))
  return `${String(Math.floor(total / 3600)).padStart(2, '0')}:${String(Math.floor((total % 3600) / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}
watch(
  () => props.open,
  (open) => {
    if (!open) return
    mode.value = 'expand'
    hours.value = 0
    minutes.value = 0
    seconds.value = 0
    ensurePti.value = false
  }
)
watch([mode, hours, minutes, seconds, ensurePti], () => {
  if (props.externalError) emit('reset-error')
})
const submit = () =>
  emit('submit', {
    durationSeconds: durationSeconds.value,
    mode: mode.value,
    ensurePti: ensurePti.value,
  })
</script>
