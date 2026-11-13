<template>
  <div class="grid grid-cols-2 gap-3">
    <div class="col-span-2 rounded-lg border border-border bg-card p-4 space-y-4">
      <div class="grid grid-cols-4 gap-x-6">
        <div class="space-y-1.5">
          <Label>Carrier</Label>
          <Select v-model="form.carrier" :disabled="disabled || order !== 1">
            <SelectTrigger>
              <SelectValue placeholder="Select carrier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="c in carriers" :key="c.id" :value="c.id">
                {{ c.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="space-y-1.5">
          <Label>Driver</Label>
          <Select v-model="form.driver" :disabled="disabled || order !== 1">
            <SelectTrigger>
              <SelectValue placeholder="Select driver" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="d in drivers" :key="d.id" :value="d.id">
                {{ d.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="space-y-1.5">
          <Label>BOL</Label>
          <Input v-model="form.bolNumber" :disabled="disabled" placeholder="BOL number" />
        </div>
        <div class="space-y-1.5">
          <Label>Trailer</Label>
          <Input v-model="form.trailerNumber" :disabled="disabled" placeholder="Trailer number" />
        </div>
      </div>
    </div>

    <div v-if="order === 1" class="rounded-lg border border-border bg-card p-4 space-y-4">
      <h3 class="text-sm font-semibold">Insert Info</h3>
      <Separator />
      <div class="grid grid-cols-3 gap-x-6">
        <div class="space-y-1.5">
          <Label>Odometer</Label>
          <Input
            v-model.number="form.insertInfo.odometer"
            :disabled="disabled"
            type="number"
            placeholder="Odometer"
          />
        </div>
        <div class="space-y-1.5">
          <Label>Engine hours</Label>
          <Input
            v-model.number="form.insertInfo.engHours"
            :disabled="disabled"
            type="number"
            placeholder="Engine hours"
          />
        </div>
        <div class="space-y-1.5">
          <Label>Shift distance (mi)</Label>
          <Input
            v-model.number="form.insertInfo.shiftDistance"
            :disabled="disabled || order !== 1"
            type="number"
            placeholder="Maximum miles per shift"
          />
        </div>
      </div>
    </div>

    <div v-if="order === 1" class="rounded-lg border border-border bg-card p-4 space-y-4">
      <h3 class="text-sm font-semibold">Start Date and Time</h3>
      <Separator />
      <div class="flex items-end gap-3">
        <div class="flex-1 space-y-1.5">
          <Label>Start date</Label>
          <CDatePickerButton
            :date="form.startDateTime.date"
            :disabled="disabled"
            @update:date="(val) => (form.startDateTime.date = val)"
          />
        </div>
        <div class="flex-1 space-y-1.5">
          <Label>Start time</Label>
          <TimePicker v-model="startTimeString" :disabled="disabled" />
        </div>
      </div>
    </div>

    <div class="rounded-lg border border-border bg-card p-4 space-y-4">
      <div class="flex justify-between items-center">
        <h3 class="text-sm font-semibold">Load Location</h3>
        <div class="flex items-center gap-3">
          <span class="text-xs font-bold text-primary uppercase">From</span>
          <Button :disabled="disabled" size="sm" @click="addLocation('from')">Add location</Button>
        </div>
      </div>
      <Separator />
      <div v-for="(from, index) in form.fromLocations" :key="from.id" class="space-y-4">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-muted-foreground">FROM {{ index + 1 }}</span>
          <Button v-if="form.fromLocations.length > 1" :disabled="disabled" variant="ghost" size="sm" @click="removeLocation('from', from.id)">
            <X class="w-4 h-4 mr-1" /> Remove
          </Button>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="col-span-2 space-y-1.5">
            <Label>Location</Label>
            <Input v-model="from.location" :disabled="disabled" placeholder="Location" />
          </div>
          <div class="space-y-1.5">
            <Label>Latitude</Label>
            <Input v-model.number="from.latitude" :disabled="disabled" type="number" step="any" placeholder="Latitude" />
          </div>
          <div class="space-y-1.5">
            <Label>Longitude</Label>
            <Input v-model.number="from.longitude" :disabled="disabled" type="number" step="any" placeholder="Longitude" />
          </div>
        </div>
        <div class="flex gap-2">
          <Button :disabled="disabled" variant="outline" class="flex-1" @click="emit('copy:from', index)">
            <Copy class="w-4 h-4 mr-2" /> Copy
          </Button>
          <Button :disabled="disabled" variant="outline" class="flex-1" @click="emit('paste:from', index)">
            <Clipboard class="w-4 h-4 mr-2" /> Paste
          </Button>
        </div>
        <Separator v-if="index < form.fromLocations.length - 1" />
      </div>
    </div>

    <div class="rounded-lg border border-border bg-card p-4 space-y-4">
      <div class="flex justify-between items-center">
        <h3 class="text-sm font-semibold">Load Location</h3>
        <div class="flex items-center gap-3">
          <span class="text-xs font-bold text-primary uppercase">To</span>
          <Button :disabled="disabled" size="sm" @click="addLocation('to')">Add location</Button>
        </div>
      </div>
      <Separator />
      <div v-for="(to, index) in form.toLocations" :key="to.id" class="space-y-4">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-muted-foreground">TO {{ index + 1 }}</span>
          <Button v-if="form.toLocations.length > 1" :disabled="disabled" variant="ghost" size="sm" @click="removeLocation('to', to.id)">
            <X class="w-4 h-4 mr-1" /> Remove
          </Button>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="col-span-2 space-y-1.5">
            <Label>Location</Label>
            <Input v-model="to.location" :disabled="disabled" placeholder="Location" />
          </div>
          <div class="space-y-1.5">
            <Label>Latitude</Label>
            <Input v-model.number="to.latitude" :disabled="disabled" type="number" step="any" placeholder="Latitude" />
          </div>
          <div class="space-y-1.5">
            <Label>Longitude</Label>
            <Input v-model.number="to.longitude" :disabled="disabled" type="number" step="any" placeholder="Longitude" />
          </div>
        </div>
        <div class="flex gap-2">
          <Button :disabled="disabled" variant="outline" class="flex-1" @click="emit('copy:to', index)">
            <Copy class="w-4 h-4 mr-2" /> Copy
          </Button>
          <Button :disabled="disabled" variant="outline" class="flex-1" @click="emit('paste:to', index)">
            <Clipboard class="w-4 h-4 mr-2" /> Paste
          </Button>
        </div>
        <Separator v-if="index < form.toLocations.length - 1" />
      </div>
    </div>

    <div class="col-span-2 rounded-lg border border-border bg-card p-4 space-y-4">
      <div class="flex justify-between items-center">
      <h3 class="text-sm font-semibold">Fuel Location</h3>

      <div class="flex items-center gap-3">
        <div class="w-48">
          <Select v-model="form.fuel.timing" :disabled="disabled">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="before">Before delivery</SelectItem>
              <SelectItem value="after">After delivery</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button :disabled="disabled" size="sm" @click="addFuelLocation">
          Add location
        </Button>
      </div>
    </div>
      <Separator />
      <div class="grid grid-cols-4 gap-4">
        <div class="col-span-2 space-y-1.5">
          <Label>Location</Label>
          <Input v-model="form.fuel.location" :disabled="disabled" placeholder="Location" />
        </div>
        <div class="space-y-1.5">
          <Label>Latitude</Label>
          <Input
            v-model.number="form.fuel.latitude"
            :disabled="disabled"
            type="number"
            step="any"
            placeholder="Latitude"
          />
        </div>
        <div class="space-y-1.5">
          <Label>Longitude</Label>
          <Input
            v-model.number="form.fuel.longitude"
            :disabled="disabled"
            type="number"
            step="any"
            placeholder="Longitude"
          />
        </div>
      </div>
      <div class="flex gap-2">
        <Button :disabled="disabled" variant="outline" class="flex-1" @click="emit('copy:fuel')">
          <Copy class="w-4 h-4 mr-2" /> Copy
        </Button>
        <Button :disabled="disabled" variant="outline" class="flex-1" @click="emit('paste:fuel')">
          <Clipboard class="w-4 h-4 mr-2" /> Paste
        </Button>
      </div>

      <Separator v-if="form.fuelLocations.length > 0" />
      <div v-if="form.fuelLocations.length > 0" class="flex gap-3 flex-wrap">
        <div
          v-for="(fuel, ind) in form.fuelLocations"
          :key="fuel.id"
          class="flex items-center border border-primary/50 rounded-lg bg-primary/10"
        >
          <div
            class="w-9 h-9 rounded-md bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium"
          >
            {{ ind + 1 }}
          </div>
          <div class="px-2">
            <p class="text-sm font-medium">
              {{ fuel.location || `${fuel.latitude}, ${fuel.longitude}` }}
            </p>
            <p class="text-xs text-muted-foreground">{{ fuel.afterDelivery ? 'After delivery' : 'Before delivery' }}</p>
          </div>
          <Button
            :disabled="disabled"
            variant="ghost"
            size="icon"
            class="h-9 w-9"
            @click="removeFuelLocation(fuel.id)"
          >
            <X class="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, watch } from 'vue'
import { Copy, Clipboard, X } from 'lucide-vue-next'
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
import { Separator } from '@/components/ui/separator'
import CDatePickerButton from '@/modules/ELD/LogsModule/[Id]/components/detail/CDatePickerButton.vue'
import TimePicker from '@/components/custom/time-picker/TimePicker.vue'
import { useGeoLocationsStore } from '@/modules/Overview/store/geoLocations'
import { useTimeZoneHelper } from '@/composables/useTimezone'
import { formatTime } from '@/utils/time'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import type { AuditCarrier, AuditDriver, Trip, AuditLocationItem, FuelLocationItem, TimeValue } from '../types'

interface Props {
  carriers: AuditCarrier[]
  drivers: AuditDriver[]
  order: number
  trip: Trip
  disabled: boolean
  constants: {
    carrierId: string
    driverId: string
    startTime: TimeValue
    endTime: TimeValue
    startDate: Dayjs
    endDate: Dayjs
    odometer: number
    engineHours: number
    distance: number
  }
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'trip:update': [trip: Trip]
  'constants:update': [constants: any]
  'copy:from': [index: number]
  'paste:from': [index: number]
  'copy:to': [index: number]
  'paste:to': [index: number]
  'copy:fuel': []
  'paste:fuel': []
}>()

const geoLocationsStore = useGeoLocationsStore()
const { convertToTimeZone } = useTimeZoneHelper()

const form = reactive({
  carrier: props.constants.carrierId || '',
  driver: props.constants.driverId || '',
  bolNumber: props.trip.bolNumber,
  trailerNumber: props.trip.trailerNumber,
  startDateTime: {
    date: props.constants.startDate || convertToTimeZone(),
    time: props.constants.startTime || {
      hours: convertToTimeZone().hour(),
      minutes: convertToTimeZone().minute(),
      seconds: convertToTimeZone().second(),
    },
  },
  insertInfo: {
    odometer: props.trip.odometer || (props.order !== 1 ? props.constants.odometer : 0),
    engHours: props.trip.engineHours || (props.order !== 1 ? props.constants.engineHours : 0),
    shiftDistance: props.order === 1
      ? props.trip.shiftDistanceInMile || props.trip.dailyDistanceInMile || 0
      : props.constants.distance,
  },
  fromLocations: (props.trip.fromLocations?.length ? props.trip.fromLocations : [props.trip.from]).map((location, index) => ({
    id: Date.now() + index,
    location: location.address,
    latitude: location.latitude,
    longitude: location.longitude,
  })) as AuditLocationItem[],
  toLocations: (props.trip.toLocations?.length ? props.trip.toLocations : [props.trip.to]).map((location, index) => ({
    id: Date.now() + index,
    location: location.address,
    latitude: location.latitude,
    longitude: location.longitude,
  })) as AuditLocationItem[],
  fuel: { location: '', latitude: 0, longitude: 0, timing: 'before' },
  fuelLocations: props.trip.fuelLocations.map((fuel, index) => ({
    id: Date.now() + index,
    location: fuel.address,
    latitude: fuel.latitude,
    longitude: fuel.longitude,
    afterDelivery: fuel.afterDelivery ?? false,
  })) as FuelLocationItem[],
})
let nextLocationId = Date.now() + form.fromLocations.length + form.toLocations.length

const startDateString = computed({
  get: () => formatTime(form.startDateTime.date, 'YYYY-MM-DD'),
  set: (val: string) => {
    form.startDateTime.date = dayjs(val)
  },
})

const startTimeString = computed({
  get: () => {
    const t = form.startDateTime.time
    return `${t.hours.toString().padStart(2, '0')}:${t.minutes.toString().padStart(2, '0')}`
  },
  set: (val: string) => {
    const [h, m] = val.split(':').map(Number)
    form.startDateTime.time = { hours: h || 0, minutes: m || 0, seconds: 0 }
  },
})

watch(
  () => props.constants,
  (newVal) => {
    form.carrier = newVal.carrierId
    form.driver = newVal.driverId
    form.startDateTime.date = newVal.startDate
    form.startDateTime.time = newVal.startTime
    form.insertInfo.shiftDistance = newVal.distance
    if (props.order === 1) {
      form.insertInfo.odometer = newVal.odometer
      form.insertInfo.engHours = newVal.engineHours
    }
  },
  { deep: true }
)

watch(
  [
    () => form.carrier,
    () => form.driver,
    () => form.startDateTime.date,
    () => form.startDateTime.time,
    () => form.insertInfo.odometer,
    () => form.insertInfo.engHours,
    () => form.insertInfo.shiftDistance,
  ],
  ([carrier, driver, startDate, startTime, odometer, engHours, distance]) => {
    if (props.order !== 1) return
    emit('constants:update', {
      carrierId: carrier,
      driverId: driver,
      startDate,
      endDate: startDate,
      startTime,
      endTime: startTime,
      odometer,
      engineHours: engHours,
      distance,
    })
  },
  { deep: true }
)

watch(
  () => form,
  () => {
    const trip: Trip = {
      bolNumber: form.bolNumber,
      trailerNumber: form.trailerNumber,
      odometer: form.insertInfo.odometer,
      engineHours: form.insertInfo.engHours,
      shiftDistanceInMile: form.insertInfo.shiftDistance,
      from: toTripLocation(form.fromLocations[0], 2),
      to: toTripLocation(form.toLocations[0], 3),
      fromLocations: form.fromLocations.map((location) => toTripLocation(location, 2)),
      toLocations: form.toLocations.map((location) => toTripLocation(location, 3)),
      fuelLocations: form.fuelLocations.map((f) => ({
        latitude: f.latitude,
        longitude: f.longitude,
        address: f.location,
        locationType: 3,
        afterDelivery: f.afterDelivery,
      })),
    }
    emit('trip:update', trip)
  },
  { deep: true }
)

function toTripLocation(location: AuditLocationItem, locationType: number) {
  return {
    latitude: location.latitude,
    longitude: location.longitude,
    address: location.location,
    locationType,
  }
}

function addLocation(type: 'from' | 'to') {
  const location = { id: ++nextLocationId, location: '', latitude: 0, longitude: 0 }
  if (type === 'from') form.fromLocations.push(location)
  else form.toLocations.push(location)
}

function removeLocation(type: 'from' | 'to', id: number) {
  const locations = type === 'from' ? form.fromLocations : form.toLocations
  const index = locations.findIndex((item) => item.id === id)
  if (locations.length > 1 && index >= 0) locations.splice(index, 1)
}

function watchLocationAddresses(getLocations: () => AuditLocationItem[]) {
  watch(
    () => getLocations().map((item) => [item.id, item.latitude, item.longitude] as const),
    async (locations, previous) => {
      for (const [id, latitude, longitude] of locations) {
        if (previous?.some(([previousId, previousLatitude, previousLongitude]) =>
          previousId === id && previousLatitude === latitude && previousLongitude === longitude)) continue
        if (!latitude || !longitude || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) continue
        const address = await geoLocationsStore.getCalculatedAddress({ latitude, longitude })
        const current = getLocations().find((item) => item.id === id)
        if (current?.latitude === latitude && current.longitude === longitude)
          current.location = address || ''
      }
    }
  )
}

watchLocationAddresses(() => form.fromLocations)
watchLocationAddresses(() => form.toLocations)

watch([() => form.fuel.latitude, () => form.fuel.longitude], async ([lat, lng]) => {
  if (lat && lng && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
    form.fuel.location =
      (await geoLocationsStore.getCalculatedAddress({ latitude: lat, longitude: lng })) || ''
  }
})

function addFuelLocation() {
  const { latitude, longitude, location } = form.fuel
  if (
    latitude &&
    longitude &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  ) {
    form.fuelLocations.push({
      id: Date.now(),
      latitude: parseFloat(String(latitude)),
      longitude: parseFloat(String(longitude)),
      location,
      afterDelivery: form.fuel.timing === 'after',
    })
    form.fuel = { location: '', latitude: 0, longitude: 0, timing: 'before' }
  }
}

function removeFuelLocation(id: number) {
  form.fuelLocations = form.fuelLocations.filter((f) => f.id !== id)
}

defineExpose({ form })
</script>
