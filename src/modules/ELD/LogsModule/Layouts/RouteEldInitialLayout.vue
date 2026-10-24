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
        :daily-summary="visibleDailySummary"
        :daily-time-remainder="headerTimeRemainder"
        class="mb-4"
      >
        <template v-if="isBoostPage" #boost-daily-log>
          <CBoostDailyLogCard
            embedded
            :forms="activeBoostProfileForms"
            :daily-logs="activeBoostDriverId === boostWorkspace?.session.driverId ? boostSchedule?.dailyLogs : undefined"
            :driver-name="activeBoostDriverId === boostWorkspace?.session.driverId ? boostWorkspace?.session.driverName : boostWorkspace?.session.coDriverName ?? undefined"
            :external-driver-id="activeBoostDriverId === boostWorkspace?.session.driverId ? boostSchedule?.externalDriverId : undefined"
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
import { computed, provide, ref, watch } from 'vue'
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
import { useApi } from '@/composables/useAxiosService'
import { ApiEndpoints } from '@/api/endpoints'
import { useTimeZoneHelper } from '@/composables/useTimezone'
import type { RouteEldLogDetail } from '../[Id]/types/routeEldDetail'

const logDetail = useRouteEldLogDetail()
const route = useRoute()
const isTrackingPage = computed(() => route.name === 'ELDTracking')
const isBoostPage = computed(() => route.name === 'ELDBoost')
const boostWorkspaceStore = useBoostWorkspaceStore()
const api = useApi()
const timeZoneHelper = useTimeZoneHelper()
const authStore = useAuthStore()
const canEditProfile = computed(() => hasPermission(authStore.token, 'route_eld.log_details.profile_forms.edit'))
const {
  workspace: boostWorkspace,
  profileForms: boostProfileForms,
  schedule: boostSchedule,
  selectedDriverId: boostSelectedDriverId,
} = storeToRefs(boostWorkspaceStore)

const activeBoostDriverId = computed(() => boostSelectedDriverId.value || boostWorkspace.value?.session.driverId || '')
const coDriverIsActive = computed(() => isBoostPage.value && Boolean(boostWorkspace.value?.session.coDriverId) &&
  activeBoostDriverId.value === boostWorkspace.value?.session.coDriverId)
const activeBoostProfileForms = computed(() => boostProfileForms.value.filter(form =>
  (form.ownerDriverId || boostWorkspace.value?.session.driverId) === activeBoostDriverId.value))
const activeBoostCalculations = computed(() => boostWorkspace.value?.calculationsByDriver?.[activeBoostDriverId.value] ?? boostWorkspace.value?.calculations)
const coDriverDetail = ref<RouteEldLogDetail | null>(null)
const boostCurrentDate = computed(() => timeZoneHelper.convertToTimeZone().format('YYYY-MM-DD'))

let coDriverDetailRequest = 0
watch([coDriverIsActive, activeBoostDriverId, boostCurrentDate], async ([active, id, date]) => {
  const requestId = ++coDriverDetailRequest
  coDriverDetail.value = null
  if (!active || !id) return
  try {
    const response = await api.get<{ successResult: RouteEldLogDetail }>(
      ApiEndpoints.ROUTE_ELD_LOG_DETAIL(id), { params: { date } })
    if (requestId === coDriverDetailRequest) coDriverDetail.value = response.data.successResult
  } catch { /* The workspace still supplies the co-driver's active events and calculations. */ }
}, { immediate: true })

const {
  headerDailySummary,
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
  const hos = activeBoostCalculations.value?.hos
  if (!isBoostPage.value || !hos) return dailyTimeRemainder.value
  return {
    breakDuration: Math.max(0, Math.floor(hos.break.remainingMs / 1000)),
    drivingDuration: Math.max(0, Math.floor(hos.drive.remainingMs / 1000)),
    shiftDuration: Math.max(0, Math.floor(hos.shift.remainingMs / 1000)),
    cycleDuration: Math.max(0, Math.floor(hos.cycle.remainingMs / 1000)),
  }
})

const headerDriverInfo = computed(() => {
  if (coDriverIsActive.value) {
    const detail = coDriverDetail.value
    const summary = detail?.dailySummary
    const violations = summary?.violations ?? detail?.hos?.violations ?? []
    const form = activeBoostProfileForms.value.find(item => item.logDate.replaceAll('/', '-') ===
      boostCurrentDate.value)
    return {
      driverId: activeBoostDriverId.value,
      firstName: detail?.driverName ?? boostWorkspace.value?.session.coDriverName ?? 'Co-driver',
      lastName: '',
      name: detail?.driverName ?? boostWorkspace.value?.session.coDriverName ?? 'Co-driver',
      email: detail?.email ?? 'N/A',
      phone: detail?.phoneNumber ?? 'N/A',
      vehicleUnit: detail?.hos?.vehicleUnitName ?? detail?.hos?.vehicleUnitId ?? 'N/A',
      connectionStatus: detail?.hos?.connectionStatus ?? 'NOT_CONNECTED',
      status: true,
      workedDurationInSeconds: ((summary?.timeDrivenMilliseconds ?? 0) +
        (summary?.timeOnDutyMilliseconds ?? 0)) / 1000,
      signaturePath: form?.signatureFileName ?? detail?.profileForm?.signature ?? undefined,
      isSigned: form ? Boolean(form.signatureFileName || form.signatureUrl) : summary?.isSigned,
      hasViolation: (summary?.violationCount ?? violations.length) > 0,
      violations,
      timeZone: detail?.timeZone ?? null,
      lastEventCode: null,
      lastEventType: null,
    }
  }
  return driverInfo.value
    ? {
        ...driverInfo.value,
        signaturePath: driverDailyForm.value?.signaturePath ?? undefined,
      }
    : undefined
})

const visibleDailySummary = computed(() => {
  if (!coDriverIsActive.value) return headerDailySummary.value
  const summary = coDriverDetail.value?.dailySummary
  return summary ? {
    summaryDate: summary.logDate,
    dailyOffDuty: 0,
    dailySleeperBerth: 0,
    dailyDriving: summary.timeDrivenMilliseconds / 1000,
    dailyOnDuty: summary.timeOnDutyMilliseconds / 1000,
  } : null
})

const headerCoDriverName = computed(() => {
  if (coDriverIsActive.value) return boostWorkspace.value?.session.driverName ?? null
  if (isBoostPage.value) return boostWorkspace.value?.session.coDriverName ?? null
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
