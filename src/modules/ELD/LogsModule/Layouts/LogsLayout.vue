<template>
  <div class="space-y-6">
    <div class="p-[16px_24px_0_24px] mb-1 bg-white dark:bg-card">
      <!-- Shared Header -->
      <CLogHeader
        :driver-info="
          driverInfo ? { ...driverInfo, signaturePath: driverDailyForm?.signaturePath } : undefined
        "
        :daily-summary="dailySummary"
        :daily-time-remainder="dailyTimeRemainder"
        class="mb-4"
      />

      <!-- Shared Tabs -->
      <CLogTabs
        :weekly-violations="weeklyViolations"
        :header-date="headerDate"
        :update-header-date="updateHeaderDate"
        :fetch-weekly-violations="fetchWeeklyViolations"
        :accept-as-time-zone="acceptAsTimeZone"
        :compare-dates="compareDates"
        :format-time="formatTime"
        :format-to-u-t-c="formatToUTC"
        :get-start-of="getStartOf"
        :get-end-of="getEndOf"
        :subtract="subtract"
        :add="add"
        @search-click="handleSearchClick"
        @boost-create-click="handleBoostCreate"
      />
    </div>

    <!-- Page Content (child routes) -->
    <RouterView v-slot="{ Component }">
      <component :is="Component" />
    </RouterView>
  </div>
</template>

<script setup lang="ts">
import { computed, provide, ref } from 'vue'
import type { Dayjs } from 'dayjs'

// Components
import CLogHeader from '../[Id]/components/detail/CLogHeader.vue'
import CLogTabs from '../[Id]/components/detail/CLogTabs.vue'

// Composables
import { useELDLogDetail } from '../[Id]/composables/useELDLogDetail.ts'

// Main composable
const logDetail = useELDLogDetail()

const {
  // State
  dailySummary,
  weeklyViolations,
  dailyTimeRemainder,
  driverInfo,
  driverDailyForm,
  headerDate,

  // Functions
  updateHeaderDate,
  fetchWeeklyViolations,

  // Helpers
  acceptAsTimeZone,
  compareDates,
  formatTime,
  formatToUTC,
  getStartOf,
  getEndOf,
  subtract,
  add,
} = logDetail

// Boost search modal trigger
const showBoostSearchModal = ref(false)

const handleSearchClick = () => {
  showBoostSearchModal.value = true
}

// Boost create trigger — CLogTabs bosganda PBoost.vue ga signal yuboradi
const boostTrigger = ref<{ fromDate: Dayjs; toDate: Dayjs } | null>(null)

const handleBoostCreate = (fromDate: Dayjs, toDate: Dayjs) => {
  boostTrigger.value = { fromDate, toDate }
}

// Provide data to child components
provide('logDetail', logDetail)
provide('showBoostSearchModal', showBoostSearchModal)
provide('boostTrigger', boostTrigger)
</script>
