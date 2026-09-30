<template>
  <div class="rounded-lg border border-border bg-card p-4 space-y-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-1.5 lg:gap-2 2xl:gap-3">
        <!-- Calendar Popover -->
        <Popover v-model:open="isCalendarOpen">
          <PopoverTrigger as-child>
            <div
              class="p-1 lg:p-1.5 2xl:p-2 bg-background rounded-lg border border-border shadow-sm cursor-pointer hover:bg-accent transition-colors"
            >
              <CalendarDays class="w-3.5 h-3.5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-muted-foreground" />
            </div>
          </PopoverTrigger>
          <PopoverContent class="w-auto p-0" align="start">
            <div class="p-4 space-y-3">
              <Calendar v-model="selectedDate" :columns="1" />
              <div class="flex gap-2">
                <Button variant="outline" size="sm" class="flex-1" @click="handleCalendarCancel">
                  Cancel
                </Button>
                <Button size="sm" class="flex-1" @click="handleCalendarApply">
                  Apply
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <!-- Violation date buttons -->
        <div class="flex items-center gap-1 lg:gap-1.5 2xl:gap-2">
          <button
            v-for="(violation, ind) in weeklyViolations"
            :key="ind"
            class="cursor-pointer!"
            :class="[
              'px-2 lg:px-2.5 2xl:px-3 py-1 lg:py-1.5 2xl:py-2 text-[10px] lg:text-xs 2xl:text-sm font-medium rounded-md transition-all whitespace-nowrap border',
              getButtonClass(violation),
            ]"
            @click="emit('dateSelect', violation.dateOfViolations)"
          >
            {{ formatViolationDate(violation.dateOfViolations) }}
          </button>

          <!-- Prev / Next day buttons -->
          <button
            class="cursor-pointer! p-1 lg:p-1.5 2xl:p-2 bg-background rounded-md border border-border shadow-sm hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-background"
            @click="emit('prevDay')"
          >
            <ChevronLeft class="w-3.5 h-3.5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-foreground" />
          </button>
          <button
            class="p-1 lg:p-1.5 2xl:p-2 bg-background rounded-md border border-border shadow-sm cursor-pointer! hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-background"
            :disabled="isToday"
            @click="emit('nextDay')"
          >
            <ChevronRight class="w-3.5 h-3.5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-foreground" />
          </button>
        </div>
      </div>
    </div>

    <Separator />

    <!-- Chart container -->
    <div ref="chartContainer" class="w-full">
      <MainChart
        v-if="chartData"
        :chart-data="chartData"
        :daily-summary="dailySummary"
        :violations="pixelViolations"
        @container:update="onContainerUpdate"
      />
      <div v-else class="flex items-center justify-center h-32 text-muted-foreground">
        Loading chart...
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { CalendarDate } from '@internationalized/date'
import MainChart from '@/modules/ELD/LogsModule/[Id]/components/chart/MainChart.vue'
import { formatTime, compareDates } from '@/utils/time'
import type { Dayjs } from 'dayjs'
import type { GraphResponse, DailySummaryResponse } from '@/modules/ELD/LogsModule/[Id]/types/chart'
import type { AuditWeeklyViolation } from '../types'

interface Props {
  chartData?: GraphResponse
  dailySummary?: DailySummaryResponse
  pixelViolations: any[]
  weeklyViolations: AuditWeeklyViolation[]
  headerDate: Dayjs
  today: Dayjs
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'container:update': [width: number]
  dateSelect: [date: Dayjs | string]
  prevDay: []
  nextDay: []
}>()

const chartContainer = ref<HTMLElement | null>(null)
const isCalendarOpen = ref(false)
const selectedDate = ref<any>(undefined)

const isToday = computed(() => compareDates(props.headerDate, props.today))

// Sync selectedDate with headerDate
watch(
  () => props.headerDate,
  (newDate) => {
    if (newDate) {
      selectedDate.value = new CalendarDate(newDate.year(), newDate.month() + 1, newDate.date())
    }
  },
  { immediate: true },
)

function formatViolationDate(date: Dayjs | string) {
  return formatTime(date as Dayjs, 'MMM D')
}

function getButtonClass(violation: AuditWeeklyViolation) {
  const isSelected = compareDates(violation.dateOfViolations as Dayjs, props.headerDate)
  const hasViolations = violation.violations?.length > 0

  if (isSelected) {
    return 'bg-foreground text-background border-foreground shadow-sm'
  } else if (hasViolations) {
    return 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20'
  }
  return 'bg-background text-muted-foreground border-border hover:bg-accent hover:text-foreground'
}

function handleCalendarCancel() {
  if (props.headerDate) {
    selectedDate.value = new CalendarDate(
      props.headerDate.year(),
      props.headerDate.month() + 1,
      props.headerDate.date(),
    )
  }
  isCalendarOpen.value = false
}

function handleCalendarApply() {
  if (selectedDate.value) {
    const date = new Date(selectedDate.value.year, selectedDate.value.month - 1, selectedDate.value.day)
    emit('dateSelect', date.toISOString())
  }
  isCalendarOpen.value = false
}

function onContainerUpdate(width: number) {
  emit('container:update', width)
}

onMounted(() => {
  if (chartContainer.value) {
    emit('container:update', chartContainer.value.clientWidth)
  }
})
</script>
