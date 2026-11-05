<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useRouter } from 'vue-router'
import { Eye } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { useApi } from '@/composables/useAxiosService'
import { useAuthStore } from '@/modules/Auth/store/authStore'
import { hasPermission } from '@/router/permissions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import CReportToolbar from '@/modules/Report/components/CReportToolbar.vue'
import CReportActivityChart from '@/modules/Report/components/CReportActivityChart.vue'
import { reportMoney } from '@/modules/Report/utils/money'

interface Result {
  successResult: Record<string, unknown>
}
interface Range {
  startTime: string
  endTime: string
}
interface KpiBreakdown {
  startTime: string
  endTime: string
  eachPointValue: number
  totalTasks: number
  taskPoints: number
  checkerGainedPoints: number
  deductedPoints: number
  totalPoints: number
  totalPointsValue: number
  totalBonus: number
  totalCharge: number
  totalLatenessPenalty: number
  totalUndertimePenalty: number
  totalFixedSalary: number
  totalKpi: number
  notes: { noteTitle: string; taskCount: number; points: number; pointsValue: number }[]
}
const api = useApi()
const auth = useAuthStore()
const canSync = computed(() => hasPermission(auth.token, 'report.attendance.sync'))
const route = useRoute()
const router = useRouter()
const mode = computed(() =>
  route.path.endsWith('/attendance')
    ? 'attendance'
    : route.path.endsWith('/kpi')
      ? 'kpi'
      : 'statistics'
)
const title = computed(() =>
  mode.value === 'attendance'
    ? 'Attendance'
    : mode.value === 'kpi'
      ? 'KPI details'
      : 'Company & Driver statistics'
)
const subtitle = computed(() =>
  mode.value === 'attendance'
    ? 'Clockster attendance and penalties'
    : mode.value === 'kpi'
      ? 'Employee points and earnings'
      : 'Company and driver changes'
)
const range = ref<Range | null>(null)
const data = ref<Record<string, unknown>>({})
const status = ref<Record<string, unknown>>({})
const activeType = ref('activity')
const teams = ref<{ id: string; name: string }[]>([])
const teamId = ref('all')
const roleNames = ref<Record<string, string>>({})
const loading = ref(false)
const syncing = ref(false)
const clocksterReady = ref(false)
const detail = ref<Record<string, unknown> | null>(null)
const detailName = ref('')
const detailOpen = ref(false)
const detailLoading = ref(false)
const breakdown = ref<KpiBreakdown | null>(null)
const breakdownOpen = ref(false)
const breakdownLoading = ref(false)
let breakdownRequestVersion = 0
const entrySearch = ref<Record<string, string>>({ company: '', driver: '' })
const entryType = ref<Record<string, string>>({ company: 'all', driver: 'all' })
const entrySort = ref<Record<string, boolean>>({ company: false, driver: false })
const rowSearch = ref('')
const moneyColumns = new Set(['dailySalary', 'earnedBase', 'fixedSalary', 'latenessPenalty', 'undertimePenalty', 'penalty', 'pointsValue', 'bonusTotal', 'chargeTotal', 'totalKpi'])
const moneyMetrics = new Set(['Lateness penalty', 'Undertime penalty', 'Total penalty', 'Fixed salary', 'Charges', 'Bonuses', 'KPI value', 'Total KPI', 'Total Salary'])
const sortKey = ref('')
const sortDirection = ref<'asc' | 'desc'>('asc')
const visibleRows = computed(() => {
  const filtered = rows.value.filter(row =>
    `${row.fullName ?? ''} ${row.userName ?? ''} ${row.teamName ?? ''} ${roleNames.value[String(row.userId)] ?? row.roleName ?? ''}`
      .toLowerCase().includes(rowSearch.value.trim().toLowerCase())
  )
  if (!sortKey.value || mode.value === 'statistics') return filtered
  return filtered.sort((left, right) => {
    const first = cellValue(left, sortKey.value)
    const second = cellValue(right, sortKey.value)
    if (first == null || first === '') return second == null || second === '' ? 0 : 1
    if (second == null || second === '') return -1
    const comparison = typeof first === 'number' && typeof second === 'number'
      ? first - second
      : String(first).localeCompare(String(second), undefined, { numeric: true, sensitivity: 'base' })
    return sortDirection.value === 'asc' ? comparison : -comparison
  })
})

function sortBy(key: string) {
  if (sortKey.value === key) sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  else {
    sortKey.value = key
    sortDirection.value = 'asc'
  }
}
const columns = computed(() =>
  mode.value === 'attendance'
    ? [
        { key: 'fullName', label: 'Employee' },
        { key: 'shiftName', label: 'Shift' },
        { key: 'teamName', label: 'Team' },
        { key: 'dailySalary', label: 'Daily $' },
        { key: 'attendedDays', label: 'Attended' },
        { key: 'earnedBase', label: 'Fixed salary' },
        { key: 'lateMinutes', label: 'Late (min)' },
        { key: 'undertimeMinutes', label: 'Undertime (min)' },
        { key: 'latenessPenalty', label: 'Lateness −' },
        { key: 'undertimePenalty', label: 'Undertime −' },
        { key: 'penalty', label: 'Total −' },
      ]
    : mode.value === 'kpi'
      ? [
          { key: 'fullName', label: 'Employee' },
          { key: 'roleName', label: 'Role' },
          { key: 'levelName', label: 'Level' },
          { key: 'teamName', label: 'Team' },
          { key: 'fixedSalary', label: 'Fixed salary' },
          { key: 'completedTaskCount', label: 'Tasks' },
          { key: 'taskPoints', label: 'Task pts' },
          { key: 'checkerGainedPoints', label: 'Checker +' },
          { key: 'deductedPoints', label: 'Deducted −' },
          { key: 'totalPoints', label: 'Total pts' },
          { key: 'pointsValue', label: 'KPI $' },
          { key: 'bonusTotal', label: 'Bonus' },
          { key: 'chargeTotal', label: 'Charge' },
          { key: 'latenessPenalty', label: 'Lateness −' },
          { key: 'undertimePenalty', label: 'Undertime −' },
          { key: 'totalKpi', label: 'Salary' },
        ]
      : [
          { key: 'name', label: 'Name' },
          { key: 'companyName', label: 'Company' },
          { key: 'type', label: 'Change' },
          { key: 'date', label: 'Date' },
        ]
)
const rows = computed<Record<string, unknown>[]>(() =>
  mode.value === 'statistics'
    ? [...asRows(data.value.companyEntries), ...asRows(data.value.driverEntries)]
    : asRows(data.value.rows)
)
const metrics = computed(() =>
  mode.value === 'attendance'
    ? [
        { label: 'Late minutes', value: data.value.totalLateMinutes },
        { label: 'Undertime minutes', value: data.value.totalUndertimeMinutes },
        { label: 'Lateness penalty', value: data.value.totalLatenessPenalty },
        { label: 'Undertime penalty', value: data.value.totalUndertimePenalty },
        { label: 'Total penalty', value: data.value.totalPenalty },
      ]
    : mode.value === 'kpi'
      ? [
          { label: 'Fixed salary', value: data.value.totalFixedSalary },
          { label: 'Charges', value: data.value.totalCharge },
          { label: 'Bonuses', value: data.value.totalBonus },
          { label: 'Total points', value: data.value.totalPoints },
          { label: 'KPI value', value: data.value.totalPointsValue },
          { label: 'Lateness penalty', value: data.value.totalLatenessPenalty },
          { label: 'Undertime penalty', value: data.value.totalUndertimePenalty },
          { label: 'Total Salary', value: data.value.totalKpi },
        ]
      : [
          { label: 'Companies added', value: data.value.companiesAdded },
          { label: 'Companies deleted', value: data.value.companiesDeleted },
          { label: 'Drivers added', value: data.value.driversAdded },
          { label: 'Drivers deleted', value: data.value.driversDeleted },
          { label: 'Active companies', value: selectedActive.value.find(item => item.title === 'Companies')?.active ?? 0 },
          { label: 'Active drivers', value: selectedActive.value.find(item => item.title === 'Drivers')?.active ?? 0 },
        ]
)
const breakdownItems = computed(() => {
  const value = breakdown.value
  if (!value) return []
  return [
    { label: 'Total tasks', value: value.totalTasks, money: false },
    { label: 'Task points', value: value.taskPoints, money: false },
    { label: 'Checker +', value: value.checkerGainedPoints, money: false },
    { label: 'Deducted −', value: value.deductedPoints, money: false },
    { label: 'Total points', value: value.totalPoints, money: false },
    { label: 'Point earnings', value: value.totalPointsValue, money: true },
    { label: 'Bonuses', value: value.totalBonus, money: true },
    { label: 'Charges', value: value.totalCharge, money: true },
    { label: 'Lateness penalty', value: value.totalLatenessPenalty, money: true },
    { label: 'Undertime penalty', value: value.totalUndertimePenalty, money: true },
    { label: 'Earned salary', value: value.totalFixedSalary, money: true },
    { label: 'Total KPI', value: value.totalKpi, money: true },
  ]
})
const statusGroups = computed(() =>
  (['Companies', 'Drivers'] as const).map((title) => {
    const kind = title === 'Companies' ? 'Companies' : 'Drivers'
    return {
      title,
      total: Number(status.value[`total${kind}`] ?? 0),
      methods: [
        {
          key: 'activity',
          label: 'By activity in selected period',
          active: Number(status.value[`active${kind}`] ?? 0),
          inactive: Number(status.value[`inactive${kind}`] ?? 0),
        },
        {
          key: 'tasks',
          label: `More than ${status.value.taskActiveThreshold ?? 4} route tasks`,
          active: Number(status.value[`active${kind}ByTasks`] ?? 0),
          inactive: Number(status.value[`inactive${kind}ByTasks`] ?? 0),
        },
        {
          key: 'any-task',
          label: 'At least one route task',
          active: Number(status.value[`active${kind}ByAnyTask`] ?? 0),
          inactive: Number(status.value[`inactive${kind}ByAnyTask`] ?? 0),
        },
      ],
    }
  })
)
const selectedActive = computed(() =>
  statusGroups.value.map((group) => ({
    title: group.title,
    active: group.methods.find((item) => item.key === activeType.value)?.active ?? 0,
  }))
)
const buckets = computed(() =>
  asRows(data.value.buckets).map((bucket) => ({
    label: String(bucket.label ?? ''),
    companiesAdded: Number(bucket.companiesAdded ?? 0),
    companiesDeleted: Number(bucket.companiesDeleted ?? 0),
    driversAdded: Number(bucket.driversAdded ?? 0),
    driversDeleted: Number(bucket.driversDeleted ?? 0),
  }))
)
const statisticsGroups = computed(() =>
  (['company', 'driver'] as const).map((kind) => {
    const search = entrySearch.value[kind].trim().toLowerCase()
    const type = entryType.value[kind]
    const entries = asRows(
      kind === 'company' ? data.value.companyEntries : data.value.driverEntries
    )
      .filter((item) => type === 'all' || item.type === type)
      .filter((item) =>
        [item.name, item.companyName, item.teamName].some((value) =>
          String(value ?? '')
            .toLowerCase()
            .includes(search)
        )
      )
      .sort(
        (a, b) =>
          (new Date(String(a.date)).getTime() - new Date(String(b.date)).getTime()) *
          (entrySort.value[kind] ? 1 : -1)
      )
    return { kind, title: kind === 'company' ? 'Companies' : 'Drivers', entries }
  })
)

function asRows(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? (value as Record<string, unknown>[]) : []
}

function display(value: unknown) {
  if (value == null || value === '') return '—'
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value))
    return new Date(value).toLocaleString()
  return String(value)
}

function cellValue(row: Record<string, unknown>, key: string) {
  if (key === 'roleName') return roleNames.value[String(row.userId)] ?? row.roleName
  return row[key] ?? (key === 'fullName' ? row.userName : null)
}

async function load() {
  if (!range.value) return
  loading.value = true
  try {
    const endpoint = mode.value === 'statistics' ? 'company-driver-stats' : mode.value
    const request = { ...range.value, teamId: teamId.value === 'all' ? null : teamId.value }
    const response = await api.post<Result>(`/report/api/${endpoint}/statistics`, request)
    data.value = response.data.successResult ?? {}
    if (mode.value === 'statistics') {
      const live = await api.get<Result>('/report/api/company-driver-stats/status', {
        params: request,
      })
      status.value = live.data.successResult ?? {}
    }
  } catch {
    toast.error(`Could not load ${title.value.toLowerCase()}.`)
  } finally {
    loading.value = false
  }
}

async function syncAttendance() {
  if (!range.value) return
  syncing.value = true
  try {
    await api.post('/report/api/attendance/sync', range.value)
    toast.success('Attendance synchronized.')
    await load()
  } catch {
    toast.error('Could not synchronize attendance.')
  } finally {
    syncing.value = false
  }
}

async function openBreakdown() {
  if (!range.value) return
  const version = ++breakdownRequestVersion
  breakdown.value = null
  breakdownOpen.value = true
  breakdownLoading.value = true
  try {
    const response = await api.post<{ successResult: KpiBreakdown }>('/report/api/kpi/statistics/breakdown', {
      ...range.value,
      teamId: teamId.value === 'all' ? null : teamId.value,
    })
    if (version === breakdownRequestVersion) breakdown.value = response.data.successResult
  } catch {
    if (version === breakdownRequestVersion) toast.error('Could not load KPI totals breakdown.')
  } finally {
    if (version === breakdownRequestVersion) breakdownLoading.value = false
  }
}

function onRange(value: Range) {
  range.value = value
  void load()
}

async function openDetail(row: Record<string, unknown>) {
  if (mode.value !== 'attendance' || !range.value || !row.userId) return
  detailOpen.value = true
  detailLoading.value = true
  detail.value = null
  detailName.value = String(row.fullName ?? row.userName ?? 'Employee')
  try {
    const response = await api.get<Result>(`/report/api/attendance/details/${row.userId}`, {
      params: range.value,
    })
    detail.value = response.data.successResult
  } catch {
    toast.error('Could not load employee details.')
  } finally {
    detailLoading.value = false
  }
}

function openEmployee(row: Record<string, unknown>) {
  if (!range.value || !row.userId) return
  void router.push({
    name: 'ReportKpiEmployee',
    params: { userId: String(row.userId) },
    query: {
      from: range.value.startTime,
      to: range.value.endTime,
      name: String(row.fullName ?? row.userName ?? 'Employee'),
      ...(teamId.value !== 'all' ? { teamId: teamId.value } : {}),
    },
  })
}

watch(mode, () => {
  data.value = {}
  status.value = {}
  breakdownOpen.value = false
  breakdown.value = null
  breakdownRequestVersion++
  sortKey.value = ''
  sortDirection.value = 'asc'
  void load()
})
watch(teamId, load)
onMounted(async () => {
  try {
    const response = await api.get<{ successResult: { id: string; roleName: string | null }[] }>('/report/api/user-levels')
    roleNames.value = Object.fromEntries(response.data.successResult.map(item => [item.id, item.roleName ?? '']))
  } catch {
    roleNames.value = {}
  }
  try {
    const response = await api.get<{
      successResult: { clocksterEnabled: boolean; clocksterConfigured: boolean }
    }>('/report/api/features')
    clocksterReady.value =
      response.data.successResult.clocksterEnabled &&
      response.data.successResult.clocksterConfigured
  } catch {
    clocksterReady.value = false
  }
  try {
    const response = await api.get<{ successResult: { id: string; name: string }[] }>(
      '/report/api/teams',
      { params: { month: new Date().toISOString().slice(0, 7) + '-01T00:00:00Z' } }
    )
    teams.value = response.data.successResult ?? []
  } catch {
    teams.value = []
  }
})
</script>

<template>
  <div
    class="flex h-[calc(100dvh-65px)] min-h-0 flex-col overflow-hidden bg-gray-50 dark:bg-background"
  >
    <CReportToolbar
      :title="title"
      :subtitle="subtitle"
      default-period="month"
      full-periods
      @change="onRange"
      ><template #actions
        ><div v-if="teams.length" class="flex max-w-full shrink-0 items-center gap-1 overflow-x-auto rounded-lg bg-muted p-1 md:max-w-[300px] 2xl:max-w-[500px]">
          <button type="button" class="whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors" :class="teamId === 'all' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'" @click="teamId = 'all'">All teams</button>
          <button v-for="team in teams" :key="team.id" type="button" class="whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors" :class="teamId === team.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'" @click="teamId = team.id">{{ team.name }}</button>
        </div><Button
          v-if="mode === 'attendance' && canSync"
          variant="outline"
          :disabled="syncing || !clocksterReady"
          :title="clocksterReady ? '' : 'Enable and configure Clockster in Report settings'"
          @click="syncAttendance"
          >{{ syncing ? 'Syncing…' : 'Sync Clockster' }}</Button
        ></template
      ></CReportToolbar
    >
    <div
      class="flex min-h-0 flex-1 flex-col gap-4 p-4"
      :class="mode === 'statistics' && 'overflow-auto'"
    >
      <div class="grid grid-cols-2 gap-3 md:grid-cols-3" :class="mode === 'kpi' ? 'xl:grid-cols-4' : mode === 'statistics' ? 'xl:grid-cols-6' : 'xl:grid-cols-5'">
        <div
          v-for="metric in metrics"
          :key="metric.label"
          class="flex min-h-20 flex-col gap-1 rounded-xl border border-border bg-card p-4"
          :class="metric.label.startsWith('Total ') ? 'bg-slate-900 text-white dark:bg-foreground dark:text-background' : ''"
        >
          <div class="text-xs" :class="metric.label.startsWith('Total ') ? 'opacity-75' : 'text-muted-foreground'">{{ metric.label }}</div>
          <strong class="text-xl font-semibold">{{ moneyMetrics.has(metric.label) ? reportMoney(metric.value ?? 0) : display(metric.value ?? 0) }}</strong>
          <button v-if="mode === 'kpi' && metric.label === 'Total Salary'" type="button" class="mt-1 w-fit text-left text-xs font-medium underline underline-offset-2 opacity-80 hover:opacity-100" @click="openBreakdown">Details</button>
        </div>
      </div>
      <template v-if="mode === 'statistics'">
        <div class="rounded-xl border border-border bg-card p-4">
          <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="text-sm font-semibold">Status for selected period</h2>
              <p class="mt-1 text-xs text-muted-foreground">
                Choose how active companies and drivers are calculated.
              </p>
            </div>
            <Select v-model="activeType"
              ><SelectTrigger class="w-60"><SelectValue /></SelectTrigger
              ><SelectContent
                ><SelectItem value="activity">By activity</SelectItem
                ><SelectItem value="tasks">By route tasks</SelectItem
                ><SelectItem value="any-task">By any route task</SelectItem></SelectContent
              ></Select
            >
          </div>
          <div class="grid gap-3 md:grid-cols-2">
            <div
              v-for="group in statusGroups"
              :key="group.title"
              class="rounded-lg border border-border p-4"
            >
              <div class="flex items-baseline justify-between text-sm font-semibold">
                <span>{{ group.title }}</span
                ><span class="text-xs font-normal text-muted-foreground"
                  >Total
                  <strong class="ml-1 text-base text-foreground">{{ group.total }}</strong></span
                >
              </div>
              <div v-for="method in group.methods.filter(item => item.key === activeType)" :key="method.key" class="mt-3 flex items-center justify-between gap-3 text-xs">
                <span class="text-muted-foreground">{{ method.label }}</span>
                <span class="flex gap-4">
                  <span><strong class="text-emerald-600">{{ method.active }}</strong> active</span>
                  <span><strong class="text-red-600">{{ method.inactive }}</strong> inactive</span>
                </span>
              </div>
            </div>
          </div>
        </div>
        <div class="rounded-lg border border-border bg-card p-4">
          <h2 class="mb-3 text-sm font-semibold">Activity over time</h2>
          <CReportActivityChart v-if="buckets.length" :buckets="buckets" />
          <div v-else class="py-14 text-center text-sm text-muted-foreground">
            No changes in this period.
          </div>
        </div>
        <div class="grid gap-4 xl:grid-cols-2">
          <div
            v-for="group in statisticsGroups"
            :key="group.kind"
            class="min-w-0 overflow-hidden rounded-lg border border-border bg-card"
          >
            <div
              class="flex flex-wrap items-center justify-between gap-2 border-b border-border p-3"
            >
              <h2 class="text-sm font-semibold">{{ group.title }} ({{ group.entries.length }})</h2>
              <div class="flex gap-2">
                <Select v-model="entryType[group.kind]">
                  <SelectTrigger class="h-9 w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="Added">Added</SelectItem>
                    <SelectItem value="Deleted">Deleted</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  v-model="entrySearch[group.kind]"
                  :placeholder="`Search ${group.title.toLowerCase()}`"
                  class="h-9 w-40"
                />
              </div>
            </div>
            <div class="max-h-80 overflow-auto">
              <table class="w-full min-w-[520px] text-left text-xs">
                <thead class="sticky top-0 bg-muted text-muted-foreground">
                  <tr>
                    <th class="px-3 py-2 font-medium">
                      {{ group.kind === 'company' ? 'Company' : 'Driver' }}
                    </th>
                    <th v-if="group.kind === 'driver'" class="px-3 py-2 font-medium">Company</th>
                    <th class="px-3 py-2 font-medium">Team</th>
                    <th class="px-3 py-2 font-medium">Change</th>
                    <th
                      class="cursor-pointer px-3 py-2 font-medium"
                      @click="entrySort[group.kind] = !entrySort[group.kind]"
                    >
                      Date {{ entrySort[group.kind] ? '↑' : '↓' }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(item, index) in group.entries"
                    :key="`${item.id}-${item.type}-${item.date}-${index}`"
                    class="border-t border-border"
                  >
                    <td class="px-3 py-2">{{ display(item.name) }}</td>
                    <td v-if="group.kind === 'driver'" class="px-3 py-2">
                      {{ display(item.companyName) }}
                    </td>
                    <td class="px-3 py-2">{{ display(item.teamName) }}</td>
                    <td
                      class="px-3 py-2"
                      :class="item.type === 'Added' ? 'text-emerald-600' : 'text-red-600'"
                    >
                      {{ display(item.type) }}
                    </td>
                    <td class="px-3 py-2">{{ display(item.date) }}</td>
                  </tr>
                  <tr v-if="!group.entries.length">
                    <td
                      :colspan="group.kind === 'driver' ? 5 : 4"
                      class="px-3 py-8 text-center text-muted-foreground"
                    >
                      No records.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </template>
      <div
        v-else
        class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card"
      >
        <div class="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h2 class="text-sm font-semibold">{{ mode === 'kpi' ? 'Employee KPI' : 'Employee attendance' }}</h2>
          <Input v-model="rowSearch" placeholder="Search employees" class="h-9 w-56" />
        </div>
        <div class="min-h-0 flex-1 overflow-auto">
          <table class="w-full text-left text-sm" :class="mode === 'kpi' ? 'min-w-[1900px]' : 'min-w-[1300px]'">
            <thead class="sticky top-0 z-10 bg-muted text-muted-foreground">
              <tr>
                <th class="px-4 py-3 font-medium">No</th>
                <th v-for="column in columns" :key="column.key" class="px-4 py-3 font-medium" :aria-sort="sortKey === column.key ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'">
                  <button type="button" class="inline-flex items-center gap-1.5 whitespace-nowrap text-left hover:text-foreground" @click="sortBy(column.key)">
                    {{ column.label }}<span class="text-xs" :class="sortKey === column.key ? 'text-foreground' : 'text-muted-foreground/60'">{{ sortKey === column.key ? (sortDirection === 'asc' ? '↑' : '↓') : '↕' }}</span>
                  </button>
                </th>
                <th v-if="mode === 'kpi'" class="px-4 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, index) in visibleRows"
                :key="String(row.id ?? row.userId ?? index)"
                class="border-t border-border hover:bg-muted/40"
                :class="mode === 'attendance' && 'cursor-pointer hover:bg-muted/40'"
                @click="openDetail(row)"
              >
                <td class="px-4 py-3 text-muted-foreground">{{ index + 1 }}</td>
                <td v-for="column in columns" :key="column.key" class="whitespace-nowrap px-4 py-3" :class="column.key.includes('Penalty') || column.key === 'chargeTotal' ? 'text-red-600' : column.key === 'bonusTotal' || column.key === 'checkerGainedPoints' ? 'text-emerald-600' : ''">
                  {{
                    moneyColumns.has(column.key) ? reportMoney(cellValue(row, column.key)) : display(cellValue(row, column.key))
                  }}
                </td>
                <td v-if="mode === 'kpi'" class="px-4 py-3 text-right">
                  <Button size="icon-sm" variant="ghost" title="Details" aria-label="Details" @click.stop="openEmployee(row)"><Eye class="h-4 w-4" /></Button>
                </td>
              </tr>
              <tr v-if="!visibleRows.length">
                <td
                  :colspan="columns.length + 1 + (mode === 'kpi' ? 1 : 0)"
                  class="px-4 py-14 text-center text-muted-foreground"
                >
                  {{ loading ? 'Loading…' : 'No records for this period.' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="border-t border-border px-4 py-3 text-xs text-muted-foreground">
          {{ visibleRows.length }} records
        </div>
      </div>
    </div>
    <Dialog v-if="mode === 'kpi'" v-model:open="breakdownOpen">
      <DialogContent class="max-h-[85vh] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-3xl">
        <DialogHeader><DialogTitle>Totals breakdown</DialogTitle></DialogHeader>
        <div v-if="breakdownLoading" class="py-12 text-center text-sm text-muted-foreground">Loading totals…</div>
        <div v-else-if="breakdown" class="space-y-5">
          <p class="text-xs text-muted-foreground">{{ breakdown.startTime.slice(0, 10) }} – {{ breakdown.endTime.slice(0, 10) }} · Point value {{ reportMoney(breakdown.eachPointValue) }}</p>
          <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            <div v-for="item in breakdownItems" :key="item.label" class="flex min-h-16 flex-col justify-center gap-1 rounded-lg border border-border bg-card px-3 py-2" :class="item.label === 'Total KPI' ? 'bg-slate-900 text-white dark:bg-foreground dark:text-background' : ''">
              <span class="text-xs" :class="item.label === 'Total KPI' ? 'opacity-75' : 'text-muted-foreground'">{{ item.label }}</span>
              <strong class="text-sm font-semibold">{{ item.money ? reportMoney(item.value) : display(item.value) }}</strong>
            </div>
          </div>
          <div class="overflow-hidden rounded-lg border border-border">
            <div class="border-b border-border px-3 py-2 text-sm font-semibold">By note</div>
            <div class="max-h-72 overflow-auto">
              <table class="w-full min-w-[520px] text-left text-sm">
                <thead class="sticky top-0 bg-muted text-muted-foreground"><tr><th class="px-3 py-2 font-medium">Note</th><th class="px-3 py-2 font-medium">Tasks</th><th class="px-3 py-2 font-medium">Points</th><th class="px-3 py-2 font-medium">Point earnings</th></tr></thead>
                <tbody>
                  <tr v-for="note in breakdown.notes" :key="note.noteTitle" class="border-t border-border"><td class="px-3 py-2">{{ note.noteTitle }}</td><td class="px-3 py-2">{{ display(note.taskCount) }}</td><td class="px-3 py-2">{{ display(note.points) }}</td><td class="px-3 py-2">{{ reportMoney(note.pointsValue) }}</td></tr>
                  <tr v-if="!breakdown.notes.length"><td colspan="4" class="px-3 py-8 text-center text-muted-foreground">No configured note activity.</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <p v-else class="py-8 text-center text-sm text-muted-foreground">Totals are unavailable for this period.</p>
      </DialogContent>
    </Dialog>
    <Dialog v-if="mode === 'attendance'" v-model:open="detailOpen"
      ><DialogContent class="max-h-[85vh] max-w-5xl overflow-auto"
        ><DialogHeader
          ><DialogTitle>{{ detailName }}</DialogTitle></DialogHeader
        >
        <div v-if="detailLoading" class="py-10 text-center text-sm text-muted-foreground">
          Loading details…
        </div>
        <div v-else-if="detail && mode === 'attendance'" class="space-y-5">
          <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div
              v-for="metric in [
                { label: 'Attended days', value: detail.attendedDays },
                { label: 'Worked minutes', value: detail.workedMinutes },
                { label: 'Late minutes', value: detail.lateMinutes },
                { label: 'Total penalty', value: detail.totalPenalty },
              ]"
              :key="metric.label"
              class="rounded-lg border border-border p-3"
            >
              <div class="text-xs text-muted-foreground">{{ metric.label }}</div>
              <strong>{{ metric.label === 'Total penalty' ? reportMoney(metric.value ?? 0) : display(metric.value ?? 0) }}</strong>
            </div>
          </div>
          <div class="overflow-auto rounded-lg border border-border">
            <table class="w-full min-w-[900px] text-left text-xs">
              <thead class="bg-muted text-muted-foreground">
                <tr>
                  <th
                    v-for="column in [
                      'Date',
                      'Shift',
                      'Clock in',
                      'Clock out',
                      'Worked',
                      'Late',
                      'Undertime',
                      'Late penalty',
                      'Undertime penalty',
                    ]"
                    :key="column"
                    class="px-3 py-2 font-medium"
                  >
                    {{ column }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(day, index) in asRows(detail.days)"
                  :key="index"
                  class="border-t border-border"
                >
                  <td class="px-3 py-2">{{ display(day.date) }}</td>
                  <td class="px-3 py-2">{{ display(day.shiftName) }}</td>
                  <td class="px-3 py-2">{{ display(day.clockInTime) }}</td>
                  <td class="px-3 py-2">{{ display(day.clockOutTime) }}</td>
                  <td class="px-3 py-2">{{ display(day.workedMinutes) }}</td>
                  <td class="px-3 py-2">{{ display(day.lateMinutes) }}</td>
                  <td class="px-3 py-2">{{ display(day.undertimeMinutes) }}</td>
                  <td class="px-3 py-2">{{ reportMoney(day.latenessPenalty) }}</td>
                  <td class="px-3 py-2">{{ reportMoney(day.undertimePenalty) }}</td>
                </tr>
                <tr v-if="!asRows(detail.days).length">
                  <td colspan="9" class="px-3 py-8 text-center text-muted-foreground">
                    No attendance days.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        </DialogContent
      ></Dialog
    >
  </div>
</template>
