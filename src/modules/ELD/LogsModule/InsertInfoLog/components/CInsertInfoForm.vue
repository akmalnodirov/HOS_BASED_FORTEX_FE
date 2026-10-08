<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center lg:gap-3">
      <button
        v-for="status in eventTypes"
        :key="status.key"
        @click="handleEventTypeChange(status)"
        :class="[
          'px-4 lg:px-8 py-2.5 rounded-md w-full text-xs lg:text-sm font-medium transition-all',
          selectedStatus === status.key
            ? 'bg-background text-foreground border border-foreground shadow-sm'
            : 'bg-[#F2F2F2] dark:bg-muted/30 text-foreground border border-transparent hover:bg-muted/80',
        ]"
      >
        {{ status.label }}
      </button>
    </div>

    <form @submit.prevent="handleSave" class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="space-y-2">
          <Label>Start Time</Label>
          <TimePicker v-model="startTimeString" @update:model-value="handleStartTimeChange" />
        </div>
        <div class="space-y-2">
          <Label>End Time</Label>
          <TimePicker v-model="endTimeString" @update:model-value="handleEndTimeChange" />
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="space-y-2">
          <Label>Latitude</Label>
          <Input
            v-model="form.latitude"
            type="number"
            step="any"
            placeholder="Enter Latitude"
            class="h-12 bg-background border-border shadow-none"
          />
        </div>
        <div class="space-y-2">
          <Label>Longitude</Label>
          <Input
            v-model="form.longitude"
            type="number"
            step="any"
            placeholder="Enter Longitude"
            class="h-12 bg-background border-border shadow-none"
          />
        </div>
      </div>

      <div class="space-y-2">
        <Label>Location</Label>
        <Input
          v-model="form.calculatedLocation"
          placeholder="Enter Location (e.g. 5.6 mi SE of Palmyra, PA)"
          class="h-12 bg-background border-border shadow-none"
        />
      </div>

      <div class="flex gap-3">
        <Button
          type="button"
          variant="outline"
          size="lg"
          class="px-6 lg:px-10 h-10 border-foreground text-foreground hover:bg-foreground hover:text-background transition-colors"
          @click="handleCopy"
        >
          <Copy class="w-4 h-4 mr-2" />
          Copy
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          class="px-6 lg:px-10 h-10 border-foreground text-foreground hover:bg-foreground hover:text-background transition-colors"
          @click="handlePaste"
        >
          <ClipboardPaste class="w-4 h-4 mr-2" />
          Paste
        </Button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="space-y-2">
          <Label>Odometer</Label>
          <Input
            v-model="form.totalVehicleMiles"
            type="number"
            step="any"
            placeholder="Enter Odometer"
            class="h-12 bg-background border-border shadow-none"
          />
        </div>
        <div class="space-y-2">
          <Label>Engine Hours</Label>
          <Input
            v-model="form.totalEngineHours"
            type="number"
            step="any"
            placeholder="Enter Engine Hours"
            class="h-12 bg-background border-border shadow-none"
          />
        </div>
      </div>

      <div class="space-y-2">
        <Label>Vehicle</Label>
        <Select v-model="form.vehicleId">
          <SelectTrigger class="h-12 bg-background border-border shadow-none">
            <SelectValue placeholder="Select Vehicle" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="vehicle in driverVehicles" :key="vehicle.id" :value="vehicle.id">
              {{ vehicle.unit }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div class="space-y-2">
        <Label>Notes</Label>
        <Textarea
          v-model="form.annotation"
          placeholder="Enter notes..."
          class="min-h-[80px] bg-background border-border shadow-none resize-none"
        />
      </div>

      <div class="flex items-center justify-between pt-4">
        <Button
          type="button"
          variant="outline"
          size="lg"
          class="px-6 lg:px-10 h-10 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
          @click="handleClear"
        >
          Clear
        </Button>
        <Button
          type="submit"
          variant="default"
          size="lg"
          class="px-8 lg:px-12 h-10 bg-[#1A1A1A] dark:bg-foreground hover:bg-black dark:hover:bg-foreground/90 text-white dark:text-background rounded-md shadow-md"
          :disabled="loading"
        >
          {{ loading ? 'Saving...' : 'Save' }}
        </Button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, inject, computed, watch } from 'vue'
import { Copy, ClipboardPaste } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { useRoute } from 'vue-router'
import { useGeoLocationsStore } from '@/modules/Overview/store/geoLocations.ts'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import TimePicker from '@/components/custom/time-picker/TimePicker.vue'

interface TimeObject {
  hours: number
  minutes: number
  seconds: number
}

const props = defineProps<{
  eventStart: TimeObject
  eventEnd: TimeObject
  eventType: number
  eventCode: number
}>()

const emit = defineEmits<{
  'update:event-start': [time: TimeObject]
  'update:event-end': [time: TimeObject]
  'update:event-type': [data: { eventType: number; eventCode: number }]
}>()

const logDetail = inject('logDetail') as ReturnType<
  typeof import('@/modules/ELD/LogsModule/[Id]/composables/useELDLogDetail.ts').useELDLogDetail
>

const route = useRoute()
const driverId = route.params.id as string

const { driverVehicles, editLoading, submitEventStatus } = logDetail
const geoStore = useGeoLocationsStore()

const loading = computed(() => editLoading.value)

const eventTypes = [
  { key: 'offduty', label: 'Off duty', eventCode: 1, eventType: 1 },
  { key: 'sleeper', label: 'Sleeper', eventCode: 2, eventType: 1 },
  { key: 'driving', label: 'Driving', eventCode: 3, eventType: 1 },
  { key: 'onduty', label: 'On duty', eventCode: 4, eventType: 1 },
  { key: 'ym', label: 'YM', eventCode: 2, eventType: 3 },
  { key: 'pc', label: 'PC', eventCode: 1, eventType: 3 },
]

function getEventKey(eventType: number, eventCode: number): string {
  const event = eventTypes.find((e) => e.eventType === eventType && e.eventCode === eventCode)
  return event?.key || 'offduty'
}

const selectedStatus = ref(getEventKey(props.eventType, props.eventCode))

const eventStart = reactive<TimeObject>({ ...props.eventStart })
const eventEnd = reactive<TimeObject>({ ...props.eventEnd })

watch(
  () => props.eventStart,
  (newVal) => {
    eventStart.hours = newVal.hours
    eventStart.minutes = newVal.minutes
    eventStart.seconds = newVal.seconds
  },
  { deep: true }
)

watch(
  () => props.eventEnd,
  (newVal) => {
    eventEnd.hours = newVal.hours
    eventEnd.minutes = newVal.minutes
    eventEnd.seconds = newVal.seconds
  },
  { deep: true }
)

watch(
  () => [props.eventType, props.eventCode],
  ([newType, newCode]) => {
    selectedStatus.value = getEventKey(newType, newCode)
    form.eventType = newType
    form.eventCode = newCode
  }
)

function timeObjectToString(time: TimeObject): string {
  return `${time.hours.toString().padStart(2, '0')}:${time.minutes.toString().padStart(2, '0')}`
}

function stringToTimeObject(str: string): TimeObject {
  const [hours, minutes] = str.split(':').map(Number)
  return { hours: hours || 0, minutes: minutes || 0, seconds: 0 }
}

const startTimeString = computed({
  get: () => timeObjectToString(eventStart),
  set: (val: string) => {
    const time = stringToTimeObject(val)
    eventStart.hours = time.hours
    eventStart.minutes = time.minutes
    eventStart.seconds = time.seconds
  },
})

const endTimeString = computed({
  get: () => timeObjectToString(eventEnd),
  set: (val: string) => {
    const time = stringToTimeObject(val)
    eventEnd.hours = time.hours
    eventEnd.minutes = time.minutes
    eventEnd.seconds = time.seconds
  },
})

const form = reactive({
  driverId: driverId,
  eventType: props.eventType,
  eventCode: props.eventCode,
  latitude: undefined as number | undefined,
  longitude: undefined as number | undefined,
  calculatedLocation: '',
  manualLocation: '',
  annotation: '',
  totalVehicleMiles: undefined as number | undefined,
  totalEngineHours: undefined as number | undefined,
  vehicleId: '',
})

let geocodeTimer: ReturnType<typeof setTimeout> | null = null
watch(
  () => [form.latitude, form.longitude],
  ([lat, lng]) => {
    if (!lat || !lng) return
    if (geocodeTimer) clearTimeout(geocodeTimer)
    geocodeTimer = setTimeout(async () => {
      const address = await geoStore.getCalculatedAddress({
        latitude: lat as number,
        longitude: lng as number,
      })
      if (address) form.calculatedLocation = address
    }, 600)
  }
)

function handleEventTypeChange(eventItem: (typeof eventTypes)[0]) {
  selectedStatus.value = eventItem.key
  form.eventType = eventItem.eventType
  form.eventCode = eventItem.eventCode
  emit('update:event-type', { eventType: eventItem.eventType, eventCode: eventItem.eventCode })
}

function handleStartTimeChange(timeStr: string) {
  const time = stringToTimeObject(timeStr)
  eventStart.hours = time.hours
  eventStart.minutes = time.minutes
  eventStart.seconds = time.seconds
  emit('update:event-start', { ...time })
}

function handleEndTimeChange(timeStr: string) {
  const time = stringToTimeObject(timeStr)
  eventEnd.hours = time.hours
  eventEnd.minutes = time.minutes
  eventEnd.seconds = time.seconds
  emit('update:event-end', { ...time })
}

async function handleCopy() {
  try {
    if (!form.latitude || !form.longitude) {
      toast.warning('No coordinates to copy')
      return
    }
    const coordinates = `${form.latitude}, ${form.longitude}`
    await navigator.clipboard.writeText(coordinates)
    toast.success('Coordinates copied to clipboard')
  } catch (error) {
    console.error('Failed to copy coordinates:', error)
    toast.error('Failed to copy coordinates')
  }
}

async function handlePaste() {
  try {
    const text = await navigator.clipboard.readText()
    const coordinates = text.split(',').map((coord) => coord.trim())

    if (coordinates.length !== 2) {
      toast.error('Invalid coordinates format. Expected: latitude, longitude')
      return
    }

    const latitude = parseFloat(coordinates[0])
    const longitude = parseFloat(coordinates[1])

    if (isNaN(latitude) || isNaN(longitude)) {
      toast.error('Invalid coordinate values')
      return
    }

    if (latitude < -90 || latitude > 90) {
      toast.error('Latitude must be between -90 and 90')
      return
    }

    if (longitude < -180 || longitude > 180) {
      toast.error('Longitude must be between -180 and 180')
      return
    }

    form.latitude = latitude
    form.longitude = longitude
    toast.success('Coordinates pasted from clipboard')
  } catch (error) {
    console.error('Failed to paste coordinates:', error)
    toast.error('Failed to paste coordinates')
  }
}

function handleClear() {
  form.eventType = 1
  form.eventCode = 1
  form.latitude = undefined
  form.longitude = undefined
  form.calculatedLocation = ''
  form.manualLocation = ''
  form.annotation = ''
  form.totalVehicleMiles = undefined
  form.totalEngineHours = undefined
  form.vehicleId = ''

  eventStart.hours = 0
  eventStart.minutes = 0
  eventStart.seconds = 0
  eventEnd.hours = 0
  eventEnd.minutes = 0
  eventEnd.seconds = 0

  selectedStatus.value = 'offduty'

  emit('update:event-start', { hours: 0, minutes: 0, seconds: 0 })
  emit('update:event-end', { hours: 0, minutes: 0, seconds: 0 })
  emit('update:event-type', { eventType: 1, eventCode: 1 })
}

async function handleSave() {
  const startTotalSeconds = eventStart.hours * 3600 + eventStart.minutes * 60 + eventStart.seconds
  const endTotalSeconds = eventEnd.hours * 3600 + eventEnd.minutes * 60 + eventEnd.seconds

  if (endTotalSeconds <= startTotalSeconds) {
    toast.error('End time must be greater than start time')
    return
  }

  const submitData = {
    ...form,
    eventStart: { ...eventStart },
    eventEnd: { ...eventEnd },
    eventId: null,
  }

  const success = await submitEventStatus(submitData)

  if (success) {
    handleClear()
  }
}
</script>
