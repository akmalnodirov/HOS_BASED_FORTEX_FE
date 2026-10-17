<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>
          {{ readonly ? 'Event details' : form.eventId ? 'Edit HOS event' : 'Insert HOS event' }}
        </DialogTitle>
      </DialogHeader>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <fieldset :disabled="readonly" class="space-y-4 disabled:opacity-100">
          <div v-if="!form.eventId" class="space-y-1">
            <label class="text-sm font-medium">Responsible user</label>
            <Select
              :model-value="form.responsibleUserId ?? ''"
              @update:model-value="patch({ responsibleUserId: String($event) })"
            >
              <SelectTrigger><SelectValue placeholder="Select responsible user" /></SelectTrigger>
              <SelectContent>
                <SelectItem v-for="user in users" :key="user.id" :value="user.id">
                  {{ user.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="grid grid-cols-12 gap-3">
            <div class="col-span-3 space-y-1">
              <label class="text-sm font-medium">Sequence ID</label>
              <Input
                :model-value="form.sequenceId ?? ''"
                @input="onStringInput('sequenceId', $event)"
                placeholder="Sequence ID"
              />
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
                  <SelectItem
                    v-for="ev in editableEvents"
                    :key="ev.id"
                    :value="ev.id"
                    :disabled="disableSleeperBerth && ev.id === 'DS_SB'"
                  >
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
              <p
                v-if="disableSleeperBerth && selectedEventKey === 'DS_SB' && !form.eventId"
                class="mt-1 text-xs text-red-600"
              >
                Sleeper berth is disabled for this session.
              </p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1">
              <label class="text-sm font-medium">Record status</label>
              <Select
                :model-value="form.recordStatus ?? ''"
                @update:model-value="onRecordStatusChange"
              >
                <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-if="
                      form.recordStatus &&
                      !['ACTIVE', 'INACTIVE_CHANGED'].includes(form.recordStatus)
                    "
                    :value="form.recordStatus"
                  >
                    {{ preservedStatusLabel }}
                  </SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE_CHANGED">Inactive · changed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="space-y-1">
              <label class="text-sm font-medium">Origin</label>
              <Select :model-value="String(form.origin ?? '')" @update:model-value="onOriginChange">
                <SelectTrigger>
                  <SelectValue placeholder="Select Origin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">ELD</SelectItem>
                  <SelectItem value="2">Driver</SelectItem>
                  <SelectItem value="3">User</SelectItem>
                  <SelectItem value="4">Unidentified driver</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <template v-if="isCertifiedVisible">
            <div class="space-y-1">
              <label class="text-sm font-medium">Date to certify</label>
              <Input type="date" :model-value="certifiedDateStr" @input="onCertifiedDateInput" />
            </div>
          </template>

          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1">
              <label class="text-sm font-medium">Date and time</label>
              <Popover>
                <PopoverTrigger as-child>
                  <Button type="button" variant="outline" class="w-full justify-start font-normal">
                    <CalendarIcon class="mr-2 h-4 w-4 text-muted-foreground" />
                    {{ formattedDateTime }}
                  </Button>
                </PopoverTrigger>
                <PopoverContent class="w-auto p-0" align="start">
                  <Calendar v-model="eventCalendarDate" initial-focus />
                  <div class="border-t p-3">
                    <TimePicker v-model="eventClock" include-seconds />
                  </div>
                </PopoverContent>
              </Popover>
              <p v-if="!dateWithinSession" class="text-xs text-red-600">
                Event time must remain within the session period.
              </p>
            </div>
            <div class="space-y-1">
              <label class="text-sm font-medium">ELD</label>
              <Select :model-value="form.eldId ?? '__none__'" @update:model-value="onEldChange">
                <SelectTrigger><SelectValue placeholder="Select ELD" /></SelectTrigger>
                <SelectContent class="max-h-64">
                  <SelectItem value="__none__">No ELD</SelectItem>
                  <SelectItem
                    v-if="form.eldId && !editOptions.elds.some((eld) => eld.id === form.eldId)"
                    :value="form.eldId"
                  >
                    {{ form.eldId }}
                  </SelectItem>
                  <SelectItem v-for="eld in editOptions.elds" :key="eld.id" :value="eld.id">
                    {{ eld.serialNumber || eld.sn || eld.id }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div class="grid grid-cols-12 gap-3">
            <div class="col-span-6 space-y-1">
              <label class="text-sm font-medium">Vehicle</label>
              <Select
                :model-value="form.vehicleId ?? '__none__'"
                @update:model-value="onVehicleChange"
              >
                <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                <SelectContent class="max-h-64">
                  <SelectItem value="__none__">No vehicle</SelectItem>
                  <SelectItem
                    v-if="
                      form.vehicleId &&
                      !editOptions.vehicles.some((vehicle) => vehicle.id === form.vehicleId)
                    "
                    :value="form.vehicleId"
                  >
                    {{ form.vehicleUnit || form.vehicleId }}
                  </SelectItem>
                  <SelectItem
                    v-for="vehicle in editOptions.vehicles"
                    :key="vehicle.id"
                    :value="vehicle.id"
                  >
                    {{ vehicle.name }}<template v-if="vehicle.vin"> · {{ vehicle.vin }}</template>
                  </SelectItem>
                </SelectContent>
              </Select>
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

          <div class="border-t pt-4">
            <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Location
            </p>
            <div class="grid grid-cols-3 gap-3">
              <div class="space-y-1">
                <label class="text-sm font-medium">Positioning</label>
                <Select
                  :model-value="form.positioning ?? '__none__'"
                  @update:model-value="onPositioningChange"
                >
                  <SelectTrigger><SelectValue placeholder="Select positioning" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Not specified</SelectItem>
                    <SelectItem value="AUTOMATIC">Automatic</SelectItem>
                    <SelectItem value="MANUAL">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1">
              <label class="text-sm font-medium">Latitude</label>
              <Input
                type="number"
                step="any"
                :model-value="form.latitude ?? ''"
                @input="onNumberInput('latitude', $event)"
                placeholder="Latitude"
                :disabled="form.positioning === 'MANUAL'"
              />
            </div>
            <div class="space-y-1">
              <label class="text-sm font-medium">Longitude</label>
              <Input
                type="number"
                step="any"
                :model-value="form.longitude ?? ''"
                @input="onNumberInput('longitude', $event)"
                placeholder="Longitude"
                :disabled="form.positioning === 'MANUAL'"
              />
            </div>
          </div>

          <div class="space-y-1">
            <label class="text-sm font-medium">Location</label>
            <Input
              :model-value="form.location ?? ''"
              disabled
              class="bg-muted"
              :placeholder="isReverseGeocoding ? 'Calculating location…' : 'Calculated location'"
            />
            <p v-if="geocodeError" class="text-xs text-red-600">{{ geocodeError }}</p>
          </div>

        </fieldset>

          <div class="grid grid-cols-3 gap-2">
            <Button type="button" variant="outline" class="gap-2" @click="copyCoords">
              <Copy class="w-4 h-4" /> Copy
            </Button>
            <Button type="button" variant="outline" class="gap-2" :disabled="readonly" @click="pasteCoords">
              <ClipboardPaste class="w-4 h-4" /> Paste
            </Button>
            <Button type="button" variant="outline" class="gap-2" @click="openMap">
              <MapPin class="w-4 h-4" /> Map
            </Button>
          </div>

        <fieldset :disabled="readonly" class="space-y-4 disabled:opacity-100">

          <div class="space-y-1">
            <label class="text-sm font-medium">Location note</label>
            <Input
              :model-value="form.locationNote ?? ''"
              @input="onStringInput('locationNote', $event)"
              placeholder="Location note"
              maxlength="100"
              :disabled="form.positioning === 'AUTOMATIC'"
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
        </fieldset>

        <DialogFooter>
          <Button
            v-if="form.eventId && !readonly"
            type="button"
            variant="destructive"
            class="mr-auto"
            :disabled="loading"
            @click="$emit('delete', form.eventId)"
          >
            <Trash2 class="mr-2 h-4 w-4" /> Delete event
          </Button>
          <Button type="button" variant="secondary" @click="$emit('update:open', false)">
            {{ readonly ? 'Close' : 'Cancel' }}
          </Button>
          <Button v-if="!readonly" type="submit" :disabled="isSubmitDisabled || loading">
            {{ loading ? 'Saving...' : form.eventId ? 'Save event' : 'Insert event' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Calendar as CalendarIcon, Copy, ClipboardPaste, MapPin, Trash2 } from 'lucide-vue-next'
import { CalendarDate } from '@internationalized/date'
import { useApi } from '@/composables/useAxiosService'
import { ApiEndpoints } from '@/api/endpoints'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import TimePicker from '@/components/custom/time-picker/TimePicker.vue'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { allEvents } from '@/utils/events.ts'
import type {
  BoostEventStatusForm,
  RouteEldEventEditOptions,
  RouteEldResponsibleUser,
} from '../../types/boost.ts'
import dayjs from 'dayjs'
import { toast } from 'vue-sonner'
import { copyCoordinates, readCoordinates } from '../../utils/coordinateClipboard'

const NOTE_SHORTCUTS = [
  'PTI',
  'Scale',
  'Hook',
  'Delivery',
  'Fuel',
  'DOT',
  'Repairs',
  'Drop',
  'Pick Up',
  'Rest',
  'Break',
  'Loading',
  'Unloading',
  'Inspection',
] as const

interface Props {
  open: boolean
  form: BoostEventStatusForm
  editOptions?: RouteEldEventEditOptions
  users?: RouteEldResponsibleUser[]
  disableSleeperBerth?: boolean
  fromDate?: string
  toDate?: string
  loading?: boolean
  readonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  readonly: false,
  editOptions: () => ({ vehicles: [], elds: [] }),
  users: () => [],
  disableSleeperBerth: false,
  fromDate: '',
  toDate: '',
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  submit: [form: BoostEventStatusForm]
  delete: [eventId: string]
  'update:form': [form: BoostEventStatusForm]
}>()

const api = useApi()

function patch(partial: Partial<BoostEventStatusForm>) {
  emit('update:form', { ...props.form, ...partial })
}

let geocodeTimer: ReturnType<typeof setTimeout> | null = null
let geocodeVersion = 0
const isReverseGeocoding = ref(false)
const geocodeError = ref('')
watch(
  () => [props.form.latitude, props.form.longitude],
  ([lat, lng]) => {
    if (
      lat === null ||
      lat === '' ||
      lng === null ||
      lng === '' ||
      props.form.positioning === 'MANUAL'
    )
      return
    if (geocodeTimer) clearTimeout(geocodeTimer)
    geocodeTimer = setTimeout(async () => {
      const latitude = Number(lat)
      const longitude = Number(lng)
      const version = ++geocodeVersion
      isReverseGeocoding.value = true
      geocodeError.value = ''
      try {
        const response = await api.get<{ label?: string | null }>(
          ApiEndpoints.ALPR_GEOCODE_REVERSE,
          {
            params: { latitude, longitude, relative: true },
          }
        )
        if (version !== geocodeVersion) return
        const address = response.data?.label?.trim().replace(/, United States$/i, '')
        if (!address) throw new Error('Location was not resolved')
        patch({
          positioning: 'AUTOMATIC',
          location: address,
          locationNote: null,
        })
      } catch {
        if (version === geocodeVersion)
          geocodeError.value = 'The coordinates could not be reverse geocoded.'
      } finally {
        if (version === geocodeVersion) isReverseGeocoding.value = false
      }
    }, 450)
  }
)

const isCertifiedVisible = computed(() => props.form.event.eventType === 4)
const dateWithinSession = computed(
  () =>
    (!props.fromDate || props.form.startDate >= props.fromDate) &&
    (!props.toDate || props.form.startDate <= props.toDate)
)
const preservedStatusLabel = computed(() =>
  String(props.form.recordStatus || '')
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/^./, (value) => value.toUpperCase())
)

const editableEventIds = [
  'DS_OFF',
  'DS_WT',
  'DS_SB',
  'DS_D',
  'DS_ON',
  'LOG_NORMAL_PRECISION',
  'LOG_REDUCED_PRECISION',
  'DR_IND_PC',
  'DR_IND_YM',
  ...Array.from({ length: 9 }, (_, index) => `DR_CERT_${index + 1}`),
  'DR_LOGIN',
  'DR_LOGOUT',
  'ENG_UP_NORMAL',
  'ENG_UP_REDUCED',
  'ENG_DOWN_NORMAL',
  'ENG_DOWN_REDUCED',
]
const eventIdByNumeric: Record<string, string> = {
  '1:1': 'DS_OFF',
  '1:2': 'DS_SB',
  '1:3': 'DS_D',
  '1:4': 'DS_ON',
  '2:1': 'LOG_NORMAL_PRECISION',
  '2:2': 'LOG_REDUCED_PRECISION',
  '3:1': 'DR_IND_PC',
  '3:2': 'DR_IND_YM',
  '5:1': 'DR_LOGIN',
  '5:2': 'DR_LOGOUT',
  '6:1': 'ENG_UP_NORMAL',
  '6:2': 'ENG_UP_REDUCED',
  '6:3': 'ENG_DOWN_NORMAL',
  '6:4': 'ENG_DOWN_REDUCED',
}
const eventLabelById: Record<string, string> = {
  DS_OFF: 'Off Duty',
  DS_WT: 'Off Duty (Waiting Time)',
  DS_SB: 'Sleeper Berth',
  DS_D: 'Driving',
  DS_ON: 'On Duty',
  LOG_NORMAL_PRECISION: 'Intermediate w/ CLP',
  LOG_REDUCED_PRECISION: 'Intermediate w/ RLP',
  DR_IND_PC: 'Personal Conveyance',
  DR_IND_YM: 'Yard Move',
  DR_LOGIN: 'Login',
  DR_LOGOUT: 'Logout',
  ENG_UP_NORMAL: 'Engine Power-up w/ CLP',
  ENG_UP_REDUCED: 'Engine Power-up w/ RLP',
  ENG_DOWN_NORMAL: 'Engine Shut-down w/ CLP',
  ENG_DOWN_REDUCED: 'Engine Shut-down w/ RLP',
}
const numericByEventId: Record<string, [number, number]> = {
  DS_OFF: [1, 1],
  DS_WT: [1, 1],
  DS_SB: [1, 2],
  DS_D: [1, 3],
  DS_ON: [1, 4],
  LOG_NORMAL_PRECISION: [2, 1],
  LOG_REDUCED_PRECISION: [2, 2],
  DR_IND_PC: [3, 1],
  DR_IND_YM: [3, 2],
  DR_LOGIN: [5, 1],
  DR_LOGOUT: [5, 2],
  ENG_UP_NORMAL: [6, 1],
  ENG_UP_REDUCED: [6, 2],
  ENG_DOWN_NORMAL: [6, 3],
  ENG_DOWN_REDUCED: [6, 4],
}
const editableEvents = editableEventIds.map((id) => {
  const certification = /^DR_CERT_(\d+)$/.exec(id)
  const numeric = certification
    ? ([4, Number(certification[1])] as [number, number])
    : numericByEventId[id]
  const definition = allEvents.find(
    (item) => item.eventType === numeric[0] && item.eventCode === numeric[1]
  )
  return {
    id,
    label: eventLabelById[id] ?? `Certification (${numeric[1]})`,
    color: definition?.color ?? '#6366F1',
    eventType: numeric[0],
    eventCode: numeric[1],
  }
})

const selectedEventKey = computed(
  () =>
    props.form.eventCodeId ??
    eventIdByNumeric[`${props.form.event.eventType}:${props.form.event.eventCode}`] ??
    ''
)

const selectedEvent = computed(() => editableEvents.find((e) => e.id === selectedEventKey.value))

function onEventChange(key: unknown) {
  const ev = editableEvents.find((e) => e.id === String(key))
  if (!ev) return
  patch({ event: { eventType: ev.eventType, eventCode: ev.eventCode }, eventCodeId: ev.id })
}

const certifiedDateStr = computed(() =>
  props.form.certifiedDate ? dayjs(props.form.certifiedDate).format('YYYY-MM-DD') : ''
)

const eventCalendarDate = computed({
  get: () => {
    const [year, month, day] = props.form.startDate.split('-').map(Number)
    return new CalendarDate(year, month, day)
  },
  set: (value: CalendarDate) => patch({ startDate: value.toString() }),
})
const formattedDateTime = computed(() =>
  dayjs(
    `${props.form.startDate}T${clockPart('hours')}:${clockPart('minutes')}:${clockPart('seconds')}`
  ).format('MMM D, YYYY · HH:mm:ss')
)
function clockPart(part: 'hours' | 'minutes' | 'seconds') {
  return String(props.form.time[part]).padStart(2, '0')
}
const eventClock = computed({
  get: () => `${clockPart('hours')}:${clockPart('minutes')}:${clockPart('seconds')}`,
  set: (value: string) => {
    const [hours = 0, minutes = 0, seconds = 0] = value.split(':').map(Number)
    patch({ time: { hours, minutes, seconds } })
  },
})
function onCertifiedDateInput(e: Event) {
  patch({ certifiedDate: (e.target as HTMLInputElement).value })
}
function onOriginChange(v: unknown) {
  patch({ origin: Number(v) })
}
function onRecordStatusChange(v: unknown) {
  patch({ recordStatus: String(v) })
}
function onVehicleChange(v: unknown) {
  const id = String(v)
  const vehicle = props.editOptions.vehicles.find((item) => item.id === id)
  patch({ vehicleId: id === '__none__' ? null : id, vehicleUnit: vehicle?.name ?? null })
}
function onEldChange(v: unknown) {
  const id = String(v)
  patch({ eldId: id === '__none__' ? null : id })
}
function onPositioningChange(v: unknown) {
  const value = String(v)
  patch({
    positioning: value === 'MANUAL' || value === 'AUTOMATIC' ? value : null,
  })
}

function onNumberInput(field: keyof BoostEventStatusForm, e: Event) {
  const raw = (e.target as HTMLInputElement).value
  const value = raw === '' ? null : parseFloat(raw)
  if ((field === 'latitude' || field === 'longitude') && props.form.positioning !== 'MANUAL') {
    patch({ [field]: value, positioning: 'AUTOMATIC' } as Partial<BoostEventStatusForm>)
    return
  }
  patch({ [field]: value } as Partial<BoostEventStatusForm>)
}
function onStringInput(field: keyof BoostEventStatusForm, e: Event) {
  patch({ [field]: (e.target as HTMLInputElement).value || null } as Partial<BoostEventStatusForm>)
}

const isSubmitDisabled = computed(() => {
  if (!props.form.eventId && !props.form.responsibleUserId) return true
  if (!dateWithinSession.value) return true
  if (!props.form.eventId && props.disableSleeperBerth && selectedEventKey.value === 'DS_SB')
    return true
  const { positioning, latitude, longitude, locationNote } = props.form
  if (
    positioning === 'AUTOMATIC' &&
    (latitude === null || latitude === '' || longitude === null || longitude === '')
  )
    return true
  return positioning === 'MANUAL' && !locationNote
})

async function copyCoords() {
  const { latitude, longitude } = props.form
  if (latitude != null && longitude != null) {
    await copyCoordinates(Number(latitude), Number(longitude))
    toast.success('Coordinates copied')
  }
}

async function pasteCoords() {
  const coordinates = await readCoordinates()
  if (coordinates) patch(coordinates)
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
  if (props.readonly) return
  emit('submit', props.form)
}
</script>
