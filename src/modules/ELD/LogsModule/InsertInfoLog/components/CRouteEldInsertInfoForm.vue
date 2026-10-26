<template>
  <form class="w-full space-y-5 rounded-lg border border-border bg-card p-4 sm:p-6" @submit.prevent="save">
    <div>
      <h2 class="text-base font-semibold">Insert Info log</h2>
      <p class="mt-1 text-xs text-muted-foreground">Choose a status and start time. The graph previews the change until the next duty event.</p>
    </div>
    <div class="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-6">
      <Button v-for="status in statuses" :key="status.code" type="button"
        :variant="eventCode === status.code ? 'default' : 'outline'"
        class="w-full" @click="selectStatus(status.code)">{{ status.label }}</Button>
    </div>
    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <div class="space-y-1.5"><Label>Start time</Label><TimePicker :model-value="timeText" @update:model-value="updateTime" /></div>
      <div class="space-y-1.5">
        <Label>Record origin</Label>
        <Select v-model="recordOrigin" :disabled="eventCode === 'DS_D'"><SelectTrigger><SelectValue placeholder="Select origin" /></SelectTrigger>
          <SelectContent :body-lock="false"><SelectItem value="ELD">Auto (ELD)</SelectItem><SelectItem value="OTHER_USER">Other user</SelectItem><SelectItem value="DRIVER">Driver</SelectItem></SelectContent>
        </Select>
        <p v-if="eventCode === 'DS_D'" class="text-xs text-muted-foreground">Driving logs use Auto (ELD) origin.</p>
      </div>
      <div v-if="recordOrigin === 'OTHER_USER'" class="space-y-1.5">
        <Label>Responsible Route ELD user</Label>
        <Select v-model="responsibleUserId" :disabled="!activeUsers.length"><SelectTrigger><SelectValue :placeholder="activeUsers.length ? 'Select a user' : 'No active users available'" /></SelectTrigger>
          <SelectContent :body-lock="false"><SelectItem v-for="user in activeUsers" :key="user.id" :value="user.id">{{ user.name }}</SelectItem></SelectContent>
        </Select>
      </div>
    </div>
    <div class="rounded-md border border-border/70 bg-muted/20 p-4">
      <h3 class="mb-4 text-sm font-medium">Location</h3>
      <div class="grid gap-4 md:grid-cols-2">
      <div class="space-y-1.5"><Label>Latitude</Label><Input v-model="latitude" type="text" inputmode="decimal" placeholder="Latitude" /></div>
      <div class="space-y-1.5"><Label>Longitude</Label><Input v-model="longitude" type="text" inputmode="decimal" placeholder="Longitude" /></div>
      <div class="space-y-1.5 md:col-span-2"><Label>Calculated location</Label><Input v-model="calculatedLocation" placeholder="Location description" /></div>
      <div class="flex gap-2 md:col-span-2">
        <Button type="button" variant="outline" size="sm" @click="copyCoordinates"><Copy class="mr-2 h-4 w-4" />Copy</Button>
        <Button type="button" variant="outline" size="sm" @click="pasteCoordinates"><ClipboardPaste class="mr-2 h-4 w-4" />Paste</Button>
      </div>
      </div>
    </div>
    <div class="grid gap-4 md:grid-cols-3">
      <div class="space-y-1.5"><Label>Odometer (mi)</Label><Input v-model="odometerMiles" type="text" inputmode="decimal" placeholder="Odometer" /></div>
      <div class="space-y-1.5"><Label>Engine hours</Label><Input v-model="engineHours" type="text" inputmode="decimal" placeholder="Engine hours" /></div>
      <div class="space-y-1.5">
        <Label>Vehicle</Label>
        <Select v-model="vehicleId"><SelectTrigger><SelectValue placeholder="No vehicle" /></SelectTrigger>
          <SelectContent :body-lock="false"><SelectItem value="none">No vehicle</SelectItem><SelectItem v-for="vehicle in vehicles" :key="vehicle.id" :value="vehicle.id">{{ vehicle.name }}</SelectItem></SelectContent>
        </Select>
      </div>
    </div>
    <div class="space-y-2">
      <Label>Notes</Label><Textarea v-model="notes" maxlength="100" placeholder="Notes" class="min-h-20" />
      <div class="flex flex-wrap gap-1.5" aria-label="Common notes">
        <Button v-for="note in noteShortcuts" :key="note" type="button" variant="outline" size="sm"
          class="h-7 px-2.5 text-xs" @click="appendNote(note)">{{ note }}</Button>
      </div>
    </div>
    <div class="flex justify-end gap-2">
      <Button type="button" variant="outline" @click="clear">Clear</Button>
      <Button type="submit" :disabled="loading || !driverExternalId || (recordOrigin === 'OTHER_USER' && !responsibleUserId)">
        {{ loading ? 'Saving…' : 'Save active log' }}
      </Button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { ClipboardPaste, Copy } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import TimePicker from '@/components/custom/time-picker/TimePicker.vue'
import { useGeoLocationsStore } from '@/modules/Overview/store/geoLocations'
import {
  copyCoordinates as writeCoordinates,
  LATITUDE_LIMIT,
  LONGITUDE_LIMIT,
  parseCoordinate,
  readCoordinates,
} from '@/modules/ELD/LogsModule/Boost/utils/coordinateClipboard'
import { parseMeasurement } from '@/modules/ELD/LogsModule/Boost/utils/decimalInput'
import type { InsertInfoLogRequest, InsertInfoOption } from '../types'

const props = defineProps<{
  startSeconds: number
  driverExternalId: string
  users: InsertInfoOption[]
  vehicles: InsertInfoOption[]
  loading: boolean
}>()
const emit = defineEmits<{
  'update:start-seconds': [seconds: number]
  'update:event-code': [code: string]
  save: [values: Omit<InsertInfoLogRequest, 'timestamp' | 'timeZone'>]
}>()
const statuses = [
  { code: 'DS_OFF', label: 'Off duty' }, { code: 'DS_SB', label: 'Sleeper' },
  { code: 'DS_D', label: 'Driving' }, { code: 'DS_ON', label: 'On duty' },
  { code: 'DR_IND_YM', label: 'YM' }, { code: 'DR_IND_PC', label: 'PC' },
]
const noteShortcuts = [
  'PTI', 'Scale', 'Hook', 'Delivery', 'Fuel', 'DOT', 'Repairs', 'Drop', 'Pick Up',
  'Rest', 'Break', 'Loading', 'Unloading', 'Inspection',
]
const eventCode = ref('DS_OFF')
const recordOrigin = ref<InsertInfoLogRequest['recordOrigin']>('OTHER_USER')
const responsibleUserId = ref('')
const vehicleId = ref('none')
const latitude = ref<string | number>('')
const longitude = ref<string | number>('')
const calculatedLocation = ref('')
const odometerMiles = ref<string | number>('')
const engineHours = ref<string | number>('')
const notes = ref('')
const geoStore = useGeoLocationsStore()
const activeUsers = computed(() => props.users.filter(user => user.active !== false))
const timeText = computed(() => `${String(Math.floor(props.startSeconds / 3600)).padStart(2, '0')}:${String(Math.floor(props.startSeconds % 3600 / 60)).padStart(2, '0')}`)
watch(activeUsers, users => {
  if (!users.some(user => user.id === responsibleUserId.value)) responsibleUserId.value = users[0]?.id ?? ''
}, { immediate: true })
let geocodeTimer: ReturnType<typeof setTimeout> | undefined
watch([latitude, longitude], ([latText, lonText]) => {
  if (geocodeTimer) clearTimeout(geocodeTimer)
  const lat = parseCoordinate(String(latText), LATITUDE_LIMIT), lon = parseCoordinate(String(lonText), LONGITUDE_LIMIT)
  if (lat === null || lon === null) return
  const priorLocation = calculatedLocation.value
  geocodeTimer = setTimeout(async () => {
    const location = await geoStore.getCalculatedAddress({ latitude: lat, longitude: lon })
    if (latitude.value === latText && longitude.value === lonText &&
        calculatedLocation.value === priorLocation && location) calculatedLocation.value = location
  }, 600)
})
onBeforeUnmount(() => { if (geocodeTimer) clearTimeout(geocodeTimer) })

function updateTime(value: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value)
  if (!match) return
  const hours = Number(match[1]), minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return
  emit('update:start-seconds', hours * 3600 + minutes * 60)
}
function selectStatus(code: string) {
  eventCode.value = code
  if (code === 'DS_D') recordOrigin.value = 'ELD'
  else if (recordOrigin.value === 'ELD') recordOrigin.value = 'OTHER_USER'
  emit('update:event-code', code)
}
function appendNote(note: string) {
  const parts = notes.value.split(',').map(value => value.trim()).filter(Boolean)
  if (parts.includes(note)) return
  const combined = [...parts, note].join(', ')
  if (combined.length <= 100) notes.value = combined
}
function save() {
  const latText = String(latitude.value).trim(), lonText = String(longitude.value).trim()
  const lat = parseCoordinate(latText, LATITUDE_LIMIT), lon = parseCoordinate(lonText, LONGITUDE_LIMIT)
  const odometerText = String(odometerMiles.value).trim(), engineText = String(engineHours.value).trim()
  const odometer = parseMeasurement(odometerText), engine = parseMeasurement(engineText)
  if ((latText !== '' && lat === null) || (lonText !== '' && lon === null) ||
      (latText === '') !== (lonText === '')) { toast.error('Enter a valid latitude and longitude pair.'); return }
  if ((odometerText !== '' && odometer === null) || (engineText !== '' && engine === null)) {
    toast.error('Enter valid odometer and engine hours.'); return
  }
  emit('save', {
    eventCode: eventCode.value, recordOrigin: recordOrigin.value,
    responsibleUserId: recordOrigin.value === 'OTHER_USER' ? responsibleUserId.value : props.driverExternalId,
    vehicleId: vehicleId.value === 'none' ? null : vehicleId.value,
    latitude: lat, longitude: lon, calculatedLocation: calculatedLocation.value.trim() || null,
    odometerMiles: odometer, engineHours: engine,
    notes: notes.value.trim() || null,
  })
}
async function copyCoordinates() {
  const lat = parseCoordinate(String(latitude.value), LATITUDE_LIMIT), lon = parseCoordinate(String(longitude.value), LONGITUDE_LIMIT)
  if (lat === null || lon === null) { toast.warning('No valid coordinates to copy'); return }
  await writeCoordinates(lat, lon); toast.success('Coordinates copied')
}
async function pasteCoordinates() {
  const coordinates = await readCoordinates()
  if (!coordinates) { toast.error('Clipboard must contain latitude, longitude'); return }
  latitude.value = String(coordinates.latitude); longitude.value = String(coordinates.longitude)
  toast.success('Coordinates pasted')
}
function clear() {
  selectStatus('DS_OFF'); recordOrigin.value = 'OTHER_USER'; responsibleUserId.value = activeUsers.value[0]?.id ?? ''
  vehicleId.value = 'none'; latitude.value = ''; longitude.value = ''; calculatedLocation.value = ''
  odometerMiles.value = ''; engineHours.value = ''; notes.value = ''
  emit('update:start-seconds', 0)
}
defineExpose({ clear })
</script>
