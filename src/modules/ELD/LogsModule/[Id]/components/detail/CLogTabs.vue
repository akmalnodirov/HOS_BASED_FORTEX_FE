<template>
  <div class="flex items-center justify-between pb-0">
    <Tabs v-model="activeTab" class="w-auto">
      <TabsList class="bg-transparent h-10 lg:h-11 2xl:h-12 p-0 gap-3 lg:gap-4 2xl:gap-6">
        <TabsTrigger
          v-for="tab in tabs"
          :key="tab"
          :value="tab"
          class="px-0 py-0 h-full text-[10px] lg:text-xs 2xl:text-sm text-[#727272] dark:text-muted-foreground font-medium uppercase tracking-wide cursor-pointer rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:text-foreground hover:text-foreground transition-all bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none"
        >
          {{ tab }}
        </TabsTrigger>
      </TabsList>
    </Tabs>

    <div v-if="isBoostPage" class="flex items-center gap-1.5 lg:gap-2 2xl:gap-3 mb-1">
      <div class="flex items-center bg-[#F0F0F0] dark:bg-muted rounded p-1 h-8 lg:h-9 2xl:h-10">
        <button
          v-for="b in ['booster 1', 'booster 2', 'booster 3']"
          :key="b"
          @click="selectedBooster = b"
          :class="[
            'px-2 lg:px-2.5 2xl:px-3 py-1 lg:py-1.5 2xl:py-2 text-[10px] lg:text-xs 2xl:text-sm font-medium rounded-sm transition-all capitalize cursor-pointer',
            selectedBooster === b
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground',
          ]"
        >
          {{ b }}
        </button>
      </div>

      <!-- Search -->
      <Button
        variant="outline"
        size="icon"
        class="h-8 w-8 lg:h-9 lg:w-9 2xl:h-10 2xl:w-10"
        @click="emit('search-click')"
      >
        <Search class="w-3.5 h-3.5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
      </Button>

      <!-- Date Range Picker -->
      <Popover v-model:open="isBoostCalendarOpen">
        <PopoverTrigger as-child>
          <Button
            variant="outline"
            class="h-8 lg:h-9 2xl:h-10 justify-start text-left font-normal px-2 min-w-45 lg:min-w-50 2xl:min-w-55"
          >
            <span
              v-if="boostDateRange && boostDateRange.start"
              class="text-[10px] lg:text-xs 2xl:text-sm"
            >
              {{ formatBoostDate(boostDateRange.start) }} -
              {{
                boostDateRange.end
                  ? formatBoostDate(boostDateRange.end)
                  : formatBoostDate(boostDateRange.start)
              }}
            </span>
            <span v-else class="text-[10px] lg:text-xs 2xl:text-sm text-muted-foreground">Pick a date</span>
            <CalendarIcon class="ml-auto w-3.5 h-3.5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent class="w-auto p-0" align="end">
          <RangeCalendar
            v-model="boostDateRange"
            :number-of-months="2"
            :is-date-disabled="isDateDisabled"
            initial-focus
          />
        </PopoverContent>
      </Popover>

      <!-- Create Button -->
      <Button
        class="h-8 lg:h-9 2xl:h-10 bg-[#111] dark:bg-foreground text-white dark:text-background hover:bg-[#111]/90 text-[10px] lg:text-xs 2xl:text-sm px-3 lg:px-4"
        @click="handleBoostCreate"
      >
        Create
      </Button>
    </div>

    <!-- Default Toolbar (for non-Boost pages) -->
    <div
      v-else-if="route.name === 'ELDLogDetail' || route.name === 'ELDTracking'"
      class="flex items-center gap-1.5 lg:gap-2 2xl:gap-3 pb-2"
    >
      <Popover v-model:open="isCalendarOpen">
        <PopoverTrigger as-child>
          <div
            class="p-1 lg:p-1.5 2xl:p-2 bg-background rounded-lg border border-border shadow-sm cursor-pointer hover:bg-accent transition-colors"
          >
            <CalendarIcon class="w-3.5 h-3.5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-muted-foreground" />
          </div>
        </PopoverTrigger>
        <PopoverContent class="w-auto p-0" align="end">
          <div class="p-4 space-y-3">
            <div class="space-y-2">
              <Calendar v-model="selectedDate" :columns="1" :is-date-disabled="isDateDisabled" />
            </div>
            <div class="flex gap-2">
              <Button variant="outline" size="sm" class="flex-1" @click="handleCancel">
                Cancel
              </Button>
              <Button size="sm" class="flex-1" @click="handleApply"> Apply </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      <div class="flex items-center gap-1 lg:gap-1.5 2xl:gap-2">
        <button
          v-for="(violation, ind) in weeklyViolations"
          :key="ind"
          class="cursor-pointer!"
          :class="[
            'px-2 lg:px-2.5 2xl:px-3 py-1 lg:py-1.5 2xl:py-2 text-[10px] lg:text-xs 2xl:text-sm font-medium rounded-md transition-all whitespace-nowrap border',
            getButtonClass(violation),
          ]"
          @click="handleDateClick(violation.dateOfViolations)"
        >
          {{ formatTime(violation.dateOfViolations, 'MMM D') }}
        </button>
        <button
          class="cursor-pointer! p-1 lg:p-1.5 2xl:p-2 bg-background rounded-md border border-border shadow-sm hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-background"
          @click="handlePreviousWeek"
          :disabled="!headerDate"
        >
          <ChevronLeft class="w-3.5 h-3.5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-foreground" />
        </button>
        <button
          class="p-1 lg:p-1.5 2xl:p-2 bg-background rounded-md border border-border shadow-sm cursor-pointer! hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-background"
          @click="handleNextWeek"
          :disabled="isNextWeekDisabled"
        >
          <ChevronRight class="w-3.5 h-3.5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-foreground" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Search } from 'lucide-vue-next'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { RangeCalendar } from '@/components/ui/range-calendar'
import { Button } from '@/components/ui/button'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import type { WeeklyViolationResponse } from '../../types/chart.ts'
import type { DateValue } from 'reka-ui'
import { CalendarDate } from '@internationalized/date'

// Define props
interface Props {
  weeklyViolations: WeeklyViolationResponse[]
  headerDate: Dayjs
  updateHeaderDate: (date?: Dayjs) => Promise<void>
  fetchWeeklyViolations: (startDate: string, endDate: string) => Promise<void>
  acceptAsTimeZone: (date: string | Dayjs) => Dayjs
  compareDates: (date1: any, date2: any) => boolean
  formatTime: (date: any, format: string) => string
  formatToUTC: (date: string | Dayjs) => string
  getStartOf: (date?: Dayjs | string | null) => Dayjs
  getEndOf: (date?: string | Dayjs | null) => Dayjs
  subtract: (
    date: Dayjs,
    amount: number,
    unit: 'second' | 'minute' | 'hour' | 'day' | 'week'
  ) => Dayjs
  add: (date: Dayjs, amount: number, unit: 'second' | 'minute' | 'hour' | 'day' | 'week') => Dayjs
}

const props = defineProps<Props>()

const router = useRouter()
const route = useRoute()

const tabs = [
  'ALL',
  'AI',
  'BOOST',
  'TRACKING',
  // 'HISTORY'
]
const activeTab = ref('ALL')

const isBoostPage = computed(() => route.name === 'ELDBoost')

const getActiveTabFromRoute = (): string => {
  if (route.query.tab === 'history') {
    return 'HISTORY'
  }
  switch (route.name) {
    case 'ELDBoost':
      return 'BOOST'
    case 'ELDTracking':
      return 'TRACKING'
    case 'ELDInsertInfoLog':
      return 'INSERT INFO LOG'
    case 'ELDLogDetail':
    default:
      return 'ALL'
  }
}

watch(
  [() => route.name, () => route.query.tab],
  () => {
    activeTab.value = getActiveTabFromRoute()
  },
  { immediate: true }
)

const emit = defineEmits<{
  (e: 'history-toggle', isHistory: boolean): void
  (e: 'search-click'): void
  (e: 'boost-create-click', fromDate: Dayjs, toDate: Dayjs): void
}>()

watch(activeTab, (newTab, oldTab) => {
  if (newTab === oldTab) return

  const currentTab = getActiveTabFromRoute()
  if (newTab === currentTab) return

  const driverId = route.params.id
  const dateParam = props.headerDate?.format('YYYY-MM-DD')

  switch (newTab) {
    case 'BOOST':
      if (driverId && route.name !== 'ELDBoost') {
        router.push({
          name: 'ELDBoost',
          params: { id: driverId },
          query: dateParam ? { date: dateParam } : undefined,
        })
      }
      break

    // case 'HISTORY':
    //   if (route.query.tab === 'history') {
    //     router.push({
    //       name: 'ELDLogDetail',
    //       params: { id: driverId },
    //       query: dateParam ? { date: dateParam } : undefined,
    //     })
    //     emit('history-toggle', false)
    //   } else {
    //     router.push({
    //       name: 'ELDLogDetail',
    //       params: { id: driverId },
    //       query: { ...route.query, tab: 'history' },
    //     })
    //     emit('history-toggle', true)
    //   }
    //   break

    case 'TRACKING':
      if (driverId && route.name !== 'ELDTracking') {
        router.push({
          name: 'ELDTracking',
          params: { id: driverId },
          query: dateParam ? { date: dateParam } : undefined,
        })
      }
      break

    case 'INSERT INFO LOG':
      if (driverId && route.name !== 'ELDInsertInfoLog') {
        router.push({
          name: 'ELDInsertInfoLog',
          params: { id: driverId },
          query: dateParam ? { date: dateParam } : undefined,
        })
      }
      break

    case 'ALL':
      if (route.name !== 'ELDLogDetail' || route.query.tab === 'history') {
        router.push({
          name: 'ELDLogDetail',
          params: { id: driverId },
          query: dateParam ? { date: dateParam } : undefined,
        })
        emit('history-toggle', false)
      }
      break
  }
})

const isCalendarOpen = ref(false)

const selectedBooster = ref('booster 1')
const isBoostCalendarOpen = ref(false)

const getInitialBoostRange = () => {
  const fromQuery = route.query.fromDate ? dayjs(String(route.query.fromDate)) : null
  const toQuery = route.query.toDate ? dayjs(String(route.query.toDate)) : null
  if (fromQuery?.isValid() && toQuery?.isValid()) {
    return {
      start: new CalendarDate(fromQuery.year(), fromQuery.month() + 1, fromQuery.date()),
      end: new CalendarDate(toQuery.year(), toQuery.month() + 1, toQuery.date()),
    }
  }
  const today = dayjs()
  const tenDaysAgo = today.subtract(9, 'day')
  return {
    start: new CalendarDate(tenDaysAgo.year(), tenDaysAgo.month() + 1, tenDaysAgo.date()),
    end: new CalendarDate(today.year(), today.month() + 1, today.date()),
  }
}

const boostDateRange = ref<any>(getInitialBoostRange())

watch([() => route.query.fromDate, () => route.query.toDate], ([fromDate, toDate]) => {
  if (!isBoostPage.value || !fromDate || !toDate) return
  const from = dayjs(String(fromDate))
  const to = dayjs(String(toDate))
  if (from.isValid() && to.isValid()) {
    boostDateRange.value = {
      start: new CalendarDate(from.year(), from.month() + 1, from.date()),
      end: new CalendarDate(to.year(), to.month() + 1, to.date()),
    }
  }
})

const handleBoostCreate = () => {
  if (!boostDateRange.value?.start || !boostDateRange.value?.end) return
  emit(
    'boost-create-click',
    calendarDateToDayjs(boostDateRange.value.start),
    calendarDateToDayjs(boostDateRange.value.end)
  )
}

watch(boostDateRange, (newRange) => {
  if (newRange?.start && newRange?.end) {
    isBoostCalendarOpen.value = false
  }
})

function formatBoostDate(date: any) {
  if (!date) return ''
  return `${String(date.day).padStart(2, '0')}.${String(date.month).padStart(2, '0')}.${date.year}`
}

const dayjsToCalendarDate = (date: Dayjs): CalendarDate => {
  return new CalendarDate(date.year(), date.month() + 1, date.date())
}

const calendarDateToDayjs = (date: DateValue | any): Dayjs => {
  return dayjs(new Date(date.year, date.month - 1, date.day))
}

const isDateDisabled = (date: DateValue | any): boolean => {
  const today = dayjs().startOf('day')
  const dateToCheck = dayjs(new Date(date.year, date.month - 1, date.day)).startOf('day')
  return dateToCheck.isAfter(today)
}

const selectedDate = ref<any>(undefined)

watch(
  () => props.headerDate,
  (newDate) => {
    if (newDate) {
      selectedDate.value = dayjsToCalendarDate(newDate)
    }
  },
  { immediate: true }
)

const getButtonClass = (violation: WeeklyViolationResponse) => {
  const hasViolations = violation.violations && violation.violations.length > 0
  const isSelected = props.compareDates(violation.dateOfViolations, props.headerDate)

  if (isSelected) {
    return 'bg-foreground text-background border-foreground shadow-sm'
  } else if (hasViolations) {
    return 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20'
  } else {
    return 'bg-background text-muted-foreground border-border hover:bg-accent hover:text-foreground'
  }
}

const handleDateClick = async (date: string | Dayjs) => {
  const selectedDate = props.acceptAsTimeZone(date)
  await props.updateHeaderDate(selectedDate)
}

const handleCancel = () => {
  if (props.headerDate) {
    selectedDate.value = dayjsToCalendarDate(props.headerDate)
  } else {
    selectedDate.value = undefined
  }
  isCalendarOpen.value = false
}

const isNextWeekDisabled = computed(() => {
  if (!props.headerDate) return true

  const yesterday = dayjs().subtract(1, 'day').startOf('day')
  const headerDateDayjs = props.headerDate.startOf('day')
  return headerDateDayjs.isSame(yesterday) || headerDateDayjs.isAfter(yesterday)
})

const handlePreviousWeek = async () => {
  if (!props.headerDate) return

  const previousDay = props.subtract(props.headerDate, 1, 'day')

  const rawEndDate = props.add(previousDay, 2, 'day')
  const yesterday = dayjs().subtract(1, 'day')
  const endDate = rawEndDate.isAfter(yesterday) ? yesterday : rawEndDate

  const startDate = props.subtract(previousDay, 6, 'day')

  const startDateUTC = props.formatToUTC(props.getStartOf(startDate))
  const endDateUTC = props.formatToUTC(props.getEndOf(endDate))

  await props.updateHeaderDate(previousDay)

  await props.fetchWeeklyViolations(startDateUTC, endDateUTC)
}

const handleNextWeek = async () => {
  if (!props.headerDate) return
  if (isNextWeekDisabled.value) return

  const nextDay = props.add(props.headerDate, 1, 'day')

  const rawEndDate = props.add(nextDay, 2, 'day')
  const yesterday = dayjs().subtract(1, 'day')
  const endDate = rawEndDate.isAfter(yesterday) ? yesterday : rawEndDate

  const startDate = props.subtract(nextDay, 6, 'day')

  const startDateUTC = props.formatToUTC(props.getStartOf(startDate))
  const endDateUTC = props.formatToUTC(props.getEndOf(endDate))

  await props.updateHeaderDate(nextDay)

  await props.fetchWeeklyViolations(startDateUTC, endDateUTC)
}

const handleApply = async () => {
  if (!selectedDate.value) return

  const selected = props.acceptAsTimeZone(calendarDateToDayjs(selectedDate.value))
  const endDate = props.add(selected, 2, 'day')
  const startDate = props.subtract(selected, 6, 'day')

  const startDateUTC = props.formatToUTC(props.getStartOf(startDate))
  const endDateUTC = props.formatToUTC(props.getEndOf(endDate))

  await props.updateHeaderDate(selected)
  await props.fetchWeeklyViolations(startDateUTC, endDateUTC)

  isCalendarOpen.value = false
}
</script>
