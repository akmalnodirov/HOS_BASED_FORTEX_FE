<template>
  <div
    class="flex h-[calc(100vh-65px)] min-h-0 flex-col overflow-hidden bg-white p-[16px_24px] dark:bg-background"
  >
    <div class="mb-4 flex flex-none flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <div>
        <h1 class="text-xl font-semibold text-foreground">Weight stations</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Route ELD station directory used for driver proximity alerts
        </p>
      </div>
      <div class="flex flex-col sm:flex-row gap-2 w-full xl:w-auto">
        <div class="relative w-full sm:w-[260px]">
          <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input v-model="searchDraft" class="h-10 pl-9" placeholder="Search station or location" />
        </div>
        <Input
          v-model="stateCode"
          list="route-eld-state-shortcuts"
          class="h-10 w-full sm:w-40"
          placeholder="State or code"
        />
        <datalist id="route-eld-state-shortcuts">
          <template v-for="state in US_STATES" :key="state.code">
            <option :value="state.name">{{ state.code }}</option>
            <option :value="state.code">{{ state.name }}</option>
          </template>
        </datalist>
        <Select v-model="marker">
          <SelectTrigger class="h-10 w-full sm:w-36">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="Fixed">Fixed</SelectItem>
            <SelectItem value="Mobile">Mobile</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" class="h-10" :disabled="isFetching" @click="refetch()">
          <RefreshCw :class="['h-4 w-4 mr-2', isFetching && 'animate-spin']" />
          Refresh
        </Button>
      </div>
    </div>

    <div class="mb-3 grid flex-none grid-cols-1 gap-3 sm:grid-cols-3">
      <div class="rounded-lg border border-border bg-card px-4 py-3">
        <div class="text-xs text-muted-foreground">Stations found</div>
        <div class="text-2xl font-semibold">{{ page?.pagination.totalCount ?? 0 }}</div>
      </div>
      <div class="rounded-lg border border-border bg-card px-4 py-3">
        <div class="text-xs text-muted-foreground">Fixed on this page</div>
        <div class="text-2xl font-semibold text-green-700 dark:text-green-400">
          {{ fixedCount }}
        </div>
      </div>
      <div class="rounded-lg border border-border bg-card px-4 py-3">
        <div class="text-xs text-muted-foreground">Mobile on this page</div>
        <div class="text-2xl font-semibold text-orange-700 dark:text-orange-400">
          {{ mobileCount }}
        </div>
      </div>
    </div>

    <div class="mb-3 flex flex-none flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
      <span class="inline-flex items-center gap-1.5">
        <span class="h-2.5 w-2.5 rounded-full bg-[#589E67]"></span>
        <strong class="font-medium text-foreground">Fixed:</strong> permanent inspection facility
      </span>
      <span class="inline-flex items-center gap-1.5">
        <span class="h-2.5 w-2.5 rounded-full bg-[#D28E3D]"></span>
        <strong class="font-medium text-foreground">Mobile:</strong> portable or temporary
        inspection location
      </span>
      <span>Type does not indicate whether a station is currently open.</span>
    </div>

    <div ref="mapSectionEl" class="mb-3 shrink-0">
      <div
        ref="mapContainerEl"
        :class="[
          'relative overflow-hidden bg-muted',
          isMapFullscreen
            ? 'h-screen w-screen rounded-none border-0'
            : 'h-[320px] rounded-lg border border-border',
        ]"
      >
        <div
          v-if="!apiKey"
          class="h-full flex items-center justify-center text-sm text-muted-foreground bg-muted/30"
        >
          Google Maps API key is not configured.
        </div>
        <template v-else>
          <div
            class="absolute left-3 top-3 z-10 rounded-md bg-white/95 dark:bg-card/95 px-3 py-2 shadow"
          >
            <div class="text-sm font-medium">All matching stations</div>
            <div class="text-xs text-muted-foreground">
              <template v-if="stationClustersFetching">Loading map clusters…</template>
              <template v-else-if="stationClustersError">Unable to load map clusters</template>
              <template v-else>
                {{ page?.pagination.totalCount ?? 0 }} stations · click a cluster to zoom
              </template>
            </div>
          </div>
          <div class="absolute right-3 top-3 z-10 flex items-center gap-2">
            <CWeightStationMapTypeControl v-model="mapTypeId" :get-map="getStationMap" />
            <button
              type="button"
              title="Toggle fullscreen"
              class="flex h-10 w-10 items-center justify-center rounded-md bg-white text-gray-700 shadow-md transition-colors hover:bg-gray-50 dark:bg-card dark:text-foreground dark:hover:bg-muted"
              @click="toggleMapFullscreen"
            >
              <Minimize v-if="isMapFullscreen" class="h-5 w-5" />
              <Maximize v-else class="h-5 w-5" />
            </button>
          </div>
          <GoogleMap
            ref="stationMapRef"
            :api-key="apiKey"
            :styles="mapStyles"
            :center="mapCenter"
            :zoom="4"
            :map-type-id="mapTypeId"
            :disable-default-ui="true"
            :street-view-control="true"
            style="width: 100%; height: 100%"
            @ready="onMapReady"
            @idle="scheduleClusterRefresh"
          >
            <CustomMarker
              v-for="cluster in visibleStationClusters"
              :key="clusterKey(cluster)"
              :options="{
                position: { lat: cluster.latitude, lng: cluster.longitude },
                anchorPoint: 'CENTER',
              }"
            >
              <button
                v-if="cluster.count > 1"
                type="button"
                class="flex items-center justify-center rounded-full border-2 border-white bg-orange-500 font-semibold text-white shadow-lg transition-transform hover:scale-110"
                :style="stationClusterStyle(cluster.count)"
                @click.stop="focusStationCluster(cluster)"
              >
                {{ formatClusterCount(cluster.count) }}
              </button>
              <button
                v-else
                type="button"
                class="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-white shadow-md transition-transform hover:scale-110"
                :style="{ backgroundColor: stationClusterColor(cluster) }"
                @click.stop="focusStationCluster(cluster)"
              >
                <Scale class="h-4 w-4" />
              </button>
            </CustomMarker>

            <CustomMarker
              v-if="selectedStation"
              :options="{
                position: { lat: selectedStation.latitude, lng: selectedStation.longitude },
                anchorPoint: 'CENTER',
              }"
            >
              <div class="relative cursor-pointer">
                <div
                  class="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white text-white shadow-lg ring-2 ring-primary/30"
                  :style="{ backgroundColor: stationColor(selectedStation) }"
                >
                  <Scale class="h-5 w-5" />
                </div>
                <div
                  class="absolute bottom-full left-1/2 z-50 mb-3 min-w-[240px] -translate-x-1/2 cursor-default rounded-lg border border-gray-200 bg-white shadow-xl dark:border-border dark:bg-card"
                  @click.stop
                >
                  <div class="space-y-2 px-4 py-3 text-xs">
                    <button
                      type="button"
                      title="Close"
                      class="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                      @click.stop="closeStationInfo"
                    >
                      <X class="h-4 w-4" />
                    </button>
                    <div class="border-b border-border pb-2 pr-6 text-sm font-semibold">
                      {{ selectedStation.name || 'Unnamed station' }}
                    </div>
                    <div class="flex justify-between gap-4">
                      <span class="text-muted-foreground">Location</span>
                      <span class="max-w-[150px] text-right">{{
                        selectedStation.location || '—'
                      }}</span>
                    </div>
                    <div class="flex justify-between gap-4">
                      <span class="text-muted-foreground">Direction</span>
                      <span>{{ selectedStation.direction || '—' }}</span>
                    </div>
                    <div class="flex justify-between gap-4">
                      <span class="text-muted-foreground">Type</span>
                      <span>{{ selectedStation.type || '—' }}</span>
                    </div>
                  </div>
                  <div
                    class="absolute -bottom-2 left-1/2 h-0 w-0 -translate-x-1/2 border-[8px] border-transparent border-t-white dark:border-t-card"
                  ></div>
                </div>
              </div>
            </CustomMarker>
          </GoogleMap>
        </template>
      </div>
    </div>

    <div
      class="min-h-0 flex-1 overflow-auto rounded-lg border border-border bg-card [&>div]:overflow-visible"
    >
      <div
        v-if="isError"
        class="flex h-32 items-center justify-center px-4 text-center text-sm text-red-600 dark:text-red-400"
      >
        Weight stations could not be loaded. Check your access and try again.
      </div>
      <Table v-else>
        <TableHeader class="sticky top-0 z-20 bg-muted">
          <TableRow class="bg-muted hover:bg-muted">
            <TableHead class="w-14">No</TableHead>
            <TableHead>Station</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>State</TableHead>
            <TableHead>Direction</TableHead>
            <!-- <TableHead>Marker</TableHead> -->
            <TableHead>Type</TableHead>
            <TableHead>Coordinates</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <template v-if="isPending">
            <TableRow v-for="index in 8" :key="index">
              <TableCell v-for="column in 7" :key="column"><Skeleton class="h-4 w-20" /></TableCell>
            </TableRow>
          </template>
          <TableRow
            v-for="(station, index) in page?.data ?? []"
            v-else
            :key="station.id"
            :class="[
              'cursor-pointer transition-colors',
              activeStationId === station.id
                ? 'bg-blue-50 hover:bg-blue-50 dark:bg-blue-950/20 dark:hover:bg-blue-950/20'
                : '',
            ]"
            @click="focusStation(station)"
          >
            <TableCell class="text-muted-foreground">{{ rowNumber(index) }}</TableCell>
            <TableCell class="font-medium">{{ station.name || 'Unnamed station' }}</TableCell>
            <TableCell class="max-w-[320px] truncate" :title="station.location ?? ''">
              <div class="flex items-center gap-2">
                <MapPin class="h-4 w-4 shrink-0 text-muted-foreground" />
                <span>{{ station.location || '—' }}</span>
              </div>
            </TableCell>
            <TableCell>{{ station.stateCode || '—' }}</TableCell>
            <TableCell>{{ station.direction || '—' }}</TableCell>
            <!-- <TableCell>
              <span :class="markerClass()">{{ station.marker || 'Unknown' }}</span>
            </TableCell> -->
            <TableCell>
              <span :class="typeClass(station.type)">{{ station.type || 'Unknown' }}</span>
            </TableCell>
            <TableCell class="text-xs whitespace-nowrap">
              <a
                :href="`https://www.google.com/maps?q=${station.latitude},${station.longitude}`"
                target="_blank"
                rel="noopener noreferrer"
                class="text-blue-500 hover:text-blue-600 hover:underline dark:text-blue-400"
                @click.stop
              >
                {{ stationAddress(station) ?? stationCoordinates(station) }}
              </a>
              <button
                v-if="!stationAddress(station)"
                type="button"
                class="ml-1.5 text-xs font-medium text-primary hover:underline disabled:opacity-60"
                :disabled="stationAddressLoading(station)"
                @click.stop="revealStation(station)"
              >
                {{ stationAddressLoading(station) ? '…' : 'Show address' }}
              </button>
            </TableCell>
          </TableRow>
          <TableRow v-if="!isPending && !page?.data.length">
            <TableCell colspan="7" class="h-32 text-center text-muted-foreground">
              No weigh stations match the selected filters.
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <div class="flex flex-none flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-3 text-sm text-muted-foreground">
        <span>{{ page?.pagination.totalCount ?? 0 }} entries</span>
        <Select :model-value="String(pageSize)" @update:model-value="changePageSize">
          <SelectTrigger class="h-8 w-20"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-sm text-muted-foreground">
          {{ page?.pagination.pageNumber ?? 1 }} of
          {{ Math.max(page?.pagination.totalPages ?? 1, 1) }} pages
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
          :disabled="pageNumber >= (page?.pagination.totalPages ?? 1)"
          @click="pageNumber++"
        >
          <ChevronRight class="h-4 w-4" />
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Maximize,
  Minimize,
  RefreshCw,
  Scale,
  Search,
  X,
} from 'lucide-vue-next'
import { CustomMarker, GoogleMap } from 'vue3-google-map'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import CWeightStationMapTypeControl from '../components/CWeightStationMapTypeControl.vue'
import { useWeightStationAddressReveal } from '../composables/useWeightStationAddressReveal'
import { mapStyles } from '@/utils/maps'
import { US_STATES } from '../usStates'
import { useWeightStationClusters, useWeightStations } from '../composables/useWeightStations'
import type { WeightStation, WeightStationCluster } from '../types'

const searchDraft = ref('')
const search = ref('')
const stateCode = ref('')
const marker = ref('all')
const pageNumber = ref(1)
const pageSize = ref(25)
const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
const stationMapRef = ref<any>(null)
const mapSectionEl = ref<HTMLElement | null>(null)
const mapContainerEl = ref<HTMLElement | null>(null)
const mapCenter = ref({ lat: 39.5, lng: -98.35 })
const mapTypeId = ref('roadmap')
const mapReady = ref(false)
const isMapFullscreen = ref(false)
const activeStationId = ref<string | null>(null)
const selectedStation = ref<WeightStation | null>(null)
const mapViewport = ref<{
  west: number
  south: number
  east: number
  north: number
  zoom: number
} | null>(null)
const { address, isLoading: isAddressLoading, reveal } = useWeightStationAddressReveal()
let searchTimer: ReturnType<typeof setTimeout> | null = null
let clusterRefreshTimer: ReturnType<typeof setTimeout> | null = null
let stationRawMap: any = null

watch(searchDraft, (value) => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    search.value = value.trim()
    pageNumber.value = 1
  }, 300)
})

watch([stateCode, marker], () => {
  pageNumber.value = 1
})

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer)
  if (clusterRefreshTimer) clearTimeout(clusterRefreshTimer)
  document.removeEventListener('fullscreenchange', syncMapFullscreen)
})

onMounted(() => document.addEventListener('fullscreenchange', syncMapFullscreen))

function toStateCode(input: string): string {
  const v = input.trim()
  if (!v) return ''
  const lower = v.toLowerCase()
  const byCode = US_STATES.find((s) => s.code.toLowerCase() === lower)
  if (byCode) return byCode.code
  const byName = US_STATES.find((s) => s.name.toLowerCase() === lower)
  if (byName) return byName.code
  return v
}

const resolvedStateCode = computed(() => toStateCode(stateCode.value))

const filters = computed(() => ({
  search: search.value,
  stateCode: resolvedStateCode.value,
  marker: marker.value === 'all' ? '' : marker.value,
  pageNumber: pageNumber.value,
  pageSize: pageSize.value,
}))

const { data: page, isPending, isFetching, isError, refetch } = useWeightStations(filters)
const visibleStations = computed(() => page.value?.data ?? [])
const clusterFilters = computed(() => {
  if (!mapViewport.value) return null
  return {
    search: search.value,
    stateCode: resolvedStateCode.value,
    marker: marker.value === 'all' ? '' : marker.value,
    ...mapViewport.value,
  }
})
const {
  data: stationClusters,
  isFetching: stationClustersFetching,
  isError: stationClustersError,
} = useWeightStationClusters(clusterFilters)
const visibleStationClusters = computed(() =>
  (stationClusters.value ?? []).filter(
    (cluster) => cluster.stationId == null || cluster.stationId !== activeStationId.value
  )
)
const fixedCount = computed(
  () => visibleStations.value.filter((item) => item.type === 'Fixed').length
)
const mobileCount = computed(
  () => visibleStations.value.filter((item) => item.type === 'Mobile').length
)

const getStationMap = () => stationMapRef.value?.map ?? stationRawMap ?? null

watch(
  () => stationMapRef.value?.ready || !!stationMapRef.value?.map,
  (ready) => {
    if (!ready) return
    mapReady.value = true
    scheduleClusterRefresh()
  },
  { immediate: true }
)

function onMapReady(instance: any) {
  stationRawMap = instance
  mapReady.value = true
  refreshClusterViewport()
}

async function toggleMapFullscreen() {
  const element = mapContainerEl.value
  if (!element) return
  if (!document.fullscreenElement) await element.requestFullscreen().catch(() => {})
  else await document.exitFullscreen().catch(() => {})
}

function syncMapFullscreen() {
  isMapFullscreen.value = document.fullscreenElement === mapContainerEl.value
  void nextTick().then(() => {
    const map = getStationMap()
    const googleMaps = (window as any).google?.maps
    if (map && googleMaps?.event) googleMaps.event.trigger(map, 'resize')
    scheduleClusterRefresh()
  })
}

function scheduleClusterRefresh() {
  if (clusterRefreshTimer) clearTimeout(clusterRefreshTimer)
  clusterRefreshTimer = setTimeout(() => {
    clusterRefreshTimer = null
    refreshClusterViewport()
  }, 300)
}

function refreshClusterViewport() {
  const map = getStationMap()
  const bounds = map?.getBounds?.()
  if (!mapReady.value || !map || !bounds) return

  const southwest = bounds.getSouthWest()
  const northeast = bounds.getNorthEast()
  const round = (value: number) => Number(value.toFixed(4))
  let west = round(Math.max(-180, southwest.lng()))
  let east = round(Math.min(180, northeast.lng()))
  const south = round(Math.max(-90, southwest.lat()))
  const north = round(Math.min(90, northeast.lat()))
  if (west >= east) {
    west = -180
    east = 180
  }
  if (south >= north) return
  const zoom = Math.max(0, Math.min(22, Math.floor(map.getZoom?.() ?? 4)))
  const cached = mapViewport.value
  if (
    cached?.zoom === zoom &&
    west >= cached.west &&
    east <= cached.east &&
    south >= cached.south &&
    north <= cached.north
  ) {
    return
  }

  const longitudeBuffer = (east - west) * 0.25
  const latitudeBuffer = (north - south) * 0.25
  mapViewport.value = {
    west: round(Math.max(-180, west - longitudeBuffer)),
    south: round(Math.max(-90, south - latitudeBuffer)),
    east: round(Math.min(180, east + longitudeBuffer)),
    north: round(Math.min(90, north + latitudeBuffer)),
    zoom,
  }
}

function flyTo(target: { lat: number; lng: number }, endZoom = 12) {
  const map = getStationMap()
  if (!map) return
  map.panTo(target)
  map.setZoom(endZoom)
  mapCenter.value = target
}

function focusStation(station: WeightStation) {
  activeStationId.value = station.id
  selectedStation.value = station
  mapSectionEl.value?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  flyTo({ lat: station.latitude, lng: station.longitude })
}

function closeStationInfo() {
  activeStationId.value = null
  selectedStation.value = null
}

function focusStationCluster(cluster: WeightStationCluster) {
  if (cluster.count > 1) {
    const map = getStationMap()
    if (!map) return
    map.panTo({ lat: cluster.latitude, lng: cluster.longitude })
    map.setZoom(Math.min((map.getZoom?.() ?? mapViewport.value?.zoom ?? 4) + 2, 18))
    return
  }

  const station = stationFromCluster(cluster)
  if (station) focusStation(station)
}

function stationFromCluster(cluster: WeightStationCluster): WeightStation | null {
  if (!cluster.stationId) return null
  return {
    id: cluster.stationId,
    name: cluster.name,
    stateCode: cluster.stateCode,
    location: cluster.location,
    direction: cluster.direction,
    marker: cluster.marker,
    type: cluster.type,
    latitude: cluster.latitude,
    longitude: cluster.longitude,
  }
}

function stationClusterColor(cluster: WeightStationCluster) {
  if (cluster.type === 'Fixed') return '#589E67'
  if (cluster.type === 'Mobile') return '#D28E3D'
  return '#6082E0'
}

function stationClusterStyle(count: number) {
  const size = Math.min(54, 34 + Math.log2(Math.max(count, 2)) * 4)
  return { width: `${size}px`, height: `${size}px`, fontSize: size > 44 ? '12px' : '11px' }
}

function formatClusterCount(count: number) {
  return count >= 1000 ? `${(count / 1000).toFixed(count >= 10_000 ? 0 : 1)}k` : String(count)
}

function clusterKey(cluster: WeightStationCluster) {
  return cluster.clusterId
}

function stationColor(station: WeightStation) {
  if (station.type === 'Fixed') return '#589E67'
  if (station.type === 'Mobile') return '#D28E3D'
  return '#6082E0'
}

function stationCoordinates(station: WeightStation) {
  return `${station.latitude.toFixed(5)}, ${station.longitude.toFixed(5)}`
}

function stationAddress(station: WeightStation) {
  return address(station.latitude, station.longitude)
}

function stationAddressLoading(station: WeightStation) {
  return isAddressLoading(station.latitude, station.longitude)
}

function revealStation(station: WeightStation) {
  reveal(station.latitude, station.longitude)
}

function rowNumber(index: number) {
  return (pageNumber.value - 1) * pageSize.value + index + 1
}

function changePageSize(value: unknown) {
  pageSize.value = Number(value)
  pageNumber.value = 1
}

function markerClass() {
  return 'inline-flex rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 dark:bg-muted dark:text-muted-foreground'
}

function typeClass(value: string | null) {
  return [
    'inline-flex rounded px-2 py-1 text-xs font-medium',
    value === 'Fixed'
      ? 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400'
      : value === 'Mobile'
        ? 'bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400'
        : 'bg-gray-100 text-gray-600 dark:bg-muted dark:text-muted-foreground',
  ]
}
</script>
