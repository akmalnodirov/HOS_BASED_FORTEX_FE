<template>
  <div class="min-h-screen bg-white p-[16px_24px]">
    <div class="bg-background">
      <!-- Header -->
      <div class="mb-5">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-semibold text-foreground">Activity</h2>

          <div class="flex items-center gap-3">
            <!-- Company Search -->
            <Select v-model="companySearch">
              <SelectTrigger class="w-48 dark:bg-card border-border">
                <SelectValue placeholder="Company search" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="company in companies" :key="company.id" :value="company.id">
                  {{ company.name }}
                </SelectItem>
              </SelectContent>
            </Select>

            <!-- Driver Search -->
            <Select v-model="driverSearch">
              <SelectTrigger class="w-48 dark:bg-card border-border">
                <SelectValue placeholder="Driver search" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="driver in drivers" :key="driver.id" :value="driver.id">
                  {{ driver.name }}
                </SelectItem>
                <div v-if="!drivers.length" class="py-2 px-3 text-sm text-muted-foreground">
                  No drivers
                </div>
              </SelectContent>
            </Select>

            <!-- Date Range -->
            <Popover v-model:open="isCalendarOpen">
              <PopoverTrigger as-child>
                <Button
                  variant="outline"
                  :class="
                    cn(
                      'w-64 justify-start text-left font-normal border-border dark:bg-card text-foreground',
                      !dateRange && 'text-muted-foreground'
                    )
                  "
                >
                  <Calendar class="mr-2 h-4 w-4" />
                  <span>{{ formatDateRange() }}</span>
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

            <!-- Tag Filter -->
            <Select v-model="selectedTag">
              <SelectTrigger class="w-32 dark:bg-card border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="ai">AI</SelectItem>
                <SelectItem value="booster">Booster</SelectItem>
                <SelectItem value="optimize">Optimize</SelectItem>
                <SelectItem value="audit">Audit</SelectItem>
              </SelectContent>
            </Select>

            <!-- Load Button -->
            <Button
              @click="handleLoad"
              :disabled="isLoading"
              class="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <span v-if="!isLoading">Load</span>
              <span v-else class="flex items-center gap-2">
                <svg
                  class="animate-spin h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                  ></circle>
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Loading...
              </span>
            </Button>
          </div>
        </div>
      </div>

      <!-- Error State -->
      <div v-if="error && hasLoaded" class="px-6 py-12 text-center">
        <p class="text-destructive">{{ error }}</p>
      </div>

      <!-- Empty State - Before Load -->
      <div v-else-if="!hasLoaded" class="px-6 py-16 text-center">
        <div class="flex flex-col items-center">
          <div class="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
            <Search class="w-10 h-10 text-muted-foreground" />
          </div>
          <p class="text-lg font-medium text-foreground mb-2">No activities to display</p>
          <p class="text-sm text-muted-foreground">
            Please select filters and click the "Load" button to view activities
          </p>
        </div>
      </div>

      <!-- Table -->
      <ActivityTable
        v-else
        :items="paginatedItems"
        :sort-key="sortKey"
        :sort-order="sortOrder"
        :rollback-loading="rollbackLoading"
        :selected-rollback-id="selectedRollbackId"
        @sort="handleSort"
        @rollback="handleRollback"
        @row-select="handleRowSelect"
      />

      <!-- Footer / Pagination -->
      <div
        v-if="hasLoaded && paginatedItems.length > 0"
        class="px-6 py-4 border-t border-border flex items-center justify-between bg-white dark:bg-card rounded-lg shadow-sm"
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

        <div class="flex items-center gap-4">
          <div class="flex gap-1">
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
                class="h-8 w-8"
              >
                <ChevronLeft class="w-4 h-4" />
              </Button>
              <Button
                @click="nextPage"
                :disabled="currentPage === totalPages"
                variant="outline"
                size="icon"
                class="h-8 w-8"
              >
                <ChevronRight class="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Search, Calendar, ChevronLeft, ChevronRight } from 'lucide-vue-next'
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
import ActivityTable from '@/modules/Tools/Activity/components/CActivityTable.vue'
import { useActivity } from '@/modules/Tools/Activity/composables/useActivity'
import type { ActivityTableItem } from '@/modules/Tools/Activity/types'
import dayjs from 'dayjs'
import type { DateRange, DateValue } from 'reka-ui'
import { CalendarDate } from '@internationalized/date'
import { cn } from '@/lib/utils'

const {
  // State
  isLoading,
  hasLoaded,
  error,
  companies,
  drivers,
  rollbackLoading,
  selectedRollbackId,

  // Filters
  companySearch,
  driverSearch,
  dateRange,
  selectedTag,

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
  paginatedItems,

  // Functions
  handleSort,
  handleLoad,
  rollbackSession,
  rowSelect,
} = useActivity()

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

// Format date range for display
const formatDateRange = () => {
  return `${dateRange.value[0].format('DD.MM.YYYY')} - ${dateRange.value[1].format('DD.MM.YYYY')}`
}

// Handle rollback
const handleRollback = (item: ActivityTableItem) => {
  rollbackSession(item)
}

// Handle row select
const handleRowSelect = (item: ActivityTableItem) => {
  rowSelect(item)
}
</script>
