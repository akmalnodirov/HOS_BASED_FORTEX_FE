<template>
  <section
    class="flex overflow-hidden bg-white dark:bg-background"
    :class="fillAvailable ? 'h-full min-h-0' : 'h-[calc(100dvh-65px)] min-h-[520px]'"
  >
    <aside class="flex w-[420px] shrink-0 flex-col border-r border-border bg-white dark:bg-card">
      <div class="shrink-0 border-b border-border px-4 py-3">
        <h2 class="text-xl font-semibold text-foreground">Tracking</h2>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto">
        <div
          v-if="historyEntries.length === 0"
          class="px-4 py-10 text-center text-sm text-muted-foreground"
        >
          No tracking points for this day
        </div>
        <div v-else class="divide-y divide-border">
          <div v-for="(entry, index) in historyEntries" :key="entry.point.id" class="px-4 py-3">
            <div class="min-w-0">
              <div class="text-sm font-normal text-foreground">
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
                  <CalendarDays class="h-4 w-4 shrink-0" />
                  {{ entry.timeRange }}
                </span>
                <span class="flex items-center gap-1.5 whitespace-nowrap">
                  <Clock class="h-4 w-4 shrink-0" />
                  {{ entry.duration }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>

    <main class="relative min-w-0 flex-1">
      <RouteEldTrackingMap :points="mapPoints" :is-live="false" :current-status="currentStatus" />
    </main>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import { CalendarDays, Clock } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import RouteEldTrackingMap from '@/modules/Overview/components/RouteEldTrackingMap.vue'
import { useGeoLocationsStore } from '@/modules/Overview/store/geoLocations'
import type { RouteEldLiveTrackingPoint, RouteEldMotionStatus } from '@/modules/Overview/types'
import type { RouteEldTrackingPoint } from '../../types/routeEldDetail'

const props = defineProps<{
  points: RouteEldTrackingPoint[]
  currentStatus?: string | null
  timeZone?: string | null
  fillAvailable?: boolean
}>()

const geoLocationsStore = useGeoLocationsStore()
const historyAddresses = reactive<Record<string, string>>({})
const historyAddressLoading = reactive<Record<string, boolean>>({})

const mapPoints = computed<RouteEldLiveTrackingPoint[]>(() =>
  [...props.points]
    .filter(
      (point) =>
        Number.isFinite(point.latitude) &&
        Number.isFinite(point.longitude) &&
        Math.abs(point.latitude) <= 90 &&
        Math.abs(point.longitude) <= 180 &&
        !(point.latitude === 0 && point.longitude === 0)
    )
    .sort((left, right) => left.timestamp - right.timestamp)
    .map((point) => ({
      ...point,
      motionStatus: normalizeMotionStatus(point.motionStatus),
      location: null,
      driverName: null,
    }))
)

const historyEntries = computed(() =>
  mapPoints.value
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

function normalizeMotionStatus(value: string): RouteEldMotionStatus {
  const normalized = value.toUpperCase()
  if (normalized === 'MOVING') return 'MOVING'
  if (normalized === 'STOPPED') return 'STOPPED'
  return 'UNKNOWN'
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

function formatClock(value: number) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: timeZoneName(props.timeZone),
    hour: '2-digit',
    minute: '2-digit',
  }).format(value)
}

function formatHistoryRange(start: number, end: number) {
  const startLabel = new Intl.DateTimeFormat(undefined, {
    timeZone: timeZoneName(props.timeZone),
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(start)
  if (dateKey(start) === dateKey(end))
    return `${startLabel} - ${formatClock(end)}`
  return `${startLabel} - ${new Intl.DateTimeFormat(undefined, {
    timeZone: timeZoneName(props.timeZone),
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(end)}`
}

function dateKey(value: number) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timeZoneName(props.timeZone),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value)
}

function timeZoneName(code?: string | null) {
  const normalized = code?.trim()
  if (normalized?.includes('/')) return normalized

  return (
    {
      ET: 'America/New_York',
      CT: 'America/Chicago',
      MT: 'America/Denver',
      PT: 'America/Los_Angeles',
      AT: 'America/Halifax',
      NT: 'America/St_Johns',
      AKT: 'America/Anchorage',
      HT: 'Pacific/Honolulu',
      AZ: 'America/Phoenix',
      SK: 'America/Regina',
    } as Record<string, string>
  )[normalized?.toUpperCase() ?? ''] ?? 'America/Chicago'
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
</script>
