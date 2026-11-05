<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuthStore } from '@/modules/Auth/store/authStore'
import { hasPermission } from '@/router/permissions'
import CReportKpiEntryTable from '@/modules/Report/components/CReportKpiEntryTable.vue'
import CReportTaskHistoryModal from '@/modules/Report/components/CReportTaskHistoryModal.vue'
import { reportMoney } from '@/modules/Report/utils/money'

const props = defineProps<{ detail: Record<string, unknown> }>()
const auth = useAuthStore()
const canViewTaskHistory = computed(() => hasPermission(auth.token, 'report.tasks.view'))
const historyOpen = ref(false)
const historyTaskId = ref('')
const moneyMetrics = new Set(['Daily salary', 'Fixed salary', 'KPI value', 'Bonuses', 'Charges', 'Lateness penalty', 'Undertime penalty', 'Total KPI'])
const metrics = computed(() => [
  { label: 'Daily salary', value: props.detail.dailySalary },
  { label: 'Attended days', value: props.detail.attendedDays },
  { label: 'Fixed salary', value: props.detail.fixedSalary },
  { label: 'Task points', value: props.detail.taskPoints },
  { label: 'Checker points', value: props.detail.checkerGainedPoints },
  { label: 'Deductions', value: props.detail.deductedPoints },
  { label: 'Total points', value: props.detail.totalPoints },
  { label: 'KPI value', value: props.detail.pointsValue },
  { label: 'Bonuses', value: props.detail.bonusTotal },
  { label: 'Charges', value: props.detail.chargeTotal },
  { label: 'Lateness penalty', value: props.detail.latenessPenalty },
  { label: 'Undertime penalty', value: props.detail.undertimePenalty },
  { label: 'Total KPI', value: props.detail.totalKpi },
])
const entryBlocks = computed(() => [
  { title: 'Task entries', entries: rows(props.detail.taskEntries) },
  { title: 'Checker entries', entries: rows(props.detail.checkerEntries) },
  { title: 'Deductions', entries: rows(props.detail.deductionEntries) },
])

function rows(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value as Record<string, unknown>[] : []
}

function date(value: unknown) {
  return value ? new Date(String(value)).toLocaleString() : '—'
}

function number(value: unknown) {
  return Number(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })
}

function openHistory(taskId: string) {
  historyTaskId.value = taskId
  historyOpen.value = true
}
</script>

<template>
  <div class="space-y-4">
    <div class="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-6">
      <div v-for="metric in metrics" :key="metric.label" class="flex flex-col gap-1 rounded-lg border border-border p-3" :class="metric.label === 'Total KPI' ? 'bg-slate-900 text-white' : 'bg-card'">
        <span class="text-xs" :class="metric.label === 'Total KPI' ? 'opacity-75' : 'text-muted-foreground'">{{ metric.label }}</span>
        <strong class="text-base">{{ moneyMetrics.has(metric.label) ? reportMoney(metric.value) : number(metric.value) }}</strong>
      </div>
    </div>
    <section class="rounded-xl border border-border bg-card p-4">
      <h3 class="mb-3 text-sm font-semibold">Attendance — worked time and penalties</h3>
      <div class="overflow-auto">
        <table class="w-full min-w-[1000px] text-left text-sm">
          <thead class="bg-muted text-muted-foreground">
            <tr>
              <th v-for="heading in ['Date', 'Shift', 'Clock in', 'Clock out', 'Worked (min)', 'Late (min)', 'Undertime (min)', 'Lateness −', 'Undertime −']" :key="heading" class="px-3 py-2 font-medium">{{ heading }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(day, index) in rows(detail.attendanceDays)" :key="index" class="border-t border-border">
              <td class="whitespace-nowrap px-3 py-2">{{ date(day.date) }}</td>
              <td class="px-3 py-2">{{ day.shiftName || '—' }}</td>
              <td class="whitespace-nowrap px-3 py-2">{{ date(day.clockInTime) }}</td>
              <td class="whitespace-nowrap px-3 py-2">{{ date(day.clockOutTime) }}</td>
              <td class="px-3 py-2">{{ number(day.workedMinutes) }}</td>
              <td class="px-3 py-2">{{ number(day.lateMinutes) }}</td>
              <td class="px-3 py-2">{{ number(day.undertimeMinutes) }}</td>
              <td class="px-3 py-2 text-red-600">{{ reportMoney(day.latenessPenalty) }}</td>
              <td class="px-3 py-2 text-red-600">{{ reportMoney(day.undertimePenalty) }}</td>
            </tr>
            <tr v-if="!rows(detail.attendanceDays).length"><td colspan="9" class="px-3 py-6 text-center text-muted-foreground">No attendance records.</td></tr>
          </tbody>
        </table>
      </div>
    </section>
    <CReportKpiEntryTable v-for="block in entryBlocks" :key="block.title" :title="block.title" :entries="block.entries" :show-details="block.title === 'Task entries' && canViewTaskHistory" @details="openHistory" />
    <section class="rounded-xl border border-border bg-card p-4">
      <h3 class="mb-3 text-sm font-semibold">Bonuses &amp; charges</h3>
      <div class="max-h-56 overflow-auto">
        <table class="w-full min-w-[560px] text-left text-sm">
          <thead class="sticky top-0 bg-muted text-muted-foreground"><tr><th class="px-3 py-2 font-medium">Date</th><th class="px-3 py-2 font-medium">Type</th><th class="px-3 py-2 font-medium">Reason</th><th class="px-3 py-2 font-medium">Amount</th></tr></thead>
          <tbody>
            <tr v-for="(item, index) in rows(detail.adjustments)" :key="index" class="border-t border-border">
              <td class="px-3 py-2">{{ date(item.effectiveDate) }}</td>
              <td class="px-3 py-2">{{ item.type === 0 ? 'Bonus' : 'Charge' }}</td>
              <td class="px-3 py-2">{{ item.reason || '—' }}</td>
              <td class="px-3 py-2" :class="item.type === 0 ? 'text-emerald-600' : 'text-red-600'">{{ reportMoney(item.amount) }}</td>
            </tr>
            <tr v-if="!rows(detail.adjustments).length"><td colspan="4" class="px-3 py-6 text-center text-muted-foreground">No adjustments.</td></tr>
          </tbody>
        </table>
      </div>
    </section>
    <CReportTaskHistoryModal v-model:open="historyOpen" :task-id="historyTaskId" />
  </div>
</template>
