<template>
  <div class="space-y-3 bg-muted/30 pb-0 pt-1">
    <CBoostToolbar
      class="sticky top-[65px] z-40 bg-background shadow-sm"
      :tabs="tabs"
      :selected-tab="selectedTab"
      :session-status="session?.status"
      :pending-submission-count="session?.pendingSubmissionCount ?? 0"
      :pending-rollback-count="session?.pendingRollbackCount ?? 0"
      :rollback-blocked="Boolean(session?.isRollbackBlocked)"
      :can-manage-tabs="session?.status === 'DRAFT' && allowed('route_eld.log_details.tabs.manage')"
      :allow-submit="allowed('route_eld.log_details.submit')"
      :allow-rollback="allowed('route_eld.log_details.rollback')"
      :actions-pending="store.isBusy"
      :submit-loading="sessionActionLoading"
      :driver-id="activeDriverId"
      :main-driver-id="session?.driverId"
      :main-driver-name="session?.driverName"
      :co-driver-id="session?.coDriverId"
      :co-driver-name="session?.coDriverName"
      @update:driver-id="selectedDriverId = $event"
      @initial-click="selectInitialTab"
      @new-click="addNewTab"
      @session-action="runSessionAction"
      @select-tab="selectTab"
      @remove-tab="removeTab"
      @ai-advice-click="aiAdviceOpen = true"
    />
    <div
      v-if="store.isSessionLocked && !sessionProgressOpen"
      class="mx-4 flex items-center justify-between rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs"
    >
      <span>
        {{ sessionOperationType === 'rollback' ? 'Rollback' : 'Submit' }} in progress ·
        {{ sessionOperation?.completed ?? 0 }} / {{ sessionOperation?.total ?? 0 }} ·
        {{ sessionOperationPercent }}%
      </span>
      <Button size="sm" variant="outline" class="h-7 text-xs" @click="sessionProgressOpen = true">
        View
      </Button>
    </div>

    <section class="border-y border-border bg-background px-6 py-4">
      <div class="mb-3 grid grid-cols-1 items-center gap-3 2xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <div class="flex min-w-0 flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            class="h-9 px-4 text-xs border-[#AF4B4B] text-[#AF4B4B] hover:bg-[#AF4B4B]/10"
            :disabled="store.isBusy || sessionActionLoading || violations.length === 0"
            @click="showViolationModal = true"
          >
            Violations
          </Button>
          <Button
            variant="outline"
            size="sm"
            class="h-9 px-4 text-xs border-[#AF4B4B] text-[#AF4B4B] hover:bg-[#E74C3C]/10 disabled:opacity-40"
            :disabled="errorCount + warningCount === 0 || store.isBusy || sessionActionLoading"
            @click="showErrorWarningModal = true"
          >
            <span class="text-red-600">Errors: {{ errorCount }}</span>
            <span class="text-muted-foreground">·</span>
            <span class="text-amber-600">Warnings: {{ warningCount }}</span>
          </Button>
          <!-- <div class="min-w-0">
            <h2 class="text-sm font-semibold">Duty-status graph</h2>
            <p class="text-xs text-muted-foreground">{{ sessionPeriodLabel }}</p>
          </div> -->
        </div>
        <CBoostGraphHeaderControls
          class="justify-self-center"
          :free-times="boostFreeTimes"
          @free-time-click="handleFreeTimeClick"
        />
        <Button variant="outline" size="sm" class="justify-self-end" @click="showGraph = !showGraph">
          <ChevronUp v-if="showGraph" class="mr-2 h-4 w-4" />
          <ChevronDown v-else class="mr-2 h-4 w-4" />
          {{ showGraph ? 'Hide graph' : 'Show graph' }}
        </Button>
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
        :free-times="displayedFreeTimes"
        :violations="activeCalculations?.violations ?? []"
        :event-issues="activeCalculations?.eventIssues ?? []"
        :reassigned-events="workspace?.reassignedEvents.map((item) => item.event) ?? []"
        :co-driver-events="coDriverRenderEnabled ? coDriverGraphEvents : []"
        :co-driver-name="activeDriverId === session?.driverId ? session?.coDriverName : session?.driverName"
        :is-graph-loading="isGraphLoading"
        @selected-event="onGraphEventSelect"
        @boost-select="onGraphBoostSelect"
      >
        <template #graph-actions>
          <button
            v-if="session?.coDriverId"
            type="button"
            role="switch"
            :aria-checked="showCoDrivers"
            class="inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] font-medium"
            title="Show both drivers' logs"
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
            Both
            <span v-if="showCoDrivers" class="max-w-28 truncate">
              {{ activeDriverId === session?.driverId ? session?.coDriverName : session?.driverName }}
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
              <span
                class="flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-[9px] font-bold text-background"
              >
                {{ index + 1 }}
              </span>
              <span class="truncate">{{ event.eventName }} · {{ formatGraphEventTime(event.timestamp) }}</span>
            </button>
            <Button
              v-if="rangeBoostSelectedEvents.length === 2 && allowed('route_eld.log_details.boost')"
              size="sm"
              class="h-6 px-2 text-xs"
              :disabled="Boolean(rangeBoostSelectionError)"
              :title="rangeBoostSelectionError || 'Open Boost'"
              @click="openRangeBoostModal"
            >
              <Zap class="mr-1 h-3 w-3" /> Boost
            </Button>
            <Button
              variant="ghost"
              size="icon"
              class="h-6 w-6"
              title="Clear Boost selection"
              @click="clearRangeBoost"
            >
              <X class="h-3.5 w-3.5" />
            </Button>
          </div>
          <span v-else-if="allowed('route_eld.log_details.boost')" class="text-xs text-muted-foreground">Right-click two graph segments to Boost time</span>
        </template>
      </CBoostGraph>
    </section>

    <section class="border-y border-border bg-background">
      <CBoostEventsTable
        :events="filteredDailyEvents"
        :loading="isDailyEventsLoading"
        :selected-event-id="selectedEventId"
        :highlighted-event-id="highlightedEventId"
        :selected-row-ids="selectedRowIds"
        :show-driver-column="Boolean(session?.coDriverId)"
        :main-driver-id="session?.driverId"
        :active-driver-id="activeDriverId"
        :can-edit-profile="canEditSession && allowed('route_eld.log_details.profile_forms.edit')"
        :drag-drop-enabled="dragDropEnabled && canEditSession"
        :can-edit-events="canEditSession && allowed('route_eld.log_details.events.edit')"
        :can-insert-events="canEditSession && allowed('route_eld.log_details.events.insert')"
        :can-delete-events="canEditSession && allowed('route_eld.log_details.events.delete')"
        :mutation-pending="store.isBusy"
        :can-retry-delivery="canRetryDelivery"
        :retrying-event-id="retryingEventId"
        :column-visibility="eventTableColumnVisibility"
        :time-zone="workspaceTimeZone"
        :camera-event-ids="cameraEventIds"
        @toggle-selection="onTableEventSelect"
        @update:selected-row-ids="onSelectedRowIdsUpdate"
        @edit-event="openEditableEvent"
        @copy-event="openCopiedEvent"
        @delete-event="deleteBoostEvent"
        @revert-event="revertBoostEvent"
        @view-event="openEventViewer"
        @edit-profile="openEditDailyForm"
        @drop-property="handleDropProperty"
        @retry-delivery="retryEventDelivery"
        @open-camera-route="openCameraRoute"
      />
    </section>

    <CBoostActions
      :action-pending="store.isBusy"
      :drag-drop-enabled="dragDropEnabled && canEditSession"
      :can-edit="canEditSession && allowed('route_eld.log_details.events.edit')"
      :can-delete="allowed('route_eld.log_details.events.delete')"
      :can-multi-update="allowed('route_eld.log_details.events.multi_update')"
      :can-boost="allowed('route_eld.log_details.boost')"
      :can-normalize="allowed('route_eld.log_details.normalize')"
      :can-certification="allowed('route_eld.log_details.certification_fix')"
      :can-reassign="allowed('route_eld.log_details.reassign_replicate')"
      :delete-disabled="!selectedRowIds.length || !canEditSession"
      :delete-loading="deletingSelectedEvents"
      :duration-disabled="
        selectedRowIds.length !== 1 || !canEditSession || Boolean(durationSelectionError)
      "
      :duration-title="durationSelectionError"
      :reassign-disabled="!selectedRowIds.length || !canEditSession"
      :normalize-disabled="!canEditSession"
      :selected-count="selectedRowIds.length"
      @dragdrop-change="dragDropEnabled = $event"
      @delete-click="deleteSelectedBoostEvents"
      @duration-click="openDurationModal"
      @reassign-click="openReassignModal"
      @multi-update-click="multiUpdateModalOpen = true"
      @normalize-click="openNormalize"
      @certification-click="openCertification"
    >
      <template #leading>
        <CBoostEventTableColumnSettings
          :options="boostEventTableColumnOptions"
          :model-value="eventTableColumnVisibility"
          @toggle="setEventTableColumnVisible"
          @show-all="showAllEventTableColumns"
        />
        <Select v-model="statusFilter">
          <SelectTrigger class="h-9 w-36 text-sm font-normal">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent :body-lock="false">
            <SelectItem value="__all__">All statuses</SelectItem>
            <SelectItem v-for="option in statusFilterOptions" :key="option" :value="option">{{ eventStatusLabel(option) }}</SelectItem>
          </SelectContent>
        </Select>
        <Select v-if="session?.coDriverId" v-model="driverFilter">
          <SelectTrigger class="h-9 w-40 text-sm font-normal">
            <SelectValue placeholder="Driver" />
          </SelectTrigger>
          <SelectContent :body-lock="false">
            <SelectItem value="__all__">All drivers</SelectItem>
            <SelectItem value="__main__">{{ session?.driverName || 'Driver' }}</SelectItem>
            <SelectItem value="__co_driver__">{{ latestPeriodCoDriver?.name || 'Co-driver' }}</SelectItem>
          </SelectContent>
        </Select>
        <Select v-model="changeFilter">
          <SelectTrigger class="h-9 w-34 text-sm font-normal">
            <SelectValue placeholder="All changes" />
          </SelectTrigger>
          <SelectContent :body-lock="false">
            <SelectItem value="__all__">All changes</SelectItem>
            <SelectItem v-for="option in changeFilterOptions" :key="option" :value="option">{{ changeStatusLabel(option) }}</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" class="h-9 text-sm" @click="showLocationFinderModal = true">
          <MapPin class="mr-2 h-4 w-4" /> Location finder
        </Button>
        <Button variant="outline" size="sm" class="h-9 text-sm" :disabled="!hasAlprOrigin" @click="alprRouteOpen = true">
          <RouteIcon class="mr-2 h-4 w-4" /> ALPR route
        </Button>
        <Button v-if="allowed('route_eld.log_details.events.insert')" variant="outline" size="sm" class="h-9 text-sm" :disabled="!canEditSession" @click="openInsertModal">
          <Plus class="mr-2 h-4 w-4" /> Insert event
        </Button>
      </template>
    </CBoostActions>

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
      :external-error="rangeBoostFailureReason"
      :time-zone="workspaceTimeZone"
      :loading="store.isMutating"
      @reset-error="rangeBoostFailureReason = ''"
      @switch="
        rangeBoostSourceIndex = rangeBoostSourceIndex === 0 ? 1 : 0;
        rangeBoostFailureReason = ''
      "
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
      :disable-sleeper-berth="Boolean(activeDriverId === session?.driverId
        ? session?.disableSleeperBerth : session?.coDriverDisableSleeperBerth)"
      :from-date="session?.fromDate"
      :to-date="session?.toDate"
      :loading="isEditEventLoading"
      :readonly="eventEditorReadonly"
      @update:form="updateEditEventForm"
      @submit="submitEditEvent"
      @delete="deleteEventFromEditor"
    />
    <CBoostMultiUpdateModal
      v-model:open="multiUpdateModalOpen"
      :events="selectedEventsForUpdate"
      :source-events="selectedSourceEvents"
      :session="session"
      :loading="isMultiUpdateLoading"
      @submit="submitMultiUpdateEvents"
    />
    <CBoostEditDailyFormModal
      v-model:open="showEditDailyFormModal"
      :form="editDailyForm"
      :loading="isEditDailyFormLoading"
      @update:form="updateEditDailyForm"
      @submit="submitDailyForm"
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
      :result="normalizeResult"
      @reset-result="normalizeResult = null"
      @submit="runNormalize"
    />
    <CBoostDurationModal
      v-model:open="durationOpen"
      :loading="store.isMutating"
      :selected-event="durationSelectedEvent"
      :selected-duration-ms="durationSelectedDurationMs"
      :available-expand-ms="durationAvailableExpandMs"
      :available-reduce-ms="durationAvailableReduceMs"
      :selected-rest-duration-ms="selectedRestCongestion?.durationMs ?? null"
      :has-reduce-receiver="Boolean(eligibleDurationReceiver)"
      :selection-error="durationSelectionError"
      :external-error="durationFailureReason"
      @reset-error="durationFailureReason = ''"
      @submit="runDurationBoost"
    />

    <CBoostAlprRouteDialog
      v-model:open="alprRouteOpen"
      :session-id="session?.id ?? null"
      :tab-id="store.activeTabId"
      :driver-id="activeDriverId"
    />

    <CBoostEventCameraDialog
      v-if="cameraRouteOpen"
      v-model:open="cameraRouteOpen"
      :loading="cameraRouteLoading"
      :error="cameraRouteError"
      :events="graphEvents"
      :selected-event-id="cameraRouteEventId"
      :analysis="cameraRouteAnalysis"
    />

    <Dialog v-model:open="sessionProgressOpen">
      <DialogContent class="sm:max-w-130">
        <DialogHeader>
          <DialogTitle>{{ sessionOperationTitle }}</DialogTitle>
          <DialogDescription>
            The session is processed in the background. You can close this window and keep working;
            this session stays locked until it finishes.
          </DialogDescription>
        </DialogHeader>
        <div class="space-y-4 py-2">
          <div class="relative h-7 overflow-hidden rounded-full bg-muted">
            <div
              class="h-full bg-primary transition-[width] duration-300"
              :style="{ width: `${sessionOperationPercent}%` }"
            />
            <span
              class="absolute inset-0 flex items-center justify-center text-[11px] font-semibold"
              :class="sessionOperationPercent > 52 ? 'text-primary-foreground' : 'text-foreground'"
            >
              {{ sessionOperation?.completed ?? 0 }} /
              {{ sessionOperation?.total ?? 0 }} · {{ sessionOperationPercent }}%
            </span>
          </div>
          <div class="grid grid-cols-3 gap-2 text-center text-xs">
            <div class="rounded-md border p-2">
              <strong class="block text-base">{{ sessionOperation?.total ?? 0 }}</strong>Total
            </div>
            <div class="rounded-md border p-2">
              <strong class="block text-base text-emerald-600">{{
                sessionOperation?.succeeded ?? 0
              }}</strong>Succeeded
            </div>
            <div class="rounded-md border p-2">
              <strong class="block text-base text-destructive">{{
                sessionOperation?.failed ?? 0
              }}</strong>Failed
            </div>
          </div>
          <div
            v-if="sessionOperation?.failures?.length"
            class="max-h-36 space-y-1 overflow-y-auto rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs"
          >
            <p
              v-for="failure in sessionOperation.failures"
              :key="`${failure.label}-${failure.message}`"
            >
              <strong>{{ failure.label }}:</strong> {{ failure.message }}
            </p>
          </div>
          <p
            v-if="sessionOperationError"
            role="alert"
            class="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive"
          >
            {{ sessionOperationError }}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="sessionProgressOpen = false">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog :open="deleteProgressOpen" @update:open="(open) => { if (open || !deletingSelectedEvents) deleteProgressOpen = open }">
      <DialogContent
        class="sm:max-w-md"
        :show-close="!deletingSelectedEvents"
        @pointer-down-outside="(event) => deletingSelectedEvents && event.preventDefault()"
        @escape-key-down="(event) => deletingSelectedEvents && event.preventDefault()"
      >
        <DialogHeader>
          <DialogTitle>{{ deletingSelectedEvents ? 'Deleting selected events' : 'Delete complete' }}</DialogTitle>
          <DialogDescription>The selected events are processed in the active workspace tab.</DialogDescription>
        </DialogHeader>
        <div class="space-y-3 py-2">
          <div class="h-2 overflow-hidden rounded-full bg-muted">
            <div class="h-full bg-primary transition-[width] duration-300" :style="{ width: `${deleteProgress.total ? deleteProgress.completed / deleteProgress.total * 100 : 0}%` }" />
          </div>
          <div class="grid grid-cols-4 gap-2 text-center text-xs">
            <div class="rounded-md border p-2"><strong class="block text-base">{{ deleteProgress.total }}</strong>Total</div>
            <div class="rounded-md border p-2"><strong class="block text-base text-emerald-600">{{ deleteProgress.deleted }}</strong>Deleted</div>
            <div class="rounded-md border p-2"><strong class="block text-base">{{ deleteProgress.skipped }}</strong>Skipped</div>
            <div class="rounded-md border p-2"><strong class="block text-base text-destructive">{{ deleteProgress.failed }}</strong>Failed</div>
          </div>
        </div>
        <DialogFooter v-if="!deletingSelectedEvents">
          <Button variant="outline" @click="deleteProgressOpen = false">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <CBoostCertificationModal
      v-model:open="certificationOpen"
      :report="certificationReport"
      :loading="certificationLoading"
      :fixing="certificationFixing"
      :can-edit="canEditSession"
      :time-zone="workspaceTimeZone"
      @apply="applyCertificationFix"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, onActivated, onBeforeUnmount, onDeactivated, onMounted, ref, watch } from 'vue'
import dayjs from 'dayjs'
import { useRoute, useRouter } from 'vue-router'
import {
  ChevronDown,
  ChevronUp,
  MapPin,
  Plus,
  Route as RouteIcon,
  X,
  Zap,
} from 'lucide-vue-next'
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
import { getApiErrorMessage, useApi } from '@/composables/useAxiosService'
import { ApiEndpoints } from '@/api/endpoints'
import { useAuthStore } from '@/modules/Auth/store/authStore'
import { hasPermission } from '@/router/permissions'
import type { BoostFreeTime } from '@/modules/ELD/LogsModule/[Id]/types/chart'
import type {
  RouteEldAiAdvice,
  RouteEldCertificationReport,
  RouteEldEventCameraAnalysis,
  RouteEldEventCameraPresence,
  RouteEldHosEvent,
  RouteEldNormalizeResponse,
  RouteEldNormalizeType,
  RouteEldSessionOperation,
} from '../types/boost'
import CBoostToolbar from '../components/CBoostToolbar.vue'
import CBoostGraphHeaderControls from '../components/CBoostGraphHeaderControls.vue'
import { cameraPresenceCache } from '@/composables/cameraPresenceCache'
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
import CBoostAlprRouteDialog from '../components/modals/CBoostAlprRouteDialog.vue'
import CBoostEventTableColumnSettings from '../components/CBoostEventTableColumnSettings.vue'
import {
  boostEventTableColumnOptions,
  useBoostEventTableColumns,
} from '../composables/useBoostEventTableColumns'
import {
  buildRouteEldRestCongestions,
  findRouteEldRestCongestion,
  isRouteEldEventWithinSession,
  isRouteEldTimestampWithinSession,
  resolveRouteEldScheduleTimeZone,
  useScheduleBoost,
} from '../composables/useScheduleBoost'

const CBoostEventCameraDialog = defineAsyncComponent(
  () => import('../components/modals/CBoostEventCameraDialog.vue')
)

const api = useApi()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const allowed = (code: string) => hasPermission(authStore.token, code)
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
  selectedDriverId,
  activeDriverId,
  activeCalculations,
  showCoDrivers,
  coDriverRenderEnabled,
  latestPeriodCoDriver,
  graphEventDurationById,
  dailyPixelViolations,
  pinTimes,
  displayedFreeTimes,
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
  deleteProgressOpen,
  deletingSelectedEvents,
  deleteProgress,
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
  selectTab,
  addNewTab,
  removeTab,
  deleteBoostEvent,
  deleteSelectedBoostEvents,
  copyBoostEvent,
  revertBoostEvent,
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
const statusFilter = ref('ACTIVE')
const driverFilter = ref('__main__')
const showLocationFinderModal = ref(false)
const showErrorWarningModal = ref(false)
const showViolationModal = ref(false)
const aiAdviceOpen = ref(false)
const aiAdviceLoading = ref(false)
const aiAdviceResult = ref<RouteEldAiAdvice | null>(null)
const normalizeOpen = ref(false)
const normalizeResult = ref<RouteEldNormalizeResponse | null>(null)
const certificationOpen = ref(false)
const certificationLoading = ref(false)
const certificationFixing = ref(false)

interface ApiEnvelope<T> {
  successResult: T
}

const certificationReport = ref<RouteEldCertificationReport | null>(null)
const durationOpen = ref(false)
const durationFailureReason = ref('')
const reassignTargetsLoading = ref(false)
const eventEditorReadonly = ref(false)
const cameraRouteOpen = ref(false)
const cameraRouteLoading = ref(false)
const cameraRouteError = ref('')
const cameraRouteEventId = ref('')
const cameraRouteAnalysis = ref<RouteEldEventCameraAnalysis | null>(null)
let cameraRouteRequestId = 0
const alprRouteOpen = ref(false)
const highlightedEventId = ref('')
let highlightTimer: ReturnType<typeof setTimeout> | null = null
const sessionProgressOpen = ref(false)
const retryingEventId = ref('')
const canRetryDelivery = computed(() =>
  !store.isLoading && (
  store.activeTab?.kind === 'ROLLBACK'
    ? allowed('route_eld.log_details.rollback')
    : store.activeTab?.kind === 'FINAL' && allowed('route_eld.log_details.submit'))
)
const sessionActionStarting = ref(false)
const sessionActionLoading = computed(() => sessionActionStarting.value || store.isSessionLocked)
const sessionOperationType = ref<'submit' | 'rollback'>('submit')
const sessionOperation = ref<RouteEldSessionOperation | null>(null)
const sessionOperationError = ref('')
watch(
  () => store.activeOperation,
  (active) => {
    if (!active || active.sessionId !== store.session?.id) return
    sessionOperationType.value = active.type
    sessionOperation.value = { ...active.operation, failures: [...(active.operation.failures ?? [])] }
  },
  { immediate: true, deep: true }
)
const canEditSession = computed(
  () => !store.isLoading && !store.isSessionLocked && session.value?.status === 'DRAFT' && workspace.value?.canEdit === true && store.activeTab?.kind === 'WORKING'
)
watch(() => store.coDriverSyncError, (message) => {
  if (message && route.name === 'ELDBoost') toast.error(message)
})
const {
  visibility: eventTableColumnVisibility,
  setVisible: setEventTableColumnVisible,
  showAll: showAllEventTableColumns,
} = useBoostEventTableColumns(computed(() => store.activeTabId))
const stableScrollbarClass = 'boost-scrollbar-stable'

const enableStableScrollbar = () => document.body.classList.add(stableScrollbarClass)
const disableStableScrollbar = () => document.body.classList.remove(stableScrollbarClass)

onMounted(enableStableScrollbar)
onActivated(enableStableScrollbar)
onDeactivated(disableStableScrollbar)
onBeforeUnmount(() => {
  disableStableScrollbar()
  if (highlightTimer) clearTimeout(highlightTimer)
  if (cameraCheckTimer) clearTimeout(cameraCheckTimer)
  cameraCheckQueue.length = 0
  activeCameraCheck?.controller.abort()
})

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
  (workspace.value?.events ?? [])
    .filter((item) => !item.isDeleted &&
      (item.ownerDriverId || session.value?.driverId) === activeDriverId.value)
    .map((item) => item.event)
)
type CameraSource = { eventId: string; signature: string }
const cameraSources = computed<CameraSource[]>(() => {
  if (!session.value || workspace.value?.session.id !== session.value.id ||
      workspace.value.tabId !== store.activeTabId) return []
  const located = workspace.value.events
    .filter((item) => !item.isDeleted && item.event.recordStatus.toUpperCase() === 'ACTIVE' &&
      item.event.latitude != null && item.event.longitude != null &&
      Number.isFinite(item.event.latitude) && Number.isFinite(item.event.longitude))
    .sort((a, b) => a.event.timestamp - b.event.timestamp)
  return located.map((item, index) => ({
      eventId: item.event.id,
      signature: [located[index - 1]?.event, item.event, located[index + 1]?.event]
        .map((event) => event ? `${event.latitude}:${event.longitude}` : '').join('|'),
    }))
})
const cameraChecksPending = new Map<string, string>()
const cameraCheckQueue: Array<{
  sessionId: string
  tabId: string
  sources: CameraSource[]
}> = []
let cameraCheckWorkers = 0
let activeCameraCheck: { sessionId: string; tabId: string; controller: AbortController } | null = null
let cameraCheckErrorShown = false
let cameraCheckTimer: ReturnType<typeof setTimeout> | null = null
const cameraCacheKey = (sessionId: string, tabId: string, eventId: string) =>
  `${sessionId}:${tabId}:${eventId}`
const cameraEventIds = computed(() => {
  const sessionId = session.value?.id
  const tabId = store.activeTabId
  if (!sessionId || !tabId) return []
  return cameraSources.value
    .filter(({ eventId, signature }) => {
      const cached = cameraPresenceCache.get(cameraCacheKey(sessionId, tabId, eventId))
      return cached?.signature === signature && cached.hasCamera
    })
    .map(({ eventId }) => eventId)
})
const runCameraCheckQueue = () => {
  while (cameraCheckWorkers < 1 && cameraCheckQueue.length) {
    cameraCheckWorkers++
    void (async () => {
      try {
        while (cameraCheckQueue.length) {
          const batch = cameraCheckQueue.shift()!
          const controller = new AbortController()
          activeCameraCheck = { sessionId: batch.sessionId, tabId: batch.tabId, controller }
          try {
            const response = await api.post<
              RouteEldEventCameraPresence[] | ApiEnvelope<RouteEldEventCameraPresence[]>
            >(ApiEndpoints.ROUTE_ELD_EVENT_SESSION_CAMERA_PRESENCE(batch.sessionId, batch.tabId),
              { eventIds: batch.sources.map((source) => source.eventId) },
              { params: { radiusMetres: 150 }, signal: controller.signal })
            const results = 'successResult' in response.data
              ? response.data.successResult : response.data
            cameraCheckErrorShown = false
            const byId = new Map(results.map((result) => [result.eventId, result.hasCamera]))
            for (const source of batch.sources) {
              const key = cameraCacheKey(batch.sessionId, batch.tabId, source.eventId)
              const cached = cameraPresenceCache.get(key)
              const current = cameraSources.value.find((item) => item.eventId === source.eventId)
              if (current?.signature === source.signature &&
                  !(cached?.routeVerified && cached.signature === source.signature))
                cameraPresenceCache.set(key, { signature: source.signature, hasCamera: byId.get(source.eventId) === true })
            }
            for (const source of batch.sources) {
              const key = cameraCacheKey(batch.sessionId, batch.tabId, source.eventId)
              if (cameraChecksPending.get(key) === source.signature) cameraChecksPending.delete(key)
            }
          } catch (error: any) {
            for (const source of batch.sources) {
              const key = cameraCacheKey(batch.sessionId, batch.tabId, source.eventId)
              if (cameraChecksPending.get(key) === source.signature) cameraChecksPending.delete(key)
            }
            if (!controller.signal.aborted && !cameraCheckErrorShown) {
              cameraCheckErrorShown = true
              toast.error(getApiErrorMessage(error, 'Camera analysis could not be loaded'))
            }
          } finally {
            if (activeCameraCheck?.controller === controller) activeCameraCheck = null
          }
        }
      } finally {
        cameraCheckWorkers--
        if (cameraCheckQueue.length) runCameraCheckQueue()
      }
    })()
  }
}
const dropQueuedCameraChecks = () => {
  const sessionId = session.value?.id
  const tabId = store.activeTabId
  if (activeCameraCheck &&
      (activeCameraCheck.sessionId !== sessionId || activeCameraCheck.tabId !== tabId))
    activeCameraCheck.controller.abort()
  for (let index = cameraCheckQueue.length - 1; index >= 0; index--) {
    const batch = cameraCheckQueue[index]
    if (batch.sessionId === sessionId && batch.tabId === tabId) continue
    cameraCheckQueue.splice(index, 1)
    for (const source of batch.sources) {
      const key = cameraCacheKey(batch.sessionId, batch.tabId, source.eventId)
      if (cameraChecksPending.get(key) === source.signature) cameraChecksPending.delete(key)
    }
  }
}
watch(
  () => `${session.value?.id}:${store.activeTabId}:${cameraSources.value.map(
    ({ eventId, signature }) => `${eventId}=${signature}`
  ).join('|')}`,
  () => {
    dropQueuedCameraChecks()
    if (cameraCheckTimer) clearTimeout(cameraCheckTimer)
    cameraCheckTimer = setTimeout(() => {
      cameraCheckTimer = null
      const sessionId = session.value?.id
      const tabId = store.activeTabId
      if (!sessionId || !tabId) return
      const missing = cameraSources.value.filter(({ eventId, signature }) => {
        const key = cameraCacheKey(sessionId, tabId, eventId)
        return cameraPresenceCache.get(key)?.signature !== signature &&
          cameraChecksPending.get(key) !== signature
      })
      if (!missing.length) return
      for (let index = 0; index < missing.length; index += 200) {
        const sources = missing.slice(index, index + 200)
        for (const source of sources)
          cameraChecksPending.set(cameraCacheKey(sessionId, tabId, source.eventId), source.signature)
        cameraCheckQueue.push({ sessionId, tabId, sources })
      }
      runCameraCheckQueue()
    }, 0)
  },
  { immediate: true, flush: 'post' }
)
const selectedSourceEvents = computed(() =>
  (workspace.value?.events ?? [])
    .filter((item) => !item.isDeleted && selectedRowIds.value.includes(item.event.id))
    .map((item) => item.event)
)
const rangeBoostSelectedIds = ref<string[]>([])
const rangeBoostSourceIndex = ref(0)
const rangeBoostModalOpen = ref(false)
const rangeBoostFailureReason = ref('')
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
  const currentSession = session.value
  const source = rangeBoostSourceEvent.value
  const target = rangeBoostTargetEvent.value
  if (!currentSession || !source || !target) return ''
  if (source.timestamp === target.timestamp)
    return 'Boost boundary events must have different times.'
  if (
    [source, target].some(
      (event) =>
        event.recordStatus.toUpperCase() !== 'ACTIVE' ||
        !['OFF', 'SB', 'D', 'ON'].includes(event.eventCategory)
    )
  )
    return 'Boost boundaries must be active duty events.'
  if (
    !isRouteEldEventWithinSession(source, currentSession) ||
    !isRouteEldEventWithinSession(target, currentSession)
  )
    return 'Events outside the session period cannot participate in Boost.'
  if (
    rangeBoostAffectedEvents.value.some(
      (event) => !isRouteEldEventWithinSession(event, currentSession)
    )
  )
    return 'Boost cannot move a range containing events outside the session period.'
  if (rangeBoostAffectedEvents.value.some((event) => event.isFrozen))
    return 'Boost cannot move a range containing DOT-inspected events.'
  return ''
})

const dutyCategories = new Set(['OFF', 'SB', 'D', 'ON'])
const restCategories = new Set(['OFF', 'SB'])
const minimumVisibleDutyDurationMs = 15 * 60_000
const minimumReceiverDurationMs = 10 * 60 * 60_000
const durationSelectedEvent = computed(() => {
  const eventId = selectedRowIds.value[0]
  return eventId ? (graphEvents.value.find((event) => event.id === eventId) ?? null) : null
})
const durationSelectedDurationMs = computed(() =>
  durationSelectedEvent.value
    ? (graphEventDurationById.value.get(durationSelectedEvent.value.id) ?? 0)
    : 0
)
const restCongestions = computed(() =>
  buildRouteEldRestCongestions(graphEvents.value, graphEventDurationById.value)
)
const selectedRestCongestion = computed(() => {
  const selected = durationSelectedEvent.value
  if (!selected || !restCategories.has(selected.eventCategory)) return null
  return findRouteEldRestCongestion(
    graphEvents.value,
    graphEventDurationById.value,
    selected.id
  )
})
const availableDurationDonors = computed(() => {
  const donors = new Map<
    string,
    {
      freeDurationMs: number
      congestion: (typeof restCongestions.value)[number]
    }
  >()
  for (const freeTime of activeCalculations.value?.freeTimes ?? []) {
    if (selectedRestCongestion.value?.eventIds.includes(freeTime.eventId)) continue
    const congestion = restCongestions.value.find((item) =>
      item.eventIds.includes(freeTime.eventId)
    )
    if (!congestion) continue

    const existing = donors.get(congestion.firstEventId)
    if (!existing || existing.freeDurationMs < freeTime.freeDurationMs) {
      donors.set(congestion.firstEventId, {
        freeDurationMs: freeTime.freeDurationMs,
        congestion,
      })
    }
  }
  return [...donors.values()]
})
const durationAvailableExpandMs = computed(() =>
  availableDurationDonors.value.reduce((total, donor) => total + donor.freeDurationMs, 0)
)
const durationAvailableReduceMs = computed(() => {
  const selected = durationSelectedEvent.value
  if (!selected) return 0
  if (restCategories.has(selected.eventCategory)) {
    return Math.max(
      0,
      (selectedRestCongestion.value?.durationMs ?? 0) - minimumVisibleDutyDurationMs
    )
  }
  return Math.max(0, durationSelectedDurationMs.value - minimumVisibleDutyDurationMs)
})
function congestionCanReceive(eventIds: string[]) {
  const currentSession = session.value
  if (!currentSession) return false
  return eventIds.every((eventId) => {
    const event = graphEvents.value.find((item) => item.id === eventId)
    return !!event && !event.isFrozen && isRouteEldEventWithinSession(event, currentSession)
  })
}
const eligibleDurationReceiver = computed(() => {
  const selected = durationSelectedEvent.value
  if (!selected) return null
  return (
    restCongestions.value
      .filter(
        (congestion) =>
          !congestion.eventIds.includes(selected.id) &&
          congestion.durationMs >= minimumReceiverDurationMs &&
          congestionCanReceive(congestion.eventIds)
      )
      .sort((left, right) => {
        const leftDistance = Math.min(
          Math.abs(selected.timestamp - left.startedAt),
          Math.abs(selected.timestamp - left.endedAt)
        )
        const rightDistance = Math.min(
          Math.abs(selected.timestamp - right.startedAt),
          Math.abs(selected.timestamp - right.endedAt)
        )
        return leftDistance - rightDistance || left.startedAt - right.startedAt
      })[0] ?? null
  )
})
const durationSelectionError = computed(() => {
  if (selectedRowIds.value.length !== 1) return 'Select one event to use Expand/Reduce.'
  const selected = durationSelectedEvent.value
  const currentSession = session.value
  if (!selected || !currentSession)
    return 'The selected event is not available in the active schedule.'
  if (!isRouteEldEventWithinSession(selected, currentSession))
    return 'Events outside the session period cannot participate in Boost.'
  if (selected.isFrozen) return 'DOT-inspected events cannot participate in Boost.'
  if (
    selected.recordStatus.toUpperCase() !== 'ACTIVE' ||
    !dutyCategories.has(selected.eventCategory)
  )
    return 'Only an active duty event can be expanded or reduced.'
  return ''
})

function findDurationExpandDonors(requestedMilliseconds: number) {
  const selected = durationSelectedEvent.value
  if (!selected) return []
  const indexes = new Map(
    [...graphEvents.value]
      .sort((left, right) => left.timestamp - right.timestamp || left.id.localeCompare(right.id))
      .map((event, index) => [event.id, index] as const)
  )
  const selectedIndex = indexes.get(selected.id)
  if (selectedIndex === undefined) return []

  const donors = [...availableDurationDonors.value].sort((left, right) => {
    const leftIndex = indexes.get(left.congestion.firstEventId) ?? Number.MAX_SAFE_INTEGER
    const rightIndex = indexes.get(right.congestion.firstEventId) ?? Number.MAX_SAFE_INTEGER
    return (
      Math.abs(leftIndex - selectedIndex) - Math.abs(rightIndex - selectedIndex) ||
      left.congestion.startedAt - right.congestion.startedAt
    )
  })
  let remaining = requestedMilliseconds
  const result: Array<(typeof donors)[number] & { transferDurationMs: number }> = []
  for (const donor of donors) {
    const transferDurationMs = Math.min(donor.freeDurationMs, remaining)
    if (transferDurationMs <= 0) continue
    result.push({ ...donor, transferDurationMs })
    remaining -= transferDurationMs
    if (remaining === 0) break
  }
  return result
}

function durationTransferRangeError(
  mode: 'expand' | 'reduce',
  requestedMilliseconds: number
) {
  const currentSession = session.value
  const selected = durationSelectedEvent.value
  if (!currentSession || !selected) return ''

  const receiver = mode === 'reduce' ? eligibleDurationReceiver.value : null
  const transfers =
    mode === 'expand'
      ? findDurationExpandDonors(requestedMilliseconds).map((donor) => ({
          donorEventId: donor.congestion.firstEventId,
          receiverEventId: selected.id,
          durationMs: donor.transferDurationMs,
        }))
      : receiver
        ? [
            {
              donorEventId: selectedRestCongestion.value?.firstEventId ?? selected.id,
              receiverEventId:
                receiver.endedAt <= selected.timestamp
                  ? receiver.lastEventId
                  : receiver.firstEventId,
              durationMs: requestedMilliseconds,
            },
          ]
        : []
  const timestamps = new Map(graphEvents.value.map((event) => [event.id, event.timestamp]))

  for (const transfer of transfers) {
    const ordered = [...graphEvents.value].sort((left, right) => {
      const difference =
        (timestamps.get(left.id) ?? left.timestamp) -
        (timestamps.get(right.id) ?? right.timestamp)
      return difference || left.id.localeCompare(right.id)
    })
    const donorIndex = ordered.findIndex((event) => event.id === transfer.donorEventId)
    const receiverIndex = ordered.findIndex((event) => event.id === transfer.receiverEventId)
    if (donorIndex < 0 || receiverIndex < 0 || donorIndex === receiverIndex) continue

    const donorBeforeReceiver = donorIndex < receiverIndex
    const affected = ordered.slice(
      Math.min(donorIndex, receiverIndex) + 1,
      Math.max(donorIndex, receiverIndex) + 1
    )
    if (
      affected.some((event) =>
        !isRouteEldTimestampWithinSession(
          timestamps.get(event.id) ?? event.timestamp,
          event.timeZone,
          currentSession
        )
      )
    )
      return 'Boost cannot move a range containing events outside the session period.'
    if (affected.some((event) => event.isFrozen))
      return 'Boost cannot move a range containing DOT-inspected events.'

    const offset = donorBeforeReceiver ? -transfer.durationMs : transfer.durationMs
    for (const event of affected) {
      const timestamp = (timestamps.get(event.id) ?? event.timestamp) + offset
      if (!isRouteEldTimestampWithinSession(timestamp, event.timeZone, currentSession))
        return 'The adjusted event times must remain within the session period.'
      timestamps.set(event.id, timestamp)
    }
  }
  return ''
}

function durationRequestError(payload: {
  durationSeconds: number
  mode: 'expand' | 'reduce'
  ensurePti: boolean
}) {
  if (durationSelectionError.value) return durationSelectionError.value
  if (!Number.isInteger(payload.durationSeconds) || payload.durationSeconds < 1)
    return 'Boost duration must be greater than zero.'

  const requestedMilliseconds = payload.durationSeconds * 1_000
  if (
    payload.mode === 'expand' &&
    payload.ensurePti &&
    (!selectedRestCongestion.value ||
      selectedRestCongestion.value.durationMs + requestedMilliseconds < minimumReceiverDurationMs)
  )
    return 'PTI requires the expanded Off Duty or Sleeper congestion to last at least 10 hours.'
  if (
    payload.mode === 'expand' &&
    requestedMilliseconds > durationAvailableExpandMs.value
  )
    return `Expanding requires ${payload.durationSeconds} seconds, but only ${Math.floor(durationAvailableExpandMs.value / 1_000)} seconds of transferable Off Duty and Sleeper time are available.`
  if (
    payload.mode === 'reduce' &&
    requestedMilliseconds > durationAvailableReduceMs.value
  )
    return 'Reducing exceeds the selected event’s available donor duration.'
  if (payload.mode === 'reduce' && !eligibleDurationReceiver.value)
    return 'No other Off Duty or Sleeper congestion lasting at least 10 hours can receive the removed duration.'
  return durationTransferRangeError(payload.mode, requestedMilliseconds)
}
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
      ['ACTIVE', ...dailyEvents.value
        .flatMap((group) => group.events)
        .map((event) => String(event.eventRecordStatus || 'ACTIVE').toUpperCase())]
    )
  ).sort()
)
const filteredDailyEvents = computed(() => {
  return dailyEvents.value.map((group) => ({
    ...group,
    events: group.events.filter(
      (event) =>
        (driverFilter.value === '__all__' ||
          (driverFilter.value === '__co_driver__' && event.ownerDriverId === session.value?.coDriverId) ||
          (driverFilter.value === '__main__' && event.ownerDriverId === session.value?.driverId)) &&
        (changeFilter.value === '__all__' ||
          String(event.changeStatus || 'UNCHANGED').toUpperCase() === changeFilter.value) &&
        (statusFilter.value === '__all__' ||
          String(event.eventRecordStatus || 'ACTIVE').toUpperCase() === statusFilter.value)
    ),
  }))
})
watch(activeDriverId, () => {
  if (driverFilter.value !== '__all__')
    driverFilter.value = activeDriverId.value === session.value?.driverId ? '__main__' : '__co_driver__'
  selectedRowIds.value = []
  selectedEventId.value = ''
  aiAdviceResult.value = null
  certificationReport.value = null
  normalizeResult.value = null
  if (activeDriverId.value) {
    void store.fetchEventEditOptions(activeDriverId.value).catch(() => {})
    void store.fetchDriverOptions(activeDriverId.value).catch(() => {})
  }
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
const issueCount = computed(() => activeCalculations.value?.eventIssues.length ?? 0)
const sessionOperationPercent = computed(() => {
  const operation = sessionOperation.value
  if (!operation?.total) return operation?.status === 'COMPLETED' ? 100 : 0
  return Math.min(
    100,
    Math.round((operation.completed / operation.total) * 100)
  )
})
const sessionOperationTitle = computed(() => {
  const prefix = sessionOperationType.value === 'rollback' ? 'Rollback' : 'Submit'
  if (sessionActionLoading.value) return `${prefix} in progress`
  if (sessionOperationError.value) return `${prefix} failed`
  if (sessionOperation.value?.failed) return `${prefix} finished with issues`
  return `${prefix} complete`
})
const sessionPeriodLabel = computed(() =>
  session.value
    ? `${dayjs(session.value.fromDate).format('MMM D, YYYY')} – ${dayjs(session.value.toDate).format('MMM D, YYYY')}`
    : ''
)
const runSessionAction = async (action: 'submit' | 'rollback') => {
  sessionOperationType.value = action
  sessionOperation.value = null
  sessionOperationError.value = ''
  sessionProgressOpen.value = true
  sessionActionStarting.value = true
  const sessionId = store.session?.id
  try {
    const result = await store.runSessionOperation(action, (operation) => {
      sessionActionStarting.value = false
      sessionOperation.value = { ...operation, failures: [...(operation.failures ?? [])] }
    })
    if (!result) throw new Error(`Session ${action} did not start`)
    sessionOperation.value = result
    if (
      store.session?.id === sessionId &&
      store.activeTabId &&
      route.query.tabId !== store.activeTabId
    ) {
      await router.replace({ query: { ...route.query, tabId: store.activeTabId } })
    }
    const failedCount = Math.max(result.failed, result.failures?.length ?? 0)
    if (result.error) sessionOperationError.value = result.error
    if (failedCount || result.error) {
      toast.warning(
        failedCount
          ? `${failedCount} event${failedCount === 1 ? '' : 's'} could not be processed`
          : result.error || 'Session operation finished with issues'
      )
    } else {
      toast.success(
        action === 'rollback'
          ? 'Session rolled back successfully'
          : 'Session submitted successfully'
      )
      sessionProgressOpen.value = false
    }
  } catch (error: any) {
    sessionOperationError.value = error?.response?.data?.message || error?.message || `Session ${action} failed`
    toast.error(sessionOperationError.value)
  } finally {
    sessionActionStarting.value = false
  }
}

const retryEventDelivery = async (eventId: string) => {
  if (!canRetryDelivery.value || retryingEventId.value) return
  retryingEventId.value = eventId
  try {
    const tabKind = await store.retryEventDelivery(eventId)
    toast.success(tabKind === 'ROLLBACK' ? 'Event rolled back successfully' : 'Event synchronized with Route ELD')
  } catch (error: any) {
    toast.error(getApiErrorMessage(error, 'Event delivery could not be retried'))
  } finally {
    retryingEventId.value = ''
  }
}

const selectInitialTab = () => {
  const initial = tabs.value.find((tab) => tab.type === 0)
  if (initial) selectTab(initial)
}
const onSelectedRowIdsUpdate = (ids: string[]) => {
  selectedRowIds.value = ids
}
const highlightEventRow = (eventId: string) => {
  highlightedEventId.value = eventId
  if (highlightTimer) clearTimeout(highlightTimer)
  highlightTimer = setTimeout(() => {
    if (highlightedEventId.value === eventId) highlightedEventId.value = ''
  }, 3500)
}
const onGraphEventSelect = (event: any) => {
  const eventId = typeof event === 'string' ? event : String(event?.eventId || event?.id || '')
  if (!eventId) return
  highlightEventRow(eventId)
  getSelectedEvent(eventId)
}
const onGraphBoostSelect = (eventId: string) => {
  if (!canEditSession.value) return
  getSelectedEvent(eventId)
  const event = graphEvents.value.find((item) => item.id === eventId)
  if (!event) return
  if (
    event.recordStatus.toUpperCase() !== 'ACTIVE' ||
    !['OFF', 'SB', 'D', 'ON', 'PC', 'YM'].includes(event.eventCategory)
  ) {
    toast.error('Boost boundaries must be active duty events')
    return
  }
  if (session.value && !isRouteEldEventWithinSession(event, session.value)) {
    toast.error('Events outside the session period cannot participate in Boost')
    return
  }
  if (event.isFrozen) {
    toast.error('DOT-inspected events cannot participate in Boost')
    return
  }
  if (rangeBoostSelectedIds.value.includes(eventId)) {
    rangeBoostFailureReason.value = ''
    rangeBoostSelectedIds.value = rangeBoostSelectedIds.value.filter((id) => id !== eventId)
    return
  }
  const next = [...rangeBoostSelectedIds.value, eventId]
  if (next.length > 2) next.shift()
  rangeBoostFailureReason.value = ''
  rangeBoostSelectedIds.value = next
}
const clearRangeBoost = () => {
  rangeBoostSelectedIds.value = []
  rangeBoostSourceIndex.value = 0
  rangeBoostFailureReason.value = ''
}
watch([() => session.value?.id, () => store.activeTabId], clearRangeBoost)
const openRangeBoostModal = () => {
  if (!canEditSession.value) return
  if (rangeBoostSelectedEvents.value.length !== 2) return
  if (rangeBoostSelectionError.value) {
    toast.error(rangeBoostSelectionError.value)
    return
  }
  const firstClickedId = rangeBoostSelectedIds.value[0]
  rangeBoostSourceIndex.value = rangeBoostChronologicalEvents.value.findIndex(
    (event) => event.id === firstClickedId
  )
  rangeBoostFailureReason.value = ''
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
    rangeBoostFailureReason.value = ''
    const deltaSeconds = source.id === left.id ? -seconds : seconds
    await store.boostEvents([left.id, right.id], deltaSeconds)
    rangeBoostModalOpen.value = false
    clearRangeBoost()
    toast.success('Time boost saved to the active Boost tab')
  } catch (error: any) {
    rangeBoostFailureReason.value = getApiErrorMessage(
      error,
      'The time transfer could not be applied'
    )
    toast.error(rangeBoostFailureReason.value)
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
  highlightEventRow(eventId)
  getSelectedEvent(eventId)
  boostGraphRef.value?.scrollToEventSegment?.(eventId)
}
const handleDropProperty = async (...args: Parameters<typeof dropProperty>) => {
  await dropProperty(...args)
}
const handleErrorWarningRowClick = (eventId: string) => {
  highlightEventRow(eventId)
  getSelectedEvent(eventId)
  showErrorWarningModal.value = false
  boostGraphRef.value?.scrollToEventSegment?.(eventId)
}
const handleViolationSelect = (eventId: string) => {
  highlightEventRow(eventId)
  getSelectedEvent(eventId)
  showViolationModal.value = false
  boostGraphRef.value?.scrollToEventSegment?.(eventId)
}
const handleLocationScrollToEvent = (eventId: string) => {
  highlightEventRow(eventId)
  getSelectedEvent(eventId)
  boostGraphRef.value?.scrollToEventSegment?.(eventId)
}
const openCameraRoute = async (eventId: string) => {
  if (!session.value || !store.activeTabId) return
  const sessionId = session.value.id
  const tabId = store.activeTabId
  const requestId = ++cameraRouteRequestId
  cameraRouteEventId.value = eventId
  cameraRouteAnalysis.value = null
  cameraRouteError.value = ''
  cameraRouteOpen.value = true
  cameraRouteLoading.value = true
  try {
    const response = await api.get<
      RouteEldEventCameraAnalysis | ApiEnvelope<RouteEldEventCameraAnalysis>
    >(ApiEndpoints.ROUTE_ELD_EVENT_SESSION_CAMERAS(sessionId, tabId), {
      params: { radiusMetres: 150, eventId },
    })
    if (requestId === cameraRouteRequestId && cameraRouteOpen.value && cameraRouteEventId.value === eventId &&
        session.value?.id === sessionId && store.activeTabId === tabId) {
      cameraRouteAnalysis.value =
        'successResult' in response.data ? response.data.successResult : response.data
      const source = cameraSources.value.find((item) => item.eventId === eventId)
      if (source) cameraPresenceCache.set(cameraCacheKey(sessionId, tabId, eventId), {
        signature: source.signature,
        hasCamera: Boolean(cameraRouteAnalysis.value.matches.find(
          (match) => match.eventId === eventId && match.cameras.length > 0
        )),
        routeVerified: true,
      })
    }
  } catch (error: any) {
    if (requestId === cameraRouteRequestId && cameraRouteOpen.value && cameraRouteEventId.value === eventId)
      cameraRouteError.value = getApiErrorMessage(error, 'The event route could not be loaded')
  } finally {
    if (requestId === cameraRouteRequestId) cameraRouteLoading.value = false
  }
}
watch([() => session.value?.id, () => store.activeTabId], () => {
  cameraRouteRequestId++
  cameraRouteOpen.value = false
  cameraRouteAnalysis.value = null
})
const handleFreeTimeClick = (freeTime: BoostFreeTime) => {
  boostGraphRef.value?.scrollToEventSegment?.(freeTime.eventId)
}
const openEditableEvent = async (eventId: string) => {
  if (!canEditSession.value || !allowed('route_eld.log_details.events.edit')) return
  eventEditorReadonly.value = false
  await openEditEvent(eventId)
}
const openCopiedEvent = async (eventId: string) => {
  eventEditorReadonly.value = false
  await copyBoostEvent(eventId)
}
const openEventViewer = async (eventId: string) => {
  eventEditorReadonly.value = true
  await openEditEvent(eventId, true)
}
const deleteEventFromEditor = async (eventId: string) => {
  if (await deleteBoostEvent(eventId)) showEditEventModal.value = false
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
const openNormalize = () => {
  normalizeResult.value = null
  normalizeOpen.value = true
}

const runNormalize = async (payload: {
  types: RouteEldNormalizeType[]
  certificationFix: boolean
}) => {
  try {
    const result = await store.normalize(payload.types, payload.certificationFix)
    normalizeResult.value = result
    if (!result) return

    if (result.messages.length === 0) {
      normalizeOpen.value = false
      if (result.success) toast.success('Events normalized')
      else toast.info('Event normalization completed')
      return
    }

    if (result.success) {
      toast.warning('Events normalized with notices. Review the normalization details.')
      return
    }

    toast.error('Event normalization completed with errors. Review the normalization details.')
  } catch (error: any) {
    toast.error(error?.response?.data?.message || error?.message || 'Normalization failed')
  }
}
const runDurationBoost = async (payload: {
  durationSeconds: number
  mode: 'expand' | 'reduce'
  ensurePti: boolean
}) => {
  durationFailureReason.value = durationRequestError(payload)
  if (durationFailureReason.value) {
    toast.error(durationFailureReason.value)
    return
  }
  try {
    await submitDurationBoost(payload)
    durationOpen.value = false
    durationFailureReason.value = ''
  } catch (error) {
    durationFailureReason.value = getApiErrorMessage(
      error,
      'The duration change could not be applied.'
    )
  }
}
const openDurationModal = () => {
  if (durationSelectionError.value) {
    toast.error(durationSelectionError.value)
    return
  }
  durationFailureReason.value = ''
  durationOpen.value = true
}
const openInsertModal = async () => {
  if (!canEditSession.value) return
  try {
    eventEditorReadonly.value = false
    await prepareInsertEvent()
  } catch (error: any) {
    toast.error(error?.response?.data?.message || error?.message || 'Failed to prepare event')
  }
}
const openReassignModal = async () => {
  if (!canEditSession.value) return
  reassignModalOpen.value = true
  reassignTargetsLoading.value = true
  try {
    await store.fetchReassignTargets(activeDriverId.value)
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
      ApiEndpoints.ROUTE_ELD_EVENT_SESSION_CERTIFICATION_REPORT(session.value.id, store.activeTabId),
      { params: { driverId: activeDriverId.value } }
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
  if (!canEditSession.value || !session.value || !store.activeTabId) return
  certificationFixing.value = true
  try {
    await store.applyCertificationFix()
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
