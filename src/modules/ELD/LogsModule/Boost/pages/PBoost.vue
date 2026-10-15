<template>
  <div class="space-y-3 bg-muted/30 pb-0 pt-1">
    <CBoostToolbar
      :free-times="boostFreeTimes"
      :tabs="tabs"
      :selected-tab="selectedTab"
      :error-count="errorCount"
      :warning-count="warningCount"
      :session-status="session?.status"
      :pending-submission-count="session?.pendingSubmissionCount ?? 0"
      :pending-rollback-count="session?.pendingRollbackCount ?? 0"
      :rollback-blocked="Boolean(session?.isRollbackBlocked)"
      :submit-loading="sessionActionLoading"
      @initial-click="selectInitialTab"
      @new-click="addNewTab"
      @session-action="runSessionAction"
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
        :reassigned-events="workspace?.reassignedEvents.map((item) => item.event) ?? []"
        :co-driver-events="showCoDrivers ? coDriverGraphEvents : []"
        :co-driver-name="latestPeriodCoDriver?.name"
        :is-graph-loading="isGraphLoading"
        @selected-event="onGraphEventSelect"
        @boost-select="onGraphBoostSelect"
      >
        <template #graph-actions>
          <button
            type="button"
            role="switch"
            :aria-checked="showCoDrivers"
            class="inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] font-medium"
            title="Show co-driver logs as read-only events"
            @click="showCoDrivers = !showCoDrivers"
          >
            <span
              class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
              :class="showCoDrivers ? 'bg-blue-600' : 'bg-muted'"
            >
              <span
                class="inline-block h-4 w-4 rounded-full bg-white shadow transition-transform"
                :class="showCoDrivers ? 'translate-x-4' : 'translate-x-0.5'"
              />
            </span>
            Co-drivers
            <span v-if="showCoDrivers" class="max-w-28 truncate">
              {{ latestPeriodCoDriver?.name || 'None in period' }}
            </span>
          </button>
        </template>
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
            :disabled="!hasAlprOrigin || alprLoading"
            title="Find ALPR cameras along the active tab's event routes"
            @click="analyzeAlpr"
          >
            <Camera class="mr-2 h-4 w-4" /> {{ alprAnalysis ? 'Refresh ALPR' : 'Find ALPR' }}
          </Button>
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
          <Select v-if="showCoDrivers" v-model="driverFilter">
            <SelectTrigger class="h-9 w-44 text-xs">
              <SelectValue placeholder="Driver" />
            </SelectTrigger>
            <SelectContent :body-lock="false">
              <SelectItem value="__all__">All drivers</SelectItem>
              <SelectItem value="__main__">{{ session?.driverName || 'Driver' }}</SelectItem>
              <SelectItem value="__co_driver__">{{ latestPeriodCoDriver?.name || 'Co-driver' }}</SelectItem>
            </SelectContent>
          </Select>
          <Select v-model="statusFilter">
            <SelectTrigger class="h-9 w-40 text-xs">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent :body-lock="false">
              <SelectItem value="__all__">All statuses</SelectItem>
              <SelectItem v-for="option in statusFilterOptions" :key="option" :value="option">
                {{ eventStatusLabel(option) }}
              </SelectItem>
            </SelectContent>
          </Select>
          <CBoostEventTableColumnSettings
            :options="boostEventTableColumnOptions"
            :model-value="eventTableColumnVisibility"
            @toggle="setEventTableColumnVisible"
            @show-all="showAllEventTableColumns"
          />
        </div>
      </div>
      <CBoostEventsTable
        :events="filteredDailyEvents"
        :loading="isDailyEventsLoading"
        :selected-event-id="selectedEventId"
        :selected-row-ids="selectedRowIds"
        :drag-drop-enabled="dragDropEnabled"
        :column-visibility="eventTableColumnVisibility"
        :time-zone="workspaceTimeZone"
        :camera-matches="alprAnalysis?.matches ?? []"
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
      <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-210">
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2">
            <span>Event details</span>
            <span v-if="selectedViewEvent" class="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
              {{ selectedViewEvent.event.recordStatus }}
            </span>
          </DialogTitle>
          <DialogDescription>{{ selectedViewEvent?.event.eventName || 'Route ELD event' }}</DialogDescription>
        </DialogHeader>
        <div v-if="selectedViewEvent" class="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div v-for="item in eventDetailItems" :key="item.label" class="min-w-0 rounded-md border bg-muted/20 p-3">
            <p class="text-[10px] font-medium uppercase text-muted-foreground">{{ item.label }}</p>
            <p class="mt-1 break-words font-medium">{{ item.value }}</p>
          </div>
          <div v-if="selectedViewEventIssues.length" class="rounded-md border border-amber-200 bg-amber-50/60 p-3 sm:col-span-2 lg:col-span-3">
            <p class="text-[10px] font-semibold uppercase text-amber-700">Errors & warnings</p>
            <div class="mt-2 flex flex-col gap-1.5">
              <span v-for="issue in selectedViewEventIssues" :key="`${issue.severity}-${issue.code}-${issue.title}`" class="text-xs text-amber-900">
                <strong>{{ issue.severity }}:</strong> {{ issue.title }}
              </span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="eventViewerOpen = false">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="sessionProgressOpen">
      <DialogContent
        class="sm:max-w-130"
        @pointer-down-outside="(event) => sessionActionLoading && event.preventDefault()"
        @escape-key-down="(event) => sessionActionLoading && event.preventDefault()"
      >
        <DialogHeader>
          <DialogTitle>{{ sessionOperationTitle }}</DialogTitle>
          <DialogDescription>
            The session is being processed event by event. Keep this window open until it finishes.
          </DialogDescription>
        </DialogHeader>
        <div class="space-y-4 py-2">
          <Progress :model-value="sessionOperationPercent" class="h-2.5" />
          <div class="grid grid-cols-3 gap-2 text-center text-xs">
            <div class="rounded-md border p-2"><strong class="block text-base">{{ sessionOperation?.total ?? 0 }}</strong>Total</div>
            <div class="rounded-md border p-2"><strong class="block text-base text-emerald-600">{{ sessionOperation?.completed ?? 0 }}</strong>Completed</div>
            <div class="rounded-md border p-2"><strong class="block text-base text-destructive">{{ sessionOperation?.failed ?? 0 }}</strong>Failed</div>
          </div>
          <div v-if="sessionOperation?.failures?.length" class="max-h-36 space-y-1 overflow-y-auto rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs">
            <p v-for="failure in sessionOperation.failures" :key="`${failure.label}-${failure.message}`">
              <strong>{{ failure.label }}:</strong> {{ failure.message }}
            </p>
          </div>
        </div>
        <DialogFooter v-if="!sessionActionLoading">
          <Button variant="outline" @click="sessionProgressOpen = false">Close</Button>
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
import { Camera, ChevronDown, ChevronUp, MapPin, Plus, X, Zap } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
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
  RouteEldEventCameraAnalysis,
  RouteEldHosEvent,
  RouteEldSessionOperation,
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
import CBoostEventTableColumnSettings from '../components/CBoostEventTableColumnSettings.vue'
import {
  boostEventTableColumnOptions,
  useBoostEventTableColumns,
} from '../composables/useBoostEventTableColumns'
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
  coDriverGraphEvents,
  latestPeriodCoDriver,
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
const statusFilter = ref('__all__')
const showCoDrivers = ref(false)
const driverFilter = ref('__all__')
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
const alprLoading = ref(false)
const alprAnalysis = ref<RouteEldEventCameraAnalysis | null>(null)
const sessionProgressOpen = ref(false)
const sessionActionLoading = ref(false)
const sessionOperationType = ref<'submit' | 'rollback'>('submit')
const sessionOperation = ref<RouteEldSessionOperation | null>(null)
const { visibility: eventTableColumnVisibility, setVisible: setEventTableColumnVisible, showAll: showAllEventTableColumns } =
  useBoostEventTableColumns(computed(() => store.activeTabId))
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
const statusFilterOptions = computed(() =>
  Array.from(
    new Set(
      dailyEvents.value
        .flatMap((group) => group.events)
        .map((event) => String(event.eventRecordStatus || 'ACTIVE').toUpperCase())
    )
  ).sort()
)
const filteredDailyEvents = computed(() => {
  return dailyEvents.value.map((group) => ({
    ...group,
    events: group.events.filter(
      (event) =>
        (event.changeStatus !== 'CO_DRIVER' ? true : showCoDrivers.value) &&
        (driverFilter.value === '__all__' ||
          (driverFilter.value === '__co_driver__' && event.changeStatus === 'CO_DRIVER') ||
          (driverFilter.value === '__main__' && event.changeStatus !== 'CO_DRIVER')) &&
        (changeFilter.value === '__all__' ||
          String(event.changeStatus || 'UNCHANGED').toUpperCase() === changeFilter.value) &&
        (statusFilter.value === '__all__' ||
          String(event.eventRecordStatus || 'ACTIVE').toUpperCase() === statusFilter.value)
    ),
  }))
})
watch(showCoDrivers, (visible) => {
  if (!visible) driverFilter.value = '__all__'
})
const changeStatusLabel = (value?: string) => {
  const normalized = String(value || 'UNCHANGED').toUpperCase()
  const label = normalized.replaceAll('_', ' ').toLowerCase()
  return label.charAt(0).toUpperCase() + label.slice(1)
}
const eventStatusLabel = (value?: string) =>
  String(value || 'UNKNOWN')
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/^./, (letter) => letter.toUpperCase())
const hasAlprOrigin = computed(() =>
  graphEvents.value.some((event) => event.latitude != null && event.longitude != null)
)
const issueCount = computed(() => workspace.value?.calculations.eventIssues.length ?? 0)
const sessionOperationPercent = computed(() => {
  const operation = sessionOperation.value
  if (!operation?.total) return operation?.status === 'COMPLETED' ? 100 : 0
  return Math.min(100, Math.round(((operation.completed + operation.failed) / operation.total) * 100))
})
const sessionOperationTitle = computed(() => {
  const prefix = sessionOperationType.value === 'rollback' ? 'Rollback' : 'Submit'
  if (sessionActionLoading.value) return `${prefix} in progress`
  if (sessionOperation.value?.failed) return `${prefix} finished with issues`
  return `${prefix} complete`
})
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
    { label: 'Positioning', value: event.positioning || '—' },
    { label: 'Location', value: event.location || event.driverLocationDescription || '—' },
    {
      label: 'Coordinates',
      value:
        event.latitude == null || event.longitude == null
          ? '—'
          : `${event.latitude.toFixed(6)}, ${event.longitude.toFixed(6)}`,
    },
    { label: 'Vehicle', value: event.vehicleName || event.vehicleVin || '—' },
    { label: 'Odometer', value: event.odometerMiles == null ? '—' : String(event.odometerMiles) },
    { label: 'Engine hours', value: event.engineHours == null ? '—' : String(event.engineHours) },
    { label: 'ELD', value: event.eldSerialNumber || event.eldMacAddress || event.eldId || '—' },
    { label: 'Trailers', value: source.trailers.join(', ') || '—' },
    { label: 'Documents', value: source.documents.join(', ') || '—' },
    { label: 'Notes', value: event.notes || '—' },
    { label: 'Change', value: source.changeStatus || 'Unchanged' },
    { label: 'Version', value: String(source.version ?? '—') },
    { label: 'Delivery', value: source.isSubmitted ? (source.isRolledBack ? 'Rolled back' : 'Submitted') : 'Not submitted' },
    { label: 'DOT freeze', value: event.isFrozen ? event.freezeSource || 'Frozen' : 'No' },
  ]
})
const selectedViewEventIssues = computed(() => {
  const id = selectedViewEvent.value?.event?.id
  return id ? workspace.value?.calculations.eventIssues.filter((issue) => issue.eventId === id) ?? [] : []
})

const runSessionAction = async (action: 'submit' | 'rollback') => {
  sessionOperationType.value = action
  sessionOperation.value = null
  sessionProgressOpen.value = true
  sessionActionLoading.value = true
  try {
    const result = await store.runSessionOperation(action, (operation) => {
      sessionOperation.value = { ...operation, failures: [...operation.failures] }
    })
    if (result) sessionOperation.value = result
    if (result?.failed) toast.warning(`${result.failed} event${result.failed === 1 ? '' : 's'} could not be processed`)
    else toast.success(action === 'rollback' ? 'Session rolled back successfully' : 'Session submitted successfully')
  } catch (error: any) {
    toast.error(error?.response?.data?.message || error?.message || `Session ${action} failed`)
  } finally {
    sessionActionLoading.value = false
  }
}

const selectInitialTab = () => {
  const initial = tabs.value.find((tab) => tab.type === 0)
  if (initial) selectTab(initial)
}
const onSelectedRowIdsUpdate = (ids: string[]) => {
  selectedRowIds.value = ids
}
const onGraphEventSelect = (event: any) => {
  const eventId = typeof event === 'string' ? event : String(event?.eventId || event?.id || '')
  if (!eventId) return
  getSelectedEvent(eventId)
  const row = dailyEvents.value.flatMap((group) => group.events).find((item) => item.eventId === eventId)
  if (row && row.actionState !== 4 && row.actionState !== 8 && !selectedRowIds.value.includes(eventId)) {
    selectedRowIds.value = [...selectedRowIds.value, eventId]
  }
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
const analyzeAlpr = async () => {
  if (!session.value || !store.activeTabId || !hasAlprOrigin.value) return
  alprLoading.value = true
  try {
    const response = await api.get<RouteEldEventCameraAnalysis | ApiEnvelope<RouteEldEventCameraAnalysis>>(
      ApiEndpoints.ROUTE_ELD_EVENT_SESSION_CAMERAS(session.value.id, store.activeTabId),
      { params: { radiusMetres: 150 } }
    )
    alprAnalysis.value = 'successResult' in response.data ? response.data.successResult : response.data
    toast.success(
      alprAnalysis.value.matches.length
        ? `${alprAnalysis.value.matches.length} events matched ALPR cameras`
        : 'No ALPR cameras matched these event locations'
    )
  } catch (error: any) {
    toast.error(error?.response?.data?.message || error?.message || 'ALPR cameras could not be analyzed')
  } finally {
    alprLoading.value = false
  }
}
watch([() => session.value?.id, () => store.activeTabId], () => {
  alprAnalysis.value = null
})
const handleFreeTimeClick = (freeTime: BoostFreeTime) => {
  boostGraphRef.value?.scrollToEventSegment?.(freeTime.eventId)
}
const openEventViewer = (eventId: string) => {
  selectedViewEvent.value = getEventDetails(eventId)
  if (!selectedViewEvent.value) {
    const event = coDriverGraphEvents.value.find((item) => item.id === eventId)
    if (event) {
      selectedViewEvent.value = {
        event,
        trailers: event.trailers,
        documents: event.documents,
        changeStatus: 'CO_DRIVER',
        version: 0,
        isSubmitted: false,
        isRolledBack: false,
      }
    }
  }
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
