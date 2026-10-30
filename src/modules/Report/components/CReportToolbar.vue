<template>
  <div
    class="px-4 sm:px-6 py-4 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3 bg-white dark:bg-card border-b border-border shrink-0"
  >
    <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
      <h1 class="font-heading text-2xl font-semibold leading-8 text-[#090909] dark:text-foreground">
        {{ title }}
      </h1>
      <p v-if="subtitle" class="text-sm text-muted-foreground">{{ subtitle }}</p>
    </div>

    <div class="flex flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-4">
      <slot name="actions" />

      <template v-if="showFilters">
        <div v-if="periods.length" class="flex items-center bg-muted p-1 rounded-lg overflow-x-auto w-full md:w-auto">
          <button
            v-for="p in periods"
            :key="p.key"
            @click="applyPeriod(p.key)"
            :class="[
              'px-3 sm:px-4 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap flex-1 md:flex-initial cursor-pointer',
              selectedPeriod === p.key
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            ]"
          >
            {{ p.label }}
          </button>
        </div>

        <Popover v-if="monthPicker" v-model:open="monthPopoverOpen">
          <PopoverTrigger as-child>
            <button
              class="h-10 min-w-[180px] px-3 rounded-md border border-border flex items-center justify-between gap-3 cursor-pointer bg-white dark:bg-card hover:bg-accent dark:hover:bg-muted transition-colors"
            >
              <span class="flex items-center gap-2">
                <CalendarIcon class="w-4 h-4 text-muted-foreground" />
                <span class="text-sm text-foreground">{{ selectedMonthLabel }}</span>
              </span>
              <ChevronDown class="w-4 h-4 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent class="w-72 p-3" align="end">
            <div class="flex items-center justify-between mb-3">
              <button class="p-1.5 rounded-md hover:bg-muted" @click="pickerYear--">
                <ChevronLeft class="w-4 h-4" />
              </button>
              <span class="text-sm font-semibold">{{ pickerYear }}</span>
              <button
                class="p-1.5 rounded-md hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
                :disabled="pickerYear >= currentYear"
                @click="pickerYear++"
              >
                <ChevronRight class="w-4 h-4" />
              </button>
            </div>
            <div class="grid grid-cols-3 gap-1.5">
              <button
                v-for="(name, index) in monthNames"
                :key="name"
                :disabled="isMonthDisabled(index + 1)"
                class="h-9 rounded-md text-sm transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
                :class="monthButtonClass(index + 1)"
                @click="selectMonth(index + 1)"
              >
                {{ name }}
              </button>
            </div>
          </PopoverContent>
        </Popover>

        <Popover v-else>
          <PopoverTrigger as-child>
            <button
              class="h-10 w-full md:w-[220px] px-3 py-2 rounded-md border border-border flex items-center gap-2 cursor-pointer bg-white dark:bg-card hover:bg-accent dark:hover:bg-muted transition-colors"
            >
              <CalendarIcon class="w-4 h-4 text-muted-foreground shrink-0" />
              <span class="text-sm text-foreground whitespace-nowrap">{{ dateRangeLabel }}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent class="w-auto p-0" align="end">
            <RangeCalendar v-model="dateRange" :number-of-months="2" initial-focus />
          </PopoverContent>
        </Popover>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { Calendar as CalendarIcon, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { CalendarDate } from '@internationalized/date'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { RangeCalendar } from '@/components/ui/range-calendar'
import { reportToday } from '@/modules/Report/utils/operations'

type PeriodKey = 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom'

interface CalendarValue {
  year: number
  month: number
  day: number
}

const props = withDefaults(
  defineProps<{
    title: string
    subtitle?: string
    showFilters?: boolean
    hideDaily?: boolean
    fullPeriods?: boolean
    rollingWeek?: boolean
    defaultPeriod?: PeriodKey
    monthPicker?: boolean
    monthValue?: string
  }>(),
  { showFilters: true, hideDaily: false, fullPeriods: false, rollingWeek: false, defaultPeriod: 'day', monthPicker: false }
)

const emit = defineEmits<{
  (e: 'change', range: { startTime: string; endTime: string }): void
}>()

const allPeriods: { key: PeriodKey; label: string }[] = [
  { key: 'day', label: 'Daily' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'quarter', label: 'This Quarter' },
  { key: 'year', label: 'This Year' },
]

const periods = computed(() => {
  if (props.monthPicker) return []
  return allPeriods.filter((p) => !(props.hideDaily && p.key === 'day'))
    .map((p) => p.key === 'week' && props.rollingWeek ? { ...p, label: 'Weekly' } : p)
})

function currentMonthValue(): string {
  const n = new Date()
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}`
}

function validMonth(value?: string): value is string {
  return !!value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
}

const selectedMonth = ref<string>(validMonth(props.monthValue) ? props.monthValue : currentMonthValue())
const monthPopoverOpen = ref(false)
const pickerYear = ref(Number(selectedMonth.value.slice(0, 4)))
const currentYear = new Date().getFullYear()
const monthNames = Array.from({ length: 12 }, (_, index) =>
  new Intl.DateTimeFormat('en-US', { month: 'short' }).format(new Date(2000, index, 1))
)
const selectedMonthLabel = computed(() => {
  const [year, month] = selectedMonth.value.split('-').map(Number)
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1))
})

function monthRange(value: string): { start: CalendarDate; end: CalendarDate } {
  const [y, m] = value.split('-').map(Number)
  return { start: new CalendarDate(y, m, 1), end: calFrom(new Date(y, m, 0)) }
}

const selectedPeriod = ref<PeriodKey>(props.monthPicker ? 'custom' : props.defaultPeriod)
const dateRange = ref<any>(props.monthPicker ? monthRange(selectedMonth.value) : periodToRange(props.defaultPeriod))
let programmatic = true

function today(): CalendarDate {
  const now = new Date()
  return new CalendarDate(now.getFullYear(), now.getMonth() + 1, now.getDate())
}

function calFrom(d: Date): CalendarDate {
  return new CalendarDate(d.getFullYear(), d.getMonth() + 1, d.getDate())
}

function periodToRange(period: PeriodKey): { start: CalendarDate; end: CalendarDate } {
  const now = new Date()
  const end = today()
  if (period === 'week' && props.rollingWeek) {
    const [year, month, day] = reportToday().split('-').map(Number)
    const current = new Date(year, month - 1, day)
    const start = new Date(current)
    start.setDate(start.getDate() - 6)
    return { start: calFrom(start), end: calFrom(current) }
  }
  if (period === 'week') {
    const monday = new Date(now)
    const offset = (now.getDay() + 6) % 7
    monday.setDate(now.getDate() - offset)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    return { start: calFrom(monday), end: props.fullPeriods ? calFrom(sunday) : end }
  }
  if (period === 'month') {
    const start = new CalendarDate(now.getFullYear(), now.getMonth() + 1, 1)
    return { start, end: props.fullPeriods ? calFrom(new Date(now.getFullYear(), now.getMonth() + 1, 0)) : end }
  }
  if (period === 'quarter') {
    const startMonth = Math.floor(now.getMonth() / 3) * 3
    const start = new CalendarDate(now.getFullYear(), startMonth + 1, 1)
    return { start, end: props.fullPeriods ? calFrom(new Date(now.getFullYear(), startMonth + 3, 0)) : end }
  }
  if (period === 'year') {
    const start = new CalendarDate(now.getFullYear(), 1, 1)
    return { start, end: props.fullPeriods ? new CalendarDate(now.getFullYear(), 12, 31) : end }
  }
  return { start: end, end }
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function toIsoDate(value: CalendarValue): string {
  return `${value.year}-${pad(value.month)}-${pad(value.day)}`
}

function formatLabel(value: CalendarValue): string {
  return `${pad(value.day)}.${pad(value.month)}.${value.year}`
}

const dateRangeLabel = ref('')

function applyPeriod(period: PeriodKey) {
  selectedPeriod.value = period
  programmatic = true
  dateRange.value = periodToRange(period)
}

function applyMonth(value: string) {
  if (!validMonth(value)) return
  selectedMonth.value = value
  pickerYear.value = Number(value.slice(0, 4))
  selectedPeriod.value = 'custom'
  programmatic = true
  dateRange.value = monthRange(value)
}

function isMonthDisabled(month: number): boolean {
  return `${pickerYear.value}-${pad(month)}` > currentMonthValue()
}

function monthButtonClass(month: number): string {
  const value = `${pickerYear.value}-${pad(month)}`
  return value === selectedMonth.value
    ? 'bg-primary text-primary-foreground'
    : 'text-foreground hover:bg-muted'
}

function selectMonth(month: number) {
  if (isMonthDisabled(month)) return
  applyMonth(`${pickerYear.value}-${pad(month)}`)
  monthPopoverOpen.value = false
}

watch(
  () => props.monthValue,
  (value) => {
    if (validMonth(value) && value !== selectedMonth.value) applyMonth(value)
  }
)

watch(
  dateRange,
  (value) => {
    if (!value?.start || !value?.end) return
    if (!programmatic) selectedPeriod.value = 'custom'
    dateRangeLabel.value = `${formatLabel(value.start)} - ${formatLabel(value.end)}`
    emit('change', { startTime: toIsoDate(value.start), endTime: toIsoDate(value.end) })
    nextTick(() => (programmatic = false))
  },
  { immediate: true, deep: true }
)
</script>

