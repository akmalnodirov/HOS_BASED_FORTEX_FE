<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="sm:max-w-162.5 max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Edit Status</DialogTitle>
      </DialogHeader>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div class="grid grid-cols-12 gap-3">
          <div class="col-span-3 space-y-1">
            <label class="text-sm font-medium">Id</label>
            <Input type="number" :model-value="form.id" disabled class="bg-muted" />
          </div>
          <div class="col-span-9 space-y-1">
            <label class="text-sm font-medium">Events</label>
            <Select :model-value="selectedEventKey" @update:model-value="onEventChange">
              <SelectTrigger>
                <SelectValue placeholder="Select Event">
                  <span v-if="selectedEvent" class="flex items-center gap-2">
                    <span
                      class="inline-block w-2 h-2 rounded-full"
                      :style="{ backgroundColor: selectedEvent.color }"
                    />
                    {{ selectedEvent.label }}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent class="max-h-64">
                <SelectItem v-for="ev in allEvents" :key="ev.key" :value="ev.key">
                  <span class="flex items-center gap-2">
                    <span
                      class="inline-block w-2 h-2 rounded-full shrink-0"
                      :style="{ backgroundColor: ev.color }"
                    />
                    {{ ev.label }}
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <template v-if="isCertifiedVisible">
          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1">
              <label class="text-sm font-medium">Certification date</label>
              <Input type="date" :model-value="certifiedDateStr" @input="onCertifiedDateInput" />
            </div>
            <div class="space-y-1">
              <label class="text-sm font-medium">Certification time</label>
              <div class="flex gap-1">
                <Input
                  type="number"
                  min="0"
                  max="23"
                  :model-value="form.certifiedTime.hours"
                  @input="onCertifiedTimeInput('hours', $event)"
                  class="text-center"
                  placeholder="HH"
                />
                <span class="flex items-center text-muted-foreground">:</span>
                <Input
                  type="number"
                  min="0"
                  max="59"
                  :model-value="form.certifiedTime.minutes"
                  @input="onCertifiedTimeInput('minutes', $event)"
                  class="text-center"
                  placeholder="MM"
                />
                <span class="flex items-center text-muted-foreground">:</span>
                <Input
                  type="number"
                  min="0"
                  max="59"
                  :model-value="form.certifiedTime.seconds"
                  @input="onCertifiedTimeInput('seconds', $event)"
                  class="text-center"
                  placeholder="SS"
                />
              </div>
            </div>
          </div>
        </template>

        <div class="grid grid-cols-12 gap-3">
          <div class="col-span-4 space-y-1">
            <label class="text-sm font-medium">Date</label>
            <Input type="date" :model-value="form.startDate" @input="onStartDateInput" />
          </div>
          <div class="col-span-4 space-y-1">
            <label class="text-sm font-medium">Time</label>
            <div class="flex gap-1">
              <Input
                type="number"
                min="0"
                max="23"
                :model-value="form.time.hours"
                @input="onTimeInput('hours', $event)"
                class="text-center px-1"
                placeholder="HH"
              />
              <span class="flex items-center text-muted-foreground">:</span>
              <Input
                type="number"
                min="0"
                max="59"
                :model-value="form.time.minutes"
                @input="onTimeInput('minutes', $event)"
                class="text-center px-1"
                placeholder="MM"
              />
              <span class="flex items-center text-muted-foreground">:</span>
              <Input
                type="number"
                min="0"
                max="59"
                :model-value="form.time.seconds"
                @input="onTimeInput('seconds', $event)"
                class="text-center px-1"
                placeholder="SS"
              />
            </div>
          </div>
          <div class="col-span-4 space-y-1">
            <label class="text-sm font-medium">Origin</label>
            <Select :model-value="String(form.origin ?? '')" @update:model-value="onOriginChange">
              <SelectTrigger>
                <SelectValue placeholder="Select Origin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">ELD</SelectItem>
                <SelectItem value="2">Driver</SelectItem>
                <SelectItem value="3">User</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div class="grid grid-cols-12 gap-3">
          <div class="col-span-6 space-y-1">
            <label class="text-sm font-medium">Vehicle</label>
            <Input
              :model-value="form.vehicleUnit ?? form.vehicleId ?? ''"
              disabled
              class="bg-muted"
            />
          </div>
          <div class="col-span-3 space-y-1">
            <label class="text-sm font-medium">Odometer</label>
            <Input
              type="number"
              :model-value="form.odometer ?? ''"
              @input="onNumberInput('odometer', $event)"
              placeholder="Odometer"
            />
          </div>
          <div class="col-span-3 space-y-1">
            <label class="text-sm font-medium">Engine Hours</label>
            <Input
              type="number"
              step="0.1"
              :model-value="form.engineHours ?? ''"
              @input="onNumberInput('engineHours', $event)"
              placeholder="Engine hrs"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1">
            <label class="text-sm font-medium">Trailer</label>
            <Input
              :model-value="form.trailer ?? ''"
              @input="onStringInput('trailer', $event)"
              placeholder="Trailer"
              maxlength="100"
            />
          </div>
          <div class="space-y-1">
            <label class="text-sm font-medium">Shipping Document</label>
            <Input
              :model-value="form.doc ?? ''"
              @input="onStringInput('doc', $event)"
              placeholder="Shipping Doc"
              maxlength="100"
            />
          </div>
        </div>

        <div class="space-y-1">
          <label class="text-sm font-medium">Location origin</label>
          <Select
            :model-value="String(form.locationOrigin ?? '')"
            @update:model-value="onLocationOriginChange"
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Location Origin" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Automatic</SelectItem>
              <SelectItem value="2">Manual</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1">
            <label class="text-sm font-medium">Latitude</label>
            <Input
              type="number"
              step="0.000001"
              :model-value="form.latitude ?? ''"
              @input="onNumberInput('latitude', $event)"
              placeholder="Latitude"
              :disabled="form.locationOrigin === 2"
            />
          </div>
          <div class="space-y-1">
            <label class="text-sm font-medium">Longitude</label>
            <Input
              type="number"
              step="0.000001"
              :model-value="form.longitude ?? ''"
              @input="onNumberInput('longitude', $event)"
              placeholder="Longitude"
              :disabled="form.locationOrigin === 2"
            />
          </div>
        </div>

        <div class="space-y-1">
          <label class="text-sm font-medium">Location</label>
          <Input
            :model-value="form.location ?? ''"
            disabled
            class="bg-muted"
            placeholder="Location"
          />
        </div>

        <div class="grid grid-cols-3 gap-2">
          <Button type="button" variant="outline" class="gap-2" @click="copyCoords">
            <Copy class="w-4 h-4" /> Copy
          </Button>
          <Button type="button" variant="outline" class="gap-2" @click="pasteCoords">
            <ClipboardPaste class="w-4 h-4" /> Paste
          </Button>
          <Button type="button" variant="outline" class="gap-2" @click="openMap">
            <MapPin class="w-4 h-4" /> Map
          </Button>
        </div>

        <div class="space-y-1">
          <label class="text-sm font-medium">Location note</label>
          <Input
            :model-value="form.locationNote ?? ''"
            @input="onStringInput('locationNote', $event)"
            placeholder="Location note"
            maxlength="100"
            :disabled="form.locationOrigin === 1"
          />
        </div>

        <div class="space-y-1">
          <label class="text-sm font-medium">Notes</label>
          <Input
            :model-value="form.notes ?? ''"
            @input="onStringInput('notes', $event)"
            placeholder="Notes"
            maxlength="100"
          />
          <div class="flex flex-wrap gap-1 mt-1">
            <Button
              v-for="note in NOTE_SHORTCUTS"
              :key="note"
              type="button"
              variant="outline"
              size="sm"
              class="text-xs h-7"
              @click="appendNote(note)"
            >
              {{ note }}
            </Button>
          </div>
        </div>

        <Separator />

        <DialogFooter>
          <Button type="button" variant="secondary" @click="$emit('update:open', false)">
            Cancel
          </Button>
          <Button type="submit" :disabled="isSubmitDisabled || loading">
            {{ loading ? 'Saving...' : 'Save' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { Copy, ClipboardPaste, MapPin } from 'lucide-vue-next'
import { useGeoLocationsStore } from '@/modules/Overview/store/geoLocations.ts'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { allEvents } from '@/utils/events.ts'
import type { BoostEventStatusForm } from '../../types/boost.ts'
import dayjs from 'dayjs'

const NOTE_SHORTCUTS = ['PTI', 'Fuel', 'Pick up', 'Delivery', 'DOT', 'Break'] as const

interface Props {
  open: boolean
  form: BoostEventStatusForm
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), { loading: false })

const emit = defineEmits<{
  'update:open': [value: boolean]
  submit: [form: BoostEventStatusForm]
  'update:form': [form: BoostEventStatusForm]
}>()

const geoStore = useGeoLocationsStore()

function patch(partial: Partial<BoostEventStatusForm>) {
  emit('update:form', { ...props.form, ...partial })
}

let geocodeTimer: ReturnType<typeof setTimeout> | null = null
watch(
  () => [props.form.latitude, props.form.longitude],
  ([lat, lng]) => {
    if (!lat || !lng || props.form.locationOrigin === 2) return
    if (geocodeTimer) clearTimeout(geocodeTimer)
    geocodeTimer = setTimeout(async () => {
      const address = await geoStore.getCalculatedAddress({
        latitude: lat as number,
        longitude: lng as number,
      })
      if (address) patch({ location: address })
    }, 600)
  }
)

const isCertifiedVisible = computed(() => props.form.event.eventType === 4)

const selectedEventKey = computed(
  () =>
    allEvents.find(
      (e) =>
        e.eventType === props.form.event.eventType && e.eventCode === props.form.event.eventCode
    )?.key ?? ''
)

const selectedEvent = computed(() => allEvents.find((e) => e.key === selectedEventKey.value))

function onEventChange(key: unknown) {
  const ev = allEvents.find((e) => e.key === String(key))
  if (!ev) return
  patch({ event: { eventType: ev.eventType, eventCode: ev.eventCode } })
}

const certifiedDateStr = computed(() =>
  props.form.certifiedDate ? dayjs(props.form.certifiedDate).format('YYYY-MM-DD') : ''
)

function onStartDateInput(e: Event) {
  patch({ startDate: (e.target as HTMLInputElement).value })
}
function onCertifiedDateInput(e: Event) {
  patch({ certifiedDate: (e.target as HTMLInputElement).value })
}
function onTimeInput(field: 'hours' | 'minutes' | 'seconds', e: Event) {
  const val = parseInt((e.target as HTMLInputElement).value) || 0
  patch({ time: { ...props.form.time, [field]: val } })
}
function onCertifiedTimeInput(field: 'hours' | 'minutes' | 'seconds', e: Event) {
  const val = parseInt((e.target as HTMLInputElement).value) || 0
  patch({ certifiedTime: { ...props.form.certifiedTime, [field]: val } })
}

function onOriginChange(v: unknown) {
  patch({ origin: Number(v) })
}
function onLocationOriginChange(v: unknown) {
  patch({ locationOrigin: Number(v) })
}

function onNumberInput(field: keyof BoostEventStatusForm, e: Event) {
  const raw = (e.target as HTMLInputElement).value
  patch({ [field]: raw === '' ? null : parseFloat(raw) } as Partial<BoostEventStatusForm>)
}
function onStringInput(field: keyof BoostEventStatusForm, e: Event) {
  patch({ [field]: (e.target as HTMLInputElement).value || null } as Partial<BoostEventStatusForm>)
}

const isSubmitDisabled = computed(() => {
  const { locationOrigin, latitude, longitude, locationNote } = props.form
  if (locationOrigin === 1 && (!latitude || !longitude)) return true
  return locationOrigin === 2 && !locationNote
})

async function copyCoords() {
  const { latitude, longitude } = props.form
  if (latitude != null && longitude != null) {
    await navigator.clipboard.writeText(`${latitude} ${longitude}`)
  }
}

async function pasteCoords() {
  try {
    const text = await navigator.clipboard.readText()
    const match = text.match(/^([+-]?\d*\.?\d+)\s*[^0-9+-]*\s*([+-]?\d*\.?\d+)/)
    if (match) {
      patch({ latitude: parseFloat(match[1]), longitude: parseFloat(match[2]) })
    }
  } catch {
  }
}

function openMap() {
  const { latitude, longitude } = props.form
  if (latitude != null && longitude != null) {
    window.open(`https://maps.google.com/?q=${latitude},${longitude}`, '_blank')
  }
}

function appendNote(note: string) {
  const parts = (props.form.notes ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (parts.includes(note)) return
  const joined = [...parts, note].join(', ')
  if (joined.length <= 100) patch({ notes: joined })
}

function handleSubmit() {
  emit('submit', props.form)
}
</script>
