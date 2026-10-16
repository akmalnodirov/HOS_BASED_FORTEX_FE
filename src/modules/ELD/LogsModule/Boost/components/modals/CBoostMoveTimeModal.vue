<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="sm:max-w-md" @interact-outside="loading && $event.preventDefault()">
      <DialogHeader><DialogTitle>Boost time between events</DialogTitle></DialogHeader>

      <div v-if="leftEvent && rightEvent" class="space-y-4 py-1">
        <div class="flex items-stretch gap-2">
          <EventCard
            class="min-w-0 flex-1"
            :event="leftEvent"
            :role="sourceIndex === 0 ? 'From · source' : 'To · target'"
            :duration-ms="sourceIndex === 0 ? sourceDurationMs : targetDurationMs"
          />
          <div class="flex items-center">
            <Button type="button" variant="outline" size="icon" title="Switch source and target" @click="$emit('switch')">
              <ArrowRight v-if="sourceIndex === 0" class="h-4 w-4" />
              <ArrowLeft v-else class="h-4 w-4" />
            </Button>
          </div>
          <EventCard
            class="min-w-0 flex-1 text-right"
            :event="rightEvent"
            :role="sourceIndex === 0 ? 'To · target' : 'From · source'"
            :duration-ms="sourceIndex === 0 ? targetDurationMs : sourceDurationMs"
          />
        </div>

        <div class="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-xs">
          <span class="text-muted-foreground">Events shifted between the selection</span>
          <span class="font-semibold">{{ affectedCount }}</span>
        </div>

        <div>
          <div class="flex items-center justify-between">
            <label class="text-sm font-medium">Transfer time</label>
            <span class="font-mono text-xs text-muted-foreground">max {{ formatDuration(availableMs) }}</span>
          </div>
          <div class="mt-1 flex items-center gap-2">
            <Input v-model.number="hours" type="number" min="0" class="w-16 text-center" />
            <span class="text-muted-foreground">hh</span>
            <Input v-model.number="minutes" type="number" min="0" max="59" class="w-16 text-center" />
            <span class="text-muted-foreground">mm</span>
            <Input v-model.number="seconds" type="number" min="0" max="59" class="w-16 text-center" />
            <span class="text-muted-foreground">ss</span>
          </div>
          <div class="mt-3 flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
            <span class="text-xs text-muted-foreground">Source duration after transfer</span>
            <span class="font-mono text-sm font-semibold">{{ formatDuration(remainingMs) }}</span>
          </div>
          <p v-if="displayError" class="mt-1.5 text-xs text-red-600">{{ displayError }}</p>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" :disabled="loading" @click="$emit('update:open', false)">Cancel</Button>
        <Button :disabled="loading || Boolean(error) || totalSeconds < 1" @click="$emit('submit', totalSeconds)">
          {{ loading ? 'Boosting…' : 'Boost' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, ref, watch, type PropType } from 'vue'
import { ArrowLeft, ArrowRight } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { RouteEldHosEvent } from '../../types/boost'
import { resolveRouteEldScheduleTimeZone } from '../../composables/useScheduleBoost'

const props = withDefaults(defineProps<{
  open: boolean
  leftEvent: RouteEldHosEvent | null
  rightEvent: RouteEldHosEvent | null
  sourceIndex: number
  sourceDurationMs: number
  targetDurationMs: number
  affectedCount: number
  selectionError?: string
  externalError?: string
  timeZone?: string | null
  loading?: boolean
}>(), { selectionError: '', externalError: '', timeZone: 'CT', loading: false })

const emit = defineEmits<{
  'update:open': [value: boolean]
  'reset-error': []
  switch: []
  submit: [seconds: number]
}>()

const hours = ref(0)
const minutes = ref(0)
const seconds = ref(0)
watch(() => props.open, (open) => { if (open) { hours.value = 0; minutes.value = 0; seconds.value = 0 } })
const totalSeconds = computed(() => Math.max(0, Number(hours.value) || 0) * 3600 + Math.max(0, Number(minutes.value) || 0) * 60 + Math.max(0, Number(seconds.value) || 0))
const availableMs = computed(() => Math.max(0, props.sourceDurationMs - 1000))
const remainingMs = computed(() => Math.max(0, props.sourceDurationMs - totalSeconds.value * 1000))
const error = computed(() => {
  if (props.selectionError) return props.selectionError
  if (![hours.value, minutes.value, seconds.value].every(Number.isInteger) || minutes.value < 0 || minutes.value > 59 || seconds.value < 0 || seconds.value > 59) return 'Enter whole hours, with minutes and seconds between 0 and 59.'
  if (totalSeconds.value * 1000 > availableMs.value) return 'Transfer time exceeds the available source duration.'
  return ''
})
const displayError = computed(() => error.value || props.externalError)
watch([hours, minutes, seconds], () => {
  if (props.externalError) emit('reset-error')
})
const formatDuration = (milliseconds: number) => {
  const total = Math.max(0, Math.round(milliseconds / 1000))
  return `${String(Math.floor(total / 3600)).padStart(2, '0')}:${String(Math.floor((total % 3600) / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}
const EventCard = defineComponent({
  props: {
    event: { type: Object as PropType<RouteEldHosEvent>, required: true },
    role: { type: String, required: true },
    durationMs: { type: Number, required: true },
  },
  setup(cardProps) {
    return () => h('div', { class: 'rounded-md border p-3' }, [
      h('div', { class: 'text-[11px] font-medium uppercase text-muted-foreground' }, cardProps.role),
      h('div', { class: 'mt-0.5 truncate text-sm font-medium' }, cardProps.event.eventName),
      h('div', { class: 'text-xs text-muted-foreground' }, new Intl.DateTimeFormat('en-US', { timeZone: resolveRouteEldScheduleTimeZone(props.timeZone), month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit' }).format(new Date(cardProps.event.timestamp))),
      h('div', { class: 'mt-1.5 font-mono text-xs' }, `Duration ${formatDuration(cardProps.durationMs)}`),
    ])
  },
})
</script>
