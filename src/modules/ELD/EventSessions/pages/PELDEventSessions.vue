<template>
  <div
    class="flex h-[calc(100vh-65px)] min-h-0 flex-col overflow-hidden bg-white p-[16px_24px] dark:bg-background"
  >
    <div class="mb-5 flex flex-none flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <div>
        <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Event sessions</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Review local Route ELD workspaces, submissions and rollbacks
        </p>
      </div>

      <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
        <div class="relative w-full sm:w-[260px]">
          <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            v-model="search"
            class="h-10 pl-9"
            placeholder="Search sessions, users or drivers"
          />
        </div>

        <Popover v-model:open="periodOpen">
          <PopoverTrigger as-child>
            <Button
              variant="outline"
              class="h-10 w-full justify-between gap-3 px-3 font-normal sm:w-[295px]"
            >
              <span class="truncate">Created: {{ formattedDateRange }}</span>
              <CalendarIcon class="h-4 w-4 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent class="w-auto p-0" align="end">
            <RangeCalendar v-model="dateRange" :number-of-months="2" initial-focus />
            <div class="flex items-center justify-end gap-2 border-t border-border p-3">
              <Button variant="outline" size="sm" @click="resetDateRange">Reset</Button>
              <Button size="sm" :disabled="!validDateRange" @click="applyDateRange">Apply</Button>
            </div>
          </PopoverContent>
        </Popover>

        <Select v-model="statusFilter">
          <SelectTrigger class="h-10 w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="SUBMITTED">Submitted</SelectItem>
            <SelectItem value="ROLLED_BACK">Rolled back</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" class="h-10" :disabled="isRefreshing" @click="refresh">
          <RefreshCw :class="['mr-2 h-4 w-4', isRefreshing && 'animate-spin']" />
          Refresh
        </Button>
      </div>
    </div>

    <div class="mb-3 grid flex-none grid-cols-2 gap-3 sm:grid-cols-4">
      <button
        type="button"
        :class="summaryCardClass(statusFilter === 'ALL')"
        @click="statusFilter = 'ALL'"
      >
        <span class="text-xs text-[#666] dark:text-muted-foreground">Sessions</span>
        <span class="text-2xl font-semibold">{{ sessionCount.toLocaleString() }}</span>
      </button>
      <button
        type="button"
        :class="summaryCardClass(statusFilter === 'DRAFT')"
        @click="statusFilter = 'DRAFT'"
      >
        <span class="text-xs text-[#666] dark:text-muted-foreground">Draft</span>
        <span class="text-2xl font-semibold text-amber-600">{{ draftCount.toLocaleString() }}</span>
      </button>
      <button
        type="button"
        :class="summaryCardClass(statusFilter === 'SUBMITTED')"
        @click="statusFilter = 'SUBMITTED'"
      >
        <span class="text-xs text-[#666] dark:text-muted-foreground">Submitted</span>
        <span class="text-2xl font-semibold text-[#6082E0]">{{
          submittedCount.toLocaleString()
        }}</span>
      </button>
      <button
        type="button"
        :class="summaryCardClass(statusFilter === 'ROLLED_BACK')"
        @click="statusFilter = 'ROLLED_BACK'"
      >
        <span class="text-xs text-[#666] dark:text-muted-foreground">Rolled back</span>
        <span class="text-2xl font-semibold text-[#589E67]">{{
          rolledBackCount.toLocaleString()
        }}</span>
      </button>
    </div>

    <div
      v-if="pageError"
      class="mb-3 flex-none rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
    >
      {{ pageError }}
    </div>

    <div
      class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg bg-white shadow-sm dark:bg-card"
    >
      <div class="min-h-0 flex-1 overflow-auto [&>div]:overflow-visible">
        <Table class="min-w-[980px]">
          <TableHeader class="sticky top-0 z-20">
            <TableRow
              class="border-0 bg-[#F0F0F0] hover:bg-[#F0F0F0] dark:bg-muted/50 dark:hover:bg-muted/50"
            >
              <TableHead class="w-14">No</TableHead>
              <TableHead>
                <button class="flex items-center gap-1" @click="sortBy('name')">
                  Session <ArrowUpDown class="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead>
                <button class="flex items-center gap-1" @click="sortBy('dispatcherName')">
                  User <ArrowUpDown class="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead>
                <button class="flex items-center gap-1" @click="sortBy('driverName')">
                  Driver <ArrowUpDown class="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead>
                <button class="flex items-center gap-1" @click="sortBy('fromDate')">
                  Period <ArrowUpDown class="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead>
                <button class="flex items-center gap-1" @click="sortBy('status')">
                  Status <ArrowUpDown class="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead class="text-center">Tabs</TableHead>
              <TableHead>
                <button class="flex items-center gap-1" @click="sortBy('changedEventCount')">
                  Changed events <ArrowUpDown class="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead>
                <button class="flex items-center gap-1" @click="sortBy('createdAt')">
                  Created <ArrowUpDown class="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead>Last operation</TableHead>
              <TableHead class="w-28 text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            <TableRow v-if="isLoading">
              <TableCell colspan="11" class="h-28 text-center text-muted-foreground"
                >Loading…</TableCell
              >
            </TableRow>

            <TableRow
              v-for="(session, index) in sessions"
              v-else
              :key="session.id"
              class="cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
              @dblclick="openSession(session)"
            >
              <TableCell class="text-muted-foreground">{{ rowNumber(index) }}</TableCell>
              <TableCell>
                <div class="font-medium">{{ session.name }}</div>
                <div class="max-w-48 truncate font-mono text-[10px] text-muted-foreground">
                  {{ session.id }}
                </div>
              </TableCell>
              <TableCell>
                <div class="font-medium">{{ session.dispatcherName || 'No user' }}</div>
                <div
                  v-if="session.dispatcherId"
                  class="max-w-44 truncate font-mono text-[10px] text-muted-foreground"
                >
                  {{ session.dispatcherId }}
                </div>
                <div v-else class="text-xs text-muted-foreground">System-owned</div>
              </TableCell>
              <TableCell>
                <div class="font-medium">{{ session.driverName }}</div>
                <div class="max-w-52 truncate text-xs text-muted-foreground">
                  {{ session.companyName }}
                </div>
              </TableCell>
              <TableCell class="whitespace-nowrap"
                >{{ formatDay(session.fromDate) }} – {{ formatDay(session.toDate) }}</TableCell
              >
              <TableCell
                ><span :class="statusClass(session.status)">{{
                  statusLabel(session.status)
                }}</span></TableCell
              >
              <TableCell class="text-center">{{ session.tabCount }}</TableCell>
              <TableCell class="text-center">{{ session.changedEventCount }}</TableCell>
              <TableCell class="whitespace-nowrap">{{
                formatDateTime(session.createdAt)
              }}</TableCell>
              <TableCell class="whitespace-nowrap">
                <div class="font-medium">{{ lastOperationLabel(session) }}</div>
                <div class="text-xs text-muted-foreground">
                  {{ formatDateTime(lastOperationAt(session)) }}
                </div>
              </TableCell>
              <TableCell>
                <div class="flex items-center justify-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    class="h-8 w-8"
                    title="Open session"
                    @click.stop="openSession(session, true)"
                  >
                    <ExternalLink class="h-4 w-4" />
                  </Button>
                  <Button
                    v-if="session.status === 'SUBMITTED'"
                    variant="ghost"
                    size="icon"
                    class="h-8 w-8 text-[#AF4B4B] hover:bg-red-50 hover:text-[#AF4B4B] dark:hover:bg-red-950/30"
                    :disabled="rollingBackId !== null || session.isRollbackBlocked"
                    :title="
                      session.isRollbackBlocked
                        ? 'Rollback is blocked by an active DOT inspection'
                        : 'Rollback session'
                    "
                    @click.stop="rollbackTarget = session"
                  >
                    <LoaderCircle
                      v-if="rollingBackId === session.id"
                      class="h-4 w-4 animate-spin"
                    />
                    <Undo2 v-else class="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>

            <TableRow v-if="!isLoading && sessions.length === 0">
              <TableCell colspan="11" class="h-28 text-center text-muted-foreground">
                No event sessions match the selected filters.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <div
        class="flex flex-none flex-col gap-3 border-t border-gray-200 px-4 py-3 dark:border-border sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="flex items-center gap-3">
          <span class="text-sm text-gray-600 dark:text-gray-400"> Display on page </span>

          <Select :model-value="String(pageSize)" @update:model-value="changePageSize">
            <SelectTrigger class="h-9 w-20"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <span class="text-sm text-gray-600 dark:text-gray-400"
            >{{ totalCount.toLocaleString() }} entries</span
          >
        </div>

        <div class="flex items-center gap-3">
          <div class="hidden items-center gap-1 md:flex">
            <button
              v-for="pageValue in pageNumbers"
              :key="pageValue"
              :disabled="pageValue === '...'"
              :class="[
                'h-8 min-w-8 rounded px-2 text-sm transition-colors',
                pageValue === pageNumber
                  ? 'bg-primary text-primary-foreground'
                  : pageValue === '...'
                    ? 'cursor-default text-muted-foreground'
                    : 'hover:bg-muted',
              ]"
              @click="typeof pageValue === 'number' && (pageNumber = pageValue)"
            >
              {{ pageValue }}
            </button>
          </div>
          <div class="flex items-center gap-2">
            <span class="whitespace-nowrap text-sm text-muted-foreground"
              >{{ totalCount ? pageNumber : 0 }} of {{ totalPages }} pages</span
            >
            <Button
              variant="outline"
              size="icon"
              class="h-8 w-8"
              :disabled="pageNumber <= 1"
              @click="pageNumber--"
            >
              <ChevronLeft class="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              class="h-8 w-8"
              :disabled="pageNumber >= totalPages"
              @click="pageNumber++"
            >
              <ChevronRight class="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>

    <Dialog :open="rollbackTarget !== null" @update:open="handleRollbackDialog">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rollback submitted session?</DialogTitle>
          <DialogDescription>
            Route ELD will be restored to the Initial snapshot. Inserted events will be deleted and
            original events and profile forms will be submitted again.
          </DialogDescription>
        </DialogHeader>
        <div v-if="rollbackTarget" class="rounded-md border border-border bg-muted/30 p-3 text-sm">
          <div class="font-medium">{{ rollbackTarget.driverName }}</div>
          <div class="mt-1 text-muted-foreground">
            {{ formatDay(rollbackTarget.fromDate) }} – {{ formatDay(rollbackTarget.toDate) }} ·
            {{ rollbackTarget.changedEventCount }} changed events
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            :disabled="rollingBackId !== null"
            @click="rollbackTarget = null"
            >Cancel</Button
          >
          <Button variant="destructive" :disabled="rollingBackId !== null" @click="confirmRollback">
            <LoaderCircle v-if="rollingBackId !== null" class="mr-2 h-4 w-4 animate-spin" />
            <Undo2 v-else class="mr-2 h-4 w-4" />
            Rollback session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { CalendarDate } from '@internationalized/date'
import type { DateRange, DateValue } from 'reka-ui'
import {
  ArrowUpDown,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  LoaderCircle,
  RefreshCw,
  Search,
  Undo2,
} from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { RangeCalendar } from '@/components/ui/range-calendar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useDebounceSearch } from '@/composables/useDebounceSearch'
import { useTimeZoneHelper } from '@/composables/useTimezone'
import { getCompanyId } from '@/utils/company'
import { useEventSessions } from '../composables/useEventSessions'
import type { EventSessionFilters, EventSessionListItem, EventSessionStatus } from '../types'

type SessionSortKey =
  | 'name'
  | 'dispatcherName'
  | 'driverName'
  | 'fromDate'
  | 'status'
  | 'changedEventCount'
  | 'createdAt'

const router = useRouter()
const { formatToTimeZone } = useTimeZoneHelper()
const { searchQuery: search, debouncedSearchQuery: debouncedSearch, cleanup } = useDebounceSearch()
const {
  page,
  isLoading,
  isRefreshing,
  rollingBackId,
  error,
  fetchSessions,
  fetchSelectedCompanyExternalId,
  rollbackSession,
} = useEventSessions()

const today = localDate(new Date())
const defaultCreatedFrom = localDate(new Date(Date.now() - 8 * 86_400_000))
const selectedCompanyExternalId = ref<string | null>(null)
const companyContextReady = ref(false)
const companyContextError = ref<string | null>(null)
const statusFilter = ref<'ALL' | EventSessionStatus>('ALL')
const pageNumber = ref(1)
const pageSize = ref(25)
const sortKey = ref<SessionSortKey>('createdAt')
const sortOrder = ref<'asc' | 'desc'>('desc')
const appliedRange = ref({ from: defaultCreatedFrom, to: today })
const pendingRange = ref({ from: defaultCreatedFrom, to: today })
const dateRange = computed<DateRange>({
  get: () => ({
    start: calendarDate(pendingRange.value.from),
    end: calendarDate(pendingRange.value.to),
  }),
  set: (value) => {
    if (value.start) pendingRange.value.from = calendarDateString(value.start)
    if (value.end) pendingRange.value.to = calendarDateString(value.end)
  },
})
const periodOpen = ref(false)
const rollbackTarget = ref<EventSessionListItem | null>(null)

const filters = computed<EventSessionFilters>(() => ({
  search: debouncedSearch.value.trim() || undefined,
  companyId: selectedCompanyExternalId.value ?? undefined,
  status: statusFilter.value === 'ALL' ? undefined : statusFilter.value,
  createdFrom: appliedRange.value.from,
  createdTo: appliedRange.value.to,
  sortBy: sortKey.value,
  sortOrder: sortOrder.value,
  pageNumber: pageNumber.value,
  pageSize: pageSize.value,
}))

const sessions = computed(() => page.value.data)
const totalCount = computed(() => page.value.pagination.totalCount)
const draftCount = computed(() => page.value.draftCount)
const submittedCount = computed(() => page.value.submittedCount)
const rolledBackCount = computed(() => page.value.rolledBackCount)
const sessionCount = computed(() => draftCount.value + submittedCount.value + rolledBackCount.value)
const totalPages = computed(() => Math.max(1, page.value.pagination.totalPages))
const pageError = computed(() => companyContextError.value ?? error.value)
const validDateRange = computed(() => {
  return pendingRange.value.from <= pendingRange.value.to && pendingRange.value.to <= today
})
const formattedDateRange = computed(() => {
  return `${formatFilterDate(pendingRange.value.from)} - ${formatFilterDate(pendingRange.value.to)}`
})
const pageNumbers = computed<(number | string)[]>(() => {
  if (totalPages.value <= 7)
    return Array.from({ length: totalPages.value }, (_, index) => index + 1)
  const values: (number | string)[] = [1]
  if (pageNumber.value > 3) values.push('...')
  for (
    let value = Math.max(2, pageNumber.value - 1);
    value <= Math.min(totalPages.value - 1, pageNumber.value + 1);
    value += 1
  )
    values.push(value)
  if (pageNumber.value < totalPages.value - 2) values.push('...')
  values.push(totalPages.value)
  return values
})

watch(
  [debouncedSearch, statusFilter, pageSize],
  () => {
    pageNumber.value = 1
  },
  { flush: 'sync' }
)
watch(
  filters,
  (value) => {
    if (companyContextReady.value) void fetchSessions(value)
  },
  { deep: true }
)
watch(totalPages, (value) => {
  if (pageNumber.value > value) pageNumber.value = value
})

onMounted(loadSelectedCompany)
onUnmounted(cleanup)

function summaryCardClass(active: boolean) {
  return [
    'flex flex-col items-start rounded-md border border-[#E6E6E6] px-4 py-3 text-left transition-colors hover:bg-[#F7F7F7] dark:border-border dark:hover:bg-muted/40',
    active && 'border-gray-900 ring-1 ring-gray-900 dark:border-foreground dark:ring-foreground',
  ]
}

function resetDateRange() {
  pendingRange.value = { from: defaultCreatedFrom, to: today }
}

function applyDateRange() {
  if (!validDateRange.value) return
  appliedRange.value = { ...pendingRange.value }
  pageNumber.value = 1
  periodOpen.value = false
}

function sortBy(key: SessionSortKey) {
  if (sortKey.value === key) sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  else {
    sortKey.value = key
    sortOrder.value = key === 'createdAt' ? 'desc' : 'asc'
  }
  pageNumber.value = 1
}

function changePageSize(value: unknown) {
  pageSize.value = Number(value)
}

function rowNumber(index: number) {
  return (pageNumber.value - 1) * pageSize.value + index + 1
}

function openSession(session: EventSessionListItem, newTab = false) {
  const target = {
    name: 'ELDBoost',
    params: { id: session.driverId },
    query: {
      sessionId: session.id,
      fromDate: session.fromDate,
      toDate: session.toDate,
    },
  }
  if (newTab) {
    window.open(router.resolve(target).href, '_blank', 'noopener,noreferrer')
    return
  }
  void router.push(target)
}

function handleRollbackDialog(open: boolean) {
  if (!open && rollingBackId.value === null) rollbackTarget.value = null
}

async function confirmRollback() {
  const session = rollbackTarget.value
  if (!session) return
  try {
    await rollbackSession(session.id)
    rollbackTarget.value = null
    await fetchSessions(filters.value, true)
    toast.success('The session was rolled back to its Initial snapshot')
  } catch (exception) {
    toast.error(
      exception instanceof Error ? exception.message : 'The session could not be rolled back'
    )
  }
}

function refresh() {
  if (companyContextReady.value) void fetchSessions(filters.value, true)
}

async function loadSelectedCompany() {
  const companyId = getCompanyId()
  if (!companyId) {
    companyContextError.value = 'Select a company before opening event sessions.'
    return
  }
  try {
    selectedCompanyExternalId.value = await fetchSelectedCompanyExternalId(companyId)
    if (!selectedCompanyExternalId.value) {
      companyContextError.value = 'The selected company could not be resolved.'
      return
    }
    companyContextReady.value = true
    await fetchSessions(filters.value)
  } catch (exception) {
    companyContextError.value =
      exception instanceof Error ? exception.message : 'The selected company could not be loaded.'
  }
}

function statusClass(status: EventSessionStatus) {
  const base = 'inline-flex rounded px-2 py-0.5 text-xs font-medium'
  if (status === 'SUBMITTED')
    return `${base} bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300`
  if (status === 'ROLLED_BACK')
    return `${base} bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300`
  return `${base} bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300`
}

function statusLabel(status: EventSessionStatus) {
  return status === 'ROLLED_BACK' ? 'Rolled back' : status.charAt(0) + status.slice(1).toLowerCase()
}

function lastOperationLabel(session: EventSessionListItem) {
  if (session.rolledBackAt) return 'Rolled back'
  if (session.submittedAt) return 'Submitted'
  return 'Created'
}

function lastOperationAt(session: EventSessionListItem) {
  return session.rolledBackAt ?? session.submittedAt ?? session.createdAt
}

function formatDay(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`))
}

function formatDateTime(value: string) {
  return formatToTimeZone(value, 'MMM D, YYYY h:mm A')
}

function localDate(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function calendarDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new CalendarDate(year, month, day)
}

function calendarDateString(value: DateValue) {
  return `${value.year}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`
}

function formatFilterDate(value: string) {
  const [year, month, day] = value.split('-')
  return `${month}/${day}/${year}`
}
</script>
