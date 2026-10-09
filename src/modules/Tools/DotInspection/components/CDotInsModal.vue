<script setup lang="ts">
import { Calendar as CalendarIcon } from 'lucide-vue-next'
import { CalendarDate } from '@internationalized/date'
import { computed, ref, watch } from 'vue'
import type { DateRange } from 'reka-ui'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { RangeCalendar } from '@/components/ui/range-calendar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type {
  CreateDotInspectionRequest,
  RouteEldDriverOption,
} from '@/modules/Tools/DotInspection/types'

const props = defineProps<{
  open: boolean
  drivers: RouteEldDriverOption[]
}>()

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'submit', request: CreateDotInspectionRequest): void
}>()

const driverId = ref('')
const fromDate = ref('')
const toDate = ref('')
const description = ref('')
const isSubmitting = ref(false)
const isCalendarOpen = ref(false)
const errors = ref<Record<string, string>>({})
const sortedDrivers = computed(() =>
  [...props.drivers].sort((a, b) => a.displayName.localeCompare(b.displayName))
)

function resetForm() {
  driverId.value = ''
  fromDate.value = ''
  toDate.value = ''
  description.value = ''
  isCalendarOpen.value = false
  errors.value = {}
}

function toCalendarDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new CalendarDate(year, month, day)
}

function toDateString(value: { year: number; month: number; day: number }) {
  return `${value.year}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`
}

const calendarRange = computed<DateRange>({
  get: () => ({
    start: fromDate.value ? toCalendarDate(fromDate.value) : undefined,
    end: toDate.value ? toCalendarDate(toDate.value) : undefined,
  }),
  set: (value) => {
    fromDate.value = value.start ? toDateString(value.start) : ''
    toDate.value = value.end ? toDateString(value.end) : ''
  },
})

const periodLabel = computed(() => {
  if (!fromDate.value || !toDate.value) return 'Select freeze period'
  return `${fromDate.value} –> ${toDate.value}`
})

function handleRangeSelect(value: DateRange) {
  if (value.start) fromDate.value = toDateString(value.start)
  if (value.end) {
    toDate.value = toDateString(value.end)
    delete errors.value.fromDate
    delete errors.value.toDate
    isCalendarOpen.value = false
  }
}

watch(
  () => props.open,
  (open) => {
    if (open) resetForm()
  }
)

function validate() {
  errors.value = {}
  if (!driverId.value) errors.value.driverId = 'Driver is required'
  if (!fromDate.value) errors.value.fromDate = 'Start date is required'
  if (!toDate.value) errors.value.toDate = 'End date is required'
  if (fromDate.value && toDate.value && fromDate.value > toDate.value) {
    errors.value.toDate = 'End date must not be before start date'
  }
  if (description.value.length > 120) {
    errors.value.description = 'Description must be 120 characters or less'
  }
  return Object.keys(errors.value).length === 0
}

async function handleSubmit() {
  if (!validate()) return
  isSubmitting.value = true
  try {
    emit('submit', {
      driverId: driverId.value,
      fromDate: fromDate.value,
      toDate: toDate.value,
      description: description.value.trim() || null,
    })
  } finally {
    isSubmitting.value = false
  }
}

function close() {
  if (!isSubmitting.value) emit('close')
}
</script>

<template>
  <Dialog :open="open" @update:open="close">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Create DOT inspection</DialogTitle>
      </DialogHeader>
      <form class="space-y-4 pt-2" @submit.prevent="handleSubmit">
        <div class="space-y-2">
          <Label for="dot-driver">Driver</Label>
          <Select v-model="driverId" :disabled="isSubmitting">
            <SelectTrigger id="dot-driver" :class="errors.driverId && 'border-destructive'">
              <SelectValue placeholder="Select driver" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="driver in sortedDrivers" :key="driver.id" :value="driver.id">
                {{ driver.displayName }}
              </SelectItem>
              <div v-if="!sortedDrivers.length" class="px-3 py-2 text-sm text-muted-foreground">
                No drivers found
              </div>
            </SelectContent>
          </Select>
          <p v-if="errors.driverId" class="text-sm text-destructive">{{ errors.driverId }}</p>
        </div>
        <div class="space-y-2">
          <Label>Freeze period</Label>
          <Popover v-model:open="isCalendarOpen">
            <PopoverTrigger as-child>
              <Button
                type="button"
                variant="outline"
                class="w-full justify-start text-left font-normal"
                :class="(errors.fromDate || errors.toDate) && 'border-destructive'"
                :disabled="isSubmitting"
              >
                <CalendarIcon class="mr-2 h-4 w-4" />
                {{ periodLabel }}
              </Button>
            </PopoverTrigger>
            <PopoverContent class="w-auto p-0" align="start">
              <RangeCalendar
                v-model="calendarRange"
                :number-of-months="2"
                initial-focus
                @update:model-value="handleRangeSelect"
              />
            </PopoverContent>
          </Popover>
          <p v-if="errors.fromDate || errors.toDate" class="text-sm text-destructive">
            {{ errors.fromDate || errors.toDate }}
          </p>
        </div>
        <div class="space-y-2">
          <Label for="dot-description">Description</Label>
          <Textarea
            id="dot-description"
            v-model="description"
            rows="4"
            maxlength="120"
            placeholder="Enter description"
            :class="errors.description && 'border-destructive'"
            :disabled="isSubmitting"
          />
          <div class="flex items-center justify-between">
            <p v-if="errors.description" class="text-sm text-destructive">
              {{ errors.description }}
            </p>
            <span class="ml-auto text-xs text-muted-foreground"
              >{{ description.length }} / 120</span
            >
          </div>
        </div>
        <div class="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" :disabled="isSubmitting" @click="close">
            Cancel
          </Button>
          <Button type="submit" :disabled="isSubmitting || !sortedDrivers.length">
            {{ isSubmitting ? 'Saving...' : 'Create' }}
          </Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>
</template>
