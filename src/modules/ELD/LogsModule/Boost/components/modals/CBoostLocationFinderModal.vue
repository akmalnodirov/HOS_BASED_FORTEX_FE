<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent
      class="flex max-h-[88vh] max-w-[min(940px,calc(100vw-24px))] flex-col gap-0 overflow-hidden p-0"
    >
      <DialogHeader class="shrink-0 border-b px-5 py-4">
        <DialogTitle class="flex items-center gap-2">
          <MapPin class="h-4 w-4 text-primary" /> Location finder
        </DialogTitle>
        <DialogDescription>
          Search an address or coordinates to find the 10 nearest active events in this session.
        </DialogDescription>
      </DialogHeader>

      <div class="shrink-0 space-y-3 border-b bg-muted/15 p-4">
        <div class="flex items-start gap-2">
          <CAlprLocationInput
            v-model="location"
            class="min-w-0 flex-1"
            placeholder="Search address or place"
            @select="selectSuggestion"
            @clear="clearSelectedLocation"
          />
          <Button class="h-10 shrink-0" :disabled="!canSearch || isSearching" @click="doSearch">
            <LoaderCircle v-if="isSearching" class="mr-2 h-4 w-4 animate-spin" />
            <Search v-else class="mr-2 h-4 w-4" />
            Search
          </Button>
        </div>

        <div class="flex items-end gap-2">
          <div class="grid min-w-0 flex-1 grid-cols-2 gap-2">
            <div>
              <Label for="boost-finder-latitude" class="mb-1 block text-xs">Latitude</Label>
              <Input
                id="boost-finder-latitude"
                v-model="latitude"
                inputmode="decimal"
                placeholder="34.914059"
                @update:model-value="clearResults"
              />
            </div>
            <div>
              <Label for="boost-finder-longitude" class="mb-1 block text-xs">Longitude</Label>
              <Input
                id="boost-finder-longitude"
                v-model="longitude"
                inputmode="decimal"
                placeholder="-82.111351"
                @update:model-value="clearResults"
              />
            </div>
          </div>
          <Button variant="outline" size="sm" :disabled="!coordinatesComplete" @click="copyCoords">
            <Copy class="mr-1.5 h-3.5 w-3.5" /> Copy
          </Button>
          <Button variant="outline" size="sm" @click="pasteCoords">
            <ClipboardPaste class="mr-1.5 h-3.5 w-3.5" /> Paste
          </Button>
        </div>
      </div>

      <div class="min-h-72 flex-1 overflow-auto">
        <div
          v-if="isSearching"
          class="flex min-h-72 items-center justify-center text-sm text-muted-foreground"
        >
          <LoaderCircle class="mr-2 h-5 w-5 animate-spin" /> Finding nearby events…
        </div>
        <div
          v-else-if="!hasSearched"
          class="flex min-h-72 flex-col items-center justify-center px-6 text-center"
        >
          <LocateFixed class="h-9 w-9 text-muted-foreground/60" />
          <p class="mt-3 text-sm font-medium">Choose a location to begin</p>
          <p class="mt-1 text-xs text-muted-foreground">
            Start typing an address and choose a suggestion, or enter coordinates.
          </p>
        </div>
        <div
          v-else-if="!searchResults.length"
          class="flex min-h-72 flex-col items-center justify-center px-6 text-center"
        >
          <MapPinOff class="h-9 w-9 text-muted-foreground/60" />
          <p class="mt-3 text-sm font-medium">No located active events</p>
          <p class="mt-1 text-xs text-muted-foreground">
            No session events with valid coordinates were found near this location.
          </p>
        </div>
        <table v-else class="w-full table-fixed text-left text-xs">
          <thead class="sticky top-0 z-10 bg-muted/95 text-muted-foreground backdrop-blur">
            <tr>
              <th class="w-12 px-3 py-2.5 text-center">#</th>
              <th class="w-20 px-2 py-2.5 font-medium">Seq ID</th>
              <th class="w-36 px-2 py-2.5 font-medium">Time</th>
              <th class="w-48 px-2 py-2.5 font-medium">Event</th>
              <th class="px-2 py-2.5 font-medium">Location</th>
              <th class="w-24 px-3 py-2.5 text-right font-medium">Distance</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, index) in searchResults"
              :key="row.eventId"
              class="cursor-pointer border-b transition-colors hover:bg-muted/50"
              @click="scrollToEvent(row.eventId)"
            >
              <td class="px-3 py-3 text-center font-semibold text-muted-foreground">
                {{ index + 1 }}
              </td>
              <td class="px-2 py-3 font-mono tabular-nums">
                {{ sequenceIdHexToDecimal(row.sequenceId) }}
              </td>
              <td class="px-2 py-3 tabular-nums">{{ formatTime(row.timestamp, row.timeZone) }}</td>
              <td class="px-2 py-3">
                <div class="truncate font-medium" :title="row.eventName">{{ row.eventName }}</div>
                <div v-if="row.eventCode" class="font-mono text-[10px] text-muted-foreground">
                  {{ row.eventCode }}
                </div>
              </td>
              <td class="px-2 py-3 text-muted-foreground">
                <div class="line-clamp-2" :title="row.location">{{ row.location || '—' }}</div>
              </td>
              <td class="px-3 py-3 text-right font-medium tabular-nums">
                {{ formatDistance(row.distanceMiles) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <DialogFooter class="shrink-0 border-t px-5 py-3 sm:justify-between">
        <span class="text-xs text-muted-foreground">Results: {{ searchResults.length }}</span>
        <Button variant="outline" @click="emit('update:open', false)">Close</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  ClipboardPaste,
  Copy,
  LoaderCircle,
  LocateFixed,
  MapPin,
  MapPinOff,
  Search,
} from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import CAlprLocationInput from '@/modules/AlprCamera/components/CAlprLocationInput.vue'
import type { AlprLocation } from '@/modules/AlprCamera/types'
import { useApi } from '@/composables/useAxiosService'
import { ApiEndpoints } from '@/api/endpoints'
import { useBoostWorkspaceStore } from '../../store/boostWorkspace'
import { resolveRouteEldScheduleTimeZone } from '../../composables/useScheduleBoost'

interface LocationResult {
  eventId: string
  sequenceId?: string | null
  eventCode?: string | null
  eventName: string
  timestamp: number
  timeZone?: string | null
  location: string
  distanceMiles: number
}

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{
  'update:open': [value: boolean]
  'scroll-to-event': [eventId: string]
}>()
const api = useApi()
const store = useBoostWorkspaceStore()
const location = ref('')
const latitude = ref('')
const longitude = ref('')
const isSearching = ref(false)
const hasSearched = ref(false)
const searchResults = ref<LocationResult[]>([])
const parsedLatitude = computed(() => parseCoordinate(latitude.value, -90, 90))
const parsedLongitude = computed(() => parseCoordinate(longitude.value, -180, 180))
const coordinatesComplete = computed(
  () => parsedLatitude.value !== null && parsedLongitude.value !== null
)
const coordinatesEmpty = computed(() => !latitude.value.trim() && !longitude.value.trim())
const canSearch = computed(
  () => coordinatesComplete.value || (coordinatesEmpty.value && location.value.trim().length > 0)
)

function parseCoordinate(value: string, minimum: number, maximum: number) {
  if (!value.trim()) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null
}
function clearResults() {
  hasSearched.value = false
  searchResults.value = []
}
function clearSelectedLocation() {
  latitude.value = ''
  longitude.value = ''
  clearResults()
}
function selectSuggestion(value: AlprLocation) {
  location.value = value.label
  latitude.value = String(value.latitude)
  longitude.value = String(value.longitude)
  clearResults()
  void doSearch()
}
async function doSearch() {
  const tabId = store.activeTabId
  const sessionId = store.session?.id
  if (!tabId || !sessionId || !canSearch.value) return
  isSearching.value = true
  try {
    const response = await api.post<any>(
      ApiEndpoints.ROUTE_ELD_EVENT_SESSION_LOCATION_FINDER(sessionId, tabId),
      {
        location: location.value.trim() || null,
        latitude: coordinatesComplete.value ? parsedLatitude.value : null,
        longitude: coordinatesComplete.value ? parsedLongitude.value : null,
      }
    )
    const result = response.data?.successResult ?? response.data
    searchResults.value = result?.events ?? []
    if (result?.location) location.value = result.location
    if (result?.latitude != null) latitude.value = String(result.latitude)
    if (result?.longitude != null) longitude.value = String(result.longitude)
    hasSearched.value = true
  } catch {
    toast.error('Nearby events could not be found')
  } finally {
    isSearching.value = false
  }
}
async function copyCoords() {
  if (!coordinatesComplete.value) return
  await navigator.clipboard.writeText(`${parsedLatitude.value}, ${parsedLongitude.value}`)
  toast.success('Coordinates copied')
}
async function pasteCoords() {
  try {
    const text = await navigator.clipboard.readText()
    const match = text.match(/^([+-]?\d*\.?\d+)\s*[^0-9+-]*\s*([+-]?\d*\.?\d+)/)
    if (!match) throw new Error('Clipboard does not contain coordinates')
    latitude.value = match[1]
    longitude.value = match[2]
    clearResults()
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Coordinates could not be pasted')
  }
}
function formatTime(timestamp: number, timeZone?: string | null) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: resolveRouteEldScheduleTimeZone(timeZone),
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp))
}
function formatDistance(value: number) {
  return `${value < 0.01 && value > 0 ? '<0.01' : value.toFixed(2)} mi`
}
function sequenceIdHexToDecimal(value?: string | null) {
  const normalized = value?.trim().replace(/^0x/i, '') ?? ''
  if (!normalized || !/^[0-9a-f]+$/i.test(normalized)) return value || '—'
  try {
    return BigInt(`0x${normalized}`).toString(10)
  } catch {
    return value || '—'
  }
}
function scrollToEvent(eventId: string) {
  emit('scroll-to-event', eventId)
  emit('update:open', false)
}
watch(
  () => props.open,
  (open) => {
    if (!open) return
    location.value = ''
    latitude.value = ''
    longitude.value = ''
    clearResults()
  }
)
</script>
