<template>
  <div class="min-h-screen bg-white p-[16px_24px]">
    <div class="">
      <!-- Header -->
      <div class="pb-5">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-6">
            <h2 class="text-2xl font-semibold text-[#090909]">DVIR</h2>
            <!-- Search -->
            <div class="relative">
              <Search
                class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
              />
              <Input
                v-model="searchQuery"
                placeholder="Search"
                class="pl-9 w-64 border-border text-foreground"
                :disabled="isLoading"
              />
            </div>
          </div>

          <div class="flex items-center gap-3">
            <!-- Date Range -->
            <Popover v-model:open="isCalendarOpen">
              <PopoverTrigger as-child>
                <Button
                  variant="outline"
                  :disabled="isLoading"
                  :class="
                    cn(
                      'w-64 justify-start text-left font-normal border-border dark:bg-card',
                      !dateRange && 'text-muted-foreground'
                    )
                  "
                >
                  <Calendar class="mr-2 h-4 w-4" />
                  <span>{{ dateRangeDisplay }}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent class="w-auto p-0" align="end">
                <RangeCalendar
                  v-model="calendarValue"
                  :number-of-months="2"
                  @update:model-value="handleDateSelect"
                />
              </PopoverContent>
            </Popover>

            <!-- All vehicles dropdown -->
            <Select v-model="selectedVehicle" :disabled="isLoading">
              <SelectTrigger class="w-40 border-border dark:bg-card">
                <SelectValue placeholder="All vehicles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem :value="null">All vehicles</SelectItem>
                <SelectItem v-for="vehicle in vehicles" :key="vehicle.id" :value="vehicle.id">
                  {{ vehicle.unit || `${vehicle.make} ${vehicle.model}` }}
                </SelectItem>
              </SelectContent>
            </Select>

            <!-- Download Selected Button (shown when rows are selected) -->
            <Button
              v-if="selectedIds.length > 0"
              @click="handleDownloadSelected"
              variant="outline"
              :disabled="isLoading"
              class="border-primary text-primary hover:bg-primary/10"
            >
              <Download class="w-4 h-4 mr-2" />
              Download ({{ selectedIds.length }})
            </Button>

            <!-- Add DVIR Button -->
            <Button
              @click="openAddModal"
              :disabled="isLoading"
              class="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <span class="text-xl mr-1">+</span>
              Add DVIR
            </Button>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div
        v-if="isLoading && paginatedDvirs.length === 0"
        class="flex items-center justify-center py-12"
      >
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="px-6 py-12 text-center">
        <p class="text-destructive">{{ error }}</p>
        <Button @click="fetchDvirs" variant="outline" class="mt-4">Try Again</Button>
      </div>

      <!-- Table -->
      <CDvirTable
        v-else
        :dvirs="paginatedDvirs"
        :sort-key="sortKey"
        :sort-order="sortOrder"
        @sort="handleSort"
        @edit="handleEdit"
        @delete="handleDelete"
        @update:selected="selectedIds = $event"
      />

      <!-- Footer / Pagination -->
      <div
        v-if="paginatedDvirs.length > 0 || totalEntries > 0"
        class="px-6 py-4 border-t border-border flex items-center justify-between"
      >
        <div class="flex items-center gap-3">
          <span class="text-sm text-muted-foreground">Display on page</span>
          <Select v-model="itemsPerPage">
            <SelectTrigger class="w-20 border-border dark:bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem :value="10">10</SelectItem>
              <SelectItem :value="25">25</SelectItem>
              <SelectItem :value="50">50</SelectItem>
              <SelectItem :value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <span class="text-sm text-muted-foreground"> {{ totalEntries }} entries </span>
        </div>

        <div class="flex items-center gap-2">
          <div class="flex items-center gap-1">
            <button
              v-for="page in pageNumbers"
              :key="page"
              @click="typeof page === 'number' && goToPage(page)"
              :disabled="page === '...'"
              :class="[
                'min-w-8 h-8 px-2 text-sm font-medium rounded transition-colors',
                page === currentPage
                  ? 'bg-primary text-primary-foreground'
                  : page === '...'
                    ? 'text-muted-foreground/50 cursor-default'
                    : 'text-foreground hover:bg-accent',
              ]"
            >
              {{ page }}
            </button>
          </div>

          <div class="flex items-center gap-2 ml-4">
            <span class="text-sm text-muted-foreground">
              {{ currentPage }} of {{ totalPages }} pages
            </span>
            <div class="flex gap-1">
              <Button
                @click="previousPage"
                :disabled="currentPage === 1"
                variant="outline"
                size="icon"
                class="h-8 w-8 border-border"
              >
                <ChevronLeft class="w-4 h-4" />
              </Button>
              <Button
                @click="nextPage"
                :disabled="currentPage === totalPages"
                variant="outline"
                size="icon"
                class="h-8 w-8 border-border"
              >
                <ChevronRight class="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Delete Confirm Modal -->
  <Dialog :open="isDeleteConfirmOpen" @update:open="(v) => !v && cancelDelete()">
    <DialogContent class="sm:max-w-sm">
      <DialogHeader>
        <DialogTitle>Delete DVIR</DialogTitle>
        <DialogDescription>
          Are you sure you want to delete this DVIR? This action cannot be undone.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter class="gap-2">
        <Button variant="outline" class="border-border" @click="cancelDelete">Cancel</Button>
        <Button variant="destructive" :disabled="isDeleting" @click="confirmDelete">
          <span v-if="isDeleting" class="flex items-center gap-2">
            <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              />
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Deleting...
          </span>
          <span v-else>Delete</span>
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <!-- Add DVIR Modal -->
  <CDvirModal
    :open="isAddModalOpen"
    :vehicles="vehicles"
    :drivers="drivers"
    :vehicle-defects="vehicleDefects"
    :trailer-defects="trailerDefects"
    :signatures="signatures"
    :dvir-statuses="dvirStatuses"
    :is-loading-vehicles="isLoadingVehicles"
    :is-loading-drivers="isLoadingDrivers"
    :is-loading-defects="isLoadingDefects"
    :is-loading-statuses="isLoadingStatuses"
    :is-loading-signatures="isLoadingSignatures"
    @close="closeAddModal"
    @submit="handleModalSubmit"
    @driver-change="fetchSignaturesByDriver"
  />

  <!-- Edit DVIR Modal -->
  <CDvirModal
    :open="isEditModalOpen"
    mode="edit"
    :edit-dvir="selectedDvir"
    :vehicles="vehicles"
    :drivers="drivers"
    :vehicle-defects="vehicleDefects"
    :trailer-defects="trailerDefects"
    :signatures="signatures"
    :dvir-statuses="dvirStatuses"
    :is-loading-vehicles="isLoadingVehicles"
    :is-loading-drivers="isLoadingDrivers"
    :is-loading-defects="isLoadingDefects"
    :is-loading-statuses="isLoadingStatuses"
    :is-loading-signatures="isLoadingSignatures"
    @close="closeEditModal"
    @update="handleUpdateDvir"
    @driver-change="fetchSignaturesByDriver"
  />
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Search, ChevronLeft, ChevronRight, Calendar, Download } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { RangeCalendar } from '@/components/ui/range-calendar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import CDvirTable from '@/modules/Dvir/components/CDvirTable.vue'
import CDvirModal from '@/modules/Dvir/components/CDvirModal.vue'
import { useDvir } from '@/modules/Dvir/composables/useDvir'
import { getCarrierIdOrThrow } from '@/utils/carrier'
import dayjs from 'dayjs'
import type { DateRange, DateValue } from 'reka-ui'
import { CalendarDate } from '@internationalized/date'
import { cn } from '@/lib/utils'

// Get carrierId from localStorage
const carrierId = getCarrierIdOrThrow()

const {
  // State
  vehicles,
  drivers,
  vehicleDefects,
  trailerDefects,
  signatures,
  dvirStatuses,
  isLoading,
  isLoadingVehicles,
  isLoadingDrivers,
  isLoadingDefects,
  isLoadingSignatures,
  isLoadingStatuses,
  error,

  // Filters
  searchQuery,
  dateRange,
  selectedVehicle,

  // Modal
  isAddModalOpen,
  isEditModalOpen,
  selectedDvir,

  // Sorting
  sortKey,
  sortOrder,

  // Pagination
  currentPage,
  itemsPerPage,
  totalPages,
  totalEntries,
  pageNumbers,
  goToPage,
  nextPage,
  previousPage,

  // Computed
  paginatedDvirs,

  // Functions
  fetchDvirs,
  handleSort,
  openAddModal,
  closeAddModal,
  openEditModal,
  closeEditModal,
  handleCreateDvir,
  handleUpdateDvir,
  downloadDvir,
  deleteDvir,
  fetchSignaturesByDriver,
} = useDvir({
  carrierId: carrierId,
  autoFetch: true,
})

// Selected rows tracking
const selectedIds = ref<string[]>([])

const handleDownloadSelected = async () => {
  for (const id of selectedIds.value) {
    const dvir = paginatedDvirs.value.find((d) => d.id === id)
    if (!dvir?.driverId || !dvir?.vehicleId) continue
    await downloadDvir(dvir.driverId, dvir.vehicleId)
  }
}

// Calendar state
const isCalendarOpen = ref(false)

// Convert Dayjs to CalendarDate
const dayjsToCalendarDate = (date: dayjs.Dayjs): CalendarDate => {
  return new CalendarDate(date.year(), date.month() + 1, date.date())
}

// Convert CalendarDate to Dayjs
const calendarDateToDayjs = (date: DateValue): dayjs.Dayjs => {
  return dayjs(new Date(date.year, date.month - 1, date.day))
}

// Calendar value (DateRange for RangeCalendar)
const calendarValue = computed<DateRange>({
  get: () => {
    if (!dateRange.value || !dateRange.value[0] || !dateRange.value[1]) {
      const now = dayjs()
      const weekAgo = now.subtract(7, 'days')
      return {
        start: dayjsToCalendarDate(weekAgo),
        end: dayjsToCalendarDate(now),
      }
    }
    return {
      start: dayjsToCalendarDate(dateRange.value[0]),
      end: dayjsToCalendarDate(dateRange.value[1]),
    }
  },
  set: (value) => {
    if (value?.start && value?.end) {
      dateRange.value = [calendarDateToDayjs(value.start), calendarDateToDayjs(value.end)]
    }
  },
})

// Handle date selection
const handleDateSelect = (value: DateRange) => {
  if (value?.start && value?.end) {
    // Auto-close when both dates are selected
    isCalendarOpen.value = false
  }
}

// Date range display
const dateRangeDisplay = computed(() => {
  if (!dateRange.value || !dateRange.value[0] || !dateRange.value[1]) {
    return ''
  }
  return `${dateRange.value[0].format('DD.MM.YYYY')} - ${dateRange.value[1].format('DD.MM.YYYY')}`
})

// Watch search query changes
watch(searchQuery, () => {
  // Search is handled in filteredDvirs computed
})

const handleEdit = async (id: string) => {
  await openEditModal(id)
}

// Delete confirm modal state
const isDeleteConfirmOpen = ref(false)
const dvirToDelete = ref<string | null>(null)
const isDeleting = ref(false)

const handleDelete = (id: string) => {
  dvirToDelete.value = id
  isDeleteConfirmOpen.value = true
}

const confirmDelete = async () => {
  if (!dvirToDelete.value) return
  isDeleting.value = true
  await deleteDvir(dvirToDelete.value)
  isDeleting.value = false
  isDeleteConfirmOpen.value = false
  dvirToDelete.value = null
}

const cancelDelete = () => {
  isDeleteConfirmOpen.value = false
  dvirToDelete.value = null
}

const handleModalSubmit = async () => {
  await handleCreateDvir()
}
</script>
