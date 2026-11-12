<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ArrowUpRight, Loader2 } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { useApi } from '@/composables/useAxiosService'
import CReportToolbar from '@/modules/Report/components/CReportToolbar.vue'
import COwnerDriverChart from '@/modules/Report/components/COwnerDriverChart.vue'
import { reportMoney } from '@/modules/Report/utils/money'
import { ownerShiftBadge } from '@/modules/Report/utils/ownerBadges'
import { currentOwnerMonthRange } from '@/modules/Report/utils/ownerDates'

interface Bucket {
  label: string
  driversAdded: number
  driversDeleted: number
}
interface Statistics {
  driversAdded: number
  driversDeleted: number
  buckets: Bucket[]
}
interface Status {
  totalDrivers: number
  activeDrivers: number
  inactiveDrivers: number
}
interface Inspection {
  id: string
  type: number
  driverName: string
  companyName: string
  inspectionDate: string
  reasonNote: string | null
}
interface Expense {
  id: string
  categoryName: string
  categoryColor: string
  amount: number
  spentAt: string
  vendor: string | null
  companyId: string | null
}
interface Worker {
  userId: string
  userName: string
  firstName: string | null
  lastName: string | null
  shift: number | null
  performanceId: string | null
  dailySalary: number
  periodSalary: number
  teamId: string | null
}
interface Performance {
  id: string
  name: string
  color: string
}
const api = useApi()
const router = useRouter()
const range = ref(currentOwnerMonthRange())
const statistics = ref<Statistics>({ driversAdded: 0, driversDeleted: 0, buckets: [] })
const status = ref<Status>({ totalDrivers: 0, activeDrivers: 0, inactiveDrivers: 0 })
const inspections = ref<Inspection[]>([])
const expenses = ref<Expense[]>([])
const expenseTotal = ref(0)
const workers = ref<Worker[]>([])
const performances = ref<Performance[]>([])
const teamsVisible = ref(true)
const teams = ref<{ id: string; name: string }[]>([])
const selectedTeam = ref('all')
const companyTeams = ref<{ companyId: string; companyName: string; teamId: string | null }[]>([])
const loading = ref(false)
const shiftNames = ['Morning', 'Afternoon', 'Night']
const visibleWorkers = computed(() =>
  workers.value.filter(
    (item) => selectedTeam.value === 'all' || !item.teamId || item.teamId === selectedTeam.value
  )
)
const visibleCompanyIds = computed(
  () =>
    new Set(
      companyTeams.value
        .filter((item) => !item.teamId || item.teamId === selectedTeam.value)
        .map((item) => item.companyId)
    )
)
const visibleCompanyNames = computed(
  () =>
    new Set(
      companyTeams.value
        .filter((item) => !item.teamId || item.teamId === selectedTeam.value)
        .map((item) => item.companyName)
    )
)
const visibleInspections = computed(() =>
  inspections.value
    .filter(
      (item) => selectedTeam.value === 'all' || visibleCompanyNames.value.has(item.companyName)
    )
    .sort((a, b) => b.inspectionDate.localeCompare(a.inspectionDate))
)
const recentInspections = computed(() => visibleInspections.value.slice(0, 8))
const recentExpenses = computed(() => expenses.value.slice(0, 7))
const visibleExpenseTotal = computed(() =>
  selectedTeam.value === 'all'
    ? expenseTotal.value
    : expenses.value.reduce((sum, item) => sum + item.amount, 0) +
      visibleWorkers.value.reduce((sum, item) => sum + item.periodSalary, 0)
)
const performance = (id: string | null) => performances.value.find((item) => item.id === id)

async function load() {
  loading.value = true
  try {
    const month = range.value.startTime.slice(0, 7) + '-01'
    const settingsResponse = await api.get<{ successResult: { teamsVisible: boolean } }>(
      '/report/api/owner/settings'
    )
    const showTeams = settingsResponse.data.successResult.teamsVisible
    teamsVisible.value = showTeams
    if (!showTeams) selectedTeam.value = 'all'
    const request = {
      ...range.value,
      teamId: selectedTeam.value === 'all' ? null : selectedTeam.value,
    }
    const [
      statisticsResponse,
      statusResponse,
      inspectionResponse,
      expenseResponse,
      workerResponse,
      performanceResponse,
      teamResponse,
      assignmentResponse,
      salaryResponse,
    ] = await Promise.all([
      api.post<{ successResult: Statistics }>(
        '/report/api/company-driver-stats/statistics',
        request
      ),
      api.get<{ successResult: Status }>('/report/api/company-driver-stats/status', {
        params: request,
      }),
      api.get<{ successResult: Inspection[] }>('/report/api/inspections', {
        params: { from: range.value.startTime, to: range.value.endTime },
      }),
      api.get<{
        successResult: {
          entries: Expense[]
          total: number
        }
      }>('/report/api/owner/expenses', { params: { month } }),
      api.get<{ successResult: Worker[] }>('/report/api/owner/employees', { params: { month } }),
      api.get<{ successResult: { definitions: Performance[] } }>('/report/api/owner/performances'),
      showTeams
        ? api.get<{ successResult: { id: string; name: string }[] }>('/report/api/teams', {
            params: { month },
          })
        : Promise.resolve(null),
      showTeams
        ? api.get<{
            successResult: {
              companies: { companyId: string; companyName: string; teamId: string | null }[]
            }
          }>('/report/api/teams/assignments', { params: { month } })
        : Promise.resolve(null),
      api.post<{ successResult: { rows: { userId: string; totalKpi: number }[] } }>(
        '/report/api/kpi/statistics',
        request
      ),
    ])
    statistics.value = statisticsResponse.data.successResult
    status.value = statusResponse.data.successResult
    inspections.value = inspectionResponse.data.successResult ?? []
    expenses.value = expenseResponse.data.successResult.entries ?? []
    expenseTotal.value = expenseResponse.data.successResult.total ?? 0
    const periodSalaryByUser = new Map(
      (salaryResponse.data.successResult.rows ?? []).map((item) => [item.userId, item.totalKpi])
    )
    workers.value = (workerResponse.data.successResult ?? []).map((item) => ({
      ...item,
      periodSalary: periodSalaryByUser.get(item.userId) ?? 0,
    }))
    performances.value = performanceResponse.data.successResult.definitions ?? []
    teams.value = teamResponse?.data.successResult ?? []
    companyTeams.value = assignmentResponse?.data.successResult.companies ?? []
  } catch {
    toast.error('Could not load Owner dashboard.')
  } finally {
    loading.value = false
  }
}

function onRange(value: { startTime: string; endTime: string }) {
  if (range.value.startTime === value.startTime && range.value.endTime === value.endTime) return
  range.value = value
  void load()
}
function selectTeam(id: string) {
  selectedTeam.value = id
  void load()
}
onMounted(load)
</script>

<template>
  <div
    class="flex h-[calc(100dvh-65px)] min-h-0 flex-col overflow-hidden bg-white dark:bg-background"
  >
    <CReportToolbar
      title="Dashboard"
      subtitle="Drivers, inspections, expenses and workers"
      month-picker
      @change="onRange"
      ><template #actions
        ><div
          v-if="teamsVisible && teams.length"
          class="flex max-w-[460px] items-center gap-1 overflow-auto rounded-lg bg-muted p-1"
        >
          <button
            v-for="option in [{ id: 'all', name: 'All teams' }, ...teams]"
            :key="option.id"
            type="button"
            class="whitespace-nowrap rounded-md px-3 py-1.5 text-sm"
            :class="
              selectedTeam === option.id
                ? 'bg-background font-semibold shadow-sm'
                : 'text-muted-foreground'
            "
            @click="selectTeam(option.id)"
          >
            {{ option.name }}
          </button>
        </div></template
      ></CReportToolbar
    >
    <div class="min-h-0 flex-1 space-y-5 overflow-auto p-4 sm:p-6">
      <div v-if="loading" class="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 class="h-4 w-4 animate-spin" />Loading dashboard…
      </div>
      <div class="grid gap-5 xl:grid-cols-12">
        <div class="space-y-5 xl:col-span-8">
          <section class="rounded-xl border border-border bg-card p-4 sm:p-5">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-sm font-semibold">Drivers activity</h2>
                <p class="mt-1 text-xs text-muted-foreground">
                  Drivers active in the selected period
                </p>
              </div>
            </div>
            <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div
                v-for="card in [
                  { label: 'All drivers', value: status.totalDrivers, color: 'text-foreground' },
                  { label: 'Active', value: status.activeDrivers, color: 'text-emerald-600' },
                  { label: 'Added', value: statistics.driversAdded, color: 'text-blue-600' },
                  { label: 'Removed', value: statistics.driversDeleted, color: 'text-amber-600' },
                ]"
                :key="card.label"
                class="rounded-lg border border-border bg-muted/20 p-3"
              >
                <span class="text-xs text-muted-foreground">{{ card.label }}</span
                ><strong class="mt-2 block text-xl" :class="card.color">{{
                  card.value ?? 0
                }}</strong>
              </div>
            </div>
          </section>
          <section class="rounded-xl border border-border bg-card p-4 sm:p-5">
            <h2 class="text-sm font-semibold">Drivers over time</h2>
            <COwnerDriverChart :buckets="statistics.buckets ?? []" />
          </section>
        </div>
        <section
          class="flex min-h-[480px] flex-col overflow-hidden rounded-xl border border-border bg-card xl:col-span-4"
        >
          <div class="flex items-center justify-between border-b border-border p-4">
            <h2 class="text-sm font-semibold">Inspections</h2>
            <button
              class="flex items-center gap-1 text-xs text-primary"
              @click="router.push('/report/owner/inspections')"
            >
              View all <ArrowUpRight class="h-3.5 w-3.5" />
            </button>
          </div>
          <div class="min-h-0 flex-1 overflow-auto">
            <div
              v-for="item in recentInspections"
              :key="item.id"
              class="border-b border-border p-4"
            >
              <div class="flex items-center justify-between gap-2">
                <span class="text-sm font-medium">{{ item.driverName }}</span
                ><span
                  class="rounded-md px-2 py-1 text-[10px] font-semibold"
                  :class="
                    item.type === 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                  "
                  >{{ item.type === 0 ? 'Violation' : 'No violation' }}</span
                >
              </div>
              <p class="mt-1 text-xs text-muted-foreground">
                {{ item.companyName }} · {{ item.inspectionDate.slice(0, 10) }}
              </p>
              <p v-if="item.reasonNote" class="mt-1 truncate text-xs">{{ item.reasonNote }}</p>
            </div>
            <p
              v-if="!recentInspections.length"
              class="p-8 text-center text-sm text-muted-foreground"
            >
              No inspections in this period.
            </p>
          </div>
          <div class="border-t border-border px-4 py-3 text-xs text-muted-foreground">
            {{ visibleInspections.length }} inspections
          </div>
        </section>
      </div>
      <div class="grid gap-5 xl:grid-cols-2">
        <section class="overflow-hidden rounded-xl border border-border bg-card">
          <div class="flex items-center justify-between border-b border-border p-4">
            <div>
              <h2 class="text-sm font-semibold">Expenses</h2>
              <p class="mt-1 text-xs text-muted-foreground">
                Total {{ reportMoney(visibleExpenseTotal) }}
              </p>
            </div>
            <button
              class="flex items-center gap-1 text-xs text-primary"
              @click="router.push('/report/owner/expenses')"
            >
              View all <ArrowUpRight class="h-3.5 w-3.5" />
            </button>
          </div>
          <div class="max-h-[340px] overflow-auto">
            <div
              v-for="item in recentExpenses"
              :key="item.id"
              class="flex items-center justify-between gap-3 border-b border-border px-4 py-3 text-sm"
            >
              <div>
                <span
                  class="mr-2 inline-block h-2.5 w-2.5 rounded-full"
                  :style="{ backgroundColor: item.categoryColor }"
                />{{ item.categoryName }}
                <p class="mt-1 text-xs text-muted-foreground">
                  {{ item.vendor || item.spentAt.slice(0, 10) }}
                </p>
              </div>
              <strong class="text-red-600">{{ reportMoney(item.amount) }}</strong>
            </div>
            <p v-if="!recentExpenses.length" class="p-8 text-center text-sm text-muted-foreground">
              No expense entries.
            </p>
          </div>
        </section>
        <section class="overflow-hidden rounded-xl border border-border bg-card">
          <div class="flex items-center justify-between border-b border-border p-4">
            <h2 class="text-sm font-semibold">Workers</h2>
            <button
              class="flex items-center gap-1 text-xs text-primary"
              @click="router.push('/report/owner/teams')"
            >
              View all <ArrowUpRight class="h-3.5 w-3.5" />
            </button>
          </div>
          <div class="max-h-[340px] overflow-auto">
            <table class="w-full min-w-[510px] text-left text-sm">
              <thead class="sticky top-0 bg-muted text-muted-foreground">
                <tr>
                  <th class="px-3 py-2 font-medium">Worker</th>
                  <th class="px-3 py-2 font-medium">Shift</th>
                  <th class="px-3 py-2 font-medium">Performance</th>
                  <th class="px-3 py-2 font-medium">Salary</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="item in visibleWorkers"
                  :key="item.userId"
                  class="border-t border-border"
                >
                  <td class="px-3 py-2">
                    {{
                      `${item.firstName ?? ''} ${item.lastName ?? ''}`.trim() ||
                      (item.userName.startsWith('vectorium:') ? 'Unnamed worker' : item.userName)
                    }}
                  </td>
                  <td class="px-3 py-2">
                    <span :class="ownerShiftBadge(item.shift)">{{
                      shiftNames[item.shift ?? -1] || '—'
                    }}</span>
                  </td>
                  <td class="px-3 py-2">
                    <span
                      v-if="performance(item.performanceId)"
                      class="rounded px-2 py-1 text-xs text-white"
                      :style="{ backgroundColor: performance(item.performanceId)?.color }"
                      >{{ performance(item.performanceId)?.name }}</span
                    ><span v-else>—</span>
                  </td>
                  <td class="px-3 py-2 font-semibold">{{ reportMoney(item.periodSalary) }}</td>
                </tr>
                <tr v-if="!visibleWorkers.length">
                  <td colspan="4" class="px-3 py-8 text-center text-muted-foreground">
                    No workers.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
