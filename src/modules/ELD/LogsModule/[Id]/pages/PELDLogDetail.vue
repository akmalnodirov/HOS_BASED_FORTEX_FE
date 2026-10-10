<template>
  <div>
    <div class="pr-5">
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
        <div class="flex items-center gap-4">
          <h3 class="text-xl font-semibold text-foreground">Events</h3>
        </div>
      </div>
      <CLogEventsTable
        ref="eventsTable"
        :events="displayEvents"
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
        @select-row="getSelectedEvent"
        @chart:container-update="getChartWidth"
      />
    </div>

    <div class="mb-1 grid grid-cols-1 items-stretch gap-1 md:grid-cols-4">
      <div class="col-span-1 flex">
        <div class="flex flex-1 flex-col bg-white p-[16px_24px] dark:bg-card">
          <h3 class="mb-5 text-xl font-semibold text-foreground">Signature</h3>
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
  </div>
</template>

<script setup lang="ts">
import { inject, nextTick, ref } from 'vue'
import { useRoute } from 'vue-router'
import CLogGraph from '../components/detail/CLogGraph.vue'
import CLogEventsTable from '../components/detail/CLogEventsTable.vue'
import CLogSignature from '../components/detail/CLogSignature.vue'
import CLogProfileForm from '../components/detail/CLogProfileForm.vue'
import CLogRouteEldTracking from '../components/detail/CLogRouteEldTracking.vue'
import type { useRouteEldLogDetail } from '../composables/useRouteEldLogDetail'

const route = useRoute()
const logDetail = inject('logDetail') as ReturnType<typeof useRouteEldLogDetail>
const eventsTable = ref<{ focusEvent: (eventId: string) => Promise<boolean> } | null>(null)

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

async function handleGraphEvent(event: { eventId?: string; id?: string }) {
  const eventId = event?.eventId || event?.id
  if (!eventId) return
  getSelectedEvent(event)
  await nextTick()
  await eventsTable.value?.focusEvent(String(eventId))
}
</script>
