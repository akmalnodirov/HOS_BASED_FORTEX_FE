<template>
  <div class="h-full min-h-0 flex flex-col overflow-hidden bg-gray-50 dark:bg-background">
    <CReportToolbar
      title="Checker"
      subtitle="Checker task review"
      default-period="week"
      full-periods
      @change="onRange"
    >
      <template #actions>
        <Button variant="outline" :disabled="loading" @click="refresh">
          <Loader2 v-if="loading" class="w-4 h-4 mr-2 animate-spin" />
          <RefreshCw v-else class="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </template>
    </CReportToolbar>

    <div class="flex-1 min-h-0 p-4 sm:p-6 flex flex-col gap-4 overflow-hidden">
      <CReportMetricCards :items="summaryCards" />
      <div
        class="shrink-0 bg-white dark:bg-card border border-border rounded-xl p-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <div class="flex flex-col gap-1.5">
          <span class="text-xs text-muted-foreground">Employee</span>
          <Select v-model="targetId">
            <SelectTrigger class="h-10"><SelectValue placeholder="All employees" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All employees</SelectItem>
              <SelectItem v-for="user in targetUsers" :key="user.id" :value="user.id">
                {{ targetLabel(user) }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="flex flex-col gap-1.5">
          <span class="text-xs text-muted-foreground">Checker</span>
          <Select v-model="checkerId">
            <SelectTrigger class="h-10"><SelectValue placeholder="All checkers" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All checkers</SelectItem>
              <SelectItem v-for="user in checkers" :key="user.id" :value="user.id">
                {{ operationUserName(user) }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="flex flex-col gap-1.5">
          <span class="text-xs text-muted-foreground">Status</span>
          <Select v-model="status">
            <SelectTrigger class="h-10"><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem
                v-for="item in checkerStatuses"
                :key="item.value"
                :value="String(item.value)"
              >
                {{ item.label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
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
      </div>

      <div
        class="flex-1 min-h-0 bg-white dark:bg-card border border-border rounded-xl overflow-hidden flex flex-col"
      >
        <div class="flex-1 min-h-0 overflow-auto">
          <table class="w-full min-w-[1480px] text-sm">
            <thead class="sticky top-0 z-20 bg-muted text-muted-foreground shadow-sm">
              <tr class="border-b border-border text-left">
                <th class="px-4 py-3 font-medium w-14">#</th>
                <th class="px-4 py-3 font-medium">Employee</th>
                <th class="px-4 py-3 font-medium">Checker</th>
                <th class="px-4 py-3 font-medium">Status</th>
                <th class="px-4 py-3 font-medium">Start time</th>
                <th class="px-4 py-3 font-medium">End time</th>
                <th class="px-4 py-3 font-medium">Driver</th>
                <th class="px-4 py-3 font-medium">Company</th>
                <th class="px-4 py-3 font-medium">Note</th>
                <th class="px-4 py-3 font-medium min-w-36">Uploads</th>
                <th class="px-4 py-3 font-medium">Related route task</th>
                <th v-if="canManage" class="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="11" class="px-4 py-12 text-center text-muted-foreground">
                  <Loader2 class="w-5 h-5 mx-auto animate-spin" />
                </td>
              </tr>
              <tr
                v-for="(row, index) in rows"
                v-else
                :key="row.id"
                class="border-b border-border/60 hover:bg-muted/30"
              >
                <td class="px-4 py-3 text-muted-foreground">{{ index + 1 }}</td>
                <td class="px-4 py-3 font-medium">{{ targetLabel(row.logBooker) }}</td>
                <td class="px-4 py-3">{{ operationUserName(row.checker) }}</td>
                <td class="px-4 py-3">
                  <Select v-if="canManage && !isCheckerLocked(row.status)" :model-value="String(row.status)" @update:model-value="value => updateCheckerRow(row, { status: Number(value) })">
                    <SelectTrigger class="h-8 min-w-32"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem v-for="item in checkerStatuses" :key="item.value" :value="String(item.value)">{{ item.label }}</SelectItem></SelectContent>
                  </Select>
                  <span v-else
                    class="inline-flex rounded-full px-2 py-1 text-xs font-semibold"
                    :class="operationStatusClass(row.status)"
                  >
                    {{ operationStatusLabel(row.status, true) }}
                  </span>
                </td>
                <td class="px-4 py-3 whitespace-nowrap">{{ operationDate(row.startTime) }}</td>
                <td class="px-4 py-3 whitespace-nowrap">{{ operationDate(row.endTime) }}</td>
                <td class="px-4 py-3">
                  <Select v-if="canManage && !isCheckerLocked(row.status)" :model-value="row.driver?.id ?? 'none'" @update:model-value="value => updateCheckerRow(row, { driverId: String(value) })">
                    <SelectTrigger class="h-8 min-w-40"><SelectValue placeholder="Select driver" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No driver</SelectItem>
                      <SelectItem v-for="driver in drivers" :key="driver.id" :value="driver.id">{{ driver.name }}</SelectItem>
                    </SelectContent>
                  </Select>
                  <template v-else>{{ row.driver?.name ?? '—' }}</template>
                </td>
                <td class="px-4 py-3">{{ row.company?.name ?? '—' }}</td>
                <td class="px-4 py-3 max-w-xs whitespace-normal">
                  <input v-if="canManage && !isCheckerLocked(row.status)" :value="row.note ?? ''" class="w-full min-w-40 bg-transparent border-b border-transparent focus:border-primary outline-none" placeholder="Action / note" @change="event => updateCheckerRow(row, { note: (event.target as HTMLInputElement).value })" />
                  <template v-else>{{ row.note || '—' }}</template>
                </td>
                <td class="px-4 py-3">
                  <CReportCheckerUploads :task-id="row.id" :uploads="row.uploads ?? []" :can-manage="canManage && !isCheckerLocked(row.status)" @updated="refresh" />
                </td>
                <td class="px-4 py-3 max-w-xs whitespace-normal">
                  <template v-if="row.relatedRouteTask">
                    <div>{{ operationStatusLabel(row.relatedRouteTask.status) }}</div>
                    <div class="text-xs text-muted-foreground">
                      {{ operationDate(row.relatedRouteTask.startTime) }}
                    </div>
                    <div v-if="row.relatedRouteTask.notes" class="text-xs text-muted-foreground">
                      {{ row.relatedRouteTask.notes }}
                    </div>
                  </template>
                  <span v-else>—</span>
                </td>
                <td v-if="canManage" class="px-4 py-3"><Button v-if="!isCheckerLocked(row.status)" size="icon-sm" variant="ghost" title="Edit checker task" aria-label="Edit checker task" @click="editTask(row)"><Pencil class="h-4 w-4 text-muted-foreground" /></Button></td>
              </tr>
              <tr v-if="canManage" class="border-b border-border bg-primary/5">
                <td class="px-4 py-3 text-muted-foreground">+</td>
                <td class="px-4 py-3"><Select v-model="draftEmployeeId"><SelectTrigger class="h-8 min-w-36"><SelectValue placeholder="Select employee" /></SelectTrigger><SelectContent><SelectItem v-for="user in users" :key="user.id" :value="user.id">{{ operationUserName(user) }}</SelectItem></SelectContent></Select></td>
                <td class="px-4 py-3 text-muted-foreground">—</td>
                <td class="px-4 py-3"><Select v-model="draftStatus"><SelectTrigger class="h-8 min-w-32"><SelectValue /></SelectTrigger><SelectContent><SelectItem v-for="item in checkerStatuses" :key="item.value" :value="String(item.value)">{{ item.label }}</SelectItem></SelectContent></Select></td>
                <td colspan="2" class="px-4 py-3 text-muted-foreground">Assigned when saved</td>
                <td class="px-4 py-3"><Select v-model="draftDriverId"><SelectTrigger class="h-8 min-w-40"><SelectValue placeholder="Select driver" /></SelectTrigger><SelectContent><SelectItem value="none">No driver</SelectItem><SelectItem v-for="driver in drivers" :key="driver.id" :value="driver.id">{{ driver.name }}</SelectItem></SelectContent></Select></td>
                <td class="px-4 py-3"><span v-if="draftCompanyFromDriver">{{ draftCompanyFromDriver.name }}</span><Select v-else v-model="draftCompanyId"><SelectTrigger class="h-8 min-w-40"><SelectValue placeholder="Select company" /></SelectTrigger><SelectContent><SelectItem v-for="company in companies" :key="company.id" :value="company.id">{{ company.name }}</SelectItem></SelectContent></Select></td>
                <td class="px-4 py-3"><input v-model="draftNote" class="w-full min-w-40 bg-transparent border-b border-border outline-none" placeholder="Action / note" /></td>
                <td colspan="2" class="px-4 py-3"></td>
                <td class="px-4 py-3"><Button size="icon-sm" title="Add row" aria-label="Add row" :disabled="!draftEmployeeId || !draftCompany || draftSaving" @click="saveDraft"><Plus class="h-4 w-4" /></Button></td>
              </tr>
              <tr v-if="!loading && !rows.length">
                <td colspan="11" class="px-4 py-12 text-center text-muted-foreground">
                  No checker tasks found for the selected filters.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="shrink-0 px-4 py-3 text-sm text-muted-foreground border-t border-border">
          {{ rows.length }} checker tasks · {{ uploadCount }} files
        </div>
      </div>
    </div>
    <CReportEditor v-model:open="editorOpen" kind="checker" :record="editingTask" :companies="companies" :drivers="drivers" :users="users" @saved="refresh" />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import dayjs from 'dayjs'
import { toast } from 'vue-sonner'
import { Loader2, Pencil, Plus, RefreshCw } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import CReportCheckerUploads from '@/modules/Report/components/CReportCheckerUploads.vue'
import CReportMetricCards from '@/modules/Report/components/CReportMetricCards.vue'
import CReportToolbar from '@/modules/Report/components/CReportToolbar.vue'
import CReportEditor from '@/modules/Report/components/CReportEditor.vue'
import { hasPermission } from '@/router/permissions'
import { useAuthStore } from '@/modules/Auth/store/authStore'
import { useReportSocket } from '@/modules/Report/composables/useReportSocket'
import { useReportOperations } from '@/modules/Report/composables/useReportOperations'
import type {
  DateRange,
  ReportCheckerTask,
  ReportOperationCompany,
  ReportOperationDriver,
  ReportOperationUser,
} from '@/modules/Report/types'
import {
  checkerStatuses,
  operationDate,
  operationRangeEnd,
  operationRangeStart,
  operationStatusClass,
  operationStatusLabel,
  operationUserName,
} from '@/modules/Report/utils/operations'

const operations = useReportOperations()
const authStore = useAuthStore()
const canManage = computed(() => hasPermission(authStore.getTokens(), 'report.manage'))
const { checkerVersion } = useReportSocket()
const editorOpen = ref(false)
const editingTask = ref<ReportCheckerTask | null>(null)
function editTask(task: ReportCheckerTask | null) { editingTask.value = task; editorOpen.value = true }
const rows = ref<ReportCheckerTask[]>([])
const draftEmployeeId = ref('')
const draftDriverId = ref('none')
const draftCompanyId = ref('')
const draftStatus = ref('0')
const draftNote = ref('')
const draftSaving = ref(false)
const draftCompanyFromDriver = computed(() => drivers.value.find((driver) => driver.id === draftDriverId.value)?.company)
const draftCompany = computed(() => draftCompanyFromDriver.value ?? companies.value.find((company) => company.id === draftCompanyId.value))
async function saveDraft() {
  if (!draftCompany.value || !draftEmployeeId.value) return
  draftSaving.value = true
  try {
    await operations.createCheckerTask({ logBookerId: draftEmployeeId.value, driverId: draftDriverId.value === 'none' ? null : draftDriverId.value, companyId: draftCompany.value.id, status: Number(draftStatus.value), note: draftNote.value })
    draftEmployeeId.value = ''
    draftDriverId.value = 'none'
    draftCompanyId.value = ''
    draftStatus.value = '0'
    draftNote.value = ''
    queueRefresh()
  } catch {
    toast.error('Could not add checker task')
  } finally {
    draftSaving.value = false
  }
}
async function updateCheckerRow(row: ReportCheckerTask, changes: { status?: number; note?: string; driverId?: string }) {
  if (isCheckerLocked(row.status)) return
  const driver = changes.driverId === 'none' ? undefined : changes.driverId
    ? drivers.value.find((item) => item.id === changes.driverId) : row.driver
  const company = driver?.company ?? row.company
  if (!company?.id) return
  try {
    await operations.updateCheckerTask(row.id, {
      logBookerId: row.logBooker?.id,
      checkerId: row.checker?.id ?? null,
      companyId: company.id,
      driverId: driver?.id ?? null,
      status: changes.status ?? row.status,
      note: changes.note ?? row.note ?? '',
    })
    Object.assign(row, changes, { driver, company })
    queueRefresh()
  } catch {
    toast.error('Could not update checker task')
    queueRefresh()
  }
}
function isCheckerLocked(status: number): boolean {
  return status === 2
}
const companies = ref<ReportOperationCompany[]>([])
const drivers = ref<ReportOperationDriver[]>([])
const users = ref<ReportOperationUser[]>([])
const loading = ref(false)
const initialLoad = ref(true)
const ready = ref(false)
const targetId = ref('all')
const checkerId = ref('all')
const companyId = ref('all')
const status = ref('all')
const range = ref<DateRange>({
  startTime: dayjs().subtract(7, 'day').format('YYYY-MM-DD'),
  endTime: dayjs().format('YYYY-MM-DD'),
})
let refreshTimer: ReturnType<typeof setTimeout> | undefined
let requestVersion = 0

const targetUsers = computed(() => users.value)
const checkers = computed(() => users.value)
const uploadCount = computed(() =>
  rows.value.reduce((total, row) => total + (row.uploads?.length ?? 0), 0)
)
const summaryCards = computed(() => [
  { label: 'Total tasks', value: rows.value.length, caption: 'Selected period and filters' },
  {
    label: 'On hold',
    value: rows.value.filter((row) => row.status === 0).length,
    valueClass: 'text-amber-600',
  },
  {
    label: 'Working',
    value: rows.value.filter((row) => row.status === 1).length,
    valueClass: 'text-blue-600',
  },
  {
    label: 'Completed',
    value: rows.value.filter((row) => row.status === 2).length,
    valueClass: 'text-emerald-600',
  },
])

function targetLabel(user?: ReportOperationUser): string {
  const name = operationUserName(user)
  return user?.role?.code === 5 ? `${name} (Checker)` : name
}

function queueRefresh() {
  if (!ready.value) return
  if (refreshTimer) clearTimeout(refreshTimer)
  refreshTimer = setTimeout(refresh, 0)
}

function onRange(value: DateRange) {
  range.value = value
  queueRefresh()
}

async function refresh() {
  const version = ++requestVersion
  if (initialLoad.value) loading.value = true
  try {
    const result = await operations.getChecker({
      logBookerId: targetId.value === 'all' ? null : targetId.value,
      checkerId: checkerId.value === 'all' ? null : checkerId.value,
      companyId: companyId.value === 'all' ? null : companyId.value,
      status: status.value === 'all' ? null : Number(status.value),
      startTime: operationRangeStart(range.value.startTime),
      endTime: operationRangeEnd(range.value.endTime),
    })
    if (version === requestVersion) rows.value = result
  } finally {
    if (version === requestVersion) {
      loading.value = false
      initialLoad.value = false
    }
  }
}

watch([targetId, checkerId, companyId, status], queueRefresh)

watch(checkerVersion, queueRefresh)

onMounted(async () => {
  const lookups = await operations.getLookups()
  companies.value = lookups.companies
  drivers.value = lookups.drivers
  users.value = lookups.users
  ready.value = true
  await refresh()
})

onBeforeUnmount(() => {
  if (refreshTimer) clearTimeout(refreshTimer)
})
</script>

