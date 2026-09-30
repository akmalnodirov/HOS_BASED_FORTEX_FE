<template>
  <div class="min-h-screen bg-white p-[16px_24px]">
    <!-- Reassign Modal -->
    <CUnidentifiedReassignModal
      v-model:open="reassignModal"
      :drivers="driverListFiltered"
      :selected-driver="selectedDriver"
      :search-query="searchDriver"
      :loading="loading"
      @update:search-query="searchDriver = $event"
      @select-driver="selectReassignedDriver"
      @submit="submitReassignDriver"
    />

    <!-- Status Modal -->
    <CUnidentifiedClaimModal
      v-model:open="statusModal"
      :events="filteredEvents"
      :selected-status="selectedStatus"
      :loading="loading"
      @update:selected-status="selectedStatus = $event"
      @submit="submitSelectDrivingStatus"
    />

    <!-- Delete Modal -->
    <CUnidentifiedDeleteModal
      v-model:open="deleteModal"
      :count="selectedRowsCount"
      :loading="loading"
      @confirm="deleteEvents"
    />

    <!-- Header -->
    <div class="flex items-center justify-between mb-3">
      <h1 class="text-2xl font-semibold text-[#1A1A1A] dark:text-foreground">Unidentified</h1>

      <div class="flex items-center gap-2">
        <!-- Delete Button -->
        <Button
          variant="outline"
          size="icon"
          class="w-10 h-10 border-[#E5E7EB]"
          :disabled="!selectedRows.length"
          @click="deleteModal = true"
        >
          <Trash2 class="w-4 h-4 text-[#666666]" />
        </Button>

        <!-- Date Range Picker -->
        <Popover v-model:open="isCalendarOpen">
          <PopoverTrigger as-child>
            <Button
              variant="outline"
              :class="
                cn(
                  'w-[200px] justify-between text-left font-normal border-[#E5E7EB] bg-white',
                  !startDate && !endDate ? 'text-[#B5B5B5]' : 'text-[#666666]'
                )
              "
            >
              <span class="text-sm truncate">{{ displayDateRange }}</span>
              <CalendarIcon class="w-4 h-4 ml-2 shrink-0" />
            </Button>
          </PopoverTrigger>
          <PopoverContent class="w-auto p-0 border-border" align="end">
            <RangeCalendar
              v-model="calendarValue"
              :number-of-months="2"
              @update:model-value="handleDateSelect"
            />
          </PopoverContent>
        </Popover>

        <!-- Vehicle Select -->
        <Select v-model="selectedVehicle">
          <SelectTrigger class="w-[200px] border-[#E5E7EB] bg-white text-[#666666]">
            <SelectValue placeholder="Vehicle" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Vehicles</SelectItem>
            <SelectItem v-for="v in vehicles" :key="v.id" :value="v.id">
              {{ v.unit }}
            </SelectItem>
          </SelectContent>
        </Select>

        <!-- Assign Button -->
        <Button
          :disabled="disableReassign"
          class="bg-[#1A1A1A] hover:bg-[#1A1A1A]/90 text-white px-8 h-10 font-medium"
          @click="reassignModal = true"
        >
          Assign
        </Button>
      </div>
    </div>

    <!-- Table -->
    <CUnidentifiedTable
      :rows="rows"
      :selected-rows="selectedRows"
      :is-loading="loading"
      @select-row="tableRowSelect"
      @select-all="toggleSelectAll"
      @edit-status="openSelectDrivingStatus"
    />

    <!-- Footer -->
    <div class="mt-6 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <span class="text-sm font-medium text-[#666666]">Display on page</span>
        <Select v-model="itemsPerPage">
          <SelectTrigger class="w-20 border-[#E5E7EB]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem :value="10">10</SelectItem>
            <SelectItem :value="25">25</SelectItem>
            <SelectItem :value="50">50</SelectItem>
          </SelectContent>
        </Select>
        <span class="text-sm font-medium text-[#B5B5B5]">{{ totalEntries }} entries</span>
      </div>

      <div class="flex items-center gap-8">
        <!-- Page Numbers -->
        <div class="flex items-center gap-1">
          <Button
            v-for="page in pageNumbers"
            :key="page"
            variant="ghost"
            class="w-8 h-8 p-0 text-sm font-medium"
            :class="[
              page === currentPage
                ? 'text-[#1A1A1A] font-bold underline underline-offset-4'
                : 'text-[#666666] hover:text-[#1A1A1A]',
            ]"
            @click="typeof page === 'number' && goToPage(page)"
          >
            {{ page }}
          </Button>
        </div>

        <!-- Pagination Summary -->
        <div class="flex items-center gap-4">
          <span class="text-sm font-medium text-[#666666]">
            {{ currentPage }} of {{ totalPages }} pages
          </span>
          <div class="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              class="w-8 h-8 text-[#666666]"
              :disabled="currentPage === 1"
              @click="previousPage"
            >
              <ArrowLeft class="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              class="w-8 h-8 text-[#666666]"
              :disabled="currentPage === totalPages"
              @click="nextPage"
            >
              <ArrowRight class="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Trash2, Calendar as CalendarIcon, ArrowLeft, ArrowRight } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { RangeCalendar } from '@/components/ui/range-calendar'
import CUnidentifiedTable from '../components/CUnidentifiedTable.vue'
import CUnidentifiedClaimModal from '../components/CUnidentifiedClaimModal.vue'
import CUnidentifiedReassignModal from '../components/CUnidentifiedReassignModal.vue'
import CUnidentifiedDeleteModal from '../components/CUnidentifiedDeleteModal.vue'
import { useUnidentified } from '../composables/useUnidentified'
import { formatTime } from '@/utils/time'
import { cn } from '@/lib/utils'
import type { DateRange } from 'reka-ui'
import { CalendarDate } from '@internationalized/date'
import dayjs from 'dayjs'

const {
  // State
  loading,
  startDate,
  endDate,
  selectedVehicle,
  selectedDriver,
  selectedStatus,

  // Modals
  reassignModal,
  statusModal,
  deleteModal,

  // Driver search
  searchDriver,
  driverListFiltered,

  // Data
  rows,
  vehicles,
  filteredEvents,

  // Selection
  selectedRows,
  selectedRowsCount,
  disableReassign,
  tableRowSelect,
  toggleSelectAll,

  // Pagination
  currentPage,
  itemsPerPage,
  totalPages,
  totalEntries,
  pageNumbers,
  goToPage,
  nextPage,
  previousPage,

  // Actions
  selectReassignedDriver,
  submitReassignDriver,
  openSelectDrivingStatus,
  submitSelectDrivingStatus,
  deleteEvents,
} = useUnidentified()

const isCalendarOpen = ref(false)

const calendarValue = computed<DateRange>({
  get: () => ({
    start: startDate.value
      ? new CalendarDate(
          startDate.value.year(),
          startDate.value.month() + 1,
          startDate.value.date()
        )
      : undefined,
    end: endDate.value
      ? new CalendarDate(endDate.value.year(), endDate.value.month() + 1, endDate.value.date())
      : undefined,
  }),
  set: (value) => {
    startDate.value = value?.start
      ? dayjs(new Date(value.start.year, value.start.month - 1, value.start.day))
      : null
    endDate.value = value?.end
      ? dayjs(new Date(value.end.year, value.end.month - 1, value.end.day))
      : null
  },
})

const displayDateRange = computed(() => {
  if (!startDate.value && !endDate.value) return 'Date range'
  const start = startDate.value ? formatTime(startDate.value, 'D MMM') : '—'
  const end = endDate.value ? formatTime(endDate.value, 'D MMM') : '—'
  return `${start} – ${end}`
})

const handleDateSelect = (value: DateRange | undefined) => {
  if (value?.start && value?.end) {
    isCalendarOpen.value = false
  }
}
</script>
