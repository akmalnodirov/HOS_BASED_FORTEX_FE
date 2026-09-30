<template>
  <Dialog v-model:open="isOpen">
    <DialogContent class="max-w-250 p-0 gap-0 overflow-hidden">
      <DialogHeader
        class="p-4 border-b bg-[#F0F0F0] dark:bg-muted border-[#E6E6E6] dark:border-border"
      >
        <div class="flex items-center justify-between">
          <DialogTitle class="text-2xl font-semibold">
            {{ action === 'edit' ? 'Edit' : 'Add' }} Status
          </DialogTitle>
          <!--          <Button variant="ghost" size="icon" @click="handleClose">-->
          <!--            <X class="h-5 w-5" />-->
          <!--          </Button>-->
        </div>
      </DialogHeader>

      <div class="p-6 space-y-6 max-h-[calc(90vh-120px)] overflow-y-auto">
        <!-- Chart Component -->
        <div>
          <MainChart
            ref="editChartRef"
            @container:update="handleContainerUpdate"
            @duty-event:update="handleDutyEventUpdate"
            @oncesetprev:update="handleOnceSetPrevUpdate"
            @update:block-event-time-edit="handleBlockEventTimeEdit"
            :edit="action === 'edit'"
            :add="action === 'add'"
            :event-id="eventState.editEventId"
            :event-time="headerDate"
            :event-type="eventState.editEventType"
            :event-code="eventState.editEventCode"
            :event-oncesetprev="eventState.editOnceSetPrev"
            :chart-data="editChartData ?? undefined"
            :block-event-time-edit="eventState.blockEventTimeEdit"
            :daily-summary="dailySummary ?? undefined"
          />
          <p v-if="chartError" class="text-red-500 font-medium text-sm text-center mt-2">
            {{ chartError }}
          </p>
        </div>

        <!-- Status Buttons -->
        <div class="flex gap-2 w-full">
          <button
            v-for="eventItem in eventTypes"
            :key="eventItem.key"
            type="button"
            class="flex-1 px-3 py-2.5 cursor-pointer text-sm font-medium rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary"
            :class="[
              eventItem.key === eventState.editEventStatus
                ? 'bg-white dark:bg-background border-[#666666] dark:border-border'
                : 'bg-[#F0F0F0] dark:bg-muted/50 border-[#F0F0F0] dark:border-transparent hover:border-[#E6E6E6] dark:hover:border-border',
            ]"
            @click="handleEventTypeChange(eventItem)"
          >
            {{ eventItem.label }}
          </button>
        </div>

        <Separator />

        <!-- Form Fields -->
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <!-- Time Pickers -->
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label>Start Time</Label>
              <TimePicker
                v-model="startTimeString"
                :disabled="eventState.blockEventTimeEdit"
                @update:model-value="handleStartTimeChange"
              />
            </div>
            <div class="space-y-2">
              <Label>End Time</Label>
              <TimePicker
                v-model="endTimeString"
                :disabled="eventState.blockEventTimeEdit"
                @update:model-value="handleEndTimeChange"
              />
            </div>
          </div>

          <!-- Coordinates -->
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label>Latitude</Label>
              <Input
                v-model="statusForm.latitude"
                type="number"
                step="any"
                placeholder="Enter Latitude"
              />
            </div>
            <div class="space-y-2">
              <Label>Longitude</Label>
              <Input
                v-model="statusForm.longitude"
                type="number"
                step="any"
                placeholder="Enter Longitude"
              />
            </div>
          </div>

          <!-- Location -->
          <div class="space-y-2">
            <Label>Location</Label>
            <Input v-model="statusForm.calculatedLocation" placeholder="Enter Location" />
          </div>

          <!-- Copy/Paste Actions -->
          <div class="flex justify-end gap-2">
            <Button type="button" variant="outline" @click="handleCopy">
              <Copy class="mr-2 h-4 w-4" />
              Copy
            </Button>
            <Button type="button" variant="outline" @click="handlePaste">
              <ClipboardPaste class="mr-2 h-4 w-4" />
              Paste
            </Button>
          </div>

          <!-- Engine Hours / Odometer -->
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label>Engine Hours</Label>
              <Input
                v-model="statusForm.totalEngineHours"
                type="number"
                step="any"
                placeholder="Enter Engine Hours"
              />
            </div>
            <div class="space-y-2">
              <Label>Odometer</Label>
              <Input
                v-model="statusForm.totalVehicleMiles"
                type="number"
                step="any"
                placeholder="Enter Odometer"
              />
            </div>
          </div>

          <!-- Vehicle -->
          <div class="space-y-2">
            <Label>Vehicle</Label>
            <Select v-model="statusForm.vehicleId">
              <SelectTrigger>
                <SelectValue placeholder="Select Vehicle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="vehicle in driverVehicles" :key="vehicle.id" :value="vehicle.id">
                  {{ vehicle.unit }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <!-- Notes -->
          <div class="space-y-2">
            <Label>Notes</Label>
            <Input v-model="statusForm.annotation" placeholder="Enter Notes" />
          </div>
        </form>
      </div>

      <Separator />

      <DialogFooter class="px-6 py-4 bg-gray-50/50">
        <Button type="button" variant="outline" @click="handleClose"> Cancel </Button>
        <Button type="button" :disabled="disabledSubmit" :loading="loading" @click="handleSubmit">
          {{ loading ? 'Saving...' : 'Save' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, reactive } from 'vue'
import type { Dayjs } from 'dayjs'
import { Copy, ClipboardPaste, X } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

// UI Components
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import TimePicker from '@/components/custom/time-picker/TimePicker.vue'

// Chart Component
import MainChart from '../chart/MainChart.vue'

// Types
import type { GraphResponse, DailySummaryResponse } from '../../types/chart'

// Event types definition
const eventTypes = [
  { key: 'offduty', label: 'Off duty', eventCode: 1, eventType: 1 },
  { key: 'onduty', label: 'On duty', eventCode: 4, eventType: 1 },
  { key: 'sleeper', label: 'Sleeper', eventCode: 2, eventType: 1 },
  { key: 'driving', label: 'Driving', eventCode: 3, eventType: 1 },
  { key: 'ym', label: 'YM', eventCode: 2, eventType: 3 },
  { key: 'pc', label: 'PC', eventCode: 1, eventType: 3 },
]

// Time object interface
interface TimeObject {
  hours: number
  minutes: number
  seconds: number
}

// Convert TimeObject to string "HH:mm"
function timeObjectToString(time: TimeObject): string {
  return `${time.hours.toString().padStart(2, '0')}:${time.minutes.toString().padStart(2, '0')}`
}

// Convert string "HH:mm" to TimeObject
function stringToTimeObject(str: string): TimeObject {
  const [hours, minutes] = str.split(':').map(Number)
  return { hours: hours || 0, minutes: minutes || 0, seconds: 0 }
}

// Props
interface Props {
  open: boolean
  action?: 'edit' | 'add'
  event: any
  headerDate?: Dayjs
  editChartData?: GraphResponse | null
  dailySummary?: DailySummaryResponse | null
  driverVehicles?: any[]
  loading?: boolean
  chartError?: string
}

const props = withDefaults(defineProps<Props>(), {
  action: 'edit',
  driverVehicles: () => [],
  loading: false,
  chartError: '',
})

// Emits
const emit = defineEmits<{
  'update:open': [value: boolean]
  'update:editOnceSetPrev': [value: boolean]
  'update:blockEventTimeEdit': [value: boolean]
  submit: [data: any]
  'container:update': [width: number]
  'dutyEvent:update': [data: any]
}>()

// Refs
const editChartRef = ref<InstanceType<typeof MainChart> | null>(null)

// Modal open state
const isOpen = computed({
  get: () => props.open,
  set: (val) => emit('update:open', val),
})

// Event state
const eventState = reactive({
  editEventId: '',
  editEventType: 1,
  editEventCode: 1,
  editEventStatus: '',
  editEventStart: { hours: 0, minutes: 0, seconds: 0 } as TimeObject,
  editEventEnd: { hours: 23, minutes: 59, seconds: 59 } as TimeObject,
  editOnceSetPrev: false,
  blockEventTimeEdit: false,
})

// Form state
const statusForm = reactive({
  driverId: '',
  eventType: 1,
  eventCode: 1,
  latitude: undefined as number | undefined,
  longitude: undefined as number | undefined,
  calculatedLocation: '',
  manualLocation: '',
  annotation: '',
  totalVehicleMiles: undefined as number | undefined,
  totalEngineHours: undefined as number | undefined,
  vehicleId: '',
})

// Computed for time picker strings
const startTimeString = computed({
  get: () => timeObjectToString(eventState.editEventStart),
  set: (val: string) => {
    eventState.editEventStart = stringToTimeObject(val)
  },
})

const endTimeString = computed({
  get: () => timeObjectToString(eventState.editEventEnd),
  set: (val: string) => {
    eventState.editEventEnd = stringToTimeObject(val)
  },
})

// Computed
const disabledSubmit = computed(() => {
  if (props.loading || !props.open) return true

  if (!eventState.editEventStart || !eventState.editEventEnd) return true

  if (!statusForm.latitude) return true
  if (!statusForm.longitude) return true
  if (!statusForm.calculatedLocation) return true

  if (statusForm.totalEngineHours === undefined || isNaN(Number(statusForm.totalEngineHours)))
    return true
  if (statusForm.totalVehicleMiles === undefined || isNaN(Number(statusForm.totalVehicleMiles)))
    return true

  if (!statusForm.annotation) return true

  return !!props.chartError
})

// Watch for event changes
watch(
  () => props.event,
  (newEvent) => {
    if (newEvent) {
      initializeFromEvent(newEvent)
    }
  },
  { immediate: true }
)

// Initialize form from event data
function initializeFromEvent(event: any) {
  // Event state
  eventState.editEventId = event.eventId || event.id || ''
  eventState.editEventType = event.eventType || 1
  eventState.editEventCode = event.eventCode || 1
  eventState.editEventStatus = getEventKey(event.eventType, event.eventCode)
  eventState.editOnceSetPrev = false
  eventState.blockEventTimeEdit = false

  // Parse time from event
  if (event.dateTime) {
    const date = new Date(event.dateTime)
    eventState.editEventStart = {
      hours: date.getHours(),
      minutes: date.getMinutes(),
      seconds: date.getSeconds(),
    }
  }

  // Form state
  statusForm.driverId = event.driverId || ''
  statusForm.eventType = event.eventType || 1
  statusForm.eventCode = event.eventCode || 1
  statusForm.latitude = event.latitude ?? undefined
  statusForm.longitude = event.longitude ?? undefined
  statusForm.calculatedLocation = event.calculatedLocation || event.location || ''
  statusForm.manualLocation = event.manualLocation || ''
  statusForm.annotation = event.annotation || event.notes || ''
  statusForm.totalVehicleMiles = event.totalVehicleMiles ?? event.odometer ?? undefined
  statusForm.totalEngineHours = event.totalEngineHours ?? event.engineHours ?? undefined
  statusForm.vehicleId = event.vehicleId || ''
}

// Get event key from type and code
function getEventKey(eventType: number, eventCode: number): string {
  const event = eventTypes.find((e) => e.eventType === eventType && e.eventCode === eventCode)
  return event?.key || ''
}

// Handle event type change
function handleEventTypeChange(eventItem: (typeof eventTypes)[0]) {
  eventState.editEventStatus = eventItem.key
  eventState.editEventType = eventItem.eventType
  eventState.editEventCode = eventItem.eventCode
  statusForm.eventType = eventItem.eventType
  statusForm.eventCode = eventItem.eventCode
}

// Handle time changes
function handleStartTimeChange(timeStr: string) {
  const time = stringToTimeObject(timeStr)
  eventState.editEventStart = time
  if (editChartRef.value) {
    const fullTimeString = `${time.hours}:${time.minutes}:${time.seconds}`
    editChartRef.value.onEditMouseMove?.(fullTimeString, true)
  }
}

function handleEndTimeChange(timeStr: string) {
  const time = stringToTimeObject(timeStr)
  eventState.editEventEnd = time
  if (editChartRef.value) {
    const fullTimeString = `${time.hours}:${time.minutes}:${time.seconds}`
    editChartRef.value.onEditMouseMove?.(fullTimeString, false)
  }
}

// Chart event handlers
function handleContainerUpdate(width: number) {
  emit('container:update', width)
}

function handleDutyEventUpdate(data: any) {
  emit('dutyEvent:update', data)
  // Update event state from chart
  if (data.eventStart) {
    eventState.editEventStart = data.eventStart
  }
  if (data.eventEnd) {
    eventState.editEventEnd = data.eventEnd
  }
}

function handleOnceSetPrevUpdate(value: boolean) {
  eventState.editOnceSetPrev = value
  emit('update:editOnceSetPrev', value)
}

function handleBlockEventTimeEdit(value: boolean) {
  eventState.blockEventTimeEdit = value
  emit('update:blockEventTimeEdit', value)
}

// Copy/Paste handlers
async function handleCopy() {
  try {
    if (!statusForm.latitude || !statusForm.longitude) {
      toast.warning('No coordinates to copy')
      return
    }
    const coordinates = `${statusForm.latitude}, ${statusForm.longitude}`
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

    statusForm.latitude = latitude
    statusForm.longitude = longitude
    toast.success('Coordinates pasted from clipboard')
  } catch (error) {
    console.error('Failed to paste coordinates:', error)
    toast.error('Failed to paste coordinates')
  }
}

// Close handler
function handleClose() {
  isOpen.value = false
  emit('update:editOnceSetPrev', false)
}

// Submit handler
function handleSubmit() {
  const submitData = {
    ...statusForm,
    eventType: eventState.editEventType,
    eventCode: eventState.editEventCode,
    eventStart: eventState.editEventStart,
    eventEnd: eventState.editEventEnd,
    eventId: eventState.editEventId,
  }
  emit('submit', submitData)
}
</script>
