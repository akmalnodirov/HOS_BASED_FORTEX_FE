<template>
  <div class="space-y-4 pb-8">
    <div class="rounded-lg border border-border bg-card">
      <div class="border-b border-border px-5 py-3">
        <h2 class="text-sm font-semibold">Duty status · {{ headerDate.format('MMM D, YYYY') }}</h2>
        <p class="text-xs text-muted-foreground">Click or drag on the graph to set the new log's start time.</p>
      </div>
      <div v-if="isGraphLoading" class="p-10 text-center text-sm text-muted-foreground">Loading graph…</div>
      <CLogGraph v-else-if="chartData" :chart-data="chartData" :daily-summary="dailySummary"
        :events="graphEvents" :range-start="graphRangeStart" :range-end="graphRangeEnd"
        select-time-enabled :selected-time-seconds="startSeconds" :preview-event-code="eventCode"
        @select-time="startSeconds = $event" />
      <div v-else class="p-10 text-center text-sm text-muted-foreground">No graph available for this day.</div>
    </div>
    <div v-if="error" class="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{{ error }}</div>
    <CRouteEldInsertInfoForm ref="formRef" :start-seconds="startSeconds"
      :vehicles="vehicles"
      :loading="saving || optionsLoading" @update:start-seconds="startSeconds = $event"
      @update:event-code="eventCode = $event" @save="save" />
  </div>
</template>

<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import dayjs from 'dayjs'
import { toast } from 'vue-sonner'
import { ApiEndpoints } from '@/api/endpoints'
import { useApi } from '@/composables/useAxiosService'
import { useRouteEldLogDetail } from '../../[Id]/composables/useRouteEldLogDetail'
import CLogGraph from '../../[Id]/components/detail/CLogGraph.vue'
import CRouteEldInsertInfoForm from '../components/CRouteEldInsertInfoForm.vue'
import type { InsertInfoLogRequest, InsertInfoOption } from '../types'

const logDetail = inject('logDetail') as ReturnType<typeof useRouteEldLogDetail>
const { detail, chartData, dailySummary, graphEvents, graphRangeStart, graphRangeEnd,
  isGraphLoading, headerDate, fetchDetail } = logDetail
const route = useRoute()
const api = useApi()
const driverId = computed(() => String(route.params.id ?? ''))
const startSeconds = ref(0)
const eventCode = ref('DS_OFF')
const saving = ref(false)
const optionsLoading = ref(false)
const error = ref<string | null>(null)
const vehicles = ref<InsertInfoOption[]>([])
const formRef = ref<InstanceType<typeof CRouteEldInsertInfoForm> | null>(null)
const zones: Record<string, string> = {
  ET: 'America/New_York', CT: 'America/Chicago', MT: 'America/Denver',
  PT: 'America/Los_Angeles', AT: 'America/Halifax', HT: 'Pacific/Honolulu',
  NT: 'America/St_Johns', AKT: 'America/Anchorage', AZ: 'America/Phoenix', SK: 'America/Regina',
  MST: 'America/Phoenix',
}

type ApiEnvelope<T> = T | { successResult: T }
function unwrap<T>(value: ApiEnvelope<T>): T {
  return value && typeof value === 'object' && 'successResult' in value ? value.successResult : value
}

watch(driverId, async id => {
  if (!id) return
  optionsLoading.value = true
  error.value = null
  try {
    const optionsResponse = await api.get<ApiEnvelope<{ vehicles: InsertInfoOption[] }>>(
      ApiEndpoints.ROUTE_ELD_DRIVER_SCHEDULE_OPTIONS(id)
    )
    vehicles.value = unwrap(optionsResponse.data)?.vehicles ?? []
  } catch (cause: any) {
    error.value = cause?.response?.data?.message || 'Could not load Route ELD vehicles.'
  } finally { optionsLoading.value = false }
}, { immediate: true })
watch(headerDate, () => { startSeconds.value = 0 })

async function save(values: Omit<InsertInfoLogRequest, 'timestamp' | 'timeZone'>) {
  if (!detail.value?.externalDriverId) { toast.error('Driver details are still loading'); return }
  const timeZone = detail.value.timeZone || 'CT'
  const time = `${String(Math.floor(startSeconds.value / 3600)).padStart(2, '0')}:${String(Math.floor(startSeconds.value % 3600 / 60)).padStart(2, '0')}:00`
  const timestamp = dayjs.tz(`${headerDate.value.format('YYYY-MM-DD')} ${time}`, zones[timeZone] || zones.CT).valueOf()
  if (!Number.isFinite(timestamp)) { toast.error('Select a valid start time'); return }
  saving.value = true
  error.value = null
  try {
    await api.post(ApiEndpoints.ROUTE_ELD_INSERT_INFO_LOG(driverId.value), {
      ...values, timestamp, timeZone,
    } satisfies InsertInfoLogRequest)
    toast.success('Active log inserted into Route ELD')
    formRef.value?.clear()
  } catch (cause: any) {
    error.value = cause?.response?.data?.message || 'Could not insert the Route ELD log.'
    toast.error(error.value || 'Could not insert the Route ELD log.')
    saving.value = false
    return
  }
  try {
    await fetchDetail(true)
  } catch {
    toast.warning('Log inserted, but the graph could not be refreshed. Reload this page to see it.')
  } finally { saving.value = false }
}
</script>
