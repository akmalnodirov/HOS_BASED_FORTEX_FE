<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { useApi } from '@/composables/useAxiosService'
import { Button } from '@/components/ui/button'
import CReportToolbar from '@/modules/Report/components/CReportToolbar.vue'
import CReportKpiDetail from '@/modules/Report/components/CReportKpiDetail.vue'

const api = useApi()
const route = useRoute()
const router = useRouter()
const employeeId = computed(() => typeof route.params.userId === 'string' ? route.params.userId : '')
const initialRange = computed(() => {
  const from = route.query.from
  const to = route.query.to
  if (typeof from !== 'string' || typeof to !== 'string') return undefined
  if (!/^\d{4}-\d{2}-\d{2}/.test(from) || !/^\d{4}-\d{2}-\d{2}/.test(to)) return undefined
  return { startTime: from, endTime: to }
})
const detail = ref<Record<string, unknown> | null>(null)
const loading = ref(false)
let requestVersion = 0
const pageTitle = computed(() => employeeId.value ? String(detail.value?.fullName ?? route.query.name ?? 'Employee KPI') : 'My KPI')

async function onRange(range: { startTime: string; endTime: string }) {
  const version = ++requestVersion
  loading.value = true
  try {
    const endpoint = employeeId.value
      ? `/report/api/kpi/statistics/employee/${employeeId.value}`
      : '/report/api/my-kpi/statistics'
    const response = await api.post<{ successResult: Record<string, unknown> }>(endpoint, employeeId.value
      ? { ...range, teamId: typeof route.query.teamId === 'string' ? route.query.teamId : null }
      : range)
    if (version === requestVersion) detail.value = response.data.successResult
  } catch {
    if (version === requestVersion) toast.error('Could not load KPI calculations.')
  } finally {
    if (version === requestVersion) loading.value = false
  }
}
</script>

<template>
  <div class="flex h-[calc(100dvh-65px)] min-h-0 flex-col overflow-hidden bg-gray-50 dark:bg-background">
    <CReportToolbar :key="route.fullPath" :title="pageTitle" :subtitle="employeeId ? 'Employee points, earnings, and calculation details' : 'Your points, earnings, and calculation details'" :initial-range="initialRange" default-period="month" full-periods @change="onRange">
      <template #actions>
        <span v-if="detail" class="rounded-md border border-border bg-card px-3 py-2 text-sm text-muted-foreground">Team: <strong class="font-semibold text-foreground">{{ detail.teamName || 'Unassigned' }}</strong></span>
        <Button v-if="employeeId" variant="outline" @click="router.push('/report/kpi')"><ArrowLeft class="mr-2 h-4 w-4" />Back</Button>
      </template>
    </CReportToolbar>
    <div class="min-h-0 flex-1 overflow-auto p-4">
      <p v-if="loading" class="py-12 text-center text-sm text-muted-foreground">Loading KPI…</p>
      <CReportKpiDetail v-else-if="detail" :detail="detail" />
      <p v-else class="py-12 text-center text-sm text-muted-foreground">No KPI data for this period.</p>
    </div>
  </div>
</template>
