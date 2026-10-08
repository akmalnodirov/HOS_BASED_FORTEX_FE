<template>
  <div class="space-y-6">
    <div class="mb-1 bg-white p-[16px_24px_0_24px] dark:bg-card">
      <CLogHeader
        :driver-info="
          driverInfo ? { ...driverInfo, signaturePath: driverDailyForm?.signaturePath } : undefined
        "
        :daily-summary="dailySummary"
        :daily-time-remainder="dailyTimeRemainder"
        class="mb-4"
      />
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
        @search-click="showBoostSearchModal = true"
        @boost-create-click="handleBoostCreate"
      />
    </div>
    <RouterView v-slot="{ Component }">
      <component :is="Component" />
    </RouterView>
  </div>
</template>

<script setup lang="ts">
import { provide, ref } from 'vue'
import type { Dayjs } from 'dayjs'
import CLogHeader from '../[Id]/components/detail/CLogHeader.vue'
import CLogTabs from '../[Id]/components/detail/CLogTabs.vue'
import { useRouteEldLogDetail } from '../[Id]/composables/useRouteEldLogDetail'

const logDetail = useRouteEldLogDetail()
const {
  dailySummary,
  weeklyViolations,
  dailyTimeRemainder,
  driverInfo,
  driverDailyForm,
  headerDate,
  updateHeaderDate,
  fetchWeeklyViolations,
  acceptAsTimeZone,
  compareDates,
  formatTime,
  formatToUTC,
  getStartOf,
  getEndOf,
  subtract,
  add,
} = logDetail

const showBoostSearchModal = ref(false)
const boostTrigger = ref<{ fromDate: Dayjs; toDate: Dayjs } | null>(null)

const handleBoostCreate = (fromDate: Dayjs, toDate: Dayjs) => {
  boostTrigger.value = { fromDate, toDate }
}

provide('logDetail', logDetail)
provide('showBoostSearchModal', showBoostSearchModal)
provide('boostTrigger', boostTrigger)
</script>
