<template>
  <div class="h-[calc(100dvh-65px)] min-h-0 flex flex-col overflow-hidden bg-gray-50 dark:bg-background">
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

    <div class="flex-1 min-h-0 p-1 sm:p-1 flex flex-col gap-1 overflow-hidden">
      <CReportOverviewCurtain>
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
            <CReportSearchSelect v-model="companyId" :options="companies" empty-label="All companies" empty-value="all" />
          </div>
        </div>
      </CReportOverviewCurtain>

      <div
        class="flex-1 min-h-0 bg-white dark:bg-card border border-border rounded-xl overflow-hidden flex flex-col"
      >
        <div ref="tableScroll" class="flex-1 min-h-0 overflow-auto overscroll-contain">
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
                v-for="(row, index) in visibleRows"
                v-else
                :key="row.id"
                class="border-b border-border/60 hover:bg-muted/30"
              >
                <td class="px-4 py-3 text-muted-foreground">{{ pageSizeSelection === 'all' ? index + 1 : (tablePage - 1) * Number(pageSizeSelection) + index + 1 }}</td>
                <td class="px-4 py-3 font-medium">{{ targetLabel(row.logBooker) }}</td>
                <td class="px-4 py-3">{{ operationUserName(row.checker) }}</td>
                <td class="px-4 py-3">
                  <CReportStatusMenu
                    v-if="canEdit && !isCheckerLocked(row.status)"
                    :model-value="row.status"
                    :options="checkerStatuses"
                    :loading="statusSavingIds.includes(row.id)"
                    @update:model-value="value => updateCheckerRow(row, { status: value })"
                  />
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
                  <CReportSearchSelect v-if="canEdit && !isCheckerLocked(row.status)" :model-value="row.driver?.id ?? 'none'" :options="driversForCompany(row.company?.id)" empty-label="No driver" empty-value="none" size="sm" @update:model-value="value => updateCheckerRow(row, { driverId: value })" />
                  <template v-else>{{ row.driver?.name ?? '—' }}</template>
                </td>
                <td class="px-4 py-3"><CReportSearchSelect v-if="canEdit && !isCheckerLocked(row.status)" :model-value="row.company?.id" :options="companies" size="sm" placeholder="Select company" @update:model-value="value => updateCheckerRow(row, { companyId: value })" /><template v-else>{{ row.company?.name ?? '—' }}</template></td>
                <td class="px-4 py-3 max-w-xs whitespace-normal">
                  <input v-if="canEdit && !isCheckerLocked(row.status)" :value="row.note ?? ''" class="w-full min-w-40 bg-transparent border-b border-transparent focus:border-primary outline-none" placeholder="Action / note" @change="event => updateCheckerRow(row, { note: (event.target as HTMLInputElement).value })" />
                  <template v-else>{{ row.note || '—' }}</template>
                </td>
                <td class="px-4 py-3">
                  <CReportCheckerUploads :task-id="row.id" :uploads="row.uploads ?? []" :can-manage="canEdit && !isCheckerLocked(row.status)" @updated="refresh" />
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
                <td v-if="canManage" class="px-4 py-3"><div class="flex gap-1"><Button v-if="canEdit && !isCheckerLocked(row.status)" size="icon-sm" variant="ghost" title="Edit checker task" aria-label="Edit checker task" @click="editTask(row)"><Pencil class="h-4 w-4 text-muted-foreground" /></Button><Button v-if="canDelete" size="icon-sm" variant="ghost" title="Delete checker task" aria-label="Delete checker task" @click="taskToDelete = row"><Trash2 class="h-4 w-4 text-destructive" /></Button></div></td>
              </tr>
              <tr v-if="canCreate" class="border-b border-border bg-primary/5">
                <td class="px-4 py-3 text-muted-foreground">New</td>
                <td class="px-4 py-3"><Select v-model="draftEmployeeId"><SelectTrigger class="h-8 min-w-36"><SelectValue placeholder="Select employee" /></SelectTrigger><SelectContent><SelectItem v-for="user in users" :key="user.id" :value="user.id">{{ operationUserName(user) }}</SelectItem></SelectContent></Select></td>
                <td class="px-4 py-3">{{ currentCheckerName }}</td>
                <td class="px-4 py-3"><CReportStatusMenu :model-value="draftStatus" :options="checkerStatuses" :loading="draftSaving" @update:model-value="saveDraft" /></td>
                <td colspan="2" class="px-4 py-3 text-muted-foreground">Assigned when saved</td>
                <td class="px-4 py-3"><CReportSearchSelect :model-value="draftDriverId" :options="driversForCompany(draftCompanyId)" empty-label="No driver" empty-value="none" size="sm" @update:model-value="selectDraftDriver" /></td>
                <td class="px-4 py-3"><CReportSearchSelect :model-value="draftCompanyId" :options="companies" size="sm" placeholder="Select company" @update:model-value="selectDraftCompany" /></td>
                <td class="px-4 py-3"><input v-model="draftNote" class="w-full min-w-40 bg-transparent border-b border-border outline-none" placeholder="Action / note" /></td>
                <td colspan="2" class="px-4 py-3"></td>
                <td class="px-4 py-3"></td>
              </tr>
              <tr v-if="!loading && !rows.length">
                <td colspan="11" class="px-4 py-12 text-center text-muted-foreground">
                  No checker tasks found for the selected filters.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="shrink-0 flex items-center justify-between gap-3 px-4 py-3 text-sm text-muted-foreground border-t border-border">
          <span>{{ rows.length }} checker tasks · {{ uploadCount }} files</span>
          <div class="flex items-center gap-2">
            <CReportPageSize v-model="pageSizeSelection" />
            <template v-if="pageSizeSelection !== 'all'">
              <Button size="sm" variant="outline" :disabled="tablePage <= 1" @click="tablePage--">Previous</Button>
              <span class="text-xs">{{ tablePage }} / {{ tablePageCount }}</span>
              <Button size="sm" variant="outline" :disabled="tablePage >= tablePageCount" @click="tablePage++">Next</Button>
            </template>
          </div>
        </div>
      </div>
    </div>
    <CReportEditor v-model:open="editorOpen" kind="checker" :record="editingTask" :can-delete="canDelete" :companies="companies" :drivers="drivers" :users="users" @saved="refresh" />
    <Dialog :open="!!taskToDelete" @update:open="value => { if (!value) taskToDelete = null }"><DialogContent class="max-w-sm"><DialogHeader><DialogTitle>Delete checker task?</DialogTitle></DialogHeader><DialogFooter><Button variant="outline" @click="taskToDelete = null">Cancel</Button><Button variant="destructive" :disabled="deleting" @click="confirmDelete">Delete</Button></DialogFooter></DialogContent></Dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import dayjs from 'dayjs'
import { toast } from 'vue-sonner'
import { Loader2, Pencil, RefreshCw, Trash2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import CReportCheckerUploads from '@/modules/Report/components/CReportCheckerUploads.vue'
import CReportMetricCards from '@/modules/Report/components/CReportMetricCards.vue'
import CReportOverviewCurtain from '@/modules/Report/components/CReportOverviewCurtain.vue'
import CReportToolbar from '@/modules/Report/components/CReportToolbar.vue'
import CReportEditor from '@/modules/Report/components/CReportEditor.vue'
import CReportSearchSelect from '@/modules/Report/components/CReportSearchSelect.vue'
import CReportStatusMenu from '@/modules/Report/components/CReportStatusMenu.vue'
import CReportPageSize from '@/modules/Report/components/CReportPageSize.vue'
import { useReportTablePage } from '@/modules/Report/composables/useReportTablePage'
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
const canCreate = computed(() => hasPermission(authStore.getTokens(), 'report.checker.create'))
const canEdit = computed(() => hasPermission(authStore.getTokens(), 'report.checker.edit'))
const canDelete = computed(() => hasPermission(authStore.getTokens(), 'report.checker.delete'))
const canManage = computed(() => canCreate.value || canEdit.value || canDelete.value)
const { checkerVersion } = useReportSocket()
const editorOpen = ref(false)
const editingTask = ref<ReportCheckerTask | null>(null)
const taskToDelete = ref<ReportCheckerTask | null>(null)
const deleting = ref(false)
function editTask(task: ReportCheckerTask | null) { editingTask.value = task; editorOpen.value = true }
async function confirmDelete() {
  if (!taskToDelete.value) return
  deleting.value = true
  try {
    await operations.deleteCheckerTask(taskToDelete.value.id)
    taskToDelete.value = null
    queueRefresh()
  } catch {
    toast.error('Could not delete checker task')
  } finally {
    deleting.value = false
  }
}
const rows = ref<ReportCheckerTask[]>([])
const { pageSizeSelection, tablePage, tablePageCount, visibleRows } = useReportTablePage(rows)
const draftEmployeeId = ref('')
const draftDriverId = ref('none')
const draftCompanyId = ref('')
const draftStatus = ref<number | null>(null)
const draftNote = ref('')
const draftSaving = ref(false)
const draftCompany = computed(() => companies.value.find((company) => company.id === draftCompanyId.value))
function driversForCompany(selectedCompanyId?: string) {
  return selectedCompanyId
    ? drivers.value.filter((driver) => driver.company?.id === selectedCompanyId)
    : drivers.value
}
function selectDraftDriver(value: string) {
  draftDriverId.value = value
  const driver = drivers.value.find((item) => item.id === value)
  if (driver?.company?.id) draftCompanyId.value = driver.company.id
}
function selectDraftCompany(value: string) {
  draftCompanyId.value = value
  if (!driversForCompany(value).some((driver) => driver.id === draftDriverId.value)) draftDriverId.value = 'none'
}
async function saveDraft(selectedStatus: number) {
  if (draftSaving.value) return
  if (!draftCompany.value || !draftEmployeeId.value) {
    toast.error('Select an employee and company before setting a status')
    return
  }
  draftStatus.value = selectedStatus
  draftSaving.value = true
  try {
    await operations.createCheckerTask({ logBookerId: draftEmployeeId.value, driverId: draftDriverId.value === 'none' ? null : draftDriverId.value, companyId: draftCompany.value.id, status: selectedStatus, note: draftNote.value })
    draftEmployeeId.value = ''
    draftDriverId.value = 'none'
    draftCompanyId.value = ''
    draftStatus.value = null
    draftNote.value = ''
    queueRefresh()
  } catch {
    toast.error('Could not add checker task')
    draftStatus.value = null
  } finally {
    draftSaving.value = false
  }
}
async function updateCheckerRow(row: ReportCheckerTask, changes: { status?: number; note?: string; driverId?: string; companyId?: string }) {
  if (changes.status !== undefined && statusSavingIds.value.includes(row.id)) return
  if (isCheckerLocked(row.status)) return
  let driver = changes.driverId === 'none' ? undefined : changes.driverId
    ? drivers.value.find((item) => item.id === changes.driverId) : row.driver
  const company = changes.companyId
    ? companies.value.find((item) => item.id === changes.companyId)
    : driver?.company ?? row.company
  if (changes.companyId && driver?.company?.id !== changes.companyId) driver = undefined
  if (!company?.id) return
  const savingStatus = changes.status !== undefined
  if (savingStatus) statusSavingIds.value = [...statusSavingIds.value, row.id]
  try {
    await operations.updateCheckerTask(row.id, {
      logBookerId: row.logBooker?.id,
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
  } finally {
    if (savingStatus) statusSavingIds.value = statusSavingIds.value.filter((id) => id !== row.id)
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
const statusSavingIds = ref<string[]>([])
const tableScroll = ref<HTMLElement | null>(null)
const range = ref<DateRange>({
  startTime: dayjs().subtract(7, 'day').format('YYYY-MM-DD'),
  endTime: dayjs().format('YYYY-MM-DD'),
})
let refreshTimer: ReturnType<typeof setTimeout> | undefined
let requestVersion = 0

const targetUsers = computed(() => users.value)
const checkers = computed(() => users.value)
const currentCheckerName = computed(() => {
  const user = authStore.user
  return user ? `${user.firstName} ${user.lastName}`.trim() || user.userName : 'Current user'
})
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
watch(tablePage, async () => { await nextTick(); tableScroll.value?.scrollTo({ top: 0 }) })

onMounted(async () => {
  const lookups = await operations.getLookups()
  companies.value = lookups.companies
  drivers.value = lookups.drivers
  users.value = lookups.users
  ready.value = true
  await refresh()
  await nextTick()
  tableScroll.value?.scrollTo({ top: tableScroll.value.scrollHeight })
})

onBeforeUnmount(() => {
  if (refreshTimer) clearTimeout(refreshTimer)
})
</script>

