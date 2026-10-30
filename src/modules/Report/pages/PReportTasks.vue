<template>
  <div class="h-[calc(100dvh-65px)] min-h-0 flex flex-col overflow-hidden bg-gray-50 dark:bg-background">
    <CReportToolbar
      title="Tasks"
      subtitle="Route Report task overview"
      default-period="day"
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
      <CReportMetricCards :items="summaryCards" single-row />

      <div
        class="shrink-0 bg-white dark:bg-card border border-border rounded-xl p-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <div class="flex flex-col gap-1.5">
          <span class="text-xs text-muted-foreground">Company</span>
          <CReportSearchSelect v-model="companyId" :options="companies" empty-label="All companies" empty-value="all" />
        </div>
        <div class="flex flex-col gap-1.5">
          <span class="text-xs text-muted-foreground">Driver</span>
          <CReportSearchSelect v-model="driverId" :options="filteredDrivers" empty-label="All drivers" empty-value="all" />
        </div>
        <div class="flex flex-col gap-1.5">
          <span class="text-xs text-muted-foreground">Logbooker</span>
          <Select v-model="logBookerId">
            <SelectTrigger class="h-10"><SelectValue placeholder="All logbookers" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All logbookers</SelectItem>
              <SelectItem v-for="user in logBookers" :key="user.id" :value="user.id">
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
                v-for="item in routeTaskStatuses"
                :key="item.value"
                :value="String(item.value)"
              >
                {{ item.label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div
        class="flex-1 min-h-0 bg-white dark:bg-card border border-border rounded-xl overflow-hidden flex flex-col"
      >
        <div ref="tableScroll" class="flex-1 min-h-0 overflow-auto overscroll-contain">
          <table class="w-full min-w-[1050px] text-sm">
            <thead class="sticky top-0 z-20 bg-muted text-muted-foreground shadow-sm">
              <tr class="border-b border-border text-left">
                <th class="px-4 py-3 font-medium w-14">#</th>
                <th class="px-4 py-3 font-medium">Driver</th>
                <th class="px-4 py-3 font-medium">Logbooker</th>
                <th class="px-4 py-3 font-medium">Status</th>
                <th class="px-4 py-3 font-medium">Start time</th>
                <th class="px-4 py-3 font-medium">End time</th>
                <th class="px-4 py-3 font-medium min-w-48"><span class="block mb-1">Company</span><CReportSearchSelect v-model="companyId" :options="companies" empty-label="All companies" empty-value="all" size="sm" @click.stop /></th>
                <th class="px-4 py-3 font-medium">Notes</th>
                <th v-if="canManage" class="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading" class="border-b border-border/60">
                <td colspan="8" class="px-4 py-12 text-center text-muted-foreground">
                  <Loader2 class="w-5 h-5 mx-auto animate-spin" />
                </td>
              </tr>
              <template
                v-for="(entry, index) in visibleRows"
                v-else
                :key="`${entry.routeTask.id}-${index}`"
              >
                <tr
                  class="border-b border-border/60 hover:bg-muted/30 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                  tabindex="0"
                  @click="openTaskHistory(entry.routeTask.id)"
                  @keydown.enter.self="openTaskHistory(entry.routeTask.id)"
                  @keydown.space.self.prevent="openTaskHistory(entry.routeTask.id)"
                >
                  <td class="px-4 py-3 text-muted-foreground">{{ pageSizeSelection === 'all' ? index + 1 : (tablePage - 1) * Number(pageSizeSelection) + index + 1 }}</td>
                  <td class="px-4 py-3 font-medium" @click.stop>
                    <CReportSearchSelect v-if="canEdit && !isTaskLocked(entry.routeTask.status)" :model-value="taskDriverId(entry.routeTask)" :options="driversForCompany(taskCompanyId(entry.routeTask))" size="sm" placeholder="Select driver" @update:model-value="value => updateTaskRow(entry.routeTask, { driverId: value })" />
                    <template v-else>{{ entry.routeTask.driver?.name ?? '—' }}</template>
                  </td>
                  <td class="px-4 py-3">
                    {{ operationUserName(entry.routeTask.logBooker) }}
                    <span v-if="entry.routeTask.taskCount" class="text-muted-foreground">
                      ({{ entry.routeTask.taskCount }})
                    </span>
                  </td>
                  <td class="px-4 py-3">
                    <CReportStatusMenu
                      v-if="canEdit && !isTaskLocked(entry.routeTask.status) && entry.routeTask.status < 3"
                      :model-value="entry.routeTask.status"
                      :options="routeTaskStatuses.slice(0, 4)"
                      :disabled-values="routeTaskStatuses.slice(0, 4).filter(item => item.value <= entry.routeTask.status).map(item => item.value)"
                      :loading="statusSavingIds.includes(entry.routeTask.id)"
                      @update:model-value="value => updateTaskRow(entry.routeTask, { status: value })"
                    />
                    <span v-else
                      class="inline-flex rounded-full px-2 py-1 text-xs font-semibold"
                      :class="operationStatusClass(entry.routeTask.status)"
                    >
                      {{ operationStatusLabel(entry.routeTask.status) }}
                    </span>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap">
                    {{ operationDate(entry.routeTask.startTime) }}
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap">
                    {{ operationDate(entry.routeTask.endTime) }}
                  </td>
                  <td class="px-4 py-3" @click.stop><CReportSearchSelect v-if="canEdit && !isTaskLocked(entry.routeTask.status)" :model-value="taskCompanyId(entry.routeTask)" :options="companies" size="sm" placeholder="Select company" @update:model-value="value => selectTaskCompany(entry.routeTask, value)" /><span v-if="pendingTaskCompanies[entry.routeTask.id]" class="text-xs text-muted-foreground">Select a driver to save</span><template v-else-if="!canEdit || isTaskLocked(entry.routeTask.status)">{{ entry.routeTask.company?.name ?? '—' }}</template></td>
                  <td class="px-4 py-3 max-w-xs whitespace-normal">
                    <CReportNotePicker v-if="canEdit && !isTaskLocked(entry.routeTask.status)" :model-value="entry.routeTask.notes ?? ''" @commit="value => saveTaskNotes(entry.routeTask, value)" />
                    <template v-else>{{ entry.routeTask.notes || '—' }}</template>
                  </td>
                  <td v-if="canManage" class="px-4 py-3">
                    <div class="flex items-center gap-1">
                      <Button v-if="canEdit && !isTaskLocked(entry.routeTask.status)" size="icon-sm" variant="ghost" title="Edit task" aria-label="Edit task" @click.stop="editTask(entry.routeTask)">
                        <Pencil class="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button v-if="canDelete" size="icon-sm" variant="ghost" title="Delete task" aria-label="Delete task" @click.stop="taskToDelete = entry.routeTask">
                        <Trash2 class="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
                <tr v-if="entry.shiftStatus" :class="shiftRowClass(entry.shiftStatus.shiftType)">
                  <td colspan="8" class="px-4 py-2 text-center font-semibold text-xs tracking-wide">
                    {{ shiftName(entry.shiftStatus.shiftType) }} shift ·
                    {{ entry.shiftStatus.shiftTaskCount }} tasks ·
                    {{ operationDate(entry.shiftStatus.dateTime) }}
                  </td>
                </tr>
              </template>
              <tr v-if="canCreate" class="border-b border-border bg-primary/5">
                <td class="px-4 py-3 text-muted-foreground">New</td>
                <td class="px-4 py-3">
                  <CReportSearchSelect :model-value="draftDriverId" :options="driversForCompany(draftCompanyId || (companyId === 'all' ? '' : companyId))" size="sm" placeholder="Select driver" @update:model-value="selectDraftDriver" />
                </td>
                <td class="px-4 py-3 text-muted-foreground">Current user</td>
                <td class="px-4 py-3"><CReportStatusMenu :model-value="draftStatus" :options="routeTaskStatuses.slice(0, 4)" :loading="draftSaving" @update:model-value="saveDraft" /></td>
                <td colspan="2" class="px-4 py-3 text-muted-foreground">Assigned when saved</td>
                <td class="px-4 py-3"><CReportSearchSelect :model-value="draftCompanyId" :options="companies" size="sm" placeholder="Select company" @update:model-value="selectDraftCompany" /></td>
                <td class="px-4 py-3"><CReportNotePicker v-model="draftNotes" /></td>
                <td class="px-4 py-3"></td>
              </tr>
              <tr v-if="!loading && !rows.length">
                <td colspan="8" class="px-4 py-12 text-center text-muted-foreground">
                  No tasks found for the selected filters.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="shrink-0 flex items-center justify-between gap-3 px-4 py-3 text-sm text-muted-foreground border-t border-border">
          <span>{{ uniqueTasks.length }} tasks</span>
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

    <CReportTaskHistoryModal v-model:open="historyOpen" :task-id="historyTaskId" />
    <CReportEditor v-model:open="editorOpen" kind="task" :record="editingTask" :can-delete="canDelete" :companies="companies" :drivers="filteredDrivers" :users="users" @saved="refresh" />
    <Dialog :open="!!taskToDelete" @update:open="open => { if (!open && !deleting) taskToDelete = null }">
      <DialogContent class="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Delete this task?</DialogTitle>
        </DialogHeader>
        <p class="text-sm text-muted-foreground">
          Task for {{ taskToDelete?.driver?.name ?? 'this driver' }} will be removed from the list.
        </p>
        <DialogFooter class="gap-2">
          <Button variant="outline" :disabled="deleting" @click="taskToDelete = null">Cancel</Button>
          <Button variant="destructive" :disabled="deleting" @click="confirmDelete">
            {{ deleting ? 'Deleting…' : 'Delete' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
import CReportMetricCards from '@/modules/Report/components/CReportMetricCards.vue'
import CReportTaskHistoryModal from '@/modules/Report/components/CReportTaskHistoryModal.vue'
import CReportSearchSelect from '@/modules/Report/components/CReportSearchSelect.vue'
import CReportNotePicker from '@/modules/Report/components/CReportNotePicker.vue'
import CReportToolbar from '@/modules/Report/components/CReportToolbar.vue'
import CReportEditor from '@/modules/Report/components/CReportEditor.vue'
import CReportStatusMenu from '@/modules/Report/components/CReportStatusMenu.vue'
import CReportPageSize from '@/modules/Report/components/CReportPageSize.vue'
import { useReportTablePage } from '@/modules/Report/composables/useReportTablePage'
import { hasPermission } from '@/router/permissions'
import { useAuthStore } from '@/modules/Auth/store/authStore'
import { useReportSocket } from '@/modules/Report/composables/useReportSocket'
import { useReportOperations } from '@/modules/Report/composables/useReportOperations'
import type {
  DateRange,
  ReportOperationCompany,
  ReportOperationDriver,
  ReportOperationUser,
  ReportTaskState,
  ReportRouteTask,
  ReportTaskStatistics,
} from '@/modules/Report/types'
import {
  operationDate,
  operationRangeEnd,
  operationRangeStart,
  operationStatusClass,
  operationStatusLabel,
  operationUserName,
  routeTaskStatuses,
} from '@/modules/Report/utils/operations'

const operations = useReportOperations()
const authStore = useAuthStore()
const canCreate = computed(() => hasPermission(authStore.getTokens(), 'report.tasks.create'))
const canEdit = computed(() => hasPermission(authStore.getTokens(), 'report.tasks.edit'))
const canDelete = computed(() => hasPermission(authStore.getTokens(), 'report.tasks.delete'))
const canManage = computed(() => canCreate.value || canEdit.value || canDelete.value)
const { taskVersion } = useReportSocket()
const editorOpen = ref(false)
const editingTask = ref<ReportTaskState['routeTask'] | null>(null)
function editTask(task: ReportTaskState['routeTask'] | null) { editingTask.value = task; editorOpen.value = true }
const rows = ref<ReportTaskState[]>([])
const { pageSizeSelection, tablePage, tablePageCount, visibleRows } = useReportTablePage(rows)
const taskToDelete = ref<ReportRouteTask | null>(null)
const deleting = ref(false)
const taskStatistics = ref<ReportTaskStatistics>()
const draftDriverId = ref('')
const draftCompanyId = ref('')
const draftStatus = ref<number | null>(null)
const draftNotes = ref('')
const draftSaving = ref(false)
const draftCompany = computed(() => companies.value.find((company) => company.id === draftCompanyId.value))
async function saveDraft(selectedStatus: number) {
  if (draftSaving.value) return
  if (!draftDriverId.value || !draftCompany.value) {
    toast.error('Select a driver and company before setting a status')
    return
  }
  if (selectedStatus === 2 && !draftNotes.value.trim()) {
    toast.error('Add a note before completing the task')
    return
  }
  draftStatus.value = selectedStatus
  draftSaving.value = true
  try {
    const body = { driverId: draftDriverId.value, companyId: draftCompany.value.id, status: selectedStatus, notes: draftNotes.value }
    if (body.status === 3) await operations.createAssistantTask(body)
    else await operations.createTask(body)
    draftDriverId.value = ''
    draftCompanyId.value = ''
    draftStatus.value = null
    draftNotes.value = ''
    queueRefresh()
  } catch {
    toast.error('Could not add task')
    draftStatus.value = null
  } finally {
    draftSaving.value = false
  }
}
const companies = ref<ReportOperationCompany[]>([])
const drivers = ref<ReportOperationDriver[]>([])
const filteredDrivers = computed(() => companyId.value === 'all'
  ? drivers.value
  : drivers.value.filter((driver) => driver.company?.id === companyId.value))
const pendingTaskCompanies = ref<Record<string, string>>({})
function driversForCompany(selectedCompanyId?: string) {
  return selectedCompanyId
    ? drivers.value.filter((driver) => driver.company?.id === selectedCompanyId)
    : drivers.value
}
function taskCompanyId(task: ReportRouteTask): string {
  return pendingTaskCompanies.value[task.id] ?? task.company?.id ?? ''
}
function taskDriverId(task: ReportRouteTask): string {
  const driver = drivers.value.find((item) => item.id === task.driver?.id)
  return driver?.company?.id === taskCompanyId(task) ? driver.id : ''
}
function selectTaskCompany(task: ReportRouteTask, value: string) {
  if (value === task.company?.id) {
    delete pendingTaskCompanies.value[task.id]
    return
  }
  pendingTaskCompanies.value[task.id] = value
}
function selectDraftDriver(value: string) {
  draftDriverId.value = value
  const driver = drivers.value.find((item) => item.id === value)
  if (driver?.company?.id) draftCompanyId.value = driver.company.id
}
function selectDraftCompany(value: string) {
  draftCompanyId.value = value
  if (!driversForCompany(value).some((driver) => driver.id === draftDriverId.value)) draftDriverId.value = ''
}
const users = ref<ReportOperationUser[]>([])
const loading = ref(false)
const initialLoad = ref(true)
const ready = ref(false)
const driverId = ref('all')
const companyId = ref('all')
const logBookerId = ref('all')
const status = ref('all')
const statusSavingIds = ref<string[]>([])
const tableScroll = ref<HTMLElement | null>(null)
const historyOpen = ref(false)
const historyTaskId = ref('')
const range = ref<DateRange>({
  startTime: dayjs().format('YYYY-MM-DD'),
  endTime: dayjs().format('YYYY-MM-DD'),
})
let refreshTimer: ReturnType<typeof setTimeout> | undefined
let requestVersion = 0

const logBookers = computed(() => users.value)
const uniqueTasks = computed(() => {
  const tasks = new Map<string, ReportTaskState['routeTask']>()
  rows.value.forEach((entry) => tasks.set(entry.routeTask.id, entry.routeTask))
  return Array.from(tasks.values())
})
const visibleCompletedTasks = computed(() => uniqueTasks.value.filter((task) => task.status === 2))
const visibleTaskStatistics = computed(() => visibleCompletedTasks.value.length ? taskStatistics.value : undefined)
const summaryCards = computed(() => [
  { label: 'Total tasks', value: uniqueTasks.value.length, caption: 'Selected period and filters' },
  {
    label: 'Working',
    value: uniqueTasks.value.filter((task) => task.status === 1 || task.status === 4).length,
    valueClass: 'text-blue-600',
  },
  {
    label: 'Completed',
    value: uniqueTasks.value.filter((task) => task.status === 2 || task.status === 5).length,
    valueClass: 'text-emerald-600',
  },
  {
    label: 'On hold',
    value: uniqueTasks.value.filter((task) => task.status === 0 || task.status === 3).length,
    valueClass: 'text-amber-600',
  },
  {
    label: 'Avg. hold-to-completed',
    value: formatDuration(visibleTaskStatistics.value?.totalCompleted
      ? visibleTaskStatistics.value.totalTime / visibleTaskStatistics.value.totalCompleted
      : 0),
    caption: `${visibleCompletedTasks.value.length} completed tasks`,
    valueClass: 'text-violet-600',
  },
  {
    label: 'Avg. hold time',
    value: formatDuration(visibleTaskStatistics.value?.averageTimeHold ?? 0),
    caption: 'Hold to working',
    valueClass: 'text-amber-600',
  },
  {
    label: 'Avg. completion time',
    value: formatDuration(visibleTaskStatistics.value?.averageTimeCompleted ?? 0),
    caption: 'Working to completed',
    valueClass: 'text-emerald-600',
  },
])

function formatDuration(seconds: number): string {
  const totalSeconds = Math.max(0, Math.round(seconds))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const remainingSeconds = totalSeconds % 60
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${remainingSeconds}s`
  return `${remainingSeconds}s`
}

function isTaskLocked(status: number): boolean {
  return status === 2 || status === 4 || status === 5
}

async function confirmDelete() {
  const task = taskToDelete.value
  if (!task || deleting.value) return
  deleting.value = true
  try {
    await operations.deleteTask(task.id)
    rows.value = rows.value.filter((entry) => entry.routeTask.id !== task.id)
    if (historyTaskId.value === task.id) historyOpen.value = false
    taskToDelete.value = null
    toast.success('Task deleted')
    queueRefresh()
  } catch {
    toast.error('Could not delete task')
  } finally {
    deleting.value = false
  }
}

async function updateTaskRow(task: ReportRouteTask, changes: { status?: number; notes?: string; driverId?: string }) {
  if (changes.status !== undefined && statusSavingIds.value.includes(task.id)) return
  if (isTaskLocked(task.status) || (changes.status !== undefined && changes.status <= task.status)) return
  if (changes.status === 2 && !task.notes?.trim()) {
    toast.error('Add a note before completing the task')
    return
  }
  const driver = changes.driverId ? drivers.value.find((item) => item.id === changes.driverId) : task.driver
  const company = changes.driverId ? driver?.company : task.company
  if (!driver?.id || !company?.id) return
  const savingStatus = changes.status !== undefined
  if (savingStatus) statusSavingIds.value = [...statusSavingIds.value, task.id]
  try {
    await operations.updateTask(task.id, {
      driverId: driver.id,
      companyId: company.id,
      status: changes.status ?? task.status,
      notes: changes.notes ?? task.notes ?? '',
      startTime: task.startTime ?? null,
      endTime: task.endTime ?? null,
      logBookerId: task.logBooker?.id ?? null,
    })
    Object.assign(task, changes, { driver, company })
    if (changes.driverId) delete pendingTaskCompanies.value[task.id]
    queueRefresh()
  } catch {
    toast.error('Could not update task')
    queueRefresh()
  } finally {
    if (savingStatus) statusSavingIds.value = statusSavingIds.value.filter((id) => id !== task.id)
  }
}

function saveTaskNotes(task: ReportRouteTask, value: string) {
  task.notes = value
  void updateTaskRow(task, { notes: value })
}

function shiftName(shiftType: number): string {
  return ['Morning', 'Afternoon', 'Night'][shiftType] ?? 'Shift'
}

function shiftRowClass(shiftType: number): string {
  if (shiftType === 0) return 'bg-cyan-500/15 text-cyan-800 dark:text-cyan-200'
  if (shiftType === 1) return 'bg-red-500/15 text-red-800 dark:text-red-200'
  return 'bg-slate-900 text-white dark:bg-slate-700'
}

function openTaskHistory(taskId: string) {
  historyTaskId.value = taskId
  historyOpen.value = true
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
    const filters = {
      driverId: driverId.value === 'all' ? null : driverId.value,
      companyId: companyId.value === 'all' ? null : companyId.value,
      logBookerId: logBookerId.value === 'all' ? null : logBookerId.value,
      startTime: operationRangeStart(range.value.startTime),
      endTime: operationRangeEnd(range.value.endTime),
    }
    const [tasksResult, statisticsResult] = await Promise.allSettled([operations.getTasks({
      ...filters,
      taskStatus: status.value === 'all' ? null : Number(status.value),
    }), operations.getTaskStatistics(filters)])
    if (version === requestVersion) {
      if (tasksResult.status === 'fulfilled') rows.value = tasksResult.value
      taskStatistics.value = tasksResult.status === 'fulfilled' && statisticsResult.status === 'fulfilled'
        ? statisticsResult.value
        : undefined
    }
  } finally {
    if (version === requestVersion) {
      loading.value = false
      initialLoad.value = false
    }
  }
}

watch(companyId, () => {
  if (!filteredDrivers.value.some((driver) => driver.id === driverId.value)) driverId.value = 'all'
})

watch([driverId, companyId, logBookerId, status], queueRefresh)

watch(taskVersion, queueRefresh)
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

