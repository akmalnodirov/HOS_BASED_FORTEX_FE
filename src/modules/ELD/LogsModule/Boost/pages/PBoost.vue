<template>
  <div class="space-y-3 bg-muted/30 pb-0 pt-1">
    <CBoostToolbar
      :free-times="boostFreeTimes"
      :tabs="tabs"
      :selected-tab="selectedTab"
      :error-count="errorCount"
      :warning-count="warningCount"
      :is-submitted="isBoostEventsSubmitted"
      :submit-loading="isSubmitLoading"
      @initial-click="selectInitialTab"
      @new-click="addNewTab"
      @submit-click="submitBoostEvents"
      @error-warning-click="showErrorWarningModal = true"
      @violation-click="showViolationModal = true"
      @free-time-click="handleFreeTimeClick"
      @select-tab="selectTab"
      @remove-tab="removeTab"
      @ai-advice-click="aiAdviceOpen = true"
    />

    <section class="border-y border-border bg-background px-6 py-4">
      <div class="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 class="text-sm font-semibold">Duty-status graph</h2>
          <p class="text-xs text-muted-foreground">{{ sessionPeriodLabel }}</p>
        </div>
        <div class="flex items-center gap-2">
          <Button variant="outline" size="sm" @click="showGraph = !showGraph">
            <ChevronUp v-if="showGraph" class="mr-2 h-4 w-4" />
            <ChevronDown v-else class="mr-2 h-4 w-4" />
            {{ showGraph ? 'Hide graph' : 'Show graph' }}
          </Button>
        </div>
      </div>
      <CBoostGraph
        v-show="showGraph"
        ref="boostGraphRef"
        :events="graphEvents"
        :from-date="session?.fromDate ?? ''"
        :to-date="session?.toDate ?? ''"
        :time-zone="workspaceTimeZone"
        :session-created-at="session?.createdAt"
        :selected-event-id="selectedEventId"
        :boost-selected-ids="rangeBoostSelectedIds"
        :free-times="workspace?.calculations.freeTimes ?? []"
        :violations="workspace?.calculations.violations ?? []"
        :event-issues="workspace?.calculations.eventIssues ?? []"
        :is-graph-loading="isGraphLoading"
        @selected-event="onGraphEventSelect"
        @boost-select="onGraphBoostSelect"
      >
        <template #toolbar>
          <div v-if="rangeBoostSelectedEvents.length" class="flex min-w-0 items-center gap-1.5">
            <button
              v-for="(event, index) in rangeBoostSelectedEvents"
              :key="event.id"
              type="button"
              class="inline-flex max-w-60 items-center gap-1.5 rounded-full border bg-muted/60 px-2 py-0.5 text-[11px]"
              @click="onGraphEventSelect(event.id)"
            >
              <span class="flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-[9px] font-bold text-background">
                {{ index + 1 }}
              </span>
              <span class="truncate">{{ event.eventName }} · {{ formatGraphEventTime(event.timestamp) }}</span>
            </button>
            <Button
              v-if="rangeBoostSelectedEvents.length === 2"
              size="sm"
              class="h-6 px-2 text-xs"
              :disabled="Boolean(rangeBoostSelectionError)"
              :title="rangeBoostSelectionError || 'Open Boost'"
              @click="openRangeBoostModal"
            >
              <Zap class="mr-1 h-3 w-3" /> Boost
            </Button>
            <Button variant="ghost" size="icon" class="h-6 w-6" title="Clear Boost selection" @click="clearRangeBoost">
              <X class="h-3.5 w-3.5" />
            </Button>
          </div>
          <span v-else class="text-xs text-muted-foreground">Right-click two graph segments to Boost time</span>
        </template>
      </CBoostGraph>
    </section>

    <section class="border-y border-border bg-background pt-4">
      <div class="flex items-center justify-between gap-3 px-6 pb-3">
        <div>
          <h2 class="text-sm font-semibold">HOS events</h2>
        </div>
        <div class="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            :disabled="!workspace?.canEdit"
            @click="openInsertModal"
          >
            <Plus class="mr-2 h-4 w-4" /> Insert event
          </Button>
          <Button variant="outline" size="sm" @click="showLocationFinderModal = true">
            <MapPin class="mr-2 h-4 w-4" /> Location finder
          </Button>
          <Select v-model="changeFilter">
            <SelectTrigger class="h-9 w-38 text-xs">
              <SelectValue placeholder="All changes" />
            </SelectTrigger>
            <SelectContent :body-lock="false">
              <SelectItem value="__all__">All changes</SelectItem>
              <SelectItem v-for="option in changeFilterOptions" :key="option" :value="option">
                {{ changeStatusLabel(option) }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <CBoostEventsTable
        :events="filteredDailyEvents"
        :loading="isDailyEventsLoading"
        :selected-event-id="selectedEventId"
        :selected-row-ids="selectedRowIds"
        :drag-drop-enabled="dragDropEnabled"
        @toggle-selection="onTableEventSelect"
        @update:selected-row-ids="onSelectedRowIdsUpdate"
        @edit-event="openEditEvent"
        @copy-event="copyBoostEvent"
        @delete-event="deleteBoostEvent"
        @revert-event="revertBoostEvent"
        @view-event="openEventViewer"
        @edit-profile="openEditDailyForm"
        @drop-property="dropProperty"
      />
    </section>

    <CBoostActions
      :drag-drop-enabled="dragDropEnabled"
      :delete-disabled="!selectedRowIds.length || !workspace?.canEdit"
      :duration-disabled="selectedRowIds.length !== 1 || !workspace?.canEdit"
      :reassign-disabled="!selectedRowIds.length || !workspace?.canEdit"
      :selected-count="selectedRowIds.length"
      @dragdrop-change="dragDropEnabled = $event"
      @delete-click="deleteSelectedBoostEvents"
      @duration-click="durationOpen = true"
      @reassign-click="openReassignModal"
      @multi-update-click="multiUpdateModalOpen = true"
      @normalize-click="normalizeOpen = true"
      @certification-click="openCertification"
    />

    <CBoostErrorWarningModal
      v-model:open="showErrorWarningModal"
      :rows="errorWarningRows"
      @row-click="handleErrorWarningRowClick"
    />
    <CBoostViolationModal
      v-model:open="showViolationModal"
      :violations="violations"
      @select-violation="handleViolationSelect"
    />
    <CBoostMoveTimeModal
      v-model:open="rangeBoostModalOpen"
      :left-event="rangeBoostLeftEvent"
      :right-event="rangeBoostRightEvent"
      :source-index="rangeBoostSourceIndex"
      :source-duration-ms="rangeBoostSourceDurationMs"
      :target-duration-ms="rangeBoostTargetDurationMs"
      :affected-count="rangeBoostAffectedCount"
      :selection-error="rangeBoostSelectionError"
      :time-zone="workspaceTimeZone"
      :loading="store.isMutating"
      @switch="rangeBoostSourceIndex = rangeBoostSourceIndex === 0 ? 1 : 0"
      @submit="confirmRangeBoost"
    />
    <CBoostReassignModal
      v-model:open="reassignModalOpen"
      :selected-count="selectedRowIds.length"
      :loading="isReassigning"
      :drivers="store.reassignTargets"
      :drivers-loading="reassignTargetsLoading"
      @submit="submitReassignSelectedEvents"
    />
    <CBoostLocationFinderModal
      v-model:open="showLocationFinderModal"
      @scroll-to-event="handleLocationScrollToEvent"
    />
    <CBoostEditEventModal
      v-model:open="showEditEventModal"
      :form="editEventForm"
      :edit-options="store.eventEditOptions"
      :users="responsibleUsers"
      :disable-sleeper-berth="Boolean(session?.disableSleeperBerth)"
      :from-date="session?.fromDate"
      :to-date="session?.toDate"
      :loading="isEditEventLoading"
      @update:form="updateEditEventForm"
      @submit="submitEditEvent"
      @delete="deleteEventFromEditor"
    />
    <CBoostMultiUpdateModal
      v-model:open="multiUpdateModalOpen"
      :events="selectedEventsForUpdate"
      :loading="isMultiUpdateLoading"
      @submit="submitMultiUpdateEvents"
    />
    <CBoostEditDailyFormModal
      v-model:open="showEditDailyFormModal"
      :form="editDailyForm"
      :loading="isEditDailyFormLoading"
      @update:form="updateEditDailyForm"
      @submit="submitDailyForm"
      @revert="revertDailyForm"
    />
    <CBoostAiAdviceModal
      v-model:open="aiAdviceOpen"
      :loading="aiAdviceLoading"
      :result="aiAdviceResult"
      @analyze="analyzeAiAdvice"
    />
    <CBoostNormalizeModal
      v-model:open="normalizeOpen"
      :loading="store.isMutating"
      @submit="runNormalize"
    />
    <CBoostDurationModal
      v-model:open="durationOpen"
      :loading="store.isMutating"
      @submit="runDurationBoost"
    />

    <Dialog v-model:open="eventViewerOpen">
      <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-180">
        <DialogHeader>
          <DialogTitle>Event Details</DialogTitle>
          <DialogDescription>
            {{ selectedViewEvent?.event.eventName || 'Route ELD event' }}
          </DialogDescription>
        </DialogHeader>
        <div v-if="selectedViewEvent" class="grid grid-cols-2 gap-3 text-sm">
          <div v-for="item in eventDetailItems" :key="item.label" class="rounded-md border p-3">
            <p class="text-[10px] font-medium uppercase text-muted-foreground">{{ item.label }}</p>
            <p class="mt-1 break-words font-medium">{{ item.value }}</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="eventViewerOpen = false">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <CBoostCertificationModal
      v-model:open="certificationOpen"
      :report="certificationReport"
      :loading="certificationLoading"
      :fixing="certificationFixing"
      :can-edit="Boolean(workspace?.canEdit)"
      :time-zone="workspaceTimeZone"
      @apply="applyCertificationFix"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onActivated, onBeforeUnmount, onDeactivated, onMounted, ref, watch } from 'vue'
import dayjs from 'dayjs'
import { ChevronDown, ChevronUp, MapPin, Plus, X, Zap } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useApi } from '@/composables/useAxiosService'
import { ApiEndpoints } from '@/api/endpoints'
import type { BoostFreeTime } from '@/modules/ELD/LogsModule/[Id]/types/chart'
import type {
  RouteEldAiAdvice,
  RouteEldCertificationReport,
  RouteEldHosEvent,
} from '../types/boost'
import CBoostToolbar from '../components/CBoostToolbar.vue'
import CBoostGraph from '../components/CBoostGraph.vue'
import CBoostEventsTable from '../components/CBoostEventsTable.vue'
import CBoostActions from '../components/CBoostActions.vue'
import CBoostErrorWarningModal from '../components/modals/CBoostErrorWarningModal.vue'
import CBoostViolationModal from '../components/modals/CBoostViolationModal.vue'
import CBoostMoveTimeModal from '../components/modals/CBoostMoveTimeModal.vue'
import CBoostReassignModal from '../components/modals/CBoostReassignModal.vue'
import CBoostLocationFinderModal from '../components/modals/CBoostLocationFinderModal.vue'
import CBoostEditEventModal from '../components/modals/CBoostEditEventModal.vue'
import CBoostEditDailyFormModal from '../components/modals/CBoostEditDailyFormModal.vue'
import CBoostMultiUpdateModal from '../components/modals/CBoostMultiUpdateModal.vue'
import CBoostAiAdviceModal from '../components/modals/CBoostAiAdviceModal.vue'
import CBoostNormalizeModal from '../components/modals/CBoostNormalizeModal.vue'
import CBoostDurationModal from '../components/modals/CBoostDurationModal.vue'
import CBoostCertificationModal from '../components/modals/CBoostCertificationModal.vue'
import { resolveRouteEldScheduleTimeZone, useScheduleBoost } from '../composables/useScheduleBoost'

const api = useApi()
const boost = useScheduleBoost()
const {
  store,
  session,
  workspace,
  profileForms,
  responsibleUsers,
  workspaceTimeZone,
  driverId,
  headerDate,
  tabs,
  selectedTab,
  dailySummaries,
  chartData,
  dailyEvents,
  graphEventDurationById,
  dailyPixelViolations,
  pinTimes,
  boostFreeTimes,
  violations,
  errorWarningRows,
  errorCount,
  warningCount,
  hasErrorWarning,
  selectedEventId,
  selectedRowIds,
  selectedEventsForUpdate,
  dragDropEnabled,
  reassignModalOpen,
  multiUpdateModalOpen,
  showEditEventModal,
  showEditDailyFormModal,
  editEventForm,
  editDailyForm,
  isGraphLoading,
  isDailyEventsLoading,
  isEditEventLoading,
  isEditDailyFormLoading,
  isMultiUpdateLoading,
  isReassigning,
  isSubmitLoading,
  isBoostEventsSubmitted,
  updateEditEventForm,
  openEditEvent,
  prepareInsertEvent,
  submitEditEvent,
  updateEditDailyForm,
  openEditDailyForm,
  submitDailyForm,
  revertDailyForm,
  selectTab,
  addNewTab,
  removeTab,
  submitBoostEvents,
  deleteBoostEvent,
  deleteSelectedBoostEvents,
  copyBoostEvent,
  revertBoostEvent,
  getEventDetails,
  submitDurationBoost,
  submitReassignSelectedEvents,
  submitMultiUpdateEvents,
  dropProperty,
  getChartWidth,
  getSelectedEvent,
  onSelectedMoveEvents,
} = boost

const boostGraphRef = ref<InstanceType<typeof CBoostGraph> | null>(null)
const showGraph = ref(true)
const changeFilter = ref('__all__')
const showLocationFinderModal = ref(false)
const showErrorWarningModal = ref(false)
const showViolationModal = ref(false)
const aiAdviceOpen = ref(false)
const aiAdviceLoading = ref(false)
const aiAdviceResult = ref<RouteEldAiAdvice | null>(null)
const normalizeOpen = ref(false)
const certificationOpen = ref(false)
const certificationLoading = ref(false)
const certificationFixing = ref(false)

interface ApiEnvelope<T> {
  successResult: T
}

const certificationReport = ref<RouteEldCertificationReport | null>(null)
const durationOpen = ref(false)
const reassignTargetsLoading = ref(false)
const eventViewerOpen = ref(false)
const selectedViewEvent = ref<any>(null)
const stableScrollbarClass = 'boost-scrollbar-stable'

const enableStableScrollbar = () => document.body.classList.add(stableScrollbarClass)
const disableStableScrollbar = () => document.body.classList.remove(stableScrollbarClass)

onMounted(enableStableScrollbar)
onActivated(enableStableScrollbar)
onDeactivated(disableStableScrollbar)
onBeforeUnmount(disableStableScrollbar)

watch(
  () => store.profileFormEditRequest,
  async (logDate) => {
    if (!logDate) return
    store.clearProfileFormEditRequest()
    await openEditDailyForm(logDate)
  }
)

const eventCount = computed(
  () => workspace.value?.events.filter((event) => !event.isDeleted).length ?? 0
)
const graphEvents = computed(() =>
  (workspace.value?.events ?? []).filter((item) => !item.isDeleted).map((item) => item.event)
)
const rangeBoostSelectedIds = ref<string[]>([])
const rangeBoostSourceIndex = ref(0)
const rangeBoostModalOpen = ref(false)
const rangeBoostSelectedEvents = computed(() =>
  rangeBoostSelectedIds.value
    .map((id) => graphEvents.value.find((event) => event.id === id))
    .filter((event): event is RouteEldHosEvent => Boolean(event))
)
const rangeBoostChronologicalEvents = computed(() =>
  [...rangeBoostSelectedEvents.value].sort((a, b) => a.timestamp - b.timestamp)
)
const rangeBoostLeftEvent = computed(() => rangeBoostChronologicalEvents.value[0] ?? null)
const rangeBoostRightEvent = computed(() => rangeBoostChronologicalEvents.value[1] ?? null)
const rangeBoostSourceEvent = computed(
  () => rangeBoostChronologicalEvents.value[rangeBoostSourceIndex.value] ?? null
)
const rangeBoostTargetEvent = computed(
  () => rangeBoostChronologicalEvents.value[1 - rangeBoostSourceIndex.value] ?? null
)
const rangeBoostSourceDurationMs = computed(() =>
  rangeBoostSourceEvent.value
    ? (graphEventDurationById.value.get(rangeBoostSourceEvent.value.id) ?? 0)
    : 0
)
const rangeBoostTargetDurationMs = computed(() =>
  rangeBoostTargetEvent.value
    ? (graphEventDurationById.value.get(rangeBoostTargetEvent.value.id) ?? 0)
    : 0
)
const rangeBoostAffectedEvents = computed(() => {
  const left = rangeBoostLeftEvent.value
  const right = rangeBoostRightEvent.value
  if (!left || !right) return []
  return graphEvents.value.filter(
    (event) => event.timestamp > left.timestamp && event.timestamp <= right.timestamp
  )
})
const rangeBoostAffectedCount = computed(() => rangeBoostAffectedEvents.value.length)
const rangeBoostSelectionError = computed(() => {
  const left = rangeBoostLeftEvent.value
  const right = rangeBoostRightEvent.value
  if (!left || !right) return ''
  if (left.timestamp === right.timestamp) return 'Boost boundary events must have different times.'
  if (
    [left, right].some(
      (event) =>
        event.recordStatus.toUpperCase() !== 'ACTIVE' ||
        !['OFF', 'SB', 'D', 'ON'].includes(event.eventCategory)
    )
  ) return 'Boost boundaries must be active duty events.'
  if (rangeBoostAffectedEvents.value.some((event) => event.isFrozen))
    return 'Boost cannot move a range containing DOT-inspected events.'
  return ''
})
const changeFilterOptions = computed(() =>
  Array.from(
    new Set(
      dailyEvents.value
        .flatMap((group) => group.events)
        .map((event) => String(event.changeStatus || 'UNCHANGED').toUpperCase())
    )
  ).sort()
)
const filteredDailyEvents = computed(() => {
  if (changeFilter.value === '__all__') return dailyEvents.value
  return dailyEvents.value.map((group) => ({
    ...group,
    events: group.events.filter(
      (event) => String(event.changeStatus || 'UNCHANGED').toUpperCase() === changeFilter.value
    ),
  }))
})
const changeStatusLabel = (value?: string) => {
  const normalized = String(value || 'UNCHANGED').toUpperCase()
  return normalized.charAt(0) + normalized.slice(1).toLowerCase()
}
const issueCount = computed(() => workspace.value?.calculations.eventIssues.length ?? 0)
const sessionPeriodLabel = computed(() =>
  session.value
    ? `${dayjs(session.value.fromDate).format('MMM D, YYYY')} – ${dayjs(session.value.toDate).format('MMM D, YYYY')}`
    : ''
)
const eventDetailItems = computed(() => {
  const source = selectedViewEvent.value
  if (!source) return []
  const event = source.event
  return [
    { label: 'Sequence', value: event.sequenceId || '—' },
    {
      label: 'Time',
      value: new Intl.DateTimeFormat('en-US', {
        timeZone: resolveRouteEldScheduleTimeZone(event.timeZone),
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(new Date(event.timestamp)),
    },
    { label: 'Status', value: event.recordStatus || '—' },
    { label: 'Origin', value: event.recordOrigin || '—' },
    { label: 'Location', value: event.location || event.driverLocationDescription || '—' },
    { label: 'Vehicle', value: event.vehicleName || event.vehicleVin || '—' },
    { label: 'Odometer', value: event.odometerMiles == null ? '—' : String(event.odometerMiles) },
    { label: 'Engine hours', value: event.engineHours == null ? '—' : String(event.engineHours) },
    { label: 'Trailers', value: source.trailers.join(', ') || '—' },
    { label: 'Documents', value: source.documents.join(', ') || '—' },
    { label: 'Notes', value: event.notes || '—' },
    { label: 'Change', value: source.changeStatus || 'Unchanged' },
  ]
})

const selectInitialTab = () => {
  const initial = tabs.value.find((tab) => tab.type === 0)
  if (initial) selectTab(initial)
}
const onSelectedRowIdsUpdate = (ids: string[]) => {
  selectedRowIds.value = ids
}
const onGraphEventSelect = (event: any) => {
  getSelectedEvent(event)
}
const onGraphBoostSelect = (eventId: string) => {
  getSelectedEvent(eventId)
  const event = graphEvents.value.find((item) => item.id === eventId)
  if (!event) return
  if (
    event.recordStatus.toUpperCase() !== 'ACTIVE' ||
    !['OFF', 'SB', 'D', 'ON'].includes(event.eventCategory)
  ) {
    toast.error('Boost boundaries must be active duty events')
    return
  }
  if (event.isFrozen) {
    toast.error('DOT-inspected events cannot participate in Boost')
    return
  }
  if (rangeBoostSelectedIds.value.includes(eventId)) {
    rangeBoostSelectedIds.value = rangeBoostSelectedIds.value.filter((id) => id !== eventId)
    return
  }
  const next = [...rangeBoostSelectedIds.value, eventId]
  if (next.length > 2) next.shift()
  rangeBoostSelectedIds.value = next
}
const clearRangeBoost = () => {
  rangeBoostSelectedIds.value = []
  rangeBoostSourceIndex.value = 0
}
watch([() => session.value?.id, () => store.activeTabId], clearRangeBoost)
const openRangeBoostModal = () => {
  if (rangeBoostSelectedEvents.value.length !== 2) return
  if (rangeBoostSelectionError.value) {
    toast.error(rangeBoostSelectionError.value)
    return
  }
  rangeBoostSourceIndex.value = 0
  rangeBoostModalOpen.value = true
}
const confirmRangeBoost = async (seconds: number) => {
  const left = rangeBoostLeftEvent.value
  const right = rangeBoostRightEvent.value
  const source = rangeBoostSourceEvent.value
  if (!left || !right || !source || seconds < 1 || rangeBoostSelectionError.value) return
  if (!rangeBoostAffectedCount.value) {
    toast.error('There are no events to move between the selection')
    return
  }
  try {
    const deltaSeconds = source.id === left.id ? -seconds : seconds
    await store.boostEvents([left.id, right.id], deltaSeconds)
    rangeBoostModalOpen.value = false
    clearRangeBoost()
    toast.success('Time boost saved to the active Boost tab')
  } catch (error: any) {
    toast.error(error?.response?.data?.message || error?.message || 'The time transfer could not be applied')
  }
}
const formatGraphEventTime = (timestamp: number) =>
  new Intl.DateTimeFormat('en-US', {
    timeZone: resolveRouteEldScheduleTimeZone(workspaceTimeZone.value),
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(timestamp))
const onTableEventSelect = (eventId: string) => {
  getSelectedEvent(eventId)
  boostGraphRef.value?.scrollToEventSegment?.(eventId)
}
const handleErrorWarningRowClick = (eventId: string) => {
  getSelectedEvent(eventId)
  showErrorWarningModal.value = false
  boostGraphRef.value?.scrollToEventSegment?.(eventId)
}
const handleViolationSelect = (eventId: string) => {
  getSelectedEvent(eventId)
  showViolationModal.value = false
  boostGraphRef.value?.scrollToEventSegment?.(eventId)
}
const handleLocationScrollToEvent = (eventId: string) => {
  getSelectedEvent(eventId)
  boostGraphRef.value?.scrollToEventSegment?.(eventId)
}
const handleFreeTimeClick = (freeTime: BoostFreeTime) => {
  boostGraphRef.value?.scrollToEventSegment?.(freeTime.eventId)
}
const openEventViewer = (eventId: string) => {
  selectedViewEvent.value = getEventDetails(eventId)
  eventViewerOpen.value = Boolean(selectedViewEvent.value)
}
const deleteEventFromEditor = async (eventId: string) => {
  await deleteBoostEvent(eventId)
  showEditEventModal.value = false
}

const analyzeAiAdvice = async (adviceType: string) => {
  aiAdviceLoading.value = true
  try {
    aiAdviceResult.value = await store.analyzeAiAdvice(adviceType)
  } catch (error: any) {
    toast.error(error?.response?.data?.message || error?.message || 'Failed to analyze workspace')
  } finally {
    aiAdviceLoading.value = false
  }
}
const runNormalize = async (payload: { types: string[]; certificationFix: boolean }) => {
  try {
    const result: any = await store.normalize(payload.types, payload.certificationFix)
    normalizeOpen.value = false
    toast.success(
      `Normalization completed${result?.changedEventCount != null ? ` · ${result.changedEventCount} changes` : ''}`
    )
  } catch (error: any) {
    toast.error(error?.response?.data?.message || error?.message || 'Normalization failed')
  }
}
const runDurationBoost = async (payload: {
  durationSeconds: number
  mode: 'expand' | 'reduce'
  ensurePti: boolean
}) => {
  try {
    await submitDurationBoost(payload)
    durationOpen.value = false
  } catch (error) {
    void error
  }
}
const openInsertModal = async () => {
  try {
    await prepareInsertEvent()
  } catch (error: any) {
    toast.error(error?.response?.data?.message || error?.message || 'Failed to prepare event')
  }
}
const openReassignModal = async () => {
  reassignModalOpen.value = true
  reassignTargetsLoading.value = true
  try {
    await store.fetchReassignTargets(driverId.value)
  } catch (error: any) {
    toast.error(error?.response?.data?.message || error?.message || 'Failed to load drivers')
  } finally {
    reassignTargetsLoading.value = false
  }
}
const openCertification = async () => {
  if (!session.value || !store.activeTabId) return
  certificationOpen.value = true
  certificationLoading.value = true
  try {
    const response = await api.get<
      RouteEldCertificationReport | ApiEnvelope<RouteEldCertificationReport>
    >(
      ApiEndpoints.ROUTE_ELD_EVENT_SESSION_CERTIFICATION_REPORT(session.value.id, store.activeTabId)
    )
    certificationReport.value =
      'successResult' in response.data ? response.data.successResult : response.data
  } catch (error: any) {
    toast.error(
      error?.response?.data?.message || error?.message || 'Failed to load certification report'
    )
  } finally {
    certificationLoading.value = false
  }
}
const applyCertificationFix = async () => {
  if (!session.value || !store.activeTabId) return
  certificationFixing.value = true
  try {
    await api.post(
      ApiEndpoints.ROUTE_ELD_EVENT_SESSION_CERTIFICATION_FIX(session.value.id, store.activeTabId),
      null
    )
    await store.refreshWorkspace()
    await openCertification()
    toast.success('Certification fix applied')
  } catch (error: any) {
    toast.error(error?.response?.data?.message || error?.message || 'Certification fix failed')
  } finally {
    certificationFixing.value = false
  }
}
</script>

<style>
body.boost-scrollbar-stable {
  margin-right: 0 !important;
  overflow-y: scroll !important;
  padding-right: 0 !important;
}
</style>
