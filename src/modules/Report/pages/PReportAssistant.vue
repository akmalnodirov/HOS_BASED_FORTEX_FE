<template>
  <div class="h-full min-h-0 flex flex-col overflow-hidden bg-gray-50 dark:bg-background">
    <CReportToolbar
      title="Assistant"
      subtitle="Assistant task overview"
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
        class="shrink-0 bg-white dark:bg-card border border-border rounded-xl p-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5"
      >
        <div class="flex flex-col gap-1.5">
          <span class="text-xs text-muted-foreground">Driver</span>
          <Select v-model="driverId">
            <SelectTrigger class="h-10"><SelectValue placeholder="All drivers" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All drivers</SelectItem>
              <SelectItem v-for="driver in drivers" :key="driver.id" :value="driver.id">
                {{ driver.name }}
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
        <div class="flex flex-col gap-1.5">
          <span class="text-xs text-muted-foreground">Assistant</span>
          <Select v-model="assistantId">
            <SelectTrigger class="h-10"><SelectValue placeholder="All assistants" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All assistants</SelectItem>
              <SelectItem v-for="user in assistants" :key="user.id" :value="user.id">
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
                v-for="item in assistantStatuses"
                :key="item.value"
                :value="String(item.value)"
              >
                {{ item.label }}
              </SelectItem>
            </SelectContent>
          </Select>
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
      </div>

      <div
        class="flex-1 min-h-0 bg-white dark:bg-card border border-border rounded-xl overflow-hidden flex flex-col"
      >
        <div class="flex-1 min-h-0 overflow-auto">
          <table class="w-full min-w-[1200px] text-sm">
            <thead class="sticky top-0 z-20 bg-muted text-muted-foreground shadow-sm">
              <tr class="border-b border-border text-left">
                <th class="px-4 py-3 font-medium w-14">#</th>
                <th class="px-4 py-3 font-medium">Driver</th>
                <th class="px-4 py-3 font-medium">Company</th>
                <th class="px-4 py-3 font-medium">Assistant</th>
                <th class="px-4 py-3 font-medium">Status</th>
                <th class="px-4 py-3 font-medium">Start time</th>
                <th class="px-4 py-3 font-medium">End time</th>
                <th class="px-4 py-3 font-medium">Logbooker</th>
                <th class="px-4 py-3 font-medium">Notes</th>
                <th v-if="canManage" class="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="9" class="px-4 py-12 text-center text-muted-foreground">
                  <Loader2 class="w-5 h-5 mx-auto animate-spin" />
                </td>
              </tr>
              <tr
                v-for="(entry, index) in rows"
                v-else
                :key="`${entry.routeTask.id}-${index}`"
                class="border-b border-border/60 hover:bg-muted/30"
              >
                <td class="px-4 py-3 text-muted-foreground">{{ index + 1 }}</td>
                <td class="px-4 py-3 font-medium">
                  <Select v-if="canManage && !isAssistantLocked(entry.routeTask.status)" :model-value="entry.routeTask.driver?.id" @update:model-value="value => updateAssistantRow(entry.routeTask, { driverId: String(value) })">
                    <SelectTrigger class="h-8 min-w-40"><SelectValue placeholder="Select driver" /></SelectTrigger>
                    <SelectContent><SelectItem v-for="driver in drivers" :key="driver.id" :value="driver.id">{{ driver.name }}</SelectItem></SelectContent>
                  </Select>
                  <template v-else>{{ entry.routeTask.driver?.name ?? '—' }}</template>
                </td>
                <td class="px-4 py-3">{{ entry.routeTask.company?.name ?? '—' }}</td>
                <td class="px-4 py-3">{{ operationUserName(entry.routeTask.assistant) }}</td>
                <td class="px-4 py-3">
                  <Select v-if="canManage && !isAssistantLocked(entry.routeTask.status)" :model-value="String(entry.routeTask.status)" @update:model-value="value => updateAssistantRow(entry.routeTask, { status: Number(value) })">
                    <SelectTrigger class="h-8 min-w-36"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem v-for="item in routeTaskStatuses.slice(3)" :key="item.value" :value="String(item.value)" :disabled="item.value <= entry.routeTask.status || (item.value === 5 && !entry.routeTask.notes?.trim())">{{ item.label }}</SelectItem></SelectContent>
                  </Select>
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
                <td class="px-4 py-3">{{ operationUserName(entry.routeTask.logBooker) }}</td>
                <td class="px-4 py-3 max-w-xs whitespace-normal">
                  <input v-if="canManage && !isAssistantLocked(entry.routeTask.status)" :value="entry.routeTask.notes ?? ''" class="w-full min-w-40 bg-transparent border-b border-transparent focus:border-primary outline-none" placeholder="Action / note" @change="event => updateAssistantRow(entry.routeTask, { notes: (event.target as HTMLInputElement).value })" />
                  <template v-else>{{ entry.routeTask.notes || '—' }}</template>
                </td>
                <td v-if="canManage" class="px-4 py-3"><Button v-if="!isAssistantLocked(entry.routeTask.status)" size="icon-sm" variant="ghost" title="Edit assistant task" aria-label="Edit assistant task" @click="editTask(entry.routeTask)"><Pencil class="h-4 w-4 text-muted-foreground" /></Button></td>
              </tr>
              <tr v-if="canManage" class="border-b border-border bg-primary/5">
                <td class="px-4 py-3 text-muted-foreground">+</td>
                <td class="px-4 py-3"><Select v-model="draftDriverId"><SelectTrigger class="h-8 min-w-40"><SelectValue placeholder="Select driver" /></SelectTrigger><SelectContent><SelectItem v-for="driver in drivers" :key="driver.id" :value="driver.id">{{ driver.name }}</SelectItem></SelectContent></Select></td>
                <td class="px-4 py-3">{{ draftCompany?.name ?? '—' }}</td>
                <td class="px-4 py-3 text-muted-foreground">Current user</td>
                <td class="px-4 py-3"><Select v-model="draftStatus"><SelectTrigger class="h-8 min-w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem v-for="item in routeTaskStatuses.slice(3)" :key="item.value" :value="String(item.value)" :disabled="item.value === 5">{{ item.label }}</SelectItem></SelectContent></Select></td>
                <td colspan="3" class="px-4 py-3 text-muted-foreground">Assigned when saved</td>
                <td class="px-4 py-3"><input v-model="draftNotes" class="w-full min-w-40 bg-transparent border-b border-border outline-none" placeholder="Action / note" /></td>
                <td class="px-4 py-3"><Button size="icon-sm" title="Add row" aria-label="Add row" :disabled="!draftCompany || draftSaving" @click="saveDraft"><Plus class="h-4 w-4" /></Button></td>
              </tr>
              <tr v-if="!loading && !rows.length">
                <td colspan="9" class="px-4 py-12 text-center text-muted-foreground">
                  No assistant tasks found for the selected filters.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="shrink-0 px-4 py-3 text-sm text-muted-foreground border-t border-border">
          {{ uniqueTasks.length }} assistant tasks
        </div>
      </div>
    </div>
    <CReportEditor v-model:open="editorOpen" kind="assistant" :record="editingTask" :companies="companies" :drivers="drivers" :users="users" @saved="refresh" />
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
import CReportMetricCards from '@/modules/Report/components/CReportMetricCards.vue'
import CReportToolbar from '@/modules/Report/components/CReportToolbar.vue'
import CReportEditor from '@/modules/Report/components/CReportEditor.vue'
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
const canManage = computed(() => hasPermission(authStore.getTokens(), 'report.manage'))
const { assistantVersion } = useReportSocket()
const editorOpen = ref(false)
const editingTask = ref<ReportTaskState['routeTask'] | null>(null)
function editTask(task: ReportTaskState['routeTask'] | null) { editingTask.value = task; editorOpen.value = true }
const rows = ref<ReportTaskState[]>([])
const draftDriverId = ref('')
const draftStatus = ref('3')
const draftNotes = ref('')
const draftSaving = ref(false)
const draftCompany = computed(() => drivers.value.find((driver) => driver.id === draftDriverId.value)?.company)
async function saveDraft() {
  if (!draftCompany.value) return
  draftSaving.value = true
  try {
    await operations.createAssistantTask({ driverId: draftDriverId.value, companyId: draftCompany.value.id, status: Number(draftStatus.value), notes: draftNotes.value })
    draftDriverId.value = ''
    draftStatus.value = '3'
    draftNotes.value = ''
    queueRefresh()
  } catch {
    toast.error('Could not add assistant task')
  } finally {
    draftSaving.value = false
  }
}
async function updateAssistantRow(task: ReportRouteTask, changes: { status?: number; notes?: string; driverId?: string }) {
  if (isAssistantLocked(task.status) || (changes.status !== undefined && changes.status <= task.status)) return
  if (changes.status === 5 && !task.notes?.trim()) {
    toast.error('Add a note before completing the assistant task')
    return
  }
  const driver = changes.driverId ? drivers.value.find((item) => item.id === changes.driverId) : task.driver
  const company = changes.driverId ? driver?.company : task.company
  if (!driver?.id || !company?.id) return
  try {
    await operations.updateAssistantTask(task.id, {
      driverId: driver.id,
      companyId: company.id,
      status: changes.status ?? task.status,
      notes: changes.notes ?? task.notes ?? '',
      startTime: task.startTime ?? null,
      endTime: task.endTime ?? null,
      logBookerId: task.logBooker?.id ?? null,
    })
    Object.assign(task, changes, { driver, company })
    queueRefresh()
  } catch {
    toast.error('Could not update assistant task')
    queueRefresh()
  }
}
function isAssistantLocked(status: number): boolean {
  return status === 5
}
const companies = ref<ReportOperationCompany[]>([])
const drivers = ref<ReportOperationDriver[]>([])
const users = ref<ReportOperationUser[]>([])
const loading = ref(false)
const initialLoad = ref(true)
const ready = ref(false)
const driverId = ref('all')
const companyId = ref('all')
const assistantId = ref('all')
const logBookerId = ref('all')
const status = ref('all')
const range = ref<DateRange>({
  startTime: dayjs().subtract(7, 'day').format('YYYY-MM-DD'),
  endTime: dayjs().format('YYYY-MM-DD'),
})
let refreshTimer: ReturnType<typeof setTimeout> | undefined
let requestVersion = 0

const assistants = computed(() => users.value)
const logBookers = computed(() => users.value)
const assistantStatuses = routeTaskStatuses.slice(3)
const uniqueTasks = computed(() => {
  const tasks = new Map<string, ReportTaskState['routeTask']>()
  rows.value.forEach((entry) => tasks.set(entry.routeTask.id, entry.routeTask))
  return Array.from(tasks.values())
})
const summaryCards = computed(() => [
  {
    label: 'Total tasks',
    value: uniqueTasks.value.length,
    caption: 'Selected period and filters',
  },
  {
    label: 'On hold',
    value: uniqueTasks.value.filter((task) => task.status === 3).length,
    valueClass: 'text-amber-600',
  },
  {
    label: 'Working',
    value: uniqueTasks.value.filter((task) => task.status === 4).length,
    valueClass: 'text-blue-600',
  },
  {
    label: 'Completed',
    value: uniqueTasks.value.filter((task) => task.status === 5).length,
    valueClass: 'text-emerald-600',
  },
])

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
    const result = await operations.getAssistant({
      driverId: driverId.value === 'all' ? null : driverId.value,
      companyId: companyId.value === 'all' ? null : companyId.value,
      assistantId: assistantId.value === 'all' ? null : assistantId.value,
      logBookerId: logBookerId.value === 'all' ? null : logBookerId.value,
      taskStatus: status.value === 'all' ? null : Number(status.value),
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

watch([driverId, companyId, assistantId, logBookerId, status], queueRefresh)

watch(assistantVersion, queueRefresh)

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

