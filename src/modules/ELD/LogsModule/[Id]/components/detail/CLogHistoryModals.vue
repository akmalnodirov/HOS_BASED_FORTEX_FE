<template>
  <!-- Transfer Events Confirmation Modal -->
  <Dialog v-model:open="transferEventsOpen">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Transfer Selected Events</DialogTitle>
        <DialogDescription>
          Transfer {{ selectionCount }} selected event(s) to the current log?
        </DialogDescription>
      </DialogHeader>
      <DialogFooter class="gap-2 sm:gap-0">
        <Button variant="outline" @click="transferEventsOpen = false"> Cancel </Button>
        <Button @click="$emit('confirm-transfer')" :disabled="loading">
          {{ loading ? 'Transferring...' : 'Transfer' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <Dialog v-model:open="transferByPeriodOpen">
    <DialogContent class="sm:max-w-180">
      <DialogHeader>
        <DialogTitle>Transfer by Date Range</DialogTitle>
        <DialogDescription>
          {{
            showConfirmation
              ? `Transfer all events from ${formattedDateRange}?`
              : 'Select a date range to transfer events.'
          }}
        </DialogDescription>
      </DialogHeader>

      <div v-if="!showConfirmation" class="flex flex-col items-center justify-center py-4">
        <RangeCalendar v-model="rangeValue" :number-of-months="2" class="rounded-md border" />
      </div>

      <DialogFooter class="flex gap-6">
        <Button variant="outline" @click="handleCancel"> Cancel </Button>
        <Button @click="handleSubmit" :disabled="loading || !isValidRange">
          {{ loading ? 'Transferring...' : showConfirmation ? 'Transfer' : 'Apply' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import { CalendarDate } from '@internationalized/date'
import { RangeCalendar } from '@/components/ui/range-calendar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface Props {
  transferEventsOpen: boolean
  transferByPeriodOpen: boolean
  dateRange: [Dayjs | null, Dayjs | null]
  showConfirmation: boolean
  selectionCount: number
  loading: boolean
  formatDate: (date: Dayjs | null) => string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:transferEventsOpen': [value: boolean]
  'update:transferByPeriodOpen': [value: boolean]
  'update:dateRange': [value: [Dayjs | null, Dayjs | null]]
  'confirm-transfer': []
  'confirm-period-transfer': []
  'cancel-period': []
}>()

const transferEventsOpen = computed({
  get: () => props.transferEventsOpen,
  set: (value) => emit('update:transferEventsOpen', value),
})

const transferByPeriodOpen = computed({
  get: () => props.transferByPeriodOpen,
  set: (value) => emit('update:transferByPeriodOpen', value),
})

const isValidRange = computed(() => {
  return props.dateRange[0] !== null && props.dateRange[1] !== null
})

const formattedDateRange = computed(() => {
  if (!isValidRange.value) return ''
  return `${props.formatDate(props.dateRange[0])} - ${props.formatDate(props.dateRange[1])}`
})

const rangeValue = computed({
  get: () => {
    const start = props.dateRange[0]
    const end = props.dateRange[1]
    return {
      start: start ? new CalendarDate(start.year(), start.month() + 1, start.date()) : undefined,
      end: end ? new CalendarDate(end.year(), end.month() + 1, end.date()) : undefined,
    }
  },
  set: (val: any) => {
    if (!val) {
      emit('update:dateRange', [null, null])
      return
    }
    const start = val.start
      ? dayjs()
          .year(val.start.year)
          .month(val.start.month - 1)
          .date(val.start.day)
          .startOf('day')
      : null
    const end = val.end
      ? dayjs()
          .year(val.end.year)
          .month(val.end.month - 1)
          .date(val.end.day)
          .endOf('day')
      : null
    emit('update:dateRange', [start, end])
  },
})

function updateStartDate(dateField: Dayjs): void {
  emit('update:dateRange', [dateField, props.dateRange[1]])
}

function updateEndDate(dateField: Dayjs): void {
  emit('update:dateRange', [props.dateRange[0], dateField])
}

function handleCancel(): void {
  emit('cancel-period')
  transferByPeriodOpen.value = false
}

function handleSubmit(): void {
  emit('confirm-period-transfer')
}
</script>
