<template>
  <div class="pb-24">
    <CBoostToolbar
      :free-times="boostFreeTimes"
      :tabs="tabs"
      :selected-tab="selectedTab"
      :has-error-warning="hasErrorWarning"
      :is-submitted="isBoostEventsSubmitted"
      :submit-loading="isSubmitLoading"
      @initial-click="() => setTabType(0)"
      @new-click="addNewTab"
      @submit-click="submitBoostEvents"
      @error-warning-click="showErrorWarningModal = true"
      @violation-click="showViolationModal = true"
      @free-time-click="handleFreeTimeClick"
      @select-tab="selectTab"
      @remove-tab="removeTab"
      class="my-1"
    />
    <div
      v-if="dotInspectionAlert && showDotInspectionBanner"
      class="px-6 py-4 bg-white dark:bg-card"
    >
      <div
        class="flex items-center gap-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-2 cursor-pointer"
        @click="fetchDotInspection"
      >
        <span class="text-sm font-medium text-red-700 dark:text-red-300 flex-1">
          The driver has downloaded DOT inspection. Click to view details.
        </span>
        <button
          class="text-red-500 hover:text-red-700 dark:text-red-400"
          @click.stop="showDotInspectionBanner = false"
        >
          ×
        </button>
      </div>
    </div>

    <CBoostGraph
      ref="boostGraphRef"
      :chart-data="chartData"
      :daily-summary="dailySummary"
      :daily-pixel-violations="dailyPixelViolations"
      :pin-times="pinTimes"
      :header-date="headerDate"
      :free-times="boostFreeTimes"
      :is-graph-loading="isGraphLoading"
      @chart-update="getChartWidth"
      @selected-event="onGraphEventSelect"
      @selected-events="onSelectedMoveEvents"
      class="my-1"
    />

    <CBoostEventsTable
      :events="dailyEvents"
      :loading="isDailyEventsLoading"
      :selected-event-id="selectedEventId"
      @toggle-selection="onTableEventSelect"
      :selected-row-ids="selectedRowIds"
      @update:selected-row-ids="onSelectedRowIdsUpdate"
      @edit-event="openEditEvent"
      @copy-event="copyBoostEvent"
      @delete-event="deleteBoostEvent"
      @edit-profile="openEditDailyForm"
      :drag-drop-enabled="dragDropEnabled"
      @drop-property="dropProperty"
    />

    <CBoostActions
      :drag-drop-enabled="dragDropEnabled"
      :delete-disabled="!selectedRowIds.length"
      :reassign-disabled="!selectedRowIds.length"
      @dragdrop-change="setDragDropEnabled"
      @delete-click="deleteSelectedBoostEvents"
      @boost-click="openBoostModal"
      @reassign-click="openReassignModal"
      @multi-update-click="multiUpdateModalOpen = true"
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
      v-model:open="boostModalOpen"
      :selected-count="selectedMoveEventsCount"
      :loading="isBoostSubmitting"
      @submit="submitMoveTimeBoost"
    />
    <CBoostReassignModal
      v-model:open="reassignModalOpen"
      :selected-count="selectedRowIds.length"
      :loading="isReassigning"
      @submit="submitReassignSelectedEvents"
    />
    <CBoostLocationFinderModal
      v-model:open="showLocationFinderModal"
      @scroll-to-event="handleLocationScrollToEvent"
    />

    <CBoostEditEventModal
      v-model:open="showEditEventModal"
      :form="editEventForm"
      :loading="isEditEventLoading"
      @update:form="updateEditEventForm"
      @submit="submitEditEvent"
    />

    <CBoostMultiUpdateModal
      v-model:open="multiUpdateModalOpen"
      :events="selectedEventsForUpdate"
      :loading="isMultiUpdateLoading"
      :current-driver-id="driverId"
      @submit="submitMultiUpdateEvents"
    />

    <CBoostDotInspectionModal
      v-model:open="showDotInspectionDetails"
      :inspection="dotInspectionData"
    />

    <CBoostEditDailyFormModal
      v-model:open="showEditDailyFormModal"
      :form="editDailyForm"
      :loading="isEditDailyFormLoading"
      @update:form="updateEditDailyForm"
      @submit="submitDailyForm"
      @revert="revertDailyForm"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, inject, watch, type Ref } from 'vue'
import type { Dayjs } from 'dayjs'
import CBoostToolbar from '../components/CBoostToolbar.vue'
import type { BoostFreeTime } from '@/modules/ELD/LogsModule/[Id]/types/chart.ts'
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
import CBoostDotInspectionModal from '../components/modals/CBoostDotInspectionModal.vue'
import { useBoost } from '../composables/useBoost.ts'

const {
  dailySummary,
  dailyTimeRemainder,
  chartData,
  dailyEvents,
  dailyPixelViolations,
  pinTimes,
  boostFreeTimes,
  violations,
  errorWarningRows,
  selectedEventId,
  selectedRowIds,
  selectedMoveEventsCount,
  dragDropEnabled,
  boostModalOpen,
  isBoostSubmitting,
  reassignModalOpen,
  isReassigning,
  isBoostEventsSubmitted,
  isSubmitLoading,
  isGraphLoading,
  isDailyEventsLoading,
  showEditEventModal,
  isEditEventLoading,
  editEventForm,
  updateEditEventForm,
  openEditEvent,
  submitEditEvent,
  showEditDailyFormModal,
  isEditDailyFormLoading,
  editDailyForm,
  updateEditDailyForm,
  openEditDailyForm,
  submitDailyForm,
  revertDailyForm,
  getChartWidth,
  getSelectedEvent,
  onSelectedMoveEvents,
  addNewTab,
  setTabType,
  submitBoostEvents,
  copyBoostEvent,
  deleteBoostEvent,
  deleteSelectedBoostEvents,
  dropProperty,
  submitMoveTimeBoost,
  submitReassignSelectedEvents,
  multiUpdateModalOpen,
  isMultiUpdateLoading,
  selectedEventsForUpdate,
  submitMultiUpdateEvents,
  dotInspectionAlert,
  dotInspectionData,
  showDotInspectionDetails,
  fetchDotInspection,
  headerDate,
  loadBoostEvents,
  tabs,
  selectedTab,
  hasErrorWarning,
  selectTab,
  removeTab,
  driverId,
} = useBoost()

const boostGraphRef = ref<InstanceType<typeof CBoostGraph> | null>(null)
const showLocationFinderModal = inject<Ref<boolean>>('showBoostSearchModal', ref(false))
const boostTrigger = inject<Ref<{ fromDate: Dayjs; toDate: Dayjs } | null>>(
  'boostTrigger',
  ref(null)
)

watch(boostTrigger, (trigger) => {
  if (trigger) {
    headerDate.value = [trigger.fromDate, trigger.toDate]
  }
})

const showDotInspectionBanner = ref(true)

const showErrorWarningModal = ref(false)
const showViolationModal = ref(false)

const setDragDropEnabled = (v: boolean) => {
  dragDropEnabled.value = v
}

const openBoostModal = () => {
  boostModalOpen.value = true
}

const openReassignModal = () => {
  reassignModalOpen.value = true
}

const onSelectedRowIdsUpdate = (ids: string[]) => {
  selectedRowIds.value = ids
}

const onGraphEventSelect = (event: any) => {
  getSelectedEvent(event)
  const id = typeof event === 'string' ? event : String(event?.id || event?.eventId || '')
  if (id) {
    if (selectedRowIds.value.includes(id)) {
      selectedRowIds.value = selectedRowIds.value.filter((rid) => rid !== id)
    } else {
      selectedRowIds.value = [...selectedRowIds.value, id]
    }
  }
}

const onTableEventSelect = (eventId: string) => {
  getSelectedEvent(eventId)
  if (boostGraphRef.value?.scrollToEventSegment) {
    boostGraphRef.value.scrollToEventSegment(eventId)
  }
}

const handleErrorWarningRowClick = (eventId: string) => {
  getSelectedEvent(eventId)
  showErrorWarningModal.value = false
}

const handleViolationSelect = (violationEventId: string) => {
  getSelectedEvent(violationEventId)
  showViolationModal.value = false
  if (boostGraphRef.value?.scrollToEventSegment) {
    boostGraphRef.value.scrollToEventSegment(violationEventId)
  }
}

const handleLocationScrollToEvent = (eventId: string) => {
  getSelectedEvent(eventId)
  if (boostGraphRef.value?.scrollToEventSegment) {
    boostGraphRef.value.scrollToEventSegment(eventId)
  }
}

const handleFreeTimeClick = (freeTime: BoostFreeTime) => {
  if (boostGraphRef.value?.scrollToEventSegment) {
    boostGraphRef.value.scrollToEventSegment(freeTime.eventId)
  }
}
</script>
