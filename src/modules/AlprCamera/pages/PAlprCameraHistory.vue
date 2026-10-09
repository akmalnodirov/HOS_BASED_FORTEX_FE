<template>
  <div
    class="flex min-h-[calc(100vh-65px)] flex-col bg-background transition-colors duration-300 lg:h-[calc(100vh-65px)]"
  >
    <div
      class="flex flex-col gap-3 bg-white px-4 py-4 dark:bg-card sm:px-6 lg:flex-row lg:items-center lg:justify-between"
    >
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <h1 class="text-xl font-semibold leading-7 text-foreground">ALPR Camera History</h1>
        <div class="relative w-full sm:w-[280px]">
          <Search
            class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#666] dark:text-muted-foreground"
          />
          <Input
            v-model="searchQuery"
            type="text"
            placeholder="Search routes"
            class="h-10 w-full rounded border-[#DBDBDB] pl-9 placeholder:text-[#666] dark:border-border dark:placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div class="flex items-center gap-2">
        <Button
          variant="outline"
          class="h-10 rounded border-[#DBDBDB] dark:border-border"
          :disabled="isFetching"
          @click="refetch()"
        >
          <RefreshCw :class="['h-4 w-4', isFetching && 'animate-spin']" />
          Refresh
        </Button>
        <Button class="h-10 rounded" @click="router.push('/alpr-camera/route')">
          <Route class="h-4 w-4" />
          New route
        </Button>
      </div>
    </div>

    <div class="relative flex-1 overflow-auto px-4 pb-4 sm:px-6">
      <div
        v-if="isError"
        class="flex h-full items-center justify-center text-red-600 dark:text-red-400"
      >
        Failed to load ALPR camera history.
      </div>

      <Table v-else>
        <TableHeader>
          <TableRow
            class="border-none bg-[#F0F0F0] hover:bg-[#F0F0F0] dark:bg-muted/50 dark:hover:bg-muted/50"
          >
            <TableHead
              class="h-10 px-3 py-2.5 text-sm font-semibold text-[#666] dark:text-muted-foreground"
            >
              Route
            </TableHead>
            <TableHead
              class="h-10 px-3 py-2.5 text-sm font-semibold text-[#666] dark:text-muted-foreground"
            >
              From
            </TableHead>
            <TableHead
              class="h-10 px-3 py-2.5 text-sm font-semibold text-[#666] dark:text-muted-foreground"
            >
              To
            </TableHead>
            <TableHead
              class="h-10 w-24 px-3 py-2.5 text-sm font-semibold text-[#666] dark:text-muted-foreground"
            >
              Routes
            </TableHead>
            <TableHead
              class="h-10 w-28 px-3 py-2.5 text-sm font-semibold text-[#666] dark:text-muted-foreground"
            >
              Cameras
            </TableHead>
            <TableHead
              class="h-10 w-44 px-3 py-2.5 text-sm font-semibold text-[#666] dark:text-muted-foreground"
            >
              Created
            </TableHead>
            <TableHead
              class="h-10 w-[100px] px-3 py-2.5 text-right text-sm font-semibold text-[#666] dark:text-muted-foreground"
            >
              Action
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <template v-if="isPending">
            <TableRow v-for="index in 8" :key="index">
              <TableCell class="px-3 py-3"><Skeleton class="h-4 w-40" /></TableCell>
              <TableCell class="px-3 py-3"><Skeleton class="h-4 w-44" /></TableCell>
              <TableCell class="px-3 py-3"><Skeleton class="h-4 w-44" /></TableCell>
              <TableCell class="px-3 py-3"><Skeleton class="h-4 w-10" /></TableCell>
              <TableCell class="px-3 py-3"><Skeleton class="h-6 w-12" /></TableCell>
              <TableCell class="px-3 py-3"><Skeleton class="h-4 w-32" /></TableCell>
              <TableCell class="px-3 py-3"><Skeleton class="ml-auto h-5 w-5" /></TableCell>
            </TableRow>
          </template>

          <template v-else-if="paginatedHistory.length">
            <TableRow
              v-for="item in paginatedHistory"
              :key="item.id"
              class="cursor-pointer border-b border-[#E6E6E6] bg-white transition-colors hover:bg-accent/40 dark:border-border dark:bg-card dark:hover:bg-accent/40"
              @click="openReport(item.id)"
            >
              <TableCell
                class="max-w-[260px] px-3 py-3 text-sm font-medium leading-4 text-[#090909] dark:text-foreground"
              >
                <div class="truncate" :title="displayRouteName(item)">
                  {{ displayRouteName(item) }}
                </div>
              </TableCell>
              <TableCell
                class="max-w-[300px] px-3 py-3 text-sm leading-4 text-[#222] dark:text-foreground/90"
              >
                <div class="flex items-center gap-2">
                  <MapPin class="h-4 w-4 shrink-0 text-primary" />
                  <span class="truncate" :title="item.originLabel">{{
                    shortLocationName(item.originLabel)
                  }}</span>
                </div>
              </TableCell>
              <TableCell
                class="max-w-[300px] px-3 py-3 text-sm leading-4 text-[#222] dark:text-foreground/90"
              >
                <div class="truncate" :title="item.destinationLabel">
                  {{ shortLocationName(item.destinationLabel) }}
                </div>
              </TableCell>
              <TableCell
                class="w-24 px-3 py-3 text-sm leading-4 text-[#222] dark:text-foreground/90"
              >
                {{ item.routeCount }}
              </TableCell>
              <TableCell class="w-28 px-3 py-2">
                <span
                  class="inline-flex min-w-9 items-center justify-center rounded bg-red-50 px-2 py-1 text-sm font-medium leading-4 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                >
                  {{ item.recommendedCameraCount ?? '—' }}
                </span>
              </TableCell>
              <TableCell
                class="w-44 whitespace-nowrap px-3 py-3 text-sm leading-4 text-[#222] dark:text-foreground/90"
              >
                {{ formatDate(item.createdAt) }}
              </TableCell>
              <TableCell class="w-[100px] px-3 py-2.5">
                <div class="flex items-center justify-end">
                  <Button
                    type="button"
                    title="View saved route"
                    variant="ghost"
                    size="icon-sm"
                    class="text-muted-foreground hover:text-foreground"
                    @click.stop="openReport(item.id)"
                  >
                    <Eye class="h-5 w-5" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          </template>

          <TableRow v-else>
            <TableCell
              colspan="7"
              class="bg-white py-12 text-center text-sm text-muted-foreground dark:bg-card"
            >
              {{ searchQuery ? 'No matching routes found' : 'No route history yet' }}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <div
      class="grid shrink-0 grid-cols-1 items-center gap-3 bg-white px-4 py-3 text-sm text-[#666] dark:bg-card dark:text-muted-foreground sm:px-6 sm:py-4 md:grid-cols-[auto_1fr_auto]"
    >
      <div class="flex items-center gap-3 justify-self-start">
        <span class="whitespace-nowrap text-sm">Display on page</span>
        <Select :model-value="String(itemsPerPage)" @update:model-value="changePageSize">
          <SelectTrigger class="!h-8 w-[72px] rounded border-[#DBDBDB] text-sm dark:border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
          </SelectContent>
        </Select>
        <span class="whitespace-nowrap text-sm">{{ formatCount(totalEntries) }} entries</span>
      </div>

      <div class="flex items-center gap-1 overflow-x-auto justify-self-center">
        <Button
          v-for="(page, index) in pageNumbers"
          :key="index"
          :disabled="page === '...'"
          :variant="page === currentPage ? 'default' : 'ghost'"
          size="icon-sm"
          class="min-w-8 shrink-0 text-sm font-medium"
          @click="typeof page === 'number' && goToPage(page)"
        >
          {{ page }}
        </Button>
      </div>

      <div class="flex items-center gap-3 justify-self-end">
        <span class="whitespace-nowrap text-sm">
          {{ formatCount(currentPage) }} of {{ formatCount(displayTotalPages) }} pages
        </span>
        <div class="flex gap-1">
          <Button
            variant="outline"
            size="icon"
            class="h-8 w-8 rounded border-[#DBDBDB] dark:border-border"
            :disabled="currentPage === 1"
            @click="previousPage"
          >
            <ChevronLeft class="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            class="h-8 w-8 rounded border-[#DBDBDB] dark:border-border"
            :disabled="currentPage >= totalPages"
            @click="nextPage"
          >
            <ChevronRight class="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>

    <Dialog v-model:open="dialogOpen">
      <DialogContent class="flex h-[min(88vh,820px)] max-w-6xl flex-col overflow-hidden p-0">
        <DialogHeader class="shrink-0 border-b border-border px-5 py-4 pr-12">
          <DialogTitle>{{ detailDisplayName }}</DialogTitle>
          <DialogDescription v-if="detail" class="space-y-2 pt-0.5">
            <span class="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs">
              <span class="inline-flex items-center gap-1.5">
                <CalendarDays class="h-3.5 w-3.5" />
                {{ formatDate(detail.createdAt) }}
              </span>
              <span class="inline-flex items-center gap-1.5">
                <Route class="h-3.5 w-3.5" />
                {{ detail.routes.length }} routes
              </span>
              <span class="inline-flex items-center gap-1.5">
                <Camera class="h-3.5 w-3.5" />
                {{ detailCameraCount }} cameras
              </span>
              <span v-if="detail.stops.length" class="inline-flex items-center gap-1.5">
                <MapPin class="h-3.5 w-3.5" />
                {{ detail.stops.length }} {{ detail.stops.length === 1 ? 'stop' : 'stops' }}
              </span>
            </span>
            <span
              class="flex min-w-0 items-center gap-1.5 text-xs"
              :title="`${detail.originLabel} → ${detail.destinationLabel}`"
            >
              <MapPin class="h-3.5 w-3.5 shrink-0 text-primary" />
              <span class="truncate">
                {{ shortLocationName(detail.originLabel) }} →
                {{ shortLocationName(detail.destinationLabel) }}
              </span>
            </span>
          </DialogDescription>
        </DialogHeader>

        <div v-if="detailPending" class="flex flex-1 items-center justify-center">
          <LoaderCircle class="h-7 w-7 animate-spin text-primary" />
        </div>

        <div v-else-if="detail" class="flex min-h-0 flex-1 flex-col lg:flex-row">
          <div
            class="max-h-[34vh] shrink-0 overflow-y-auto border-b border-border p-4 lg:max-h-none lg:w-[310px] lg:border-b-0 lg:border-r"
          >
            <div class="mb-3 flex items-center justify-between">
              <h3 class="text-sm font-semibold text-foreground">Saved routes</h3>
              <span class="text-xs text-muted-foreground">{{ detail.routes.length }}</span>
            </div>

            <button
              v-for="(route, index) in detail.routes"
              :key="`${route.label}-${index}`"
              type="button"
              class="mb-3 w-full rounded-md border p-3 text-left transition-colors"
              :class="
                selectedRouteIndex === index
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-accent/40'
              "
              @click="selectedRouteIndex = index"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <div class="truncate text-sm font-semibold text-foreground">
                    {{ route.label }}
                  </div>
                  <div class="mt-1 text-xs text-muted-foreground">
                    {{ formatMiles(route.distanceMetres) }} mi ·
                    {{ formatDuration(route.durationSeconds) }}
                  </div>
                </div>
                <span
                  class="rounded bg-red-50 px-2 py-1 text-sm font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-400"
                >
                  {{ route.cameraCount }}
                </span>
              </div>
              <p class="mt-2 truncate text-xs text-muted-foreground">
                via {{ route.roadSummary || 'provider route' }}
              </p>
            </button>
          </div>

          <div class="min-h-[360px] flex-1">
            <div
              v-if="!detailMapReady"
              class="flex h-full min-h-[360px] items-center justify-center bg-muted"
            >
              <div class="flex items-center gap-2 text-sm text-muted-foreground">
                <LoaderCircle class="h-5 w-5 animate-spin text-primary" />
                Preparing map...
              </div>
            </div>
            <CAlprRouteMap
              v-else
              :routes="detail.routes"
              :selected-index="selectedRouteIndex"
              :origin="detailOrigin"
              :destination="detailDestination"
              :stops="detailStops"
              @select-route="selectedRouteIndex = $event"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  CalendarDays,
  Camera,
  ChevronLeft,
  ChevronRight,
  Eye,
  LoaderCircle,
  MapPin,
  RefreshCw,
  Route,
  Search,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { usePagination } from '@/composables/usePagination'
import { useTimeZoneHelper } from '@/composables/useTimezone'
import CAlprRouteMap from '../components/CAlprRouteMap.vue'
import {
  useAlprCameraHistory,
  useAlprCameraHistoryDetail,
} from '../composables/useAlprCameraRoutes'
import type { AlprCameraRouteHistoryItem, AlprLocation } from '../types'

const router = useRouter()
const { formatToTimeZone } = useTimeZoneHelper()
const searchQuery = ref('')
const selectedId = ref<string | null>(null)
const dialogOpen = ref(false)
const selectedRouteIndex = ref(0)
const detailMapReady = ref(false)
let detailMapMountVersion = 0

const { data: historyData, isPending, isFetching, isError, refetch } = useAlprCameraHistory()
const { data: detail, isPending: detailPending } = useAlprCameraHistoryDetail(selectedId)

const history = computed(() => historyData.value ?? [])
const filteredHistory = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return history.value
  return history.value.filter((item) =>
    [item.name, item.originLabel, item.destinationLabel].some((value) =>
      value.toLowerCase().includes(query)
    )
  )
})
const totalCount = computed(() => filteredHistory.value.length)
const {
  currentPage,
  itemsPerPage,
  totalPages,
  totalEntries,
  pageNumbers,
  goToPage,
  nextPage,
  previousPage,
  paginateData,
  resetPage,
} = usePagination(totalCount, { itemsPerPage: 10 })
const paginatedHistory = computed(() => paginateData(filteredHistory.value))
const displayTotalPages = computed(() => Math.max(totalPages.value, 1))

const detailOrigin = computed<AlprLocation | null>(() =>
  detail.value
    ? {
        label: detail.value.originLabel,
        longitude: detail.value.originLongitude,
        latitude: detail.value.originLatitude,
      }
    : null
)
const detailDestination = computed<AlprLocation | null>(() =>
  detail.value
    ? {
        label: detail.value.destinationLabel,
        longitude: detail.value.destinationLongitude,
        latitude: detail.value.destinationLatitude,
      }
    : null
)
const detailStops = computed<AlprLocation[]>(() =>
  (detail.value?.stops ?? [])
    .filter(
      (coordinates) =>
        coordinates.length >= 2 &&
        Number.isFinite(coordinates[0]) &&
        Number.isFinite(coordinates[1])
    )
    .map((coordinates, index) => ({
      label: `Stop ${index + 1}`,
      longitude: coordinates[0],
      latitude: coordinates[1],
    }))
)
const detailDisplayName = computed(() => {
  if (!detail.value) return 'Route history'
  return displayName(detail.value.name, detail.value.originLabel, detail.value.destinationLabel)
})
const detailCameraCount = computed(
  () => detail.value?.routes[selectedRouteIndex.value]?.cameraCount ?? 0
)

function openReport(id: string) {
  selectedId.value = id
  selectedRouteIndex.value = 0
  dialogOpen.value = true
}

function displayRouteName(item: AlprCameraRouteHistoryItem) {
  return displayName(item.name, item.originLabel, item.destinationLabel)
}

function displayName(name: string, origin: string, destination: string) {
  if (name.length <= 55 && !name.includes('→')) return name
  return `${shortLocationName(origin)} → ${shortLocationName(destination)}`
}

function shortLocationName(value: string) {
  const parts = value
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part && part.toLowerCase() !== 'united states')
  if (!parts.length) return 'Location'
  const first = parts[0]
  const combined =
    parts.length > 1 && (first.length <= 4 || /^\d+$/.test(first)) ? `${first} ${parts[1]}` : first
  return combined.length <= 40 ? combined : `${combined.slice(0, 37).trim()}...`
}

function changePageSize(value: unknown) {
  itemsPerPage.value = Number(value)
  resetPage()
}

function formatDate(value: string) {
  return formatToTimeZone(value, 'MMM D, YYYY h:mm A')
}

function formatCount(value: number) {
  return new Intl.NumberFormat('en-US').format(value)
}

function formatMiles(metres: number) {
  return (metres / 1609.344).toFixed(1)
}

function formatDuration(seconds: number) {
  const totalMinutes = Math.round(seconds / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`
}

watch(searchQuery, resetPage)

watch(
  () => detail.value?.id,
  (id) => {
    const recommended = detail.value?.routes.findIndex((route) => route.isRecommended) ?? -1
    selectedRouteIndex.value = Math.max(recommended, 0)
    detailMapReady.value = false
    const version = ++detailMapMountVersion
    if (!id) return
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (version === detailMapMountVersion && dialogOpen.value) detailMapReady.value = true
      })
    })
  }
)

watch(dialogOpen, (open) => {
  if (!open) {
    detailMapMountVersion += 1
    detailMapReady.value = false
    selectedId.value = null
  }
})
</script>
