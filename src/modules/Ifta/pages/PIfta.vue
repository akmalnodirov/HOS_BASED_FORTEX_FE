<template>
  <div class="min-h-screen bg-white p-[16px_24px] dark:bg-background">
    <div
      class="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between"
    >
      <div>
        <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
          IFTA reports
        </h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Mileage by state per vehicle for a selected period
        </p>
      </div>
      <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
        <div class="w-full sm:w-[210px]">
          <CIftaMultiSelect
            v-model="statusFilter"
            :options="statusOptions"
            placeholder="All statuses"
          />
        </div>
        <Button
          variant="outline"
          class="h-10"
          :disabled="!selectedReadyReports.length"
          @click="bulkDownloadOpen = true"
        >
          <Download class="mr-2 h-4 w-4" />
          Download selected
        </Button>
        <Button
          variant="outline"
          class="h-10"
          :disabled="isRefreshing || !companyId"
          @click="fetchIfta(true)"
        >
          <RefreshCw :class="['mr-2 h-4 w-4', isRefreshing && 'animate-spin']" />
          Refresh
        </Button>
        <Button
          class="h-10"
          :disabled="!companyId"
          @click="generateOpen = true"
        >
          <Plus class="mr-2 h-4 w-4" />
          Generate report(s)
        </Button>
      </div>
    </div>
    <div class="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div class="rounded-md border border-[#E6E6E6] px-4 py-3 dark:border-border">
        <div class="text-xs text-[#666] dark:text-muted-foreground">
          Reports
        </div>
        <div class="text-2xl font-semibold">
          {{ reports.length }}
        </div>
      </div>
      <div class="rounded-md border border-[#E6E6E6] px-4 py-3 dark:border-border">
        <div class="text-xs text-[#666] dark:text-muted-foreground">
          Ready
        </div>
        <div class="text-2xl font-semibold text-[#589E67]">
          {{ counts.ready }}
        </div>
      </div>
      <div class="rounded-md border border-[#E6E6E6] px-4 py-3 dark:border-border">
        <div class="text-xs text-[#666] dark:text-muted-foreground">
          Processing
        </div>
        <div class="text-2xl font-semibold text-foreground">
          {{ counts.processing }}
        </div>
      </div>
      <div class="rounded-md border border-[#E6E6E6] px-4 py-3 dark:border-border">
        <div class="text-xs text-[#666] dark:text-muted-foreground">
          Waiting
        </div>
        <div class="text-2xl font-semibold text-amber-600">
          {{ counts.waiting }}
        </div>
      </div>
    </div>
    <div
      v-if="error"
      class="mb-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
    >
      {{ error }}
    </div>
    <div class="rounded-lg bg-white shadow-sm dark:bg-card">
      <div class="overflow-x-auto [&>div]:overflow-visible">
        <Table class="min-w-[980px]">
          <TableHeader>
            <TableRow
              class="border-0 bg-[#F0F0F0] hover:bg-[#F0F0F0] dark:bg-muted/50 dark:hover:bg-muted/50"
            >
              <TableHead class="w-10">
                <button
                  type="button"
                  class="flex h-4 w-4 items-center justify-center rounded border"
                  :class="
                    allSelected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border'
                  "
                  @click="toggleSelectAll"
                >
                  <Check
                    v-if="allSelected"
                    class="h-3 w-3"
                  />
                </button>
              </TableHead>
              <TableHead
                class="cursor-pointer select-none"
                @click="setSort('timeSubmitted')"
              >
                Submitted
                <ArrowUpDown class="ml-1 inline h-3 w-3" />
              </TableHead>
              <TableHead
                class="cursor-pointer select-none"
                @click="setSort('fromDate')"
              >
                From
                <ArrowUpDown class="ml-1 inline h-3 w-3" />
              </TableHead>
              <TableHead
                class="cursor-pointer select-none"
                @click="setSort('toDate')"
              >
                To
                <ArrowUpDown class="ml-1 inline h-3 w-3" />
              </TableHead>
              <TableHead
                class="cursor-pointer select-none"
                @click="setSort('vehicleName')"
              >
                Vehicle
                <ArrowUpDown class="ml-1 inline h-3 w-3" />
              </TableHead>
              <TableHead>
                States
              </TableHead>
              <TableHead
                class="cursor-pointer select-none"
                @click="setSort('status')"
              >
                Status
                <ArrowUpDown class="ml-1 inline h-3 w-3" />
              </TableHead>
              <TableHead class="w-20 text-center">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-if="isLoading">
              <TableCell
                colspan="8"
                class="h-28 text-center text-muted-foreground"
              >
                Loading…
              </TableCell>
            </TableRow>
            <TableRow
              v-for="(report, index) in paginatedReports"
              v-else
              :key="report.id"
              class="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <TableCell>
                <button
                  type="button"
                  class="flex h-4 w-4 select-none items-center justify-center rounded border"
                  :class="
                    selectedIds.has(report.id)
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border'
                  "
                  @click="onRowCheck(index, $event)"
                >
                  <Check
                    v-if="selectedIds.has(report.id)"
                    class="h-3 w-3"
                  />
                </button>
              </TableCell>
              <TableCell class="whitespace-nowrap">
                {{ formatSubmitted(report.timeSubmitted) }}
              </TableCell>
              <TableCell class="whitespace-nowrap">
                {{ report.fromDate }}
              </TableCell>
              <TableCell class="whitespace-nowrap">
                {{ report.toDate }}
              </TableCell>
              <TableCell class="font-medium">
                {{ report.vehicleName || report.vehicleId }}
              </TableCell>
              <TableCell class="text-xs text-muted-foreground">
                {{
                  report.states.length
                    ? report.states.join(', ')
                    : 'All available states'
                }}
              </TableCell>
              <TableCell>
                <span :class="statusClass(report.status)">
                  {{ statusLabel(report.status) }}
                </span>
              </TableCell>
              <TableCell class="text-center">
                <Button
                  variant="ghost"
                  size="icon"
                  class="h-8 w-8"
                  title="Download report"
                  :disabled="report.status !== 'READY' || !report.csvUrl"
                  @click="openDownload(report)"
                >
                  <Download class="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
            <TableRow v-if="!isLoading && !paginatedReports.length">
              <TableCell
                colspan="8"
                class="h-28 text-center text-muted-foreground"
              >
                No IFTA reports for this company.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
      <div
        class="flex items-center justify-between border-t border-gray-200 px-6 py-4 dark:border-border"
      >
        <div class="flex items-center gap-3">
          <span class="text-sm text-gray-600 dark:text-gray-400">
            Display on page
          </span>
          <Select v-model="itemsPerPage">
            <SelectTrigger class="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem :value="10">10</SelectItem>
              <SelectItem :value="25">25</SelectItem>
              <SelectItem :value="50">50</SelectItem>
              <SelectItem :value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <span class="text-sm text-gray-600 dark:text-gray-400">
            {{ filteredReports.length.toLocaleString() }} entries
          </span>
        </div>
        <div class="flex items-center gap-2">
          <div class="flex items-center gap-1">
            <button
              v-for="page in pageNumbers"
              :key="page"
              @click="typeof page === 'number' && goToPage(page)"
              :disabled="page === '...'"
              :class="[
                'min-w-[32px] h-8 px-2 text-sm font-medium rounded transition-colors',
                page === currentPage
                  ? 'bg-gray-900 dark:bg-gray-700 text-white'
                  : page === '...'
                    ? 'text-gray-400 dark:text-gray-500 cursor-default'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
              ]"
            >
              {{ page }}
            </button>
          </div>
          <div class="ml-4 flex items-center gap-2">
            <span class="text-sm text-gray-600 dark:text-gray-400">
              {{ currentPage }} of {{ totalPages }} pages
            </span>
            <div class="flex gap-1">
              <Button
                @click="goToPage(currentPage - 1)"
                :disabled="currentPage === 1"
                variant="outline"
                size="icon"
                class="h-8 w-8"
              >
                <ChevronLeft class="h-4 w-4" />
              </Button>
              <Button
                @click="goToPage(currentPage + 1)"
                :disabled="currentPage === totalPages"
                variant="outline"
                size="icon"
                class="h-8 w-8"
              >
                <ChevronRight class="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <IftaModal
      :open="generateOpen"
      :vehicles="vehicles"
      :is-submitting="isSubmitting"
      @close="generateOpen = false"
      @generate="handleGenerate"
    />

    <CIftaDownloadDialog
      v-model:open="downloadOpen"
      :report="downloadReport"
      :company-name="companyName"
      :fetch-csv="fetchCsv"
    />

    <CIftaBulkDownloadDialog
      v-model:open="bulkDownloadOpen"
      :reports="selectedReadyReports"
      :company-name="companyName"
      :fetch-csv="fetchCsv"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import dayjs from 'dayjs'
import {
  ArrowUpDown,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  RefreshCw,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
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
import { usePagination } from '@/composables/usePagination'
import { getCompanyId } from '@/utils/company'
import { useCompanies } from '@/layouts/Initial/composables/useCompanies'
import IftaModal from '@/modules/Ifta/components/CIftaModal.vue'
import CIftaMultiSelect from '@/modules/Ifta/components/CIftaMultiSelect.vue'
import CIftaDownloadDialog from '@/modules/Ifta/components/CIftaDownloadDialog.vue'
import CIftaBulkDownloadDialog from '@/modules/Ifta/components/CIftaBulkDownloadDialog.vue'
import { useIfta } from '@/modules/Ifta/composables/useIfta'
import type { IftaApiResponse } from '@/modules/Ifta/types'

const companyId = getCompanyId() || ''
const { companies } = useCompanies()

const companyName = computed(
  () =>
    companies.value.find((company) => company.id === companyId)?.name ||
    'Selected company'
)

const {
  reports,
  vehicles,
  isLoading,
  isRefreshing,
  isSubmitting,
  error,
  fetchIfta,
  generateIfta,
  fetchCsv,
} = useIfta({ companyId, autoFetch: true })

const statusOptions = [
  { value: 'READY', label: 'Ready' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'WAITING', label: 'Waiting' },
  { value: 'ERROR', label: 'Error' },
]

const statusFilter = ref<string[]>([])

const counts = computed(() => ({
  ready: reports.value.filter((report) => report.status === 'READY').length,
  processing: reports.value.filter(
    (report) => report.status === 'PROCESSING'
  ).length,
  waiting: reports.value.filter((report) => report.status === 'WAITING').length,
}))

type SortKey =
  | 'timeSubmitted'
  | 'fromDate'
  | 'toDate'
  | 'vehicleName'
  | 'status'

const sortKey = ref<SortKey>('timeSubmitted')
const sortDirection = ref<'asc' | 'desc'>('desc')

const filteredReports = computed(() => {
  const statuses = new Set(statusFilter.value)

  const values = reports.value.filter(
    (report) => !statuses.size || statuses.has(report.status)
  )

  const factor = sortDirection.value === 'asc' ? 1 : -1

  return [...values].sort((first, second) => {
    if (sortKey.value === 'timeSubmitted') {
      return (first.timeSubmitted - second.timeSubmitted) * factor
    }

    const firstValue =
      sortKey.value === 'vehicleName'
        ? first.vehicleName || first.vehicleId
        : first[sortKey.value] || ''

    const secondValue =
      sortKey.value === 'vehicleName'
        ? second.vehicleName || second.vehicleId
        : second[sortKey.value] || ''

    return String(firstValue).localeCompare(String(secondValue)) * factor
  })
})

const pagination = usePagination(
  computed(() => filteredReports.value.length),
  { itemsPerPage: 10 }
)

const paginatedReports = computed(() =>
  pagination.paginateData(filteredReports.value)
)

const selectedIds = ref<Set<string>>(new Set())
const anchorIndex = ref<number | null>(null)

const allSelected = computed(
  () =>
    paginatedReports.value.length > 0 &&
    paginatedReports.value.every((report) =>
      selectedIds.value.has(report.id)
    )
)

const generateOpen = ref(false)
const downloadOpen = ref(false)
const bulkDownloadOpen = ref(false)

const downloadReport = ref<IftaApiResponse | null>(null)

const selectedReadyReports = computed(() =>
  filteredReports.value.filter(
    (report) =>
      selectedIds.value.has(report.id) &&
      report.status === 'READY' &&
      report.csvUrl
  )
)

watch(statusFilter, () => {
  pagination.resetPage()
  selectedIds.value = new Set()
})

watch(
  () => pagination.itemsPerPage.value,
  () => pagination.resetPage()
)

function setSort(key: SortKey) {
  if (sortKey.value === key) {
    sortDirection.value =
      sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDirection.value =
      key === 'timeSubmitted' ? 'desc' : 'asc'
  }

  anchorIndex.value = null
}

function onRowCheck(index: number, event: MouseEvent) {
  const report = paginatedReports.value[index]

  if (!report) return

  if (event.shiftKey && anchorIndex.value !== null) {
    const start = Math.min(anchorIndex.value, index)
    const end = Math.max(anchorIndex.value, index)
    const next = new Set(selectedIds.value)

    for (let rowIndex = start; rowIndex <= end; rowIndex += 1) {
      const current = paginatedReports.value[rowIndex]

      if (current) {
        next.add(current.id)
      }
    }

    selectedIds.value = next
    return
  }

  const next = new Set(selectedIds.value)

  if (next.has(report.id)) {
    next.delete(report.id)
  } else {
    next.add(report.id)
  }

  selectedIds.value = next
  anchorIndex.value = index
}

function toggleSelectAll() {
  const next = new Set(selectedIds.value)

  if (allSelected.value) {
    paginatedReports.value.forEach((report) =>
      next.delete(report.id)
    )
  } else {
    paginatedReports.value.forEach((report) =>
      next.add(report.id)
    )
  }

  selectedIds.value = next
}

function openDownload(report: IftaApiResponse) {
  downloadReport.value = report
  downloadOpen.value = true
}

async function handleGenerate(data: {
  vehicleIds: string[]
  startDate: string
  endDate: string
  states: string[]
}) {
  if (await generateIfta(data)) {
    generateOpen.value = false
  }
}

function formatSubmitted(value: number) {
  return dayjs(value).format('MMM DD, hh:mm A')
}

function statusLabel(status: string) {
  return status.charAt(0) + status.slice(1).toLowerCase()
}

function statusClass(status: string) {
  const base = 'inline-flex rounded px-2 py-0.5 text-xs font-medium'

  if (status === 'READY') {
    return `${base} bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300`
  }

  if (status === 'PROCESSING') {
    return `${base} bg-slate-100 text-slate-700 dark:bg-muted dark:text-muted-foreground`
  }

  if (status === 'WAITING') {
    return `${base} bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300`
  }

  if (status === 'ERROR') {
    return `${base} bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300`
  }

  return `${base} bg-slate-100 text-slate-600 dark:bg-muted dark:text-muted-foreground`
}

const currentPage = pagination.currentPage
const itemsPerPage = pagination.itemsPerPage
const totalPages = pagination.totalPages
const pageNumbers = pagination.pageNumbers
const goToPage = pagination.goToPage
</script>
