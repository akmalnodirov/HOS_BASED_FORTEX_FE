<template>
  <div class="flex h-screen min-h-0 flex-col overflow-hidden bg-background text-foreground">
    <header
      class="flex h-16 shrink-0 items-center justify-between border-b border-border bg-white px-5 dark:bg-card"
    >
      <div class="flex items-center gap-3">
        <div
          class="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white dark:bg-white dark:text-slate-900"
        >
          V
        </div>
        <div>
          <div class="text-sm font-semibold">Vectorium Live Tracking</div>
          <div class="text-xs text-muted-foreground">View-only Route ELD location</div>
        </div>
      </div>
      <div v-if="share" class="text-right">
        <div class="text-xs font-medium">Expires {{ formatDate(share.expiresAt) }}</div>
        <div class="mt-0.5 flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
          <span
            :class="[
              'h-2 w-2 rounded-full',
              expired ? 'bg-red-500' : 'animate-pulse bg-emerald-500',
            ]"
          />
          {{ expired ? 'Expired' : 'Live' }}
        </div>
      </div>
    </header>

    <main class="relative min-h-0 flex-1">
      <RouteEldTrackingMap v-if="share" :points="share.tracking.points" :is-live="!expired" />
      <div
        v-if="share"
        class="absolute bottom-4 left-4 z-10 max-w-[360px] rounded-md border border-border bg-white/95 p-4 shadow-lg dark:bg-card/95"
      >
        <div class="flex items-start justify-between gap-5">
          <div class="min-w-0">
            <div class="truncate text-base font-semibold">{{ share.tracking.vehicle.name }}</div>
            <div class="mt-0.5 truncate text-xs text-muted-foreground">
              {{ share.tracking.vehicle.driverName || 'Driver unavailable' }}
            </div>
          </div>
          <span :class="statusClass">{{ statusLabel }}</span>
        </div>
        <div class="mt-3 grid grid-cols-[72px_1fr] gap-x-3 gap-y-1.5 text-xs">
          <span class="text-muted-foreground">Location</span>
          <span>{{ share.tracking.vehicle.latestPoint?.location || coordinateLabel }}</span>
          <span class="text-muted-foreground">Updated</span>
          <span>{{ updatedLabel }}</span>
          <span class="text-muted-foreground">Speed</span>
          <span>{{ speedLabel }}</span>
        </div>
      </div>
      <div
        v-if="isLoading"
        class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background"
      >
        <LoaderCircle class="h-8 w-8 animate-spin text-muted-foreground" />
        <span class="text-sm text-muted-foreground">Loading live tracking…</span>
      </div>
      <div
        v-else-if="error"
        class="absolute inset-0 flex items-center justify-center bg-background p-6"
      >
        <div class="max-w-md rounded-lg border border-border bg-card p-8 text-center shadow-sm">
          <CircleAlert class="mx-auto h-10 w-10 text-destructive" />
          <h1 class="mt-4 text-lg font-semibold">Live tracking unavailable</h1>
          <p class="mt-2 text-sm text-muted-foreground">{{ error }}</p>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { CircleAlert, LoaderCircle } from 'lucide-vue-next'
import RouteEldTrackingMap from '../components/RouteEldTrackingMap.vue'
import { getPublicRouteEldTracking } from '../composables/useRouteEldOverview'
import type { RouteEldLiveShareTracking } from '../types'

const route = useRoute()
const token = computed(() => String(route.params.token || ''))
const share = ref<RouteEldLiveShareTracking | null>(null)
const isLoading = ref(true)
const error = ref('')
const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | null = null

const expired = computed(
  () => !share.value || new Date(share.value.expiresAt).getTime() <= now.value
)
const statusLabel = computed(() => {
  const value = share.value?.tracking.vehicle.motionStatus
  return value === 'MOVING' ? 'Moving' : value === 'STOPPED' ? 'Stopped' : 'Unavailable'
})
const statusClass = computed(() => {
  const moving = share.value?.tracking.vehicle.motionStatus === 'MOVING'
  return moving
    ? 'rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700'
    : 'rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700'
})
const coordinateLabel = computed(() => {
  const point = share.value?.tracking.vehicle.latestPoint
  return point ? `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}` : 'Unavailable'
})
const updatedLabel = computed(() => {
  const value = share.value?.tracking.vehicle.latestPoint?.timestamp
  return value
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'medium' }).format(value)
    : '—'
})
const speedLabel = computed(() => {
  const value = share.value?.tracking.vehicle.latestPoint?.speed
  return value == null ? '—' : `${value.toFixed(1)} mph`
})

onMounted(() => {
  void load()
  timer = setInterval(() => {
    now.value = Date.now()
    if (!expired.value) void load(false)
  }, 15_000)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})

async function load(initial = true) {
  if (initial) isLoading.value = true
  error.value = ''
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  try {
    const latestTimestamp = share.value?.tracking.points.at(-1)?.timestamp
    const incoming = await getPublicRouteEldTracking(
      token.value,
      !initial && latestTimestamp != null
        ? Math.max(start.getTime(), latestTimestamp)
        : start.getTime(),
      Date.now()
    )
    if (!share.value || initial) share.value = incoming
    else {
      share.value = {
        ...incoming,
        tracking: {
          ...share.value.tracking,
          ...incoming.tracking,
          points: deduplicatePoints([...share.value.tracking.points, ...incoming.tracking.points]),
        },
      }
    }
  } catch (exception: any) {
    error.value =
      exception.response?.data?.message ||
      exception.response?.data ||
      'This link is invalid or has expired.'
  } finally {
    isLoading.value = false
  }
}

function deduplicatePoints(points: RouteEldLiveShareTracking['tracking']['points']) {
  return [...new Map(points.map((point) => [point.id, point])).values()].sort(
    (left, right) => left.timestamp - right.timestamp
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value)
  )
}
</script>
