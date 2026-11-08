<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Loader2, Search } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { useApi } from '@/composables/useAxiosService'
import { Input } from '@/components/ui/input'
import CReportToolbar from '@/modules/Report/components/CReportToolbar.vue'
import CReportMonthField from '@/modules/Report/components/CReportMonthField.vue'
import { currentOwnerMonth } from '@/modules/Report/utils/ownerDates'
import { reportMoney } from '@/modules/Report/utils/money'
import { ownerRoleBadge, ownerShiftBadge } from '@/modules/Report/utils/ownerBadges'

interface Row {
  userId: string
  userName: string
  fullName: string | null
  roleName: string | null
  levelName: string | null
  teamId: string | null
  teamName: string | null
  dailySalary: number
  attendedDays: number
  fixedSalary: number
  pointsValue: number
  bonusTotal: number
  chargeTotal: number
  attendancePenalty: number
  totalKpi: number
}
interface Employee {
  userId: string
  shift: number | null
  performanceId: string | null
}
interface Performance {
  id: string
  name: string
  color: string
}
const api = useApi()
const month = ref(currentOwnerMonth())
const rows = ref<Row[]>([])
const employees = ref<Employee[]>([])
const performances = ref<Performance[]>([])
const teamsVisible = ref(true)
const team = ref('all')
const search = ref('')
const loading = ref(false)
const teamOptions = computed(() => [
  ...new Map(
    rows.value
      .filter((item) => item.teamId)
      .map((item) => [item.teamId, { id: item.teamId, name: item.teamName }])
  ).values(),
])
const visible = computed(() =>
  rows.value.filter(
    (item) =>
      (team.value === 'all' || !item.teamId || item.teamId === team.value) &&
      `${item.fullName ?? ''} ${item.userName}`.toLowerCase().includes(search.value.toLowerCase())
  )
)
const totals = computed(() =>
  visible.value.reduce(
    (result, item) => ({
      earned: result.earned + item.fixedSalary,
      kpi: result.kpi + item.pointsValue,
      bonus: result.bonus + item.bonusTotal,
      charge: result.charge + item.chargeTotal,
      penalty: result.penalty + item.attendancePenalty,
      salary: result.salary + item.totalKpi,
    }),
    { earned: 0, kpi: 0, bonus: 0, charge: 0, penalty: 0, salary: 0 }
  )
)
const employeeById = computed(() => new Map(employees.value.map((item) => [item.userId, item])))
const shiftNames = ['Morning', 'Afternoon', 'Night']
const shiftClass = ownerShiftBadge
function performance(id: string | null | undefined) {
  return performances.value.find((item) => item.id === id)
}

async function load() {
  loading.value = true
  try {
    const [year, number] = month.value.split('-').map(Number)
    const startTime = new Date(Date.UTC(year, number - 1, 1)).toISOString()
    const endTime = new Date(Date.UTC(year, number, 0, 23, 59, 59)).toISOString()
    const [statistics, employeesResponse, performanceResponse, settingsResponse] =
      await Promise.all([
        api.post<{ successResult: { rows: Row[] } }>('/report/api/kpi/statistics', {
          startTime,
          endTime,
        }),
        api.get<{ successResult: Employee[] }>('/report/api/owner/employees', {
          params: { month: `${month.value}-01` },
        }),
        api.get<{ successResult: { definitions: Performance[] } }>(
          '/report/api/owner/performances'
        ),
        api.get<{ successResult: { teamsVisible: boolean } }>('/report/api/owner/settings'),
      ])
    rows.value = statistics.data.successResult.rows ?? []
    employees.value = employeesResponse.data.successResult ?? []
    performances.value = performanceResponse.data.successResult.definitions ?? []
    teamsVisible.value = settingsResponse.data.successResult.teamsVisible
  } catch {
    toast.error('Could not load salary data.')
  } finally {
    loading.value = false
  }
}

watch(month, load)
onMounted(load)
</script>

<template>
  <div
    class="flex h-[calc(100dvh-65px)] min-h-0 flex-col overflow-hidden bg-white dark:bg-background"
  >
    <CReportToolbar
      title="Salary"
      subtitle="Earned pay, KPI and adjustments by worker"
      :show-filters="false"
      ><template #actions
        ><div class="relative">
          <Search
            class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          /><Input v-model="search" class="w-56 pl-9" placeholder="Search workers" />
        </div>
        <CReportMonthField v-model="month" /></template
    ></CReportToolbar>
    <div class="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4 sm:p-6">
      <div v-if="loading" class="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 class="h-4 w-4 animate-spin" />Loading salary…
      </div>
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <div
          v-for="card in [
            { label: 'Earned base', value: totals.earned, color: 'text-foreground' },
            { label: 'KPI', value: totals.kpi, color: 'text-blue-600' },
            { label: 'Bonuses', value: totals.bonus, color: 'text-emerald-600' },
            { label: 'Charges', value: totals.charge, color: 'text-red-600' },
            { label: 'Time penalties', value: totals.penalty, color: 'text-red-600' },
            { label: 'Total salary', value: totals.salary, color: 'text-emerald-600' },
          ]"
          :key="card.label"
          class="rounded-xl border border-border bg-card p-4"
        >
          <div class="text-xs text-muted-foreground">{{ card.label }}</div>
          <strong class="mt-2 block text-xl" :class="card.color">{{
            reportMoney(card.value)
          }}</strong>
        </div>
      </div>
      <section
        class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card"
      >
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div class="flex items-center gap-2">
            <h2 class="text-sm font-semibold">Workers ({{ visible.length }})</h2>
            <div v-if="teamsVisible" class="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
              <button
                v-for="option in [{ id: 'all', name: 'All teams' }, ...teamOptions]"
                :key="option.id || 'all'"
                type="button"
                class="rounded-md px-3 py-1 text-xs"
                :class="
                  team === option.id
                    ? 'bg-background font-semibold shadow-sm'
                    : 'text-muted-foreground'
                "
                @click="team = option.id || 'all'"
              >
                {{ option.name }}
              </button>
            </div>
          </div>
        </div>
        <div class="min-h-0 flex-1 overflow-auto">
          <table class="w-full min-w-[1100px] text-left text-sm">
            <thead class="bg-muted text-muted-foreground">
              <tr>
                <th class="px-3 py-2 font-medium">Worker</th>
                <th class="px-3 py-2 font-medium">Role</th>
                <th class="px-3 py-2 font-medium">Level</th>
                <th class="px-3 py-2 font-medium">Shift</th>
                <th class="px-3 py-2 font-medium">Performance</th>
                <th class="px-3 py-2 font-medium">Days</th>
                <th class="px-3 py-2 font-medium">Daily rate</th>
                <th class="px-3 py-2 font-medium">Earned base</th>
                <th class="px-3 py-2 font-medium">KPI</th>
                <th class="px-3 py-2 font-medium">Bonus</th>
                <th class="px-3 py-2 font-medium">Charges</th>
                <th class="px-3 py-2 font-medium">Penalty</th>
                <th class="px-3 py-2 font-medium">Salary</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in visible" :key="item.userId" class="border-t border-border">
                <td class="px-3 py-2 font-medium">
                  {{
                    item.fullName ||
                    (item.userName.startsWith('vectorium:') ? 'Unnamed worker' : item.userName)
                  }}
                </td>
                <td class="px-3 py-2">
                  <span :class="ownerRoleBadge(item.roleName)">{{ item.roleName || '—' }}</span>
                </td>
                <td class="px-3 py-2">{{ item.levelName || '—' }}</td>
                <td class="px-3 py-2">
                  <span
                    class="rounded-md px-2 py-1 text-xs"
                    :class="shiftClass(employeeById.get(item.userId)?.shift ?? null)"
                    >{{ shiftNames[employeeById.get(item.userId)?.shift ?? -1] || '—' }}</span
                  >
                </td>
                <td class="px-3 py-2">
                  <span
                    v-if="performance(employeeById.get(item.userId)?.performanceId)"
                    class="rounded-md px-2 py-1 text-xs"
                    :style="{
                      backgroundColor: performance(employeeById.get(item.userId)?.performanceId)
                        ?.color,
                      color: '#fff',
                    }"
                    >{{ performance(employeeById.get(item.userId)?.performanceId)?.name }}</span
                  ><span v-else>—</span>
                </td>
                <td class="px-3 py-2">{{ item.attendedDays }}</td>
                <td class="px-3 py-2">{{ reportMoney(item.dailySalary) }}</td>
                <td class="px-3 py-2">{{ reportMoney(item.fixedSalary) }}</td>
                <td class="px-3 py-2 text-blue-600">{{ reportMoney(item.pointsValue) }}</td>
                <td class="px-3 py-2 text-emerald-600">{{ reportMoney(item.bonusTotal) }}</td>
                <td class="px-3 py-2 text-red-600">{{ reportMoney(item.chargeTotal) }}</td>
                <td class="px-3 py-2 text-red-600">{{ reportMoney(item.attendancePenalty) }}</td>
                <td class="px-3 py-2 font-semibold">{{ reportMoney(item.totalKpi) }}</td>
              </tr>
              <tr v-if="!visible.length">
                <td colspan="13" class="px-3 py-12 text-center text-muted-foreground">
                  No salary data for this month.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="shrink-0 border-t border-border px-3 py-2 text-xs text-muted-foreground">
          {{ visible.length }} workers
        </div>
      </section>
    </div>
  </div>
</template>
