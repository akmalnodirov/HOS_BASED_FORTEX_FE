<template>
  <div class="flex h-[calc(100vh-65px)] min-h-0 w-full overflow-hidden bg-white dark:bg-background">
    <aside class="flex w-[360px] shrink-0 flex-col border-r border-border bg-white dark:bg-card">
      <div class="shrink-0 space-y-3 border-b border-border p-4">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h1 class="text-xl font-semibold text-foreground">Overview</h1>
            <p class="mt-0.5 text-xs text-muted-foreground">Route ELD live driver tracking</p>
          </div>
          <Button
            variant="outline"
            size="icon"
            class="h-9 w-9"
            :disabled="isRefreshing"
            @click="load()"
          >
            <RefreshCw :class="['h-4 w-4', isRefreshing && 'animate-spin']" />
          </Button>
        </div>
        <div class="relative">
          <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input v-model="search" class="h-10 pl-9" placeholder="Search drivers or units" />
        </div>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto p-3">
        <div v-if="isLoading" class="space-y-3">
          <Skeleton v-for="index in 6" :key="index" class="h-24 w-full rounded-md" />
        </div>
        <div
          v-else-if="error"
          class="rounded-md border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {{ error }}
        </div>
        <div
          v-else-if="filteredDrivers.length === 0"
          class="py-10 text-center text-sm text-muted-foreground"
        >
          No drivers found
        </div>
        <button
          v-for="driver in filteredDrivers"
          v-else
          :key="driver.driverId"
          type="button"
          class="mb-2 w-full overflow-hidden rounded-md border border-border bg-background text-left transition-all hover:border-slate-400 hover:shadow-sm"
          @click="openDriver(driver.driverId)"
        >
          <div
            class="flex items-center justify-between px-3 py-2 text-white"
            :style="{ backgroundColor: statusColor(driver.currentStatus) }"
          >
            <span class="truncate text-xs font-semibold">{{
              driver.vehicleName || 'No unit'
            }}</span>
            <span class="rounded bg-white/20 px-2 py-0.5 text-[10px] font-medium">{{
              statusLabel(driver.currentStatus)
            }}</span>
          </div>
          <div class="flex items-center gap-3 p-3">
            <div
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold"
            >
              {{ initials(driver.driverName) }}
            </div>
            <div class="min-w-0 flex-1">
              <div class="truncate text-sm font-semibold text-foreground">
                {{ driver.driverName }}
              </div>
              <div class="mt-0.5 truncate text-xs text-muted-foreground">
                {{ driver.latestPoint?.location || 'Location unavailable' }}
              </div>
            </div>
            <Wifi :class="['h-4 w-4 shrink-0', connectionColor(driver.connectionStatus)]" />
          </div>
        </button>
      </div>
    </aside>

    <section
      ref="mapContainer"
      :class="[
        'relative min-w-0 flex-1',
        isFullscreen && 'fixed inset-0 z-[100] h-screen w-screen bg-background',
      ]"
    >
      <CMapControls
        v-model:map-type="mapType"
        v-model:current-filter="statusFilter"
        :filter-options="driverStatuses"
        :is-traffic-active="isTrafficActive"
        :is-fullscreen="isFullscreen"
        @toggle-traffic="toggleTraffic"
        @toggle-fullscreen="toggleFullscreen"
      />
      <div
        v-if="!apiKey"
        class="flex h-full items-center justify-center text-sm text-muted-foreground"
      >
        Google Maps API key is not configured.
      </div>
      <GoogleMap
        v-else
        :api-key="apiKey"
        :center="mapCenter"
        :zoom="4"
        :styles="mapStyles"
        :map-type-id="mapType"
        :disable-default-ui="true"
        :zoom-control="true"
        style="height: 100%; width: 100%"
        @ready="handleMapReady"
      >
        <CustomMarker
          v-for="driver in locatedDrivers"
          :key="driver.driverId"
          :options="{
            position: { lat: driver.latestPoint!.latitude, lng: driver.latestPoint!.longitude },
            anchorPoint: 'CENTER',
          }"
        >
          <button
            type="button"
            class="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white text-white shadow-lg"
            :style="{ backgroundColor: statusColor(driver.currentStatus) }"
            :title="driver.driverName"
            @click="openDriver(driver.driverId)"
          >
            <Navigation class="h-4 w-4" />
          </button>
        </CustomMarker>
      </GoogleMap>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { CustomMarker, GoogleMap } from 'vue3-google-map'
import { Navigation, RefreshCw, Search, Wifi } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import CMapControls from '@/components/custom/CMapControls.vue'
import { mapStyles } from '@/utils/maps'
import { useRouteEldOverviewDrivers } from '../composables/useRouteEldOverview'

const router = useRouter()
const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
const search = ref('')
const statusFilter = ref('all')
const mapType = ref<'roadmap' | 'terrain' | 'satellite'>('roadmap')
const mapCenter = { lat: 39.8283, lng: -98.5795 }
const mapContainer = ref<HTMLElement | null>(null)
const rawMap = ref<any>(null)
const trafficLayer = ref<any>(null)
const isTrafficActive = ref(false)
const isFullscreen = ref(false)
const { drivers, isLoading, isRefreshing, error, load } = useRouteEldOverviewDrivers()

const driverStatuses = computed(() => [
  { id: 'all', label: 'All', count: drivers.value.length, colorClass: '' },
  {
    id: 'offDuty',
    label: 'Off Duty',
    count: drivers.value.filter((item) => dutyStatus(item.currentStatus) === 'offDuty').length,
    colorClass: 'bg-red-500',
  },
  {
    id: 'sleeper',
    label: 'Sleep',
    count: drivers.value.filter((item) => dutyStatus(item.currentStatus) === 'sleeper').length,
    colorClass: 'bg-purple-500',
  },
  {
    id: 'driving',
    label: 'Driving',
    count: drivers.value.filter((item) => dutyStatus(item.currentStatus) === 'driving').length,
    colorClass: 'bg-green-500',
  },
  {
    id: 'onDuty',
    label: 'On Duty',
    count: drivers.value.filter((item) => dutyStatus(item.currentStatus) === 'onDuty').length,
    colorClass: 'bg-blue-500',
  },
])

const filteredDrivers = computed(() => {
  const term = search.value.trim().toLowerCase()
  return drivers.value.filter((driver) => {
    if (statusFilter.value !== 'all' && dutyStatus(driver.currentStatus) !== statusFilter.value)
      return false
    if (!term) return true
    return [driver.driverName, driver.email, driver.vehicleName, driver.vehicleVin]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(term))
  })
})

onMounted(() => document.addEventListener('fullscreenchange', handleFullscreenChange))

onBeforeUnmount(() => {
  trafficLayer.value?.setMap(null)
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
})

const locatedDrivers = computed(() => filteredDrivers.value.filter((driver) => driver.latestPoint))

function openDriver(driverId: string) {
  void router.push({ name: 'OverviewDetail', params: { id: driverId } })
}

function dutyStatus(value: string) {
  const status = value.replace(/[\s_-]/g, '').toUpperCase()
  if (status.includes('SLEEP') || status === 'SB') return 'sleeper'
  if (status.includes('DRIV') || status === 'D') return 'driving'
  if (status.includes('ONDUTY') || status === 'ON') return 'onDuty'
  return 'offDuty'
}

function handleMapReady(instance: any) {
  rawMap.value = instance?.map ?? instance
}

function toggleTraffic() {
  isTrafficActive.value = !isTrafficActive.value
  if (!rawMap.value || !(window as any).google?.maps) return
  if (!trafficLayer.value) trafficLayer.value = new (window as any).google.maps.TrafficLayer()
  trafficLayer.value.setMap(isTrafficActive.value ? rawMap.value : null)
}

async function toggleFullscreen() {
  if (!mapContainer.value) return
  if (document.fullscreenElement === mapContainer.value) await document.exitFullscreen()
  else await mapContainer.value.requestFullscreen()
}

function handleFullscreenChange() {
  isFullscreen.value = document.fullscreenElement === mapContainer.value
  nextTick(() => {
    const googleMaps = (window as any).google?.maps
    if (rawMap.value && googleMaps?.event) googleMaps.event.trigger(rawMap.value, 'resize')
  })
}

function statusLabel(value: string) {
  const normalized = value.replaceAll('_', ' ').trim()
  return normalized ? normalized.replace(/\b\w/g, (letter) => letter.toUpperCase()) : 'Unknown'
}

function statusColor(value: string) {
  const normalized = value.toUpperCase()
  if (normalized.includes('DRIVING')) return '#589e67'
  if (normalized.includes('SLEEP')) return '#954baf'
  if (normalized.includes('ON')) return '#6082e0'
  if (normalized.includes('PERSONAL')) return '#d28e3d'
  return '#af4b4b'
}

function connectionColor(value: string) {
  if (value === 'CONNECTED') return 'text-emerald-600'
  if (value === 'DISCONNECTED') return 'text-amber-500'
  return 'text-slate-400'
}

function initials(value: string) {
  return (
    value
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'D'
  )
}
</script>
