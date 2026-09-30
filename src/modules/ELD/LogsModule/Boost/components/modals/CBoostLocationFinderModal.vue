<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="sm:max-w-[1100px] p-0 gap-0 overflow-hidden bg-white dark:bg-background border shadow-lg">
      <!-- Header -->
      <div class="px-6 py-5 flex items-center justify-between bg-[#F0F0F0] dark:bg-muted border-b border-[#dbdbdb] dark:border-border">
        <h2 class="text-2xl font-normal text-[#090909] dark:text-foreground">Location finder</h2>
      </div>

      <!-- Main Body -->
      <div class="p-6">
        <div class="grid grid-cols-1 md:grid-cols-12 gap-5 h-[500px]">
          <!-- Left: Map -->
          <div class="md:col-span-6 rounded-lg border border-[#DBDBDB] dark:border-border overflow-hidden shadow-sm">
            <GoogleMap
              :api-key="apiKey"
              :center="mapCenter"
              :zoom="mapZoom"
              style="width: 100%; height: 100%"
              :styles="mapStyles"
              :disable-default-ui="true"
            >
              <Marker
                v-for="event in searchResults"
                :key="event.id"
                :options="{ position: { lat: event.latitude, lng: event.longitude }, title: event.location }"
              />
            </GoogleMap>
          </div>

          <!-- Right: Inputs & Table -->
          <div class="md:col-span-6 flex flex-col gap-4">
            <!-- Inputs -->
            <div class="space-y-3">
              <!-- Location search -->
              <div class="flex gap-2">
                <Input
                  v-model="searchForm.calculatedLocation"
                  placeholder="Enter location"
                  class="flex-1"
                  @keydown.enter="doSearch"
                />
                <Button :disabled="isSearching" @click="doSearch" class="shrink-0">
                  <Loader2 v-if="isSearching" class="h-4 w-4 animate-spin mr-1" />
                  <Search v-else class="h-4 w-4 mr-1" />
                  Search
                </Button>
              </div>

              <!-- Lat / Lng -->
              <div class="grid grid-cols-2 gap-3">
                <Input
                  type="number"
                  step="0.000001"
                  v-model.number="searchForm.latitude"
                  placeholder="Latitude"
                />
                <Input
                  type="number"
                  step="0.000001"
                  v-model.number="searchForm.longitude"
                  placeholder="Longitude"
                />
              </div>

              <!-- Copy / Paste -->
              <div class="flex justify-end gap-2">
                <Button variant="outline" class="h-9 px-6 bg-[#F0F0F0] dark:bg-muted border-none text-sm" @click="copyCoords">
                  <Copy class="w-4 h-4 mr-1" /> Copy
                </Button>
                <Button variant="ghost" class="h-9 px-6 bg-[#F0F0F0] dark:bg-muted border-none text-sm" @click="pasteCoords">
                  <ClipboardPaste class="w-4 h-4 mr-1" /> Paste
                </Button>
              </div>
            </div>

            <!-- Results Table -->
            <div class="flex-1 flex flex-col overflow-hidden border border-[#DBDBDB] dark:border-border rounded">
              <!-- Header -->
              <div class="bg-[#F0F0F0] dark:bg-muted/50 shrink-0">
                <div class="grid grid-cols-[110px_1fr_1fr_90px] gap-2 px-4 py-2">
                  <span class="text-[13px] font-normal text-[#666666] dark:text-muted-foreground">Time</span>
                  <span class="text-[13px] font-normal text-[#666666] dark:text-muted-foreground">Event</span>
                  <span class="text-[13px] font-normal text-[#666666] dark:text-muted-foreground">Location</span>
                  <span class="text-[13px] font-normal text-right text-[#666666] dark:text-muted-foreground">Distance</span>
                </div>
              </div>
              <!-- Rows -->
              <div class="flex-1 overflow-auto">
                <div v-if="!searchResults.length" class="flex items-center justify-center h-full text-sm text-muted-foreground">
                  {{ isSearching ? 'Searching...' : 'No results. Enter location and search.' }}
                </div>
                <div
                  v-for="row in searchResults"
                  :key="row.id"
                  class="grid grid-cols-[110px_1fr_1fr_90px] gap-2 px-4 py-2 border-b text-sm hover:bg-muted/30 transition-colors"
                >
                  <span class="text-xs text-foreground">{{ formatTime(row.dateTime) }}</span>
                  <span class="text-xs text-foreground truncate">{{ getEventLabel(row.eventType, row.eventCode) }}</span>
                  <span class="text-xs text-foreground break-words">{{ row.location }}</span>
                  <button
                    class="text-xs text-sky-600 cursor-pointer hover:underline text-right"
                    @click="scrollToEvent(row.id)"
                  >
                    {{ row.distance.toFixed(2) }} mi
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-6 py-5 border-t border-[#DBDBDB] dark:border-border flex items-center justify-between">
        <div class="text-sm font-medium text-[#090909] dark:text-foreground">Results: {{ searchResults.length }}</div>
        <Button
          variant="outline"
          @click="$emit('update:open', false)"
          class="h-11 px-8 border-[#DBDBDB] dark:border-border rounded-md text-sm font-normal"
        >
          Close
        </Button>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue'
import { Copy, ClipboardPaste, Search, Loader2 } from 'lucide-vue-next'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { GoogleMap, Marker } from 'vue3-google-map'
import { mapStyles } from '@/utils/maps'
import { useBoostEventsStore } from '../../store/boostEvents.ts'
import { useBoostSessionsStore } from '../../store/boostSessions.ts'
import { useBoostTabsStore } from '../../store/boostTabs.ts'
import { allEvents } from '@/utils/events.ts'
import dayjs from 'dayjs'

const props = defineProps<{ open: boolean }>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'scroll-to-event': [eventId: string]
}>()

const eventsStore = useBoostEventsStore()
const sessionsStore = useBoostSessionsStore()
const tabsStore = useBoostTabsStore()

const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string

const isSearching = ref(false)

const searchForm = reactive({
  calculatedLocation: '',
  latitude: 0,
  longitude: 0,
})

// Reset form when modal closes
watch(() => props.open, (val) => {
  if (!val) {
    searchForm.calculatedLocation = ''
    searchForm.latitude = 0
    searchForm.longitude = 0
  }
})

const searchResults = computed(() => eventsStore.boostLocationSearchEvents ?? [])

const mapCenter = computed(() => {
  if (searchResults.value.length === 0) return { lat: 42.7756, lng: -95.9685 }
  const lat = searchResults.value.reduce((s, r) => s + r.latitude, 0) / searchResults.value.length
  const lng = searchResults.value.reduce((s, r) => s + r.longitude, 0) / searchResults.value.length
  return { lat, lng }
})

const mapZoom = computed(() => (searchResults.value.length > 0 ? 8 : 5))

async function doSearch() {
  const tabId = tabsStore.selectedTab?.id
  const sessionId = sessionsStore.sessionId
  if (!tabId || !sessionId) return
  if (!searchForm.calculatedLocation && searchForm.latitude === 0 && searchForm.longitude === 0) return

  isSearching.value = true
  try {
    await eventsStore.searchNearestLocations({
      sessionId,
      tabId,
      calculatedLocation: searchForm.calculatedLocation,
      latitude: searchForm.latitude,
      longitude: searchForm.longitude,
    })
  } finally {
    isSearching.value = false
  }
}

async function copyCoords() {
  if (searchForm.latitude !== 0 || searchForm.longitude !== 0) {
    await navigator.clipboard.writeText(`${searchForm.latitude} ${searchForm.longitude}`)
  }
}

async function pasteCoords() {
  try {
    const text = await navigator.clipboard.readText()
    const match = text.match(/^([+-]?\d*\.?\d+)\s*[^0-9+-]*\s*([+-]?\d*\.?\d+)/)
    if (match) {
      searchForm.latitude = parseFloat(match[1])
      searchForm.longitude = parseFloat(match[2])
    }
  } catch {
    // clipboard access denied
  }
}

function formatTime(dt: string) {
  return dayjs(dt).format('MMM D, hh:mm A')
}

function getEventLabel(eventType: number, eventCode: number) {
  const ev = allEvents.find((e) => e.eventType === eventType && e.eventCode === eventCode)
  return ev?.label ?? `${eventType}-${eventCode}`
}

function scrollToEvent(eventId: string) {
  emit('scroll-to-event', eventId)
  emit('update:open', false)
}
</script>
