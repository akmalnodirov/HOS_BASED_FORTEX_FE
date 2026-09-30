<template>
  <div class="">
    <!-- Graph Section -->
    <div class="pr-5">
      <div v-if="isGraphLoading" class="flex items-center justify-center p-8">
        <div class="text-muted-foreground">Loading chart...</div>
      </div>
      <MainChart
        v-else-if="chartData && Object.keys(chartData).length > 0"
        :loading="isGraphLoading"
        :chart-data="chartData"
        :daily-summary="dailySummary || undefined"
        :violations="(dailyPixelViolations || []) as any"
        @container:update="getChartWidth"
        @selected-event="getSelectedEvent"
      />
      <div v-else class="flex flex-col items-center justify-center p-8 space-y-2">
        <div class="text-muted-foreground">No chart data available</div>
      </div>
    </div>

    <!-- Events Table -->
    <div class="my-1 px-4 bg-white dark:bg-card">
      <div class="py-4 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <h3 class="font-semibold text-xl text-foreground">
            {{ history.isActive.value ? 'History Events' : 'Events' }}
          </h3>
        </div>
        <div v-if="history.isActive.value" class="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            :disabled="!history.hasSelection.value"
            @click="history.openTransferEventsModal"
          >
            Transfer events
          </Button>
          <Button variant="outline" size="sm" @click="history.openTransferByPeriodModal">
            <Calendar class="w-4 h-4 mr-2" />
            Transfer logs by period
          </Button>
        </div>
      </div>
      <CLogEventsTable
        :events="displayEvents"
        :loading="isDailyEventsLoading || history.transferLoading.value"
        :selected-event-id="selectedEventId"
        :format-time="formatTime"
        :selectable="history.isActive.value"
        :selected-rows="history.selectedRows.value"
        :header-date="headerDate"
        :edit-chart-data="editChartData"
        :daily-summary="dailySummary"
        :driver-vehicles="driverVehicles"
        :edit-loading="editLoading"
        :chart-error="chartError"
        @row-select="history.toggleRowSelection"
        @save-event="handleSaveEvent"
        @chart:container-update="getChartEditWidth"
      />
    </div>

    <!-- Signature & Profile Form -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-1 items-stretch mb-1">
      <div class="col-span-1 flex">
        <div class="bg-white dark:bg-card p-[16px_24px] flex-1">
          <h3 class="font-semibold text-xl text-foreground mb-5">Signature</h3>
          <CLogSignature :signature-path="driverDailyForm?.signaturePath" />
        </div>
      </div>
      <div class="col-span-3 flex">
        <div class="bg-white dark:bg-card p-[16px_24px] flex-1">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-semibold text-xl text-foreground">Profile form</h3>
            <Button variant="outline" size="sm" @click="profileFormRef?.handleEdit" class="p-2">
              <Pencil class="w-4 h-4" />
            </Button>
          </div>
          <CLogProfileForm
            ref="profileFormRef"
            :driver-daily-form="driverDailyForm"
            :drivers="drivers"
            :driver-id="route.params.id as string"
            :form-date="headerDate"
            :certified-date="convertToTimeZone()"
            @update="handleProfileFormUpdate"
          />
        </div>
      </div>
    </div>

    <!-- Tracking Section -->
    <CLogTracking
      :daily-trackings="dailyTrackings"
      :every-trackings="everyTrackings"
      :selected-event="selectedEvent"
      :tracking-tooltips="trackingTooltips"
      :map-center="mapCenter"
      :zoom-map="zoomMap"
      :tracking-collapse="trackingCollapse"
      :directions-segments="directionsSegments"
      :render-route-on-map="renderRouteOnMap"
      @select-event="selectEvent"
      @toggle-collapse="toggleTrackingCollapse"
    />

    <!-- History Transfer Modals -->
    <CLogHistoryModals
      v-model:transfer-events-open="history.modals.transferEvents"
      v-model:transfer-by-period-open="history.modals.transferByPeriod"
      :date-range="history.transferForm.dateRange"
      :show-confirmation="history.transferForm.dateRangeSubmit"
      :selection-count="history.selectionCount.value"
      :loading="history.transferLoading.value"
      :format-date="formatDateForModal"
      @update:date-range="updateHistoryDateRange"
      @confirm-transfer="history.transferSelectedEvents"
      @confirm-period-transfer="history.transferByDateRange"
      @cancel-period="history.resetTransferForm"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, inject } from 'vue'
import { useRoute } from 'vue-router'
import { Pencil, Calendar } from 'lucide-vue-next'
import type { Dayjs } from 'dayjs'

// UI Components
import { Button } from '@/components/ui/button'

// Page Components
import MainChart from '../components/chart/MainChart.vue'
import CLogEventsTable from '../components/detail/CLogEventsTable.vue'
import CLogSignature from '../components/detail/CLogSignature.vue'
import CLogProfileForm from '../components/detail/CLogProfileForm.vue'
import CLogTracking from '../components/detail/CLogTracking.vue'
import CLogHistoryModals from '../components/detail/CLogHistoryModals.vue'

// Types
import type { DriverOption } from '../types/driverDailyForm.ts'

const route = useRoute()

// Inject shared data from layout
const logDetail = inject('logDetail') as ReturnType<
  typeof import('../composables/useELDLogDetail.ts').useELDLogDetail
>

const {
  // State
  chartData,
  dailySummary,
  dailyPixelViolations,
  displayEvents,
  selectedEventId,
  isGraphLoading,
  isDailyEventsLoading,
  headerDate,

  // Edit event state
  editChartData,
  driverVehicles,
  editLoading,
  chartError,

  // Functions
  getChartWidth,
  getSelectedEvent,

  // Edit event functions
  getChartEditWidth,
  submitEventStatus,

  // Helpers
  convertToTimeZone,
  formatTime,
  formatToUTC,

  // Driver Daily Form
  driverDailyForm,
  fetchDriverDailyForm,

  // Tracking
  dailyTrackings,
  everyTrackings,
  selectedEvent,
  trackingTooltips,
  trackingCollapse,
  mapCenter,
  zoomMap,
  selectEvent,
  toggleTrackingCollapse,
  directionsSegments,
  renderRouteOnMap,

  // History
  history,
} = logDetail

// Local state
const profileFormRef = ref<{ handleEdit: () => void } | null>(null)
const drivers = ref<DriverOption[]>([])

// Helper for modal date formatting
const formatDateForModal = (date: Dayjs | null): string => {
  return date ? formatTime(date, 'MMM D, YYYY') : ''
}

// Update history date range
const updateHistoryDateRange = (range: [Dayjs | null, Dayjs | null]) => {
  history.transferForm.dateRange = range
}

// Handle profile form update
const handleProfileFormUpdate = async () => {
  await fetchDriverDailyForm(route.params.id as string, formatToUTC(headerDate.value))
}

// Handle save event from modal
const handleSaveEvent = async (eventData: any) => {
  await submitEventStatus(eventData)
}
</script>
