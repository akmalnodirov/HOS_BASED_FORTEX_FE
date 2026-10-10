<template>
  <div
    :class="
      isTrackingPage
        ? 'flex h-[calc(100vh-65px)] min-h-0 flex-col overflow-hidden'
        : 'space-y-6'
    "
  >
    <div class="mb-1 flex-none bg-white p-[16px_24px_0_24px] dark:bg-card">
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
    <div :class="isTrackingPage ? 'min-h-0 flex-1 overflow-hidden' : ''">
      <RouterView v-slot="{ Component }">
        <KeepAlive>
        <component :is="Component" />
        </KeepAlive>
    </RouterView>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, provide, ref } from 'vue'
import { useRoute } from 'vue-router'
import type { Dayjs } from 'dayjs'
import CLogHeader from '../[Id]/components/detail/CLogHeader.vue'
import CLogTabs from '../[Id]/components/detail/CLogTabs.vue'
import { useRouteEldLogDetail } from '../[Id]/composables/useRouteEldLogDetail'

const logDetail = useRouteEldLogDetail()
const route = useRoute()
const isTrackingPage = computed(() => route.name === 'ELDTracking')
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
