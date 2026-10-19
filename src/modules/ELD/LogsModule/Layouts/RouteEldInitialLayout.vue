<template>
  <div
    :class="
      isTrackingPage ? 'flex h-[calc(100vh-65px)] min-h-0 flex-col overflow-hidden' : 'space-y-6'
    "
  >
    <div class="mb-1 flex-none bg-white p-[16px_24px_0_24px] dark:bg-card">
      <CLogHeader
        :driver-info="headerDriverInfo"
        :co-driver-name="headerCoDriverName"
        :daily-summary="isBoostPage ? null : dailySummary"
        :daily-time-remainder="headerTimeRemainder"
        class="mb-4"
      >
        <template v-if="isBoostPage" #boost-daily-log>
          <CBoostDailyLogCard
            embedded
            :forms="boostProfileForms"
            :daily-logs="boostSchedule?.dailyLogs"
            :driver-name="boostWorkspace?.session.driverName"
            :external-driver-id="boostSchedule?.externalDriverId"
            :company-name="boostWorkspace?.session.companyName"
            :can-edit="canEditProfile && boostWorkspace?.session.status === 'DRAFT' && boostWorkspace?.canEdit && boostWorkspaceStore.activeTab?.kind === 'WORKING'"
            :time-zone="boostWorkspace?.events[0]?.event.timeZone ?? 'CT'"
            @edit="boostWorkspaceStore.requestProfileFormEdit"
          />
        </template>
      </CLogHeader>
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
import { storeToRefs } from 'pinia'
import type { Dayjs } from 'dayjs'
import CLogHeader from '../[Id]/components/detail/CLogHeader.vue'
import CLogTabs from '../[Id]/components/detail/CLogTabs.vue'
import { useRouteEldLogDetail } from '../[Id]/composables/useRouteEldLogDetail'
import CBoostDailyLogCard from '../Boost/components/CBoostDailyLogCard.vue'
import { useBoostWorkspaceStore } from '../Boost/store/boostWorkspace'
import { useAuthStore } from '@/modules/Auth/store/authStore'
import { hasPermission } from '@/router/permissions'

const logDetail = useRouteEldLogDetail()
const route = useRoute()
const isTrackingPage = computed(() => route.name === 'ELDTracking')
const isBoostPage = computed(() => route.name === 'ELDBoost')
const boostWorkspaceStore = useBoostWorkspaceStore()
const authStore = useAuthStore()
const canEditProfile = computed(() => hasPermission(authStore.token, 'route_eld.log_details.profile_forms.edit'))
const {
  workspace: boostWorkspace,
  profileForms: boostProfileForms,
  schedule: boostSchedule,
} = storeToRefs(boostWorkspaceStore)
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

const headerTimeRemainder = computed(() => {
  const hos = boostWorkspace.value?.calculations?.hos
  if (!isBoostPage.value || !hos) return dailyTimeRemainder.value
  return {
    breakDuration: Math.max(0, Math.floor(hos.break.remainingMs / 1000)),
    drivingDuration: Math.max(0, Math.floor(hos.drive.remainingMs / 1000)),
    shiftDuration: Math.max(0, Math.floor(hos.shift.remainingMs / 1000)),
    cycleDuration: Math.max(0, Math.floor(hos.cycle.remainingMs / 1000)),
  }
})

const headerDriverInfo = computed(() => {
  return driverInfo.value
    ? {
        ...driverInfo.value,
        signaturePath: driverDailyForm.value?.signaturePath ?? undefined,
      }
    : undefined
})

const headerCoDriverName = computed(() => {
  if (isBoostPage.value) {
    const from = boostWorkspace.value?.session.fromDate ?? ''
    const to = boostWorkspace.value?.session.toDate ?? ''
    const namesByDate = new Map(
      (boostSchedule.value?.dailyLogs ?? []).map((log) => [
        log.logDate.replaceAll('/', '-').slice(0, 10),
        log.coDriverName?.trim() || '',
      ])
    )
    for (const form of boostProfileForms.value) {
      namesByDate.set(form.logDate.replaceAll('/', '-').slice(0, 10), form.coDriverName?.trim() || '')
    }
    const names = Array.from(namesByDate, ([date, name]) => ({ date, name }))
      .filter((item) => item.name && item.date >= from && item.date <= to)
      .sort((first, second) => first.date.localeCompare(second.date))
    return Array.from(new Set(names.map((item) => item.name))).join(', ') || null
  }
  const coDriver = driverDailyForm.value?.coDriver?.user
  return coDriver ? `${coDriver.firstName} ${coDriver.lastName}`.trim() : null
})

const showBoostSearchModal = ref(false)
const boostTrigger = ref<{ fromDate: Dayjs; toDate: Dayjs } | null>(null)

const handleBoostCreate = (fromDate: Dayjs, toDate: Dayjs) => {
  boostTrigger.value = { fromDate, toDate }
}

provide('logDetail', logDetail)
provide('showBoostSearchModal', showBoostSearchModal)
provide('boostTrigger', boostTrigger)
</script>
