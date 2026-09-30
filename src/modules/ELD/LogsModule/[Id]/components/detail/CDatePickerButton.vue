<template>
  <Popover>
    <PopoverTrigger as-child>
      <Button variant="outline" class="w-full justify-start text-left font-normal">
        <CalendarIcon class="mr-2 h-4 w-4" />
        {{ displayDate }}
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-auto p-0" align="start">
      <Calendar v-model="calendarDate" @update:model-value="handleDateChange" />
    </PopoverContent>
  </Popover>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { Calendar as CalendarIcon } from 'lucide-vue-next'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { CalendarDate } from '@internationalized/date'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface Props {
  date: Dayjs | null
  formatFn?: (date: Dayjs | null) => string
  placeholder?: string
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Select date',
  formatFn: (date: Dayjs | null) => date?.format('MMM D, YYYY') ?? '',
})

const emit = defineEmits<{
  'update:date': [date: Dayjs]
}>()

// Convert Dayjs to CalendarDate
function toCalendarDate(date: Dayjs | null): CalendarDate | undefined {
  if (!date) return undefined
  return new CalendarDate(date.year(), date.month() + 1, date.date())
}

// Convert CalendarDate to Dayjs
function toDayjs(date: any): Dayjs {
  return dayjs(new Date(date.year, date.month - 1, date.day))
}

// Local calendar state
const calendarDate = ref<CalendarDate | undefined>(toCalendarDate(props.date))

// Sync with prop changes
watch(
  () => props.date,
  (newDate) => {
    calendarDate.value = toCalendarDate(newDate)
  }
)

// Display text
const displayDate = computed(() => {
  return props.date ? props.formatFn(props.date) : props.placeholder
})

// Handle date selection
function handleDateChange(date: any): void {
  if (date) {
    emit('update:date', toDayjs(date))
  }
}
</script>
