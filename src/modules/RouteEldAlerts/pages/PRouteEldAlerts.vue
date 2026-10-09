<template>
  <div
    class="flex h-[calc(100vh-65px)] min-h-0 flex-col overflow-hidden bg-white p-[16px_24px] dark:bg-background"
  >
    <div class="mb-4 flex flex-none flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <div>
        <h1 class="text-xl font-semibold text-foreground">Alerts</h1>
        <p class="mt-1 text-sm text-muted-foreground">{{ pageDescription }}</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <Select v-model="alertType">
          <SelectTrigger class="h-10 w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="station">Station Alerts</SelectItem>
            <SelectItem value="violation">Violation Alerts</SelectItem>
            <SelectItem value="speed">Speed Alerts</SelectItem>
          </SelectContent>
        </Select>
        <div class="relative w-64">
          <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input v-model="search" class="h-10 pl-9" :placeholder="searchPlaceholder" />
        </div>
        <Select v-model="statusFilter">
          <SelectTrigger class="h-10 w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem v-for="option in statusOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" class="h-10" :disabled="isRefreshing" @click="refresh">
          <RefreshCw class="mr-2 h-4 w-4" :class="isRefreshing && 'animate-spin'" />
          Refresh
        </Button>
      </div>
    </div>

    <div class="mb-4 grid flex-none grid-cols-2 gap-3 xl:grid-cols-4">
      <div
        v-for="card in summaryCards"
        :key="card.label"
        class="rounded-lg border border-border bg-card px-4 py-3"
      >
        <div class="text-xs text-muted-foreground">{{ card.label }}</div>
        <div class="mt-1 text-2xl font-semibold" :class="card.className">{{ card.value }}</div>
      </div>
    </div>

    <div
      v-if="error"
      class="mb-3 flex-none rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
    >
      {{ error }}
    </div>

    <div class="min-h-0 flex-1 overflow-auto rounded-lg border border-border bg-card">
      <table
        v-if="alertType === 'station'"
        class="w-full min-w-[1480px] border-collapse text-left text-sm"
      >
        <thead class="sticky top-0 z-20 bg-muted text-xs text-muted-foreground">
          <tr>
            <th class="h-12 w-14 px-3">No</th>
            <th class="px-3">Driver</th>
            <th class="px-3">Station</th>
            <th class="px-3">Driver location</th>
            <th class="px-3">Station location</th>
            <th class="px-3">Direction</th>
            <th class="px-3">Distance</th>
            <th class="px-3">Occurred</th>
            <th class="px-3">Status</th>
            <th class="w-28 px-3 text-center">Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading">
            <td colspan="10" class="h-28 text-center text-muted-foreground">Loading…</td>
          </tr>
          <tr
            v-for="(alert, index) in paginatedStationAlerts"
            v-else
            :key="alert.id"
            class="h-12 border-t border-border transition-colors hover:bg-muted/40"
          >
            <td class="px-3 text-muted-foreground">{{ rowNumber(index) }}</td>
            <td class="px-3 font-medium">{{ alert.driverName }}</td>
            <td class="px-3">
              <div class="font-medium">{{ alert.stationName }}</div>
              <div class="text-xs text-muted-foreground">{{ alert.stateCode || '—' }}</div>
            </td>
            <td class="max-w-64 px-3">
              <a
                :href="mapUrl(alert.driverLatitude, alert.driverLongitude)"
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center gap-2 hover:text-primary hover:underline"
              >
                <MapPin class="h-4 w-4 shrink-0 text-blue-600" />
                <span class="truncate" :title="stationDriverLocation(alert)">
                  {{ stationDriverLocation(alert) }}
                </span>
              </a>
            </td>
            <td class="max-w-72 px-3">
              <a
                :href="mapUrl(alert.stationLatitude, alert.stationLongitude)"
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center gap-2 hover:text-primary hover:underline"
              >
                <MapPin class="h-4 w-4 shrink-0 text-muted-foreground" />
                <span class="truncate" :title="stationLocation(alert)">{{
                  stationLocation(alert)
                }}</span>
              </a>
            </td>
            <td class="px-3">{{ alert.direction || '—' }}</td>
            <td class="whitespace-nowrap px-3">{{ alert.distanceMiles.toFixed(2) }} mi</td>
            <td class="whitespace-nowrap px-3">{{ formatDate(alert.occurredAt) }}</td>
            <td class="px-3">
              <div class="flex flex-wrap gap-1.5">
                <span
                  class="inline-flex rounded-full px-2 py-1 text-xs font-medium"
                  :class="
                    alert.resolvedAt
                      ? 'bg-green-100 text-green-700'
                      : 'bg-orange-100 text-orange-700'
                  "
                >
                  {{ alert.resolvedAt ? 'Resolved' : 'Active' }}
                </span>
                <span
                  v-if="!alert.isRead"
                  class="inline-flex rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700"
                >
                  Unread
                </span>
              </div>
            </td>
            <td class="px-3 text-center">
              <Button
                v-if="!alert.isRead"
                variant="ghost"
                size="sm"
                :disabled="markingReadId === alert.id"
                @click="markStationRead(alert.id)"
              >
                <LoaderCircle v-if="markingReadId === alert.id" class="mr-2 h-4 w-4 animate-spin" />
                Mark read
              </Button>
              <span v-else class="text-xs text-muted-foreground">Read</span>
            </td>
          </tr>
          <tr v-if="!isLoading && paginatedStationAlerts.length === 0">
            <td colspan="10" class="h-28 text-center text-muted-foreground">
              No station alerts match the selected filters.
            </td>
          </tr>
        </tbody>
      </table>

      <table
        v-else-if="alertType === 'speed'"
        class="w-full min-w-[1050px] border-collapse text-left text-sm"
      >
        <thead class="sticky top-0 z-20 bg-muted text-xs text-muted-foreground">
          <tr>
            <th class="h-12 w-14 px-3">No</th>
            <th class="px-3">Driver</th>
            <th class="px-3">Speed</th>
            <th class="px-3">Limit</th>
            <th class="px-3">Over limit</th>
            <th class="px-3">State</th>
            <th class="px-3">Location</th>
            <th class="px-3">Occurred</th>
            <th class="px-3">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading">
            <td colspan="9" class="h-28 text-center text-muted-foreground">Loading…</td>
          </tr>
          <tr
            v-for="(alert, index) in paginatedSpeedAlerts"
            v-else
            :key="alert.id"
            class="h-12 border-t border-border transition-colors hover:bg-muted/40"
          >
            <td class="px-3 text-muted-foreground">{{ rowNumber(index) }}</td>
            <td class="px-3 font-medium">{{ alert.driverName }}</td>
            <td class="px-3 font-medium text-red-600">{{ Math.round(alert.speed) }} mph</td>
            <td class="px-3">{{ alert.speedLimit }} mph</td>
            <td class="px-3 font-medium text-orange-600">{{ speedOverLimit(alert) }} mph</td>
            <td class="px-3">{{ alert.stateCode || '—' }}</td>
            <td class="max-w-80 px-3">
              <a
                :href="mapUrl(alert.latitude, alert.longitude)"
                target="_blank"
                rel="noopener noreferrer"
                class="block truncate hover:text-primary hover:underline"
                :title="speedLocation(alert)"
              >
                {{ speedLocation(alert) }}
              </a>
            </td>
            <td class="whitespace-nowrap px-3">{{ formatDate(alert.occurredAt) }}</td>
            <td class="px-3">
              <span
                class="inline-flex rounded-full px-2 py-1 text-xs font-medium"
                :class="alert.isRead ? 'bg-gray-100 text-gray-600' : 'bg-red-100 text-red-700'"
              >
                {{ alert.isRead ? 'Read' : 'Unread' }}
              </span>
            </td>
          </tr>
          <tr v-if="!isLoading && paginatedSpeedAlerts.length === 0">
            <td colspan="9" class="h-28 text-center text-muted-foreground">
              No speed alerts match the selected filters.
            </td>
          </tr>
        </tbody>
      </table>

      <table v-else class="w-full min-w-[980px] border-collapse text-left text-sm">
        <thead class="sticky top-0 z-20 bg-muted text-xs text-muted-foreground">
          <tr>
            <th class="h-12 w-14 px-3">No</th>
            <th class="px-3">Driver</th>
            <th class="px-3">Log date</th>
            <th class="px-3">Violations</th>
            <th class="px-3">Note</th>
            <th class="px-3">Time zone</th>
            <th class="px-3">Occurred</th>
            <th class="px-3">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading">
            <td colspan="8" class="h-28 text-center text-muted-foreground">Loading…</td>
          </tr>
          <tr
            v-for="(alert, index) in paginatedViolationAlerts"
            v-else
            :key="alert.id"
            class="h-12 border-t border-border transition-colors hover:bg-muted/40"
          >
            <td class="px-3 text-muted-foreground">{{ rowNumber(index) }}</td>
            <td class="px-3 font-medium">{{ alert.driverName }}</td>
            <td class="whitespace-nowrap px-3">{{ formatLogDate(alert.logDate) }}</td>
            <td class="px-3 font-medium text-red-600">{{ alert.violationCount }}</td>
            <td class="max-w-96 px-3">
              <div class="truncate" :title="alert.note || ''">{{ alert.note || '—' }}</div>
            </td>
            <td class="px-3">{{ alert.timeZone || '—' }}</td>
            <td class="whitespace-nowrap px-3">{{ formatDate(alert.occurredAt) }}</td>
            <td class="px-3">
              <span
                class="inline-flex rounded-full px-2 py-1 text-xs font-medium"
                :class="alert.isRead ? 'bg-gray-100 text-gray-600' : 'bg-red-100 text-red-700'"
              >
                {{ alert.isRead ? 'Read' : 'Unread' }}
              </span>
            </td>
          </tr>
          <tr v-if="!isLoading && paginatedViolationAlerts.length === 0">
            <td colspan="8" class="h-28 text-center text-muted-foreground">
              No violation alerts match the selected filters.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      class="mt-4 flex flex-none flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="flex items-center gap-3">
        <span class="text-sm text-muted-foreground">Display on page</span>
        <Select v-model="pageSize">
          <SelectTrigger class="h-9 w-20"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem :value="10">10</SelectItem>
            <SelectItem :value="25">25</SelectItem>
            <SelectItem :value="50">50</SelectItem>
            <SelectItem :value="100">100</SelectItem>
          </SelectContent>
        </Select>
        <span class="text-sm text-muted-foreground">{{ filteredCount }} entries</span>
      </div>
      <div class="flex items-center gap-3">
        <div class="hidden items-center gap-1 md:flex">
          <button
            v-for="page in pageNumbers"
            :key="page"
            :disabled="page === '...'"
            :class="[
              'h-8 min-w-8 rounded px-2 text-sm transition-colors',
              page === pageNumber
                ? 'bg-primary text-primary-foreground'
                : page === '...'
                  ? 'cursor-default text-muted-foreground'
                  : 'hover:bg-muted',
            ]"
            @click="typeof page === 'number' && (pageNumber = page)"
          >
            {{ page }}
          </button>
        </div>
        <span class="whitespace-nowrap text-sm text-muted-foreground">
          {{ filteredCount ? pageNumber : 0 }} of {{ totalPages }} pages
        </span>
        <Button
          variant="outline"
          size="icon"
          class="h-8 w-8"
          :disabled="pageNumber <= 1"
          @click="pageNumber--"
        >
          <ChevronLeft class="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          class="h-8 w-8"
          :disabled="pageNumber >= totalPages"
          @click="pageNumber++"
        >
          <ChevronRight class="h-4 w-4" />
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ChevronLeft, ChevronRight, LoaderCircle, MapPin, RefreshCw, Search } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTimeZoneHelper } from '@/composables/useTimezone'
import { useRouteEldAlerts } from '../composables/useRouteEldAlerts'
import type { RouteEldAlertType, SpeedAlert, StationAlert } from '../types'

const { formatToTimeZone } = useTimeZoneHelper()
const {
  stationAlerts,
  speedAlerts,
  violationAlerts,
  isLoading,
  isRefreshing,
  markingReadId,
  error,
  fetchAlerts,
  ensureAlerts,
  markStationRead,
} = useRouteEldAlerts()

const alertType = ref<RouteEldAlertType>('station')
const search = ref('')
const statusFilter = ref('all')
const pageNumber = ref(1)
const pageSize = ref(25)

const pageDescription = computed(() => {
  if (alertType.value === 'station') return 'Driver approaches to Route ELD weigh stations'
  if (alertType.value === 'speed') return 'Drivers exceeding the state speed limit from Route ELD'
  return 'Drivers with HOS violations from Route ELD daily logs'
})

const searchPlaceholder = computed(() => {
  if (alertType.value === 'station') return 'Search driver or station'
  if (alertType.value === 'speed') return 'Search driver or location'
  return 'Search driver, date or note'
})

const statusOptions = computed(() => {
  if (alertType.value === 'station') {
    return [
      { value: 'all', label: 'All alerts' },
      { value: 'unread', label: 'Unread' },
      { value: 'active', label: 'Active' },
      { value: 'resolved', label: 'Resolved' },
    ]
  }
  return [
    { value: 'all', label: 'All alerts' },
    { value: 'unread', label: 'Unread' },
    { value: 'read', label: 'Read' },
  ]
})

const filteredStationAlerts = computed(() => {
  const query = search.value.trim().toLowerCase()
  return stationAlerts.value.filter((alert) => {
    const matchesSearch =
      !query ||
      [alert.driverName, alert.stationName, alert.location, alert.stateCode, alert.direction].some(
        (value) => value?.toLowerCase().includes(query)
      )
    const matchesStatus =
      statusFilter.value === 'all' ||
      (statusFilter.value === 'unread' && !alert.isRead) ||
      (statusFilter.value === 'active' && !alert.resolvedAt) ||
      (statusFilter.value === 'resolved' && !!alert.resolvedAt)
    return matchesSearch && matchesStatus
  })
})

const filteredSpeedAlerts = computed(() => {
  const query = search.value.trim().toLowerCase()
  return speedAlerts.value.filter((alert) => {
    const matchesSearch =
      !query ||
      [alert.driverName, alert.location, alert.stateCode].some((value) =>
        value?.toLowerCase().includes(query)
      )
    const matchesStatus =
      statusFilter.value === 'all' ||
      (statusFilter.value === 'unread' && !alert.isRead) ||
      (statusFilter.value === 'read' && alert.isRead)
    return matchesSearch && matchesStatus
  })
})

const filteredViolationAlerts = computed(() => {
  const query = search.value.trim().toLowerCase()
  return violationAlerts.value.filter((alert) => {
    const matchesSearch =
      !query ||
      [alert.driverName, alert.logDate, alert.note].some((value) =>
        value?.toLowerCase().includes(query)
      )
    const matchesStatus =
      statusFilter.value === 'all' ||
      (statusFilter.value === 'unread' && !alert.isRead) ||
      (statusFilter.value === 'read' && alert.isRead)
    return matchesSearch && matchesStatus
  })
})

const filteredCount = computed(() => {
  if (alertType.value === 'station') return filteredStationAlerts.value.length
  if (alertType.value === 'speed') return filteredSpeedAlerts.value.length
  return filteredViolationAlerts.value.length
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredCount.value / pageSize.value)))
const pageNumbers = computed<(number | string)[]>(() => {
  if (totalPages.value <= 7) {
    return Array.from({ length: totalPages.value }, (_, index) => index + 1)
  }
  const values: (number | string)[] = [1]
  if (pageNumber.value > 3) values.push('...')
  for (
    let page = Math.max(2, pageNumber.value - 1);
    page <= Math.min(totalPages.value - 1, pageNumber.value + 1);
    page += 1
  ) {
    values.push(page)
  }
  if (pageNumber.value < totalPages.value - 2) values.push('...')
  values.push(totalPages.value)
  return values
})

const pageSlice = computed(() => {
  const start = (pageNumber.value - 1) * pageSize.value
  return { start, end: start + pageSize.value }
})
const paginatedStationAlerts = computed(() =>
  filteredStationAlerts.value.slice(pageSlice.value.start, pageSlice.value.end)
)
const paginatedSpeedAlerts = computed(() =>
  filteredSpeedAlerts.value.slice(pageSlice.value.start, pageSlice.value.end)
)
const paginatedViolationAlerts = computed(() =>
  filteredViolationAlerts.value.slice(pageSlice.value.start, pageSlice.value.end)
)

const summaryCards = computed(() => {
  if (alertType.value === 'station') {
    return [
      { label: 'Alerts loaded', value: stationAlerts.value.length, className: '' },
      {
        label: 'Active approaches',
        value: stationAlerts.value.filter((alert) => !alert.resolvedAt).length,
        className: 'text-orange-600',
      },
      {
        label: 'Resolved',
        value: stationAlerts.value.filter((alert) => !!alert.resolvedAt).length,
        className: 'text-green-600',
      },
      {
        label: 'Unread',
        value: stationAlerts.value.filter((alert) => !alert.isRead).length,
        className: 'text-red-600',
      },
    ]
  }
  if (alertType.value === 'speed') {
    const overages = speedAlerts.value.map((alert) => Math.max(0, alert.speed - alert.speedLimit))
    return [
      { label: 'Alerts loaded', value: speedAlerts.value.length, className: '' },
      {
        label: 'Unread',
        value: speedAlerts.value.filter((alert) => !alert.isRead).length,
        className: 'text-red-600',
      },
      {
        label: 'Average over limit',
        value: `${Math.round(overages.reduce((sum, value) => sum + value, 0) / (overages.length || 1))} mph`,
        className: 'text-orange-600',
      },
      {
        label: 'Highest speed',
        value: `${Math.round(Math.max(0, ...speedAlerts.value.map((alert) => alert.speed)))} mph`,
        className: 'text-red-600',
      },
    ]
  }
  return [
    { label: 'Alerts loaded', value: violationAlerts.value.length, className: '' },
    {
      label: 'Unread',
      value: violationAlerts.value.filter((alert) => !alert.isRead).length,
      className: 'text-red-600',
    },
    {
      label: 'Total violations',
      value: violationAlerts.value.reduce((sum, alert) => sum + alert.violationCount, 0),
      className: 'text-red-600',
    },
    {
      label: 'Affected drivers',
      value: new Set(violationAlerts.value.map((alert) => alert.driverName)).size,
      className: 'text-orange-600',
    },
  ]
})

watch(alertType, async (value) => {
  search.value = ''
  statusFilter.value = 'all'
  pageNumber.value = 1
  await ensureAlerts(value)
})
watch([search, statusFilter, pageSize], () => {
  pageNumber.value = 1
})
watch(totalPages, (value) => {
  if (pageNumber.value > value) pageNumber.value = value
})

onMounted(() => ensureAlerts('station'))

function refresh() {
  void fetchAlerts(alertType.value, true)
}

function rowNumber(index: number) {
  return (pageNumber.value - 1) * pageSize.value + index + 1
}

function formatDate(value: string) {
  return formatToTimeZone(value, 'MMM D, YYYY h:mm A')
}

function formatLogDate(value: string) {
  const normalized = value.replaceAll('/', '-')
  const date = new Date(`${normalized}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

function mapUrl(latitude: number, longitude: number) {
  return `https://www.google.com/maps?q=${latitude},${longitude}`
}

function stationDriverLocation(alert: StationAlert) {
  return (
    alert.driverLocation ||
    `${alert.driverLatitude.toFixed(5)}, ${alert.driverLongitude.toFixed(5)}`
  )
}

function stationLocation(alert: StationAlert) {
  return (
    alert.location || `${alert.stationLatitude.toFixed(5)}, ${alert.stationLongitude.toFixed(5)}`
  )
}

function speedLocation(alert: SpeedAlert) {
  return alert.location || `${alert.latitude.toFixed(5)}, ${alert.longitude.toFixed(5)}`
}

function speedOverLimit(alert: SpeedAlert) {
  return Math.max(0, Math.round(alert.speed - alert.speedLimit))
}
</script>
