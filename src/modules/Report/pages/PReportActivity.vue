<template>
  <div class="h-full min-h-0 flex flex-col overflow-hidden bg-gray-50 dark:bg-background">
    <CReportToolbar
      title="Activity"
      subtitle="Driver activity status by day"
      default-period="week"
      full-periods
      @change="onRange"
    >
      <template #actions>
        <Button variant="outline" :disabled="loading" @click="refresh(page)">
          <Loader2 v-if="loading" class="w-4 h-4 mr-2 animate-spin" />
          <RefreshCw v-else class="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </template>
    </CReportToolbar>

    <div class="flex-1 min-h-0 p-4 sm:p-6 flex flex-col gap-4 overflow-hidden">
      <CReportMetricCards :items="summaryCards" />
      <div
        class="shrink-0 bg-white dark:bg-card border border-border rounded-xl p-4 grid gap-3 sm:grid-cols-2"
      >
        <div class="flex flex-col gap-1.5">
          <span class="text-xs text-muted-foreground">Company</span>
          <Select v-model="companyId">
            <SelectTrigger class="h-10"><SelectValue placeholder="All companies" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All companies</SelectItem>
              <SelectItem v-for="company in companies" :key="company.id" :value="company.id">
                {{ company.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="flex flex-col gap-1.5">
          <span class="text-xs text-muted-foreground">Driver</span>
          <Select v-model="driverId">
            <SelectTrigger class="h-10"><SelectValue placeholder="All drivers" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All drivers</SelectItem>
              <SelectItem v-for="driver in filteredDrivers" :key="driver.id" :value="driver.id">
                {{ driver.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div
        class="flex-1 min-h-0 bg-white dark:bg-card border border-border rounded-xl overflow-hidden flex flex-col"
      >
        <div class="flex-1 min-h-0 overflow-auto">
          <table
            class="w-full text-sm"
            :style="{ minWidth: `${Math.max(760, 312 + columns.length * 125)}px` }"
          >
            <thead class="sticky top-0 z-30 bg-muted text-muted-foreground shadow-sm">
              <tr class="h-11 border-b border-border text-left">
                <th
                  class="sticky left-0 z-40 w-14 min-w-14 max-w-14 bg-muted px-4 py-3 font-medium"
                >
                  #
                </th>
                <th
                  class="sticky left-14 z-40 w-64 min-w-64 max-w-64 border-r border-border bg-muted px-4 py-3 font-medium shadow-[4px_0_8px_-6px_rgba(15,23,42,0.45)]"
                >
                  Company / Driver
                </th>
                <th
                  v-for="column in columns"
                  :key="column.date"
                  class="px-3 py-3 font-medium text-center min-w-28"
                >
                  {{ formatActivityDay(column.date) }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td
                  :colspan="columns.length + 2"
                  class="px-4 py-12 text-center text-muted-foreground"
                >
                  <Loader2 class="w-5 h-5 mx-auto animate-spin" />
                </td>
              </tr>
              <template v-for="row in displayRows" v-else :key="row.key">
                <tr
                  v-if="row.isCompany"
                  class="bg-slate-900 text-white dark:bg-slate-700 border-y border-slate-700"
                >
                  <td
                    class="sticky top-11 left-0 z-20 w-14 min-w-14 max-w-14 bg-slate-900 px-4 py-2.5 dark:bg-slate-700"
                  ></td>
                  <td
                    class="sticky top-11 left-14 z-20 w-64 min-w-64 max-w-64 border-r border-slate-700 bg-slate-900 px-4 py-2.5 font-semibold shadow-[4px_0_8px_-6px_rgba(15,23,42,0.75)] dark:bg-slate-700"
                  >
                    <span
                      class="inline-flex items-center rounded-md bg-white/10 px-2 py-1 text-[11px] uppercase tracking-wide mr-2"
                    >
                      Company
                    </span>
                    {{ row.companyName }}
                  </td>
                  <td
                    :colspan="columns.length"
                    class="sticky top-11 z-20 bg-slate-900 shadow-sm dark:bg-slate-700"
                  ></td>
                </tr>
                <tr v-else class="group border-b border-border/60 hover:bg-muted/30">
                  <td
                    class="sticky left-0 z-10 w-14 min-w-14 max-w-14 bg-white px-4 py-3 text-muted-foreground group-hover:bg-muted dark:bg-card"
                  >
                    {{ row.rowNumber }}
                  </td>
                  <td
                    class="sticky left-14 z-10 w-64 min-w-64 max-w-64 border-l-4 border-r border-l-primary/35 border-r-border bg-white px-4 py-3 shadow-[4px_0_8px_-6px_rgba(15,23,42,0.45)] group-hover:bg-muted dark:bg-card"
                  >
                    <div class="font-medium">{{ row.driverName || '—' }}</div>
                    <div v-if="row.companyName" class="text-xs text-muted-foreground">
                      {{ row.companyName }}
                    </div>
                  </td>
                  <td
                    v-for="column in columns"
                    :key="column.date"
                    class="px-2 py-3 text-center"
                    :class="canManage ? 'cursor-pointer hover:bg-primary/10' : ''"
                    @click="canManage && (editingCell = cellKey(row, column.date))"
                  >
                    <Select
                      v-if="canManage && editingCell === cellKey(row, column.date)"
                      :open="true"
                      :model-value="String(activityFor(row, column.date)?.status ?? 9)"
                      @update:open="open => { if (!open) editingCell = null }"
                      @update:model-value="value => upsertActivityCell(row, column, Number(value))"
                    >
                      <SelectTrigger class="h-8 min-w-28" @click.stop><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem v-for="(label, value) in activityStatuses" :key="value" :value="String(value)">{{ label }}</SelectItem></SelectContent>
                    </Select>
                    <span v-else-if="hasKnownActivity(row, column.date)"
                      class="inline-flex min-w-20 justify-center rounded-full px-2 py-1 text-xs font-semibold"
                      :class="operationStatusClass(activityFor(row, column.date)?.status)"
                      :title="operationUserName(activityFor(row, column.date)?.logBooker)"
                    >
                      {{ activityLabel(activityFor(row, column.date)?.status) }}
                    </span>
                    <span v-else class="text-muted-foreground">—</span>
                  </td>
                </tr>
              </template>
              <tr v-if="!loading && loadError">
                <td :colspan="columns.length + 2" class="px-4 py-12 text-center text-destructive">
                  {{ loadError }}
                </td>
              </tr>
              <tr v-else-if="!loading && !rows.length">
                <td
                  :colspan="columns.length + 2"
                  class="px-4 py-12 text-center text-muted-foreground"
                >
                  No activity found for the selected filters.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div
          class="shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-t border-border text-sm text-muted-foreground"
        >
          <span>{{ result?.totalCount ?? driverRows.length }} drivers</span>
          <div class="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              :disabled="loading || result?.isFirst !== false"
              @click="refresh(page - 1)"
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              :disabled="loading || result?.isLast !== false"
              @click="refresh(page + 1)"
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import dayjs from 'dayjs'
import { toast } from 'vue-sonner'
import { Loader2, RefreshCw } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import CReportMetricCards from '@/modules/Report/components/CReportMetricCards.vue'
import CReportToolbar from '@/modules/Report/components/CReportToolbar.vue'
import { hasPermission } from '@/router/permissions'
import { useAuthStore } from '@/modules/Auth/store/authStore'
import { useReportSocket } from '@/modules/Report/composables/useReportSocket'
import { useReportOperations } from '@/modules/Report/composables/useReportOperations'
import type {
  DateRange,
  ReportDriverActivity,
  ReportDriverActivityTable,
  ReportOperationCompany,
  ReportOperationDriver,
} from '@/modules/Report/types'
import {
  activityStatuses,
  operationRangeEnd,
  operationRangeStart,
  operationStatusClass,
  operationUserName,
} from '@/modules/Report/utils/operations'

type ActivityRow = ReportDriverActivityTable['rows'][number]

const operations = useReportOperations()
async function upsertActivityCell(row: ActivityRow, column: ReportDriverActivityTable['columns'][number], status: number) {
  if (!row.driverId) return
  editingCell.value = null
  const existing = activityFor(row, column.date)
  const body = {
    driverId: row.driverId,
    date: `${column.date}T00:00:00Z`,
    status,
    colNumber: existing?.colNumber ?? column.colNumber,
  }
  try {
    if (existing?.id && existing.id !== '00000000-0000-0000-0000-000000000000') {
      await operations.updateActivity(existing.id, body)
    } else {
      await operations.createActivity(body)
    }
    await refresh(page.value)
  } catch {
    toast.error('Could not update activity')
  }
}
const authStore = useAuthStore()
const canManage = computed(() => hasPermission(authStore.getTokens(), 'report.manage'))
const { activityVersion } = useReportSocket()
const editingCell = ref<string | null>(null)
const result = shallowRef<ReportDriverActivityTable>()
const companies = shallowRef<ReportOperationCompany[]>([])
const drivers = shallowRef<ReportOperationDriver[]>([])
const loading = ref(false)
const loadError = ref('')
const initialLoad = ref(true)
const ready = ref(false)
const companyId = ref('all')
const driverId = ref('all')
const page = ref(1)
const range = ref<DateRange>({
  startTime: dayjs().subtract(7, 'day').format('YYYY-MM-DD'),
  endTime: dayjs().format('YYYY-MM-DD'),
})
let refreshTimer: ReturnType<typeof setTimeout> | undefined
let requestVersion = 0
const activityCache = new WeakMap<ActivityRow, Map<string, ReportDriverActivity>>()

const columns = computed<ReportDriverActivityTable['columns']>(() => {
  const start = dayjs(range.value.startTime).startOf('day')
  const end = dayjs(range.value.endTime).startOf('day')
  if (!start.isValid() || !end.isValid() || end.isBefore(start)) return []

  return Array.from({ length: end.diff(start, 'day') + 1 }, (_, index) => ({
    date: start.add(index, 'day').format('YYYY-MM-DD'),
    colNumber: index + 1,
  }))
})
const pageSize = computed(() =>
  Math.max(5, Math.min(50, Math.floor(2000 / Math.max(columns.value.length, 1))))
)
const rows = computed(() => result.value?.rows ?? [])
const driverRows = computed(() => rows.value.filter((row) => !!row.driverId))
const displayRows = computed(() => {
  let rowNumber = 0
  return rows.value.map((row, index) => {
    const isCompany = !!row.companyName && !row.driverId
    return {
      ...row,
      isCompany,
      rowNumber: isCompany ? null : ++rowNumber,
      key: `${row.companyId ?? 'company'}-${row.driverId ?? 'header'}-${index}`,
    }
  })
})
const filteredDrivers = computed(() =>
  companyId.value === 'all'
    ? drivers.value
    : drivers.value.filter((driver) => driver.company?.id === companyId.value)
)
const activityEntries = computed(() =>
  driverRows.value.flatMap((row) =>
    Object.values(row.dateStatuses ?? {}).filter(
      (activity) => activity.status != null && activity.status !== 9
    )
  )
)
const companyCount = computed(
  () =>
    new Set(
      rows.value
        .filter((row) => row.companyId || row.companyName)
        .map((row) => row.companyId ?? row.companyName)
    ).size
)
const summaryCards = computed(() => [
  {
    label: 'Drivers',
    value: result.value?.totalCount ?? driverRows.value.length,
    caption: 'Selected period and filters',
  },
  { label: 'Companies', value: companyCount.value },
  { label: 'Recorded statuses', value: activityEntries.value.length, valueClass: 'text-blue-600' },
  {
    label: 'Checked entries',
    value: activityEntries.value.filter((activity) => activity.status === 0).length,
    valueClass: 'text-emerald-600',
  },
])

watch(companyId, () => {
  if (!filteredDrivers.value.some((driver) => driver.id === driverId.value)) driverId.value = 'all'
})

function queueRefresh() {
  if (!ready.value) return
  if (refreshTimer) clearTimeout(refreshTimer)
  refreshTimer = setTimeout(() => refresh(1), 100)
}

function onRange(value: DateRange) {
  range.value = value
  queueRefresh()
}

function activityDateKey(value: string): string {
  const date = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0]
  return date ?? dayjs(value).format('YYYY-MM-DD')
}

function formatActivityDay(value: string): string {
  return dayjs(value).format('MM/DD/YYYY')
}

function cellKey(row: ActivityRow, date: string): string {
  return `${row.driverId}-${activityDateKey(date)}`
}

function activityFor(row: ActivityRow, date: string): ReportDriverActivity | undefined {
  let activities = activityCache.get(row)
  if (!activities) {
    activities = new Map<string, ReportDriverActivity>()
    for (const activity of Object.values(row.dateStatuses ?? {})) {
      const key = activityDateKey(activity.date)
      if (!activities.has(key)) activities.set(key, activity)
    }
    activityCache.set(row, activities)
  }
  return activities.get(activityDateKey(date))
}

function activityLabel(status?: number): string {
  return status == null ? '—' : (activityStatuses[status] ?? 'Unknown')
}

function hasKnownActivity(row: ActivityRow, date: string): boolean {
  const status = activityFor(row, date)?.status
  return status != null && status !== 9
}

async function refresh(nextPage = page.value) {
  const version = ++requestVersion
  if (initialLoad.value) loading.value = true
  loadError.value = ''
  page.value = Math.max(1, nextPage)
  try {
    const response = await operations.getActivity({
      companyId: companyId.value === 'all' ? null : companyId.value,
      driverId: driverId.value === 'all' ? null : driverId.value,
      startTime: operationRangeStart(range.value.startTime),
      endTime: operationRangeEnd(range.value.endTime),
      pageNumber: page.value,
      pageSize: pageSize.value,
    })
    if (version === requestVersion) result.value = response
  } catch {
    if (version === requestVersion) loadError.value = 'Could not load activity. Please try again.'
  } finally {
    if (version === requestVersion) {
      loading.value = false
      initialLoad.value = false
    }
  }
}

watch([companyId, driverId], queueRefresh)

watch(activityVersion, queueRefresh)

onMounted(() => {
  ready.value = true
  void refresh(1)
  void operations.getLookups().then((lookups) => {
    companies.value = lookups.companies
    drivers.value = lookups.drivers
  }).catch(() => {
    loadError.value = 'Could not load activity filters. Please try again.'
  })
})

onBeforeUnmount(() => {
  if (refreshTimer) clearTimeout(refreshTimer)
  requestVersion += 1
})
</script>

