<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Multi Update Events</DialogTitle>
      </DialogHeader>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div class="text-sm text-muted-foreground">
          Selected events: <span class="font-medium text-foreground">{{ events.length }}</span>
        </div>

        <!-- Trailer + Doc + Co-Driver -->
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1">
            <label class="text-sm font-medium">Trailer</label>
            <Input v-model="form.trailer" placeholder="Trailer" maxlength="100" />
          </div>
          <div class="space-y-1">
            <label class="text-sm font-medium">Shipping Document</label>
            <Input v-model="form.doc" placeholder="Shipping Doc" maxlength="100" />
          </div>
        </div>
        <div class="space-y-1">
          <label class="text-sm font-medium">
            Co-Driver <span class="text-muted-foreground font-normal">(optional)</span>
          </label>
          <Select v-model="form.coDriverId">
            <SelectTrigger :disabled="isDriversLoading">
              <SelectValue :placeholder="isDriversLoading ? 'Loading drivers...' : 'Select co-driver'" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">None</SelectItem>
              <SelectItem
                v-for="driver in filteredDrivers"
                :key="driver.id"
                :value="driver.id"
              >
                {{ driver.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- Shift Timeline -->
        <div class="rounded-xl border bg-muted/30 p-4 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-sm font-semibold">Shift Timeline</span>
            <span
              v-if="computedShiftedTimes !== null"
              :class="shiftForm.direction === 'up' ? 'text-amber-600' : 'text-primary'"
              class="text-xs font-mono font-medium"
            >
              {{ shiftForm.direction === 'up' ? '−' : '+' }} {{ formatShiftDuration(Math.abs(computedShiftedTimes)) }}
            </span>
            <span v-else class="text-xs text-muted-foreground italic">No shift applied</span>
          </div>

          <!-- Direction toggle -->
          <div class="flex gap-2">
            <button
              type="button"
              class="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium border transition-colors"
              :class="shiftForm.direction === 'up'
                ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800'
                : 'bg-background text-muted-foreground border-border hover:bg-muted'"
              @click="shiftForm.direction = 'up'"
            >
              ↑ Earlier
            </button>
            <button
              type="button"
              class="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium border transition-colors"
              :class="shiftForm.direction === 'down'
                ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800'
                : 'bg-background text-muted-foreground border-border hover:bg-muted'"
              @click="shiftForm.direction = 'down'"
            >
              ↓ Later
            </button>
          </div>

          <!-- Time inputs -->
          <div class="flex items-center gap-3 justify-center">
            <div v-for="field in SHIFT_FIELDS" :key="field.key" class="flex flex-col items-center gap-1">
              <Input
                type="number"
                :min="0"
                :max="field.max"
                :placeholder="field.placeholder"
                :value="shiftForm[field.key]"
                class="w-16 text-center font-mono"
                @input="onShiftInput(field.key, $event)"
              />
              <span class="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                {{ field.label }}
              </span>
            </div>
          </div>
        </div>

        <!-- Selected events preview -->
        <div v-if="events.length" class="border rounded-lg overflow-hidden max-h-44 overflow-y-auto">
          <div class="bg-muted/50 grid grid-cols-[40px_1fr_1fr_1fr] gap-2 px-4 py-2 text-xs font-semibold text-muted-foreground uppercase sticky top-0">
            <span>#</span>
            <span>Time</span>
            <span>Trailer</span>
            <span>Document</span>
          </div>
          <div
            v-for="(ev, i) in events"
            :key="ev.eventId"
            class="grid grid-cols-[40px_1fr_1fr_1fr] gap-2 px-4 py-2 text-sm border-t"
          >
            <span class="text-muted-foreground">{{ i + 1 }}</span>
            <span>{{ formatTime(ev.startTime) }}</span>
            <span>{{ ev.trailerNumber || '-' }}</span>
            <span>{{ ev.shippingDocument || '-' }}</span>
          </div>
        </div>

        <Separator />

        <DialogFooter>
          <Button type="button" variant="secondary" @click="$emit('update:open', false)">Cancel</Button>
          <Button type="submit" :disabled="isDisabled || loading">
            {{ loading ? 'Updating...' : 'Update' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { reactive, computed, watch, ref } from 'vue'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import dayjs from 'dayjs'
import type { BoostUiEventRow } from '../../composables/useBoost.ts'
import { useCarriersDrivers } from '@/composables/useCarriersDrivers'

const SHIFT_FIELDS = [
  { key: 'days' as const, label: 'Day', placeholder: '00', max: undefined },
  { key: 'hours' as const, label: 'Hr', placeholder: '00', max: 23 },
  { key: 'minutes' as const, label: 'Min', placeholder: '00', max: 59 },
  { key: 'seconds' as const, label: 'Sec', placeholder: '00', max: 59 },
]

interface Props {
  open: boolean
  events?: BoostUiEventRow[]
  loading?: boolean
  currentDriverId?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  events: () => [],
  loading: false,
  currentDriverId: null,
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  submit: [payload: {
    trailer: string | null
    doc: string | null
    coDriverId: string | null
    shiftedTimes: number | null
  }]
}>()

const { drivers, fetchDrivers } = useCarriersDrivers()
const isDriversLoading = ref(false)

const form = reactive({ trailer: '', doc: '', coDriverId: '' })

const shiftForm = reactive({
  days: null as number | null,
  hours: null as number | null,
  minutes: null as number | null,
  seconds: null as number | null,
  direction: 'up' as 'up' | 'down',
})

const filteredDrivers = computed(() =>
  drivers.value.filter((d) => d.id !== props.currentDriverId)
)

const computedShiftedTimes = computed(() => {
  const total =
    (shiftForm.days || 0) * 86400 +
    (shiftForm.hours || 0) * 3600 +
    (shiftForm.minutes || 0) * 60 +
    (shiftForm.seconds || 0)
  if (total === 0) return null
  return shiftForm.direction === 'up' ? -total : total
})

const isDisabled = computed(
  () => !form.trailer && !form.doc && !form.coDriverId && computedShiftedTimes.value === null
)

watch(
  () => props.open,
  async (val) => {
    if (!val) return
    form.trailer = ''
    form.doc = ''
    form.coDriverId = ''
    Object.assign(shiftForm, { days: null, hours: null, minutes: null, seconds: null, direction: 'up' })
    if (!drivers.value.length) {
      isDriversLoading.value = true
      try {
        await fetchDrivers()
      } finally {
        isDriversLoading.value = false
      }
    }
  }
)

function onShiftInput(field: keyof typeof shiftForm, e: Event) {
  const raw = parseInt((e.target as HTMLInputElement).value)
  const fieldDef = SHIFT_FIELDS.find((f) => f.key === field)
  const max = fieldDef?.max
  const val = isNaN(raw) ? null : max !== undefined ? Math.min(max, Math.max(0, raw)) : Math.max(0, raw)
  ;(shiftForm as any)[field] = val
}

function formatTime(t: string) {
  return dayjs(t).format('MMM D, h:mm:ss a')
}

function formatShiftDuration(totalSeconds: number): string {
  if (!totalSeconds) return '0s'
  const d = Math.floor(totalSeconds / 86400)
  const h = Math.floor((totalSeconds % 86400) / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return [d && `${d}d`, h && `${h}h`, m && `${m}m`, s && `${s}s`].filter(Boolean).join(' ')
}

function handleSubmit() {
  emit('submit', {
    trailer: form.trailer.trim() || null,
    doc: form.doc.trim() || null,
    coDriverId: form.coDriverId || null,
    shiftedTimes: computedShiftedTimes.value,
  })
}
</script>
