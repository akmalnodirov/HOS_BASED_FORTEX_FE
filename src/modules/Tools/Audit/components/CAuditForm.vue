<template>
  <div class="grid grid-cols-2 gap-3">
    <!-- Top Row: Company, Driver, BOL, Trailer -->
    <div class="col-span-2 rounded-lg border border-border bg-card p-4 space-y-4">
      <div class="grid grid-cols-4 gap-x-6">
        <div class="space-y-1.5">
          <Label>Company</Label>
          <Select v-model="form.company" :disabled="disabled">
            <SelectTrigger>
              <SelectValue placeholder="Select company" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="c in companies" :key="c.id" :value="c.id">
                {{ c.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="space-y-1.5">
          <Label>Driver</Label>
          <Select v-model="form.driver" :disabled="disabled">
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

    <!-- Insert Info (only for first trip) -->
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
          <Label>Daily distance</Label>
          <Input
            v-model.number="form.insertInfo.dailyDistance"
            :disabled="disabled"
            type="number"
            placeholder="Daily distance"
          />
        </div>
      </div>
    </div>

    <!-- Start Date & Time (only for first trip) -->
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

    <!-- Load Location (FROM) -->
    <div class="rounded-lg border border-border bg-card p-4 space-y-4">
      <div class="flex justify-between items-center">
        <h3 class="text-sm font-semibold">Load Location</h3>
        <span class="text-xs font-bold text-primary uppercase">From</span>
      </div>
      <Separator />
      <div class="grid grid-cols-2 gap-4">
        <div class="col-span-2 space-y-1.5">
          <Label>Location</Label>
          <Input v-model="form.from.location" :disabled="disabled" placeholder="Location" />
        </div>
        <div class="space-y-1.5">
          <Label>Latitude</Label>
          <Input
            v-model.number="form.from.latitude"
            :disabled="disabled"
            type="number"
            step="any"
            placeholder="Latitude"
          />
        </div>
        <div class="space-y-1.5">
          <Label>Longitude</Label>
          <Input
            v-model.number="form.from.longitude"
            :disabled="disabled"
            type="number"
            step="any"
            placeholder="Longitude"
          />
        </div>
      </div>
      <div class="flex gap-2">
        <Button :disabled="disabled" variant="outline" class="flex-1" @click="emit('copy:from')">
          <Copy class="w-4 h-4 mr-2" /> Copy
        </Button>
        <Button :disabled="disabled" variant="outline" class="flex-1" @click="emit('paste:from')">
          <Clipboard class="w-4 h-4 mr-2" /> Paste
        </Button>
      </div>
    </div>

    <!-- Load Location (TO) -->
    <div class="rounded-lg border border-border bg-card p-4 space-y-4">
      <div class="flex justify-between items-center">
        <h3 class="text-sm font-semibold">Load Location</h3>
        <span class="text-xs font-bold text-primary uppercase">To</span>
      </div>
      <Separator />
      <div class="grid grid-cols-2 gap-4">
        <div class="col-span-2 space-y-1.5">
          <Label>Location</Label>
          <Input v-model="form.to.location" :disabled="disabled" placeholder="Location" />
        </div>
        <div class="space-y-1.5">
          <Label>Latitude</Label>
          <Input
            v-model.number="form.to.latitude"
            :disabled="disabled"
            type="number"
            step="any"
            placeholder="Latitude"
          />
        </div>
        <div class="space-y-1.5">
          <Label>Longitude</Label>
          <Input
            v-model.number="form.to.longitude"
            :disabled="disabled"
            type="number"
            step="any"
            placeholder="Longitude"
          />
        </div>
      </div>
      <div class="flex gap-2">
        <Button :disabled="disabled" variant="outline" class="flex-1" @click="emit('copy:to')">
          <Copy class="w-4 h-4 mr-2" /> Copy
        </Button>
        <Button :disabled="disabled" variant="outline" class="flex-1" @click="emit('paste:to')">
          <Clipboard class="w-4 h-4 mr-2" /> Paste
        </Button>
      </div>
    </div>

    <!-- Fuel Location -->
    <div class="col-span-2 rounded-lg border border-border bg-card p-4 space-y-4">
      <div class="flex justify-between items-center">
        <h3 class="text-sm font-semibold">Fuel Location</h3>
        <Button :disabled="disabled" size="sm" @click="addFuelLocation">Add location</Button>
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

      <!-- Added fuel locations list -->
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
import type { AuditCompany, AuditDriver, Trip, FuelLocationItem, TimeValue } from '../types'

interface Props {
  companies: AuditCompany[]
  drivers: AuditDriver[]
  order: number
  disabled: boolean
  constants: {
    companyId: string
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
  'copy:from': []
  'paste:from': []
  'copy:to': []
  'paste:to': []
  'copy:fuel': []
  'paste:fuel': []
}>()

const geoLocationsStore = useGeoLocationsStore()
const { convertToTimeZone } = useTimeZoneHelper()

const form = reactive({
  company: props.constants.companyId || '',
  driver: props.constants.driverId || '',
  bolNumber: '',
  trailerNumber: '',
  startDateTime: {
    date: props.constants.startDate || convertToTimeZone(),
    time: props.constants.startTime || {
      hours: convertToTimeZone().hour(),
      minutes: convertToTimeZone().minute(),
      seconds: convertToTimeZone().second(),
    },
  },
  insertInfo: {
    odometer: props.order !== 1 ? props.constants.odometer : 0,
    engHours: props.order !== 1 ? props.constants.engineHours : 0,
    dailyDistance: props.order !== 1 ? props.constants.distance : 0,
  },
  from: { location: '', latitude: 0, longitude: 0 },
  to: { location: '', latitude: 0, longitude: 0 },
  fuel: { location: '', latitude: 0, longitude: 0 },
  fuelLocations: [] as FuelLocationItem[],
})

// Date/Time string bindings
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

// Sync constants from parent
watch(
  () => props.constants,
  (newVal) => {
    form.company = newVal.companyId
    form.driver = newVal.driverId
    form.startDateTime.date = newVal.startDate
    form.startDateTime.time = newVal.startTime
    form.insertInfo.odometer = newVal.odometer
    form.insertInfo.engHours = newVal.engineHours
    form.insertInfo.dailyDistance = newVal.distance
  },
  { deep: true }
)

// Emit constants changes back to parent
watch(
  [
    () => form.company,
    () => form.driver,
    () => form.startDateTime.date,
    () => form.startDateTime.time,
    () => form.insertInfo.odometer,
    () => form.insertInfo.engHours,
    () => form.insertInfo.dailyDistance,
  ],
  ([company, driver, startDate, startTime, odometer, engHours, distance]) => {
    emit('constants:update', {
      companyId: company,
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

// Emit trip update to parent
watch(
  () => form,
  () => {
    const trip: Trip = {
      bolNumber: form.bolNumber,
      trailerNumber: form.trailerNumber,
      odometer: form.insertInfo.odometer,
      engineHours: form.insertInfo.engHours,
      dailyDistanceInMile: form.insertInfo.dailyDistance,
      from: {
        latitude: form.from.latitude,
        longitude: form.from.longitude,
        address: form.from.location,
        locationType: 2,
      },
      to: {
        latitude: form.to.latitude,
        longitude: form.to.longitude,
        address: form.to.location,
        locationType: 3,
      },
      fuelLocations: form.fuelLocations.map((f) => ({
        latitude: f.latitude,
        longitude: f.longitude,
        address: f.location,
        locationType: 3,
      })),
    }
    emit('trip:update', trip)
  },
  { deep: true }
)

// Auto-resolve addresses from coordinates
watch([() => form.from.latitude, () => form.from.longitude], async ([lat, lng]) => {
  if (lat && lng && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
    form.from.location =
      (await geoLocationsStore.getCalculatedAddress({ latitude: lat, longitude: lng })) || ''
  }
})

watch([() => form.to.latitude, () => form.to.longitude], async ([lat, lng]) => {
  if (lat && lng && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
    form.to.location =
      (await geoLocationsStore.getCalculatedAddress({ latitude: lat, longitude: lng })) || ''
  }
})

watch([() => form.fuel.latitude, () => form.fuel.longitude], async ([lat, lng]) => {
  if (lat && lng && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
    form.fuel.location =
      (await geoLocationsStore.getCalculatedAddress({ latitude: lat, longitude: lng })) || ''
  }
})

// Fuel location management
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
    })
    form.fuel = { location: '', latitude: 0, longitude: 0 }
  }
}

function removeFuelLocation(id: number) {
  form.fuelLocations = form.fuelLocations.filter((f) => f.id !== id)
}

// Expose form for parent clipboard operations
defineExpose({ form })
</script>
