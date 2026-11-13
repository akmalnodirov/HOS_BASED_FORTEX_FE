<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-6xl">
      <DialogHeader>
        <DialogTitle>Certify company drivers</DialogTitle>
        <DialogDescription>
          Review daily profile forms, then queue direct Route ELD certification fixes for selected drivers.
        </DialogDescription>
      </DialogHeader>

      <div class="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <Button
          size="sm"
          :variant="view === 'repair' ? 'default' : 'outline'"
          @click="view = 'repair'"
        >
          Certification
        </Button>
        <Button
          size="sm"
          :variant="view === 'history' ? 'default' : 'outline'"
          @click="showHistory"
        >
          <History class="mr-2 h-4 w-4" />
          History
        </Button>
        <div v-if="activeBatch" class="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <span :class="statusClass(activeBatch.status)" class="rounded border px-2 py-1 font-semibold">
            {{ statusLabel(activeBatch.status) }}
          </span>
          <span>{{ activeBatch.completedDrivers }}/{{ activeBatch.totalDrivers }} drivers</span>
        </div>
      </div>

      <template v-if="view === 'repair'">
        <div class="flex flex-wrap items-end gap-3">
          <div class="space-y-1.5">
            <Label class="text-xs">Date range</Label>
            <div>
              <Popover v-model:open="calendarOpen">
                <PopoverTrigger as-child>
                  <Button variant="outline" class="h-9 min-w-60 justify-start px-3 text-left text-sm font-normal">
                    <CalendarIcon class="mr-2 h-4 w-4 text-muted-foreground" />
                    {{ rangeLabel }}
                  </Button>
                </PopoverTrigger>
                <PopoverContent class="w-auto p-0" align="start">
                  <RangeCalendar v-model="dateRange" initial-focus />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div class="relative min-w-56 flex-1 space-y-1.5">
            <Label class="text-xs">Find driver</Label>
            <Search class="absolute bottom-3 translate-y-1/2 left-3 h-4 w-4 text-muted-foreground" />
            <Input v-model="search" class="h-9 pl-9 text-sm" placeholder="Search drivers" />
          </div>
          <Button variant="outline" class="h-9" :disabled="loading" @click="loadPreview">
            <RefreshCw class="mr-2 h-4 w-4" :class="loading && 'animate-spin'" />
            Check statuses
          </Button>
        </div>

        <p v-if="rangeError" class="text-xs text-destructive">{{ rangeError }}</p>
        <div class="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2">
          <Label class="flex cursor-pointer items-center gap-2 text-sm font-medium">
            <Checkbox :model-value="allDriversSelectionState" @update:model-value="toggleAllDrivers" />
            All drivers
          </Label>
          <span class="text-xs text-muted-foreground">
            {{ selectedDriverIds.size }} selected
          </span>
        </div>

        <div class="min-h-0 flex-1 overflow-auto rounded-md border border-border">
          <div v-if="loading" class="p-10 text-center text-sm text-muted-foreground">
            Loading driver certification statuses…
          </div>
          <div v-else-if="!filteredDrivers.length" class="p-10 text-center text-sm text-muted-foreground">
            No drivers match this selection.
          </div>
          <table v-else class="w-full min-w-220 text-sm">
            <thead class="sticky top-0 z-10 bg-background shadow-sm">
              <tr class="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th class="w-12 px-3 py-3"></th>
                <th class="px-3 py-3">Driver</th>
                <th class="px-3 py-3">Daily status report</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="driver in filteredDrivers" :key="driver.driverId" class="border-b last:border-0">
                <td class="px-3 py-3 align-top">
                  <Checkbox
                    :model-value="selectedDriverIds.has(driver.driverId)"
                    @update:model-value="toggleDriver(driver.driverId)"
                  />
                </td>
                <td class="px-3 py-3 align-top">
                  <div class="font-medium text-foreground">{{ driver.driverName }}</div>
                  <div class="mt-1 text-xs text-muted-foreground">{{ driver.externalDriverId }}</div>
                  <div v-if="driver.error" class="mt-1 max-w-72 text-xs text-destructive">
                    {{ driver.error }}
                  </div>
                </td>
                <td class="px-3 py-3">
                  <div class="flex flex-wrap gap-1.5">
                    <span
                      v-for="day in driver.days"
                      :key="day.logDate"
                      :title="dayTitle(day)"
                      class="inline-flex min-w-36 flex-col gap-1 rounded border px-2 py-1.5 text-[11px]"
                      :class="dayClass(day)"
                    >
                      <span class="text-center font-semibold">{{ formatShortDate(day.logDate) }}</span>
                      <span class="flex items-center justify-between gap-2">
                        <span class="text-muted-foreground">Profile form</span>
                        <span :class="profileFormStatusClass(day.hasProfileForm)" class="font-medium">
                          {{ profileFormStatusLabel(day.hasProfileForm) }}
                        </span>
                      </span>
                      <span class="flex items-center justify-between gap-2">
                        <span class="text-muted-foreground">Certification</span>
                        <span :class="certificationStatusClass(day)" class="font-medium">
                          {{ certificationStatusLabel(day) }}
                        </span>
                      </span>
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="emit('update:open', false)">Close</Button>
          <Button
            :disabled="starting || loading || !!rangeError || selectedDriverIds.size === 0"
            @click="startCertification"
          >
            <LoaderCircle v-if="starting" class="mr-2 h-4 w-4 animate-spin" />
            Certify selected drivers
          </Button>
        </DialogFooter>
      </template>

      <template v-else>
        <div class="min-h-0 flex-1 overflow-auto rounded-md border border-border">
          <div v-if="historyLoading" class="p-10 text-center text-sm text-muted-foreground">
            Loading certification history…
          </div>
          <div v-else-if="!history.length" class="p-10 text-center text-sm text-muted-foreground">
            No company certification runs yet.
          </div>
          <div v-else class="divide-y divide-border">
            <template v-for="batch in history" :key="batch.id">
              <button
                type="button"
                class="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                :class="historyBatch?.id === batch.id && 'bg-muted/40'"
                :aria-expanded="historyBatch?.id === batch.id"
                @click="toggleBatch(batch.id)"
              >
                <div class="min-w-0 flex-1">
                  <div class="text-sm font-medium text-foreground">
                    {{ formatDate(batch.fromDate) }} – {{ formatDate(batch.toDate) }}
                  </div>
                  <div class="mt-1 text-xs text-muted-foreground">
                    {{ formatTimestamp(batch.createdAt) }} · {{ batch.completedDrivers }}/{{ batch.totalDrivers }} drivers
                  </div>
                </div>
                <span :class="statusClass(batch.status)" class="rounded border px-2 py-1 text-xs font-semibold">
                  {{ statusLabel(batch.status) }}
                </span>
                <LoaderCircle
                  v-if="historyBatchLoadingId === batch.id"
                  class="h-4 w-4 animate-spin text-muted-foreground"
                />
                <ChevronRight
                  v-else
                  class="h-4 w-4 text-muted-foreground transition-transform"
                  :class="historyBatch?.id === batch.id && 'rotate-90'"
                />
              </button>

              <div v-if="historyBatch?.id === batch.id" class="bg-muted/10 px-4 pb-4">
                <div class="rounded-md border border-border bg-background p-3">
                  <div class="mb-2 flex items-center justify-between">
                    <div class="text-sm font-semibold">Run details</div>
                    <Button variant="ghost" size="sm" @click="historyBatch = null">Hide</Button>
                  </div>
                  <details
                    v-for="driver in historyBatch.drivers"
                    :key="driver.id"
                    class="border-t py-2 first:border-0"
                  >
                    <summary class="cursor-pointer text-sm font-medium">
                      {{ driver.driverName }} · {{ statusLabel(driver.status) }}
                    </summary>
                    <div class="mt-2 space-y-2 pl-3">
                      <div v-for="day in driver.days" :key="day.logDate" class="rounded border p-2 text-xs">
                        <div class="flex items-center justify-between gap-2">
                          <span class="font-medium">{{ formatDate(day.logDate) }}</span>
                          <span :class="statusClass(day.status)" class="rounded border px-1.5 py-0.5 font-semibold">
                            {{ statusLabel(day.status) }}
                          </span>
                        </div>
                        <div class="mt-2 grid grid-cols-[minmax(6rem,1fr)_minmax(5rem,auto)_minmax(5rem,auto)] gap-x-3 gap-y-1.5 rounded bg-muted/30 p-2">
                          <span></span>
                          <span class="text-center text-muted-foreground">Before</span>
                          <span class="text-center text-muted-foreground">After</span>
                          <span class="text-muted-foreground">Profile form</span>
                          <span :class="itemStatusClass(day.profileFormBeforeStatus)" class="text-center font-medium">
                            {{ profileFormHistoryLabel(day.profileFormBeforeStatus) }}
                          </span>
                          <span :class="itemStatusClass(day.profileFormAfterStatus)" class="text-center font-medium">
                            {{ profileFormHistoryLabel(day.profileFormAfterStatus) }}
                          </span>
                          <span class="text-muted-foreground">Certification</span>
                          <span :class="itemStatusClass(day.certificationBeforeStatus)" class="text-center font-medium">
                            {{ certificationHistoryLabel(day.certificationBeforeStatus) }}
                          </span>
                          <span :class="itemStatusClass(day.certificationAfterStatus)" class="text-center font-medium">
                            {{ certificationHistoryLabel(day.certificationAfterStatus) }}
                          </span>
                        </div>
                        <div v-for="action in day.actions" :key="`${action.type}:${action.eventId}`" class="mt-1 text-muted-foreground">
                          {{ action.succeeded ? '✓' : '×' }} {{ action.message }}
                          <span v-if="action.error" class="text-destructive"> {{ action.error }}</span>
                        </div>
                        <div v-if="day.error" class="mt-1 text-destructive">{{ day.error }}</div>
                      </div>
                    </div>
                  </details>
                </div>
              </div>
            </template>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="emit('update:open', false)">Close</Button>
        </DialogFooter>
      </template>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { CalendarDate } from '@internationalized/date'
import {
  Calendar as CalendarIcon,
  ChevronRight,
  History,
  LoaderCircle,
  RefreshCw,
  Search,
} from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { ApiEndpoints } from '@/api/endpoints'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { RangeCalendar } from '@/components/ui/range-calendar'
import { getApiErrorMessage, useApi } from '@/composables/useAxiosService'
import { useCompanyCertificationProgress } from '../../composables/useCompanyCertificationProgress'
import type {
  CompanyCertificationBatch,
  CompanyCertificationDayPreview,
  CompanyCertificationItemStatus,
  CompanyCertificationPreview,
} from '../types/companyCertification'

const props = defineProps<{ open: boolean; companyId: string }>()
const emit = defineEmits<{ (event: 'update:open', value: boolean): void }>()
const api = useApi()
const certificationProgress = useCompanyCertificationProgress()
certificationProgress.initialize()

const current = new Date()
const start = new Date(current)
start.setDate(start.getDate() - 8)
const dateRange = ref<any>({
  start: new CalendarDate(start.getFullYear(), start.getMonth() + 1, start.getDate()),
  end: new CalendarDate(current.getFullYear(), current.getMonth() + 1, current.getDate()),
})
const calendarOpen = ref(false)
const loading = ref(false)
const starting = ref(false)
const preview = ref<CompanyCertificationPreview | null>(null)
const selectedDriverIds = ref(new Set<string>())
const search = ref('')
const view = ref<'repair' | 'history'>('repair')
const history = ref<CompanyCertificationBatch[]>([])
const historyLoading = ref(false)
const historyBatch = ref<CompanyCertificationBatch | null>(null)
const historyBatchLoadingId = ref<string | null>(null)
const activeBatch = computed(() =>
  Object.values(certificationProgress.batches.value)
    .filter((batch) => batch.companyId === props.companyId)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0] ?? null
)

const fromDate = computed(() => calendarDateToString(dateRange.value?.start))
const toDate = computed(() => calendarDateToString(dateRange.value?.end ?? dateRange.value?.start))
const rangeLabel = computed(() =>
  fromDate.value && toDate.value
    ? `${formatDate(fromDate.value)} – ${formatDate(toDate.value)}`
    : 'Select a date range'
)
const rangeError = computed(() => {
  if (!fromDate.value || !toDate.value) return 'Select a date range.'
  const days = Math.round(
    (new Date(`${toDate.value}T00:00:00`).getTime() - new Date(`${fromDate.value}T00:00:00`).getTime()) /
      86_400_000
  )
  if (days < 0) return 'The end date must be after the start date.'
  if (days > 30) return 'Select no more than 31 days.'
  const tomorrow = new Date()
  tomorrow.setHours(0, 0, 0, 0)
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (new Date(`${toDate.value}T00:00:00`) >= tomorrow) return 'The range cannot include future dates.'
  return null
})
const filteredDrivers = computed(() => {
  const query = search.value.trim().toLowerCase()
  const drivers = preview.value?.drivers ?? []
  if (!query) return drivers
  return drivers.filter(
    (driver) =>
      driver.driverName.toLowerCase().includes(query) ||
      driver.externalDriverId.toLowerCase().includes(query)
  )
})
const allDriversSelectionState = computed<boolean | 'indeterminate'>(() => {
  const drivers = preview.value?.drivers ?? []
  if (!drivers.length || selectedDriverIds.value.size === 0) return false
  if (drivers.every((driver) => selectedDriverIds.value.has(driver.driverId))) return true
  return 'indeterminate'
})
watch(
  () => props.open,
  (open) => {
    if (!open) return
    view.value = 'repair'
    void loadPreview()
  }
)

async function loadPreview() {
  if (rangeError.value || !props.companyId) return
  loading.value = true
  try {
    const response = await api.post<{ successResult: CompanyCertificationPreview }>(
      ApiEndpoints.ROUTE_ELD_COMPANY_CERTIFICATION_PREVIEW,
      { companyId: props.companyId, fromDate: fromDate.value, toDate: toDate.value }
    )
    preview.value = response.data.successResult
    // selectedDriverIds.value = new Set(preview.value.drivers.map((driver) => driver.driverId))
  } catch (error) {
    toast.error(getApiErrorMessage(error, 'Could not load company certification statuses.'))
  } finally {
    loading.value = false
  }
}

async function startCertification() {
  if (rangeError.value || selectedDriverIds.value.size === 0) return
  starting.value = true
  try {
    const response = await api.post<{ successResult: CompanyCertificationBatch }>(
      ApiEndpoints.ROUTE_ELD_COMPANY_CERTIFICATION_FIXES,
      {
        companyId: props.companyId,
        fromDate: fromDate.value,
        toDate: toDate.value,
        driverIds: [...selectedDriverIds.value],
      },
      { _successMessage: 'Company certification fix was queued.' }
    )
    certificationProgress.track(response.data.successResult)
  } catch (error) {
    toast.error(getApiErrorMessage(error, 'Could not start the company certification fix.'))
  } finally {
    starting.value = false
  }
}

async function showHistory() {
  view.value = 'history'
  historyLoading.value = true
  try {
    const response = await api.get<{ successResult: CompanyCertificationBatch[] }>(
      ApiEndpoints.ROUTE_ELD_COMPANY_CERTIFICATION_FIXES,
      { params: { companyId: props.companyId } }
    )
    history.value = response.data.successResult ?? []
  } catch (error) {
    toast.error(getApiErrorMessage(error, 'Could not load certification history.'))
  } finally {
    historyLoading.value = false
  }
}

async function toggleBatch(id: string) {
  if (historyBatch.value?.id === id) {
    historyBatch.value = null
    return
  }

  historyBatchLoadingId.value = id
  try {
    const response = await api.get<{ successResult: CompanyCertificationBatch }>(
      ApiEndpoints.ROUTE_ELD_COMPANY_CERTIFICATION_FIX(id)
    )
    historyBatch.value = response.data.successResult
  } catch (error) {
    toast.error(getApiErrorMessage(error, 'Could not load certification run details.'))
  } finally {
    if (historyBatchLoadingId.value === id) historyBatchLoadingId.value = null
  }
}

function toggleDriver(id: string) {
  const next = new Set(selectedDriverIds.value)
  next.has(id) ? next.delete(id) : next.add(id)
  selectedDriverIds.value = next
}

function toggleAllDrivers(value: boolean | 'indeterminate') {
  selectedDriverIds.value = value === true
    ? new Set((preview.value?.drivers ?? []).map((driver) => driver.driverId))
    : new Set()
}

function calendarDateToString(value: any): string {
  if (!value) return ''
  return `${value.year}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`
}

function formatDate(value: string) {
  const [year, month, day] = value.split('-')
  return `${month}/${day}/${year}`
}

function formatShortDate(value: string) {
  const [, month, day] = value.split('-')
  return `${month}/${day}`
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function profileFormStatusLabel(hasProfileForm: boolean) {
  return hasProfileForm ? 'Available' : 'Missing'
}

function profileFormStatusClass(hasProfileForm: boolean) {
  return hasProfileForm ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
}

function certificationStatusLabel(day: CompanyCertificationDayPreview) {
  if (!day.hasProfileForm) return 'Unavailable'
  return day.isSigned ? 'Signed' : 'Not signed'
}

function certificationStatusClass(day: CompanyCertificationDayPreview) {
  if (!day.hasProfileForm) return 'text-muted-foreground'
  if (day.isSigned) return 'text-emerald-600 dark:text-emerald-400'
  return 'text-amber-600 dark:text-amber-400'
}

function profileFormHistoryLabel(status: CompanyCertificationItemStatus) {
  return status === 'PRESENT' || status === 'VALID' || status === 'INVALID'
    ? 'Available'
    : 'Missing'
}

function certificationHistoryLabel(status: CompanyCertificationItemStatus) {
  return status === 'SIGNED' || status === 'VALID' ? 'Signed' : 'Not signed'
}

function itemStatusClass(status: CompanyCertificationItemStatus) {
  if (status === 'PRESENT' || status === 'SIGNED' || status === 'VALID') {
    return 'text-emerald-600 dark:text-emerald-400'
  }
  if (status === 'NOT_SIGNED' || status === 'INVALID') return 'text-amber-600 dark:text-amber-400'
  return 'text-muted-foreground'
}

function dayTitle(day: CompanyCertificationDayPreview) {
  return `${formatDate(day.logDate)} — Profile form: ${profileFormStatusLabel(day.hasProfileForm)}; Certification: ${certificationStatusLabel(day)}`
}

function dayClass(day: CompanyCertificationDayPreview) {
  if (!day.hasProfileForm) return 'border-border bg-muted/30 text-muted-foreground'
  if (day.isSigned) return 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
  return 'border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300'
}

function statusLabel(status: string) {
  return status.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function statusClass(status: string) {
  if (status === 'SUCCEEDED') return 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
  if (status === 'PARTIALLY_SUCCEEDED') return 'border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300'
  if (status === 'FAILED') return 'border-red-300 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300'
  return 'border-border bg-muted text-muted-foreground'
}

</script>
