<template>
  <div class="flex h-[calc(100vh-65px)] min-h-0 w-full overflow-hidden bg-white dark:bg-background">
    <aside class="flex w-[420px] shrink-0 flex-col border-r border-border bg-white dark:bg-card">
      <div
        class="shrink-0 px-4 py-3 text-white"
        :style="{ backgroundColor: statusColor(tracking?.driver.currentStatus || '') }"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="truncate text-sm font-semibold">
              {{ tracking?.driver.vehicleName || 'No unit' }}
            </div>
            <div class="mt-0.5 truncate text-xs text-white/90">
              {{ tracking?.driver.driverName || 'Driver' }}
            </div>
          </div>
          <div class="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              class="h-8 w-8 bg-white/20 text-white hover:bg-white/30 hover:text-white"
              :disabled="!tracking?.driver.vehicleId"
              @click="openShare"
            >
              <Share2 class="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              class="h-8 w-8 bg-white/20 text-white hover:bg-white/30 hover:text-white"
              @click="router.push('/overview')"
            >
              <X class="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div class="my-2 border-t border-white/20" />
        <div class="space-y-1 text-xs text-white/95">
          <div class="flex gap-2">
            <span class="font-medium">Phone Number:</span>
            <span>{{ tracking?.driver.phoneNumber || 'N/A' }}</span>
          </div>
          <div class="flex gap-2">
            <span class="font-medium">Email:</span>
            <span class="truncate">{{ tracking?.driver.email || 'N/A' }}</span>
          </div>
        </div>
        <div class="mt-3 grid grid-cols-2 gap-4 border-t border-white/20 pt-3 text-xs">
          <div>
            <div class="text-white/75">Latest speed</div>
            <div class="mt-1 font-semibold text-white">{{ latestSpeedLabel }}</div>
          </div>
          <div class="text-right">
            <div class="text-white/75">Last update</div>
            <div class="mt-1 font-semibold text-white">{{ lastUpdateLabel }}</div>
          </div>
        </div>
      </div>

      <div
        v-if="firstPoint && lastPoint"
        class="shrink-0 border-b border-border bg-[#f5f5f5] p-4 dark:bg-muted/20"
      >
        <div class="grid grid-cols-3 text-xs text-muted-foreground">
          <div>
            <div>Start:</div>
            <div class="mt-1 whitespace-nowrap text-foreground">{{ startLabel }}</div>
          </div>
          <div class="text-center">
            <div>Distance:</div>
            <div class="mt-1 whitespace-nowrap text-foreground">{{ distanceLabel }}</div>
          </div>
          <div class="text-right">
            <div>End:</div>
            <div class="mt-1 whitespace-nowrap text-foreground">{{ endLabel }}</div>
          </div>
        </div>
        <div class="my-4 flex items-center gap-1 px-1">
          <span class="relative h-3 w-3 shrink-0 rounded-full border border-foreground">
            <span class="absolute inset-[2px] rounded-full bg-foreground" />
          </span>
          <span class="h-0 flex-1 border-t-2 border-dotted border-foreground/60" />
          <span class="relative h-3 w-3 shrink-0 rounded-full border border-foreground">
            <span class="absolute inset-[2px] rounded-full bg-foreground" />
          </span>
          <span class="h-0 flex-1 border-t-2 border-dotted border-muted-foreground/40" />
          <span class="relative h-3 w-3 shrink-0 rounded-full border border-muted-foreground">
            <span class="absolute inset-[2px] rounded-full bg-muted-foreground" />
          </span>
        </div>
        <div class="grid grid-cols-2 gap-4 text-xs text-foreground">
          <p class="line-clamp-2 leading-snug">{{ pointLocation(firstPoint) }}</p>
          <p class="line-clamp-2 text-right leading-snug">{{ pointLocation(lastPoint) }}</p>
        </div>
      </div>

      <div class="shrink-0 border-b border-border px-4 py-3">
        <div class="flex items-center justify-between">
          <h2 class="text-base font-semibold">History</h2>
          <Popover v-model:open="calendarOpen">
            <PopoverTrigger as-child>
              <Button variant="outline" class="h-8 justify-start gap-2 px-3 text-xs font-normal">
                <CalendarDays class="h-4 w-4 text-muted-foreground" />
                {{ selectedDateLabel }}
              </Button>
            </PopoverTrigger>
            <PopoverContent class="w-auto p-0" align="start">
              <CalendarComponent
                v-model="selectedCalendarDate"
                :max-value="maximumCalendarDate"
                initial-focus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto">
        <div v-if="isLoading" class="space-y-2 p-4">
          <Skeleton v-for="index in 7" :key="index" class="h-16 w-full" />
        </div>
        <div
          v-else-if="error"
          class="m-4 rounded-md border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {{ error }}
        </div>
        <div
          v-else-if="historyEntries.length === 0"
          class="px-4 py-10 text-center text-sm text-muted-foreground"
        >
          No tracking points for this day
        </div>
        <div v-else class="divide-y divide-border">
          <div v-for="(entry, index) in historyEntries" :key="entry.point.id" class="px-4 py-3">
            <div class="flex items-start gap-3">
              <div class="min-w-0 flex-1">
                <div class="text-sm font-normal">
                  <span class="mr-1 font-medium text-muted-foreground">
                    {{ historyEntries.length - index }}.
                  </span>
                  <template v-if="historyAddress(entry.point)">
                    {{ historyAddress(entry.point) }}
                  </template>
                  <template v-else>
                    <span>{{ pointCoordinates(entry.point) }}</span>
                    <button
                      type="button"
                      class="ml-1.5 whitespace-nowrap text-xs font-medium text-primary hover:underline disabled:cursor-wait disabled:opacity-60"
                      :disabled="isHistoryAddressLoading(entry.point)"
                      @click="showHistoryAddress(entry.point)"
                    >
                      {{ isHistoryAddressLoading(entry.point) ? 'Loading…' : 'Show Address' }}
                    </button>
                  </template>
                </div>
                <div
                  class="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground"
                >
                  <span class="flex items-center gap-1.5">
                    <CalendarDays class="h-4 w-4" />
                    {{ entry.timeRange }}
                  </span>
                  <span class="flex items-center gap-1.5">
                    <Clock class="h-4 w-4" />
                    {{ entry.duration }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>

    <main class="relative min-w-0 flex-1">
      <RouteEldTrackingMap
        :key="`${id}:${selectedDate}`"
        :points="tracking?.points || []"
        :is-live="isToday"
        :current-status="tracking?.driver.currentStatus"
      />
      <div
        v-if="isLoading"
        class="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[1px]"
      >
        <LoaderCircle class="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    </main>

    <LiveShareModal
      v-model:open="liveModal"
      :emails="liveState.emails"
      :telegrams="liveState.telegrams"
      :expire-at="liveState.expireAt"
      :save-loading="saveLoading"
      :share-url="generatedShareUrl"
      @add-email="liveState.emails.push('')"
      @remove-email="removeRecipient(liveState.emails, $event)"
      @add-telegram="liveState.telegrams.push('')"
      @remove-telegram="removeRecipient(liveState.telegrams, $event)"
      @update:email="(index, value) => updateRecipient(liveState.emails, index, value)"
      @update:telegram="(index, value) => updateRecipient(liveState.telegrams, index, value)"
      @update:expire-at="liveState.expireAt = $event"
      @submit="submitLiveShare"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { CalendarDate } from '@internationalized/date'
import type { DateValue } from 'reka-ui'
import { CalendarDays, Clock, LoaderCircle, Share2, X } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import LiveShareModal from '../components/LiveShareModal.vue'
import RouteEldTrackingMap from '../components/RouteEldTrackingMap.vue'
import type { RouteEldLiveTrackingPoint } from '../types'
import {
  createRouteEldLiveShare,
  localDateKey,
  useRouteEldDriverTracking,
} from '../composables/useRouteEldOverview'
import { useGeoLocationsStore } from '../store/geoLocations'

const props = defineProps<{ id: string }>()
const router = useRouter()
const geoLocationsStore = useGeoLocationsStore()
const driverId = computed(() => props.id)
const today = localDateKey(new Date())
const selectedDate = ref(today)
const calendarOpen = ref(false)
const { tracking, isLoading, isToday, error } = useRouteEldDriverTracking(driverId, selectedDate)
const liveModal = ref(false)
const saveLoading = ref(false)
const generatedShareUrl = ref('')
const historyAddresses = reactive<Record<string, string>>({})
const historyAddressLoading = reactive<Record<string, boolean>>({})
const liveState = reactive({
  emails: [''],
  telegrams: [''],
  expireAt: dayjs().add(1, 'day').endOf('day'),
})

const orderedPoints = computed(() =>
  [...(tracking.value?.points || [])].sort((left, right) => left.timestamp - right.timestamp)
)
const firstPoint = computed(() => orderedPoints.value[0] ?? null)
const lastPoint = computed(() => orderedPoints.value.at(-1) ?? null)
const historyEntries = computed(() =>
  orderedPoints.value
    .map((point, index, points) => {
      const endTimestamp = points[index + 1]?.timestamp ?? point.timestamp
      return {
        point,
        timeRange: formatHistoryRange(point.timestamp, endTimestamp),
        duration: formatDuration(Math.max(0, endTimestamp - point.timestamp)),
      }
    })
    .reverse()
)
const startLabel = computed(() =>
  firstPoint.value ? formatSummaryTime(firstPoint.value.timestamp) : '—'
)
const endLabel = computed(() =>
  lastPoint.value ? formatSummaryTime(lastPoint.value.timestamp) : '—'
)
const distanceLabel = computed(() => `${routeDistance().toFixed(1)} mi`)
const selectedDateLabel = computed(() =>
  new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(
    new Date(`${selectedDate.value}T00:00:00`)
  )
)
const latestSpeedLabel = computed(() => {
  const speed = lastPoint.value?.speed
  return speed == null ? '—' : `${speed.toFixed(1)} mph`
})
const lastUpdateLabel = computed(() =>
  lastPoint.value
    ? new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(lastPoint.value.timestamp)
    : '—'
)
const maximumCalendarDate = toCalendarDate(today)
const selectedCalendarDate = computed<DateValue>({
  get: () => toCalendarDate(selectedDate.value),
  set: (value) => {
    selectedDate.value = `${value.year}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`
    calendarOpen.value = false
  },
})
function toCalendarDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new CalendarDate(year, month, day)
}

function openShare() {
  liveState.emails = ['']
  liveState.telegrams = ['']
  liveState.expireAt = dayjs().add(1, 'day').endOf('day')
  generatedShareUrl.value = ''
  liveModal.value = true
}

function updateRecipient(values: string[], index: number, value: string) {
  values[index] = value
}

function removeRecipient(values: string[], index: number) {
  if (values.length > 1) values.splice(index, 1)
  else values[0] = ''
}

async function submitLiveShare() {
  const driver = tracking.value?.driver
  if (!driver?.vehicleId) {
    toast.error('This driver has no vehicle available for live sharing.')
    return
  }
  saveLoading.value = true
  try {
    const createdShare = await createRouteEldLiveShare({
      companyId: driver.externalCompanyId,
      vehicleId: driver.vehicleId,
      expiresAt: liveState.expireAt.toISOString(),
      recipientEmails: liveState.emails.map((value) => value.trim()).filter(Boolean),
      recipientTelegrams: liveState.telegrams.map(normalizeTelegram).filter(Boolean),
    })
    generatedShareUrl.value = createdShare.shareUrl
  } catch {
    toast.error('The live tracking link could not be sent.')
  } finally {
    saveLoading.value = false
  }
}

function normalizeTelegram(value: string) {
  const normalized = value.trim()
  if (
    !normalized ||
    normalized.startsWith('@') ||
    normalized.startsWith('+') ||
    /^\d+$/.test(normalized)
  )
    return normalized
  return `@${normalized}`
}

function statusColor(value: string) {
  const normalized = value.toUpperCase()
  if (normalized.includes('DRIVING')) return '#589e67'
  if (normalized.includes('SLEEP')) return '#954baf'
  if (normalized.includes('ON')) return '#6082e0'
  if (normalized.includes('PERSONAL')) return '#d28e3d'
  return '#af4b4b'
}

function pointLocation(point: RouteEldLiveTrackingPoint) {
  return point.location || point.stateCode || 'Location not available'
}

function historyPointKey(point: RouteEldLiveTrackingPoint) {
  return `${point.latitude.toFixed(5)},${point.longitude.toFixed(5)}`
}

function pointCoordinates(point: RouteEldLiveTrackingPoint) {
  return `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`
}

function historyAddress(point: RouteEldLiveTrackingPoint) {
  return historyAddresses[historyPointKey(point)] || ''
}

function isHistoryAddressLoading(point: RouteEldLiveTrackingPoint) {
  return Boolean(historyAddressLoading[historyPointKey(point)])
}

async function showHistoryAddress(point: RouteEldLiveTrackingPoint) {
  const key = historyPointKey(point)
  if (historyAddresses[key] || historyAddressLoading[key]) return

  historyAddressLoading[key] = true
  try {
    const address = await geoLocationsStore.getCalculatedAddress({
      latitude: point.latitude,
      longitude: point.longitude,
    })

    if (address) historyAddresses[key] = address
    else toast.error('The address could not be calculated for this point.')
  } finally {
    historyAddressLoading[key] = false
  }
}

function formatSummaryTime(value: number) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value)
}

function formatClock(value: number) {
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(value)
}

function formatHistoryRange(start: number, end: number) {
  const startDate = new Date(start)
  const endDate = new Date(end)
  const startLabel = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(startDate)
  if (startDate.toDateString() === endDate.toDateString())
    return `${startLabel} - ${formatClock(end)}`
  return `${startLabel} - ${new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(endDate)}`
}

function formatDuration(milliseconds: number) {
  const seconds = Math.floor(milliseconds / 1000)
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60
  if (hours) return `${hours}h ${minutes}m ${remainingSeconds}s`
  if (minutes) return `${minutes}m ${remainingSeconds}s`
  return `${remainingSeconds}s`
}

function routeDistance() {
  const points = orderedPoints.value
  const firstOdometer = points.find((point) => point.odometer != null)?.odometer
  const lastOdometer = [...points].reverse().find((point) => point.odometer != null)?.odometer
  if (firstOdometer != null && lastOdometer != null && lastOdometer >= firstOdometer)
    return lastOdometer - firstOdometer
  let meters = 0
  for (let index = 1; index < points.length; index += 1)
    meters += distanceMeters(points[index - 1], points[index])
  return meters / 1609.344
}

function distanceMeters(start: RouteEldLiveTrackingPoint, end: RouteEldLiveTrackingPoint) {
  const latitudeDelta = ((end.latitude - start.latitude) * Math.PI) / 180
  const longitudeDelta = ((end.longitude - start.longitude) * Math.PI) / 180
  const startLatitude = (start.latitude * Math.PI) / 180
  const endLatitude = (end.latitude * Math.PI) / 180
  const value =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(longitudeDelta / 2) ** 2
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value))
}
</script>
