<template>
  <div>
    <div ref="graphSection" class="scroll-mt-0 pr-5">
      <div v-if="isGraphLoading" class="flex items-center justify-center p-8">
        <div class="text-muted-foreground">Loading chart...</div>
      </div>
      <CLogGraph
        v-else-if="chartData && Object.keys(chartData).length > 0"
        :chart-data="chartData"
        :daily-summary="dailySummary || undefined"
        :selected-event-id="selectedEventId"
        :events="graphEvents"
        :event-issues="eventIssues"
        :violations="violations"
        :range-start="graphRangeStart"
        :range-end="graphRangeEnd"
        @select-event="handleGraphEvent"
      />
      <div v-else class="flex flex-col items-center justify-center space-y-2 p-8">
        <div :class="error ? 'text-destructive' : 'text-muted-foreground'">
          {{ error || 'No chart data available' }}
        </div>
      </div>
    </div>

    <div class="my-1 bg-white px-4 dark:bg-card">
      <div class="flex items-center justify-between py-4">
        <div class="flex flex-wrap items-center gap-3">
          <h3 class="text-xl font-semibold text-foreground">Events</h3>
          <button
            v-if="frozenEventCount"
            type="button"
            class="inline-flex items-center gap-1 rounded border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:border-blue-400 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300"
            @click="frozenDialogOpen = true"
          >
            <LockKeyhole class="h-3.5 w-3.5" />
            DOT inspected events ({{ frozenEventCount }})
          </button>
          <CLogEventIssues
            :event-issues="eventIssues"
            :events="graphEvents"
            :display-events="displayEvents"
            :format-time="formatTime"
            @select-event="handleIssueEvent"
          />
        </div>
        <div class="flex items-center gap-2">
          <Select v-model="statusFilter">
            <SelectTrigger class="h-9 w-40 text-sm font-normal">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent :body-lock="false">
              <SelectItem value="__all__">All statuses</SelectItem>
              <SelectItem v-for="status in statusFilterOptions" :key="status" :value="status">
                {{ statusLabel(status) }}
              </SelectItem>
            </SelectContent>
          </Select>
          <CLogEventTableColumnSettings
            :options="eventTableColumnOptions"
            :model-value="eventTableColumnVisibility"
            @toggle="setEventTableColumnVisible"
            @show-all="showAllEventTableColumns"
          />
        </div>
      </div>
      <CLogEventsTable
        ref="eventsTable"
        :events="filteredDisplayEvents"
        :camera-event-ids="cameraEventIds"
        :event-issues="eventIssues"
        :column-visibility="eventTableColumnVisibility"
        :loading="isDailyEventsLoading"
        :selected-event-id="selectedEventId"
        :format-time="formatTime"
        :header-date="headerDate"
        :edit-chart-data="editChartData"
        :daily-summary="dailySummary"
        :driver-vehicles="driverVehicles"
        :edit-loading="editLoading"
        :chart-error="chartError"
        readonly
        @select-row="handleTableEvent"
        @open-camera-route="openCameraRoute"
        @chart:container-update="getChartWidth"
      />
    </div>

    <div class="mb-1 grid grid-cols-1 items-stretch gap-1 md:grid-cols-4">
      <div class="col-span-1 flex">
        <div class="flex flex-1 flex-col bg-white p-[12px_24px] dark:bg-card">
          <h3 class="mb-2 text-xl font-semibold text-foreground">Signature</h3>
          <div class="flex flex-1 items-center justify-center">
            <CLogSignature :signature-path="signatureImageUrl" />
          </div>
        </div>
      </div>
      <div class="col-span-3 flex">
        <div class="flex-1 bg-white p-[16px_24px] dark:bg-card">
          <div class="mb-4 flex items-center justify-between">
            <h3 class="text-xl font-semibold text-foreground">Profile form</h3>
          </div>
          <CLogProfileForm
            :driver-daily-form="driverDailyForm"
            :driver-id="route.params.id as string"
            :form-date="headerDate"
            :certified-date="headerDate"
          />
        </div>
      </div>
    </div>

    <CLogRouteEldTracking
      :points="detail?.trackingPoints ?? []"
      :current-status="detail?.hos?.currentStatus"
      :time-zone="detail?.timeZone"
    />
    <CBoostEventCameraDialog
      v-model:open="cameraRouteOpen"
      :loading="cameraRouteLoading"
      :error="cameraRouteError"
      :events="cameraMapEvents"
      :selected-event-id="cameraRouteEventId"
      :analysis="cameraRouteAnalysis"
    />
    <CDotInspectedEventsModal
      v-model:open="frozenDialogOpen"
      :rows="frozenEventRows"
      @select-event="selectFrozenEvent"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, inject, nextTick, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { toast } from 'vue-sonner'
import { LockKeyhole } from 'lucide-vue-next'
import CLogGraph from '../components/detail/CLogGraph.vue'
import CLogEventsTable from '../components/detail/CLogEventsTable.vue'
import CLogSignature from '../components/detail/CLogSignature.vue'
import CLogProfileForm from '../components/detail/CLogProfileForm.vue'
import CLogRouteEldTracking from '../components/detail/CLogRouteEldTracking.vue'
import CLogEventIssues from '../components/detail/CLogEventIssues.vue'
import CLogEventTableColumnSettings from '../components/detail/CLogEventTableColumnSettings.vue'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import CBoostEventCameraDialog from '../../Boost/components/modals/CBoostEventCameraDialog.vue'
import CDotInspectedEventsModal from '../../Boost/components/modals/CDotInspectedEventsModal.vue'
import type { RouteEldEventCameraAnalysis, RouteEldEventCameraPresence, RouteEldHosEvent } from '../../Boost/types/boost'
import { cameraPresenceCache } from '@/composables/cameraPresenceCache'
import type { RouteEldEvent } from '../types/routeEldDetail'
import { ApiEndpoints } from '@/api/endpoints'
import { useApi } from '@/composables/useAxiosService'
import { useLogEventTableColumns } from '../composables/useLogEventTableColumns'
import type { useRouteEldLogDetail } from '../composables/useRouteEldLogDetail'

const route = useRoute()
const api = useApi()
const logDetail = inject('logDetail') as ReturnType<typeof useRouteEldLogDetail>
const eventsTable = ref<{ focusEvent: (eventId: string) => Promise<boolean> } | null>(null)
const graphSection = ref<HTMLElement | null>(null)
const statusFilter = ref('ACTIVE')
const frozenDialogOpen = ref(false)
const {
  columnOptions: eventTableColumnOptions,
  visibility: eventTableColumnVisibility,
  setColumnVisible: setEventTableColumnVisible,
  showAllColumns: showAllEventTableColumns,
} = useLogEventTableColumns()

const {
  error,
  detail,
  chartData,
  dailySummary,
  dailyPixelViolations,
  graphEvents,
  graphRangeStart,
  graphRangeEnd,
  violations,
  eventIssues,
  displayEvents,
  selectedEventId,
  isGraphLoading,
  isDailyEventsLoading,
  headerDate,
  editChartData,
  driverVehicles,
  editLoading,
  chartError,
  getChartWidth,
  getSelectedEvent,
  formatTime,
  driverDailyForm,
  signatureImageUrl,
} = logDetail

const normalizedStatus = (event: (typeof displayEvents.value)[number]) => {
  const status = String(event.recordStatusCode || (event.recordStatus === 1 ? 'ACTIVE' : 'INACTIVE'))
    .toUpperCase()
  return status === 'NONE' ? 'ACTIVE' : status
}
const statusFilterOptions = computed(() =>
  Array.from(new Set(['ACTIVE', ...displayEvents.value.map(normalizedStatus)])).sort()
)
const statusLabel = (status: string) =>
  status === 'INACTIVE_CHANGED' ? 'Inactive · changed' :
    status.replaceAll('_', ' ').toLowerCase().replace(/^./, (letter) => letter.toUpperCase())
const filteredDisplayEvents = computed(() =>
  statusFilter.value === '__all__'
    ? displayEvents.value
    : displayEvents.value.filter((event) => normalizedStatus(event) === statusFilter.value)
)
const frozenEventRows = computed(() => displayEvents.value
  .filter((event) => event.isFrozen)
  .map((event) => ({
    id: String(event.id || event.eventId),
    event: event.eventName || 'Event',
    time: formatTime(event.dateTime, 'MMM D, h:mm:ss a'),
    sequenceId: decimalSequenceId(event.sequenceId),
    source: event.freezeSource,
  })))
const frozenEventCount = computed(() => frozenEventRows.value.length)
watch(() => [route.params.id, headerDate.value.format('YYYY-MM-DD')], () => {
  frozenDialogOpen.value = false
})

function decimalSequenceId(value?: string | null) {
  const normalized = value?.trim().replace(/^0x/i, '')
  return normalized && /^[0-9a-f]+$/i.test(normalized)
    ? BigInt(`0x${normalized}`).toString(10)
    : value || '—'
}

async function selectFrozenEvent(eventId: string) {
  frozenDialogOpen.value = false
  statusFilter.value = '__all__'
  await handleGraphEvent({ eventId })
}

const cameraCache = cameraPresenceCache
const cameraEvents = computed(() => (detail.value?.events ?? []).filter((event) =>
  event.recordStatus.toUpperCase() === 'ACTIVE' && event.latitude != null &&
  event.longitude != null && Number.isFinite(event.latitude) && Number.isFinite(event.longitude))
  .sort((a, b) => a.timestamp - b.timestamp))
const cameraSignature = (event: RouteEldEvent) => {
  const index = cameraEvents.value.findIndex((item) => item.id === event.id)
  return [cameraEvents.value[index - 1], event, cameraEvents.value[index + 1],
    cameraEvents.value.slice(index + 1).find((item) => ['OFF', 'SB', 'D', 'ON'].includes(item.eventCategory))]
    .map((item) => item ? `${item.latitude}:${item.longitude}:${item.timestamp}:${item.eventCode}` : '').join('|')
}
const cameraCacheKey = (event: RouteEldEvent) => `all:${route.params.id}:${event.id}`
const cameraEventIds = computed(() => cameraEvents.value.filter((event) => {
  const cached = cameraCache.get(cameraCacheKey(event))
  return cached?.signature === cameraSignature(event) && cached.hasCamera
}).map((event) => event.id))
const cameraMapEvents = computed<RouteEldHosEvent[]>(() => {
  const events = [...(detail.value?.events ?? [])]
  const previous = detail.value?.previousEvent
  if (previous && !events.some((event) => event.id === previous.id)) events.push(previous)
  return events.map((event) => ({ ...event, isEditable: false, trailers: [], documents: [] }))
})
const cameraRouteOpen = ref(false)
const cameraRouteLoading = ref(false)
const cameraRouteError = ref('')
const cameraRouteEventId = ref('')
const cameraRouteAnalysis = ref<RouteEldEventCameraAnalysis | null>(null)
let cameraRouteRequestId = 0

watch(() => `${route.params.id}:${headerDate.value.format('YYYY-MM-DD')}:${cameraEvents.value.map(
  (event) => `${event.id}=${cameraSignature(event)}`).join('|')}`, (_key, _old, onCleanup) => {
  const driverId = String(route.params.id || '')
  const day = headerDate.value
  const missing = cameraEvents.value.map((event) => ({ event, signature: cameraSignature(event) }))
    .filter(({ event, signature }) => cameraCache.get(cameraCacheKey(event))?.signature !== signature)
  if (!driverId || !missing.length) return
  const controller = new AbortController()
  onCleanup(() => controller.abort())
  void (async () => {
    for (let index = 0; index < missing.length && !controller.signal.aborted; index += 200) {
      const batch = missing.slice(index, index + 200)
      try {
        const response = await api.post<RouteEldEventCameraPresence[] | { successResult: RouteEldEventCameraPresence[] }>(
          ApiEndpoints.ROUTE_ELD_DRIVER_SCHEDULE_CAMERA_PRESENCE(driverId),
          { eventIds: batch.map(({ event }) => event.id) },
          { params: { fromDate: day.subtract(1, 'day').format('YYYY-MM-DD'),
            toDate: day.add(1, 'day').format('YYYY-MM-DD'), radiusMetres: 97 }, signal: controller.signal })
        if (controller.signal.aborted) return
        const results = 'successResult' in response.data ? response.data.successResult : response.data
        const found = new Map(results.map((result) => [result.eventId, result.hasCamera]))
        for (const { event, signature } of batch) {
          const current = cameraEvents.value.find((item) => item.id === event.id)
          if (!current || cameraSignature(current) !== signature) continue
          const existing = cameraCache.get(cameraCacheKey(event))
          if (existing?.routeVerified && existing.signature === signature) continue
          cameraCache.set(cameraCacheKey(event), { signature, hasCamera: found.get(event.id) === true })
        }
      } catch {
        if (controller.signal.aborted) return
        toast.error('Camera checks could not be loaded')
        break
      }
    }
  })()
}, { immediate: true })

async function openCameraRoute(eventId: string) {
  const driverId = String(route.params.id || '')
  if (!driverId) return
  const requestId = ++cameraRouteRequestId
  const day = headerDate.value
  cameraRouteEventId.value = eventId
  cameraRouteAnalysis.value = null
  cameraRouteError.value = ''
  cameraRouteOpen.value = true
  cameraRouteLoading.value = true
  try {
    const response = await api.get<RouteEldEventCameraAnalysis | { successResult: RouteEldEventCameraAnalysis }>(
      ApiEndpoints.ROUTE_ELD_DRIVER_SCHEDULE_CAMERAS(driverId), {
        params: { fromDate: day.subtract(1, 'day').format('YYYY-MM-DD'),
          toDate: day.add(1, 'day').format('YYYY-MM-DD'), radiusMetres: 97, eventId },
      })
    if (requestId !== cameraRouteRequestId || !cameraRouteOpen.value) return
    cameraRouteAnalysis.value = 'successResult' in response.data ? response.data.successResult : response.data
    const event = cameraEvents.value.find((item) => item.id === eventId)
    if (event) cameraCache.set(cameraCacheKey(event), {
      signature: cameraSignature(event),
      hasCamera: Boolean(cameraRouteAnalysis.value.matches.find(
        (match) => match.eventId === eventId && match.cameras.length > 0)),
      routeVerified: true,
    })
  } catch (error: any) {
    if (requestId === cameraRouteRequestId) cameraRouteError.value = error.response?.data?.message || 'The event route could not be loaded'
  } finally {
    if (requestId === cameraRouteRequestId) cameraRouteLoading.value = false
  }
}

watch(() => [route.params.id, headerDate.value.format('YYYY-MM-DD')], () => {
  cameraRouteRequestId++
  cameraRouteOpen.value = false
})

async function handleGraphEvent(event: { eventId?: string; id?: string }) {
  const eventId = event?.eventId || event?.id
  if (!eventId) return
  getSelectedEvent(event)
  await nextTick()
  await eventsTable.value?.focusEvent(String(eventId))
}

function handleIssueEvent(eventId: string) {
  void handleGraphEvent({ eventId })
}

async function handleTableEvent(event: { eventId?: string; id?: string }) {
  getSelectedEvent(event)
  await nextTick()
  revealGraphIfNeeded()
}

function revealGraphIfNeeded() {
  if (typeof window === 'undefined' || !graphSection.value) return
  const graphBounds = graphSection.value.getBoundingClientRect()
  const headerHeight = 0
  const graphTop = window.scrollY + graphBounds.top
  const targetScrollY = Math.max(0, graphTop - headerHeight)
  if (window.scrollY <= targetScrollY) return

  window.scrollBy({
    top: targetScrollY - window.scrollY,
    behavior: 'smooth',
  })
}
</script>
