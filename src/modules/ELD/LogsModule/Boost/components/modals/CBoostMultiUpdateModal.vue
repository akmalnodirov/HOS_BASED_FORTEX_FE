<template>
  <Dialog :open="open" @update:open="onOpenChange">
    <DialogContent
      class="max-h-[90vh] overflow-y-auto sm:max-w-xl"
      @escape-key-down="loading && $event.preventDefault()"
      @interact-outside="loading && $event.preventDefault()"
      @pointer-down-outside="loading && $event.preventDefault()"
    >
      <DialogHeader>
        <DialogTitle>Update selected events</DialogTitle>
        <DialogDescription>
          Update {{ events.length }} selected event{{ events.length === 1 ? '' : 's' }}.
        </DialogDescription>
      </DialogHeader>

      <form class="space-y-3 py-2" @submit.prevent="submit">
        <div class="rounded-lg border border-border p-3">
          <div class="flex items-start gap-3">
            <div class="min-w-0 flex-1 space-y-1.5">
              <Label for="multi-trailers">Trailers</Label>
              <Input id="multi-trailers" v-model="trailers" :disabled="loading" placeholder="Bobtail" />
              <p class="text-xs text-muted-foreground">Separate multiple trailers with commas. Leave empty to set Bobtail.</p>
            </div>
          </div>
        </div>

        <div class="rounded-lg border border-border p-3">
          <div class="flex items-start gap-3">
            <div class="min-w-0 flex-1 space-y-1.5">
              <Label for="multi-documents">Shipping documents</Label>
              <Input id="multi-documents" v-model="documents" :disabled="loading" placeholder="None" />
              <p class="text-xs text-muted-foreground">Separate multiple documents with commas. Leave empty to clear them.</p>
            </div>
          </div>
        </div>

        <div class="rounded-lg border border-border p-3">
          <div class="flex items-start gap-3">
            <Checkbox id="multi-time" :model-value="applyTime" :disabled="loading" @update:model-value="applyTime = Boolean($event)" />
            <div class="min-w-0 flex-1 space-y-1.5">
              <Label for="multi-time" class="cursor-pointer">Move time (seconds)</Label>
              <Input v-model="deltaSeconds" type="number" step="1" :disabled="!applyTime || loading" placeholder="0" />
              <p class="text-xs text-muted-foreground">Positive moves later; negative moves earlier.</p>
            </div>
          </div>
        </div>

        <div class="rounded-lg border border-border p-3">
          <div class="flex items-start gap-3">
            <Checkbox id="multi-odometer" :model-value="applyOdometer" :disabled="loading" @update:model-value="setApplyOdometer" />
            <div class="min-w-0 flex-1 space-y-1.5">
              <div class="flex items-center justify-between gap-3">
                <Label for="multi-odometer" class="cursor-pointer">Odometer (mi)</Label>
                <div class="flex items-center gap-2">
                  <Checkbox id="multi-odometer-offset" :model-value="odometerOffset" :disabled="!applyOdometer || loading" @update:model-value="odometerOffset = Boolean($event)" />
                  <Label for="multi-odometer-offset" class="cursor-pointer text-xs font-normal text-muted-foreground">Offset</Label>
                </div>
              </div>
              <Input v-model="odometerMiles" type="number" step="any" :min="odometerOffset ? undefined : 0" :disabled="!applyOdometer || loading" placeholder="0" />
              <p class="text-xs text-muted-foreground">
                {{ odometerOffset ? 'Adds this amount to each current odometer; negative values decrease it.' : 'Sets this value for every selected event.' }}
              </p>
            </div>
          </div>
        </div>

        <p v-if="validationError" class="text-xs text-destructive">{{ validationError }}</p>

        <DialogFooter>
          <Button type="button" variant="outline" :disabled="loading" @click="onOpenChange(false)">Cancel</Button>
          <Button type="submit" :disabled="!canSubmit || loading">
            <LoaderCircle v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
            Update events
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { LoaderCircle } from 'lucide-vue-next'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { BoostUiEventRow } from '../../composables/useScheduleBoost'
import { isRouteEldEventWithinSession, isRouteEldTimestampWithinSession } from '../../composables/useScheduleBoost'
import type { RouteEldEventSession, RouteEldHosEvent } from '../../types/boost'

const props = withDefaults(defineProps<{
  open: boolean
  events?: BoostUiEventRow[]
  sourceEvents?: RouteEldHosEvent[]
  session?: RouteEldEventSession | null
  loading?: boolean
}>(), {
  events: () => [],
  sourceEvents: () => [],
  session: null,
  loading: false,
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  submit: [payload: {
    trailers: string[] | null
    documents: string[] | null
    deltaSeconds: number | null
    odometerMiles: number | null
    odometerOffset: boolean
  }]
}>()

const applyTime = ref(false)
const applyOdometer = ref(false)
const odometerOffset = ref(false)
const trailers = ref('')
const documents = ref('')
const deltaSeconds = ref('')
const odometerMiles = ref('')

const parsedDelta = computed(() => Number(deltaSeconds.value))
const parsedOdometer = computed(() => Number(odometerMiles.value))
const validationError = computed(() => {
  if (!props.session || !props.events.length || props.sourceEvents.length !== props.events.length)
    return 'The selected events are not available in the active session.'
  if (props.sourceEvents.some((event) => event.isFrozen || !isRouteEldEventWithinSession(event, props.session!)))
    return 'Frozen events and events outside the session period cannot be updated.'
  if (applyTime.value) {
    if (!deltaSeconds.value.trim() || !Number.isInteger(parsedDelta.value) || parsedDelta.value === 0)
      return 'Enter a non-zero time adjustment in whole seconds.'
    if (props.sourceEvents.some((event) =>
      !isRouteEldTimestampWithinSession(event.timestamp + parsedDelta.value * 1000, event.timeZone, props.session!)
    )) return 'The adjusted event times must remain within the session period.'
  }
  if (applyOdometer.value) {
    if (!odometerMiles.value.trim() || !Number.isFinite(parsedOdometer.value))
      return 'Enter a valid odometer value.'
    if (!odometerOffset.value && parsedOdometer.value < 0)
      return 'Odometer cannot be negative.'
    if (odometerOffset.value && props.sourceEvents.some((event) =>
      event.odometerMiles != null && event.odometerMiles + parsedOdometer.value < 0
    )) return 'The offset would make an odometer negative.'
  }
  return ''
})
const canSubmit = computed(() =>
  !validationError.value &&
  (trailers.value.trim().length > 0 || documents.value.trim().length > 0 || applyTime.value || applyOdometer.value)
)

watch(() => props.open, (open) => {
  if (!open) return
  applyTime.value = false
  applyOdometer.value = false
  odometerOffset.value = false
  trailers.value = ''
  documents.value = ''
  deltaSeconds.value = ''
  odometerMiles.value = ''
})

function setApplyOdometer(value: boolean | 'indeterminate') {
  applyOdometer.value = Boolean(value)
  if (!applyOdometer.value) odometerOffset.value = false
}

function onOpenChange(open: boolean) {
  if (!open && props.loading) return
  emit('update:open', open)
}

function parseCargo(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean)
}

function submit() {
  if (!canSubmit.value) return
  emit('submit', {
    trailers: parseCargo(trailers.value),
    documents: parseCargo(documents.value),
    deltaSeconds: applyTime.value ? parsedDelta.value : null,
    odometerMiles: applyOdometer.value ? parsedOdometer.value : null,
    odometerOffset: applyOdometer.value && odometerOffset.value,
  })
}
</script>
