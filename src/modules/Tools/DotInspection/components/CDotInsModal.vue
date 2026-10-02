<!-- src/components/dotInspection/CreateDotModal.vue -->
<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { Calendar } from 'lucide-vue-next'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { RangeCalendar } from '@/components/ui/range-calendar'
import type { CreateDotInspectionRequest } from '@/modules/Tools/DotInspection/types'
import { useCompaniesDrivers } from '@/composables/useCompaniesDrivers'
import dayjs, { type Dayjs } from 'dayjs'
import type { DateRange, DateValue } from 'reka-ui'
import { CalendarDate } from '@internationalized/date'
import { cn } from '@/lib/utils'

interface Company {
  id: string
  name: string
}

interface Props {
  open: boolean
  companies: Company[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submit', data: CreateDotInspectionRequest): void
}>()

const { drivers, fetchDrivers } = useCompaniesDrivers()
const isDriversLoading = ref(false)

// Default to last two days (yesterday and today)
const getDefaultDateRange = (): [Dayjs, Dayjs] => {
  const today = dayjs()
  const yesterday = today.subtract(1, 'day')
  return [yesterday, today]
}

const formData = ref({
  blockDate: getDefaultDateRange() as [Dayjs, Dayjs] | null,
  company: '',
  driver: '',
  description: '',
})

const errors = ref<Record<string, string>>({})
const isSubmitting = ref(false)
const isCalendarOpen = ref(false)

const companyOptions = computed(() => props.companies || [])
const driverOptions = computed(() => drivers.value)

// Fetch drivers when company changes
watch(
  () => formData.value.company,
  async (companyId) => {
    formData.value.driver = ''
    drivers.value = []
    if (!companyId) return
    isDriversLoading.value = true
    try {
      await fetchDrivers(companyId)
    } finally {
      isDriversLoading.value = false
    }
  }
)

// Calendar conversion functions
const dayjsToCalendarDate = (date: Dayjs): CalendarDate => {
  return new CalendarDate(date.year(), date.month() + 1, date.date())
}

const calendarDateToDayjs = (date: DateValue): Dayjs => {
  return dayjs(new Date(date.year, date.month - 1, date.day))
}

// Calendar value (DateRange for RangeCalendar)
const calendarValue = computed<DateRange>({
  get: () => {
    if (!formData.value.blockDate) {
      const [yesterday, today] = getDefaultDateRange()
      return {
        start: dayjsToCalendarDate(yesterday),
        end: dayjsToCalendarDate(today),
      }
    }
    return {
      start: dayjsToCalendarDate(formData.value.blockDate[0]),
      end: dayjsToCalendarDate(formData.value.blockDate[1]),
    }
  },
  set: (value) => {
    if (value?.start && value?.end) {
      formData.value.blockDate = [calendarDateToDayjs(value.start), calendarDateToDayjs(value.end)]
    }
  },
})

// Handle date selection
const handleDateSelect = (value: DateRange) => {
  if (value?.start && value?.end) {
    clearError('blockDate')
    isCalendarOpen.value = false
  }
}

// Format date range for display
const formatDateRange = () => {
  if (!formData.value.blockDate) {
    return 'Select date range'
  }
  return `${formData.value.blockDate[0].format('DD.MM.YYYY')} - ${formData.value.blockDate[1].format('DD.MM.YYYY')}`
}

// Reset form when modal opens/closes
watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) {
      resetForm()
    }
  }
)

const resetForm = () => {
  formData.value = {
    blockDate: getDefaultDateRange(),
    company: '',
    driver: '',
    description: '',
  }
  errors.value = {}
  isCalendarOpen.value = false
  drivers.value = []
}

// Max date for calendar (today - disable future dates)
const maxDate = computed(() => dayjsToCalendarDate(dayjs()))

const validateForm = (): boolean => {
  errors.value = {}
  let isValid = true

  if (!formData.value.blockDate) {
    errors.value.blockDate = 'Block date is required'
    isValid = false
  }

  if (!formData.value.company) {
    errors.value.company = 'Company is required'
    isValid = false
  }

  if (!formData.value.driver) {
    errors.value.driver = 'Driver is required'
    isValid = false
  }

  if (!formData.value.description.trim()) {
    errors.value.description = 'Description is required'
    isValid = false
  } else if (formData.value.description.length > 120) {
    errors.value.description = 'Description must be 120 characters or less'
    isValid = false
  }

  return isValid
}

const handleSubmit = async () => {
  if (!validateForm()) {
    return
  }

  isSubmitting.value = true

  try {
    if (!formData.value.blockDate) {
      throw new Error('Block date is required')
    }

    const payload: CreateDotInspectionRequest = {
      companyId: formData.value.company,
      driverId: formData.value.driver,
      startDate: formData.value.blockDate[0].format('YYYY-MM-DD'),
      endDate: formData.value.blockDate[1].format('YYYY-MM-DD'),
      description: formData.value.description,
      status: 0,
    }

    emit('submit', payload)
  } catch (error) {
    console.error('Error creating dot inspection:', error)
  } finally {
    isSubmitting.value = false
  }
}

const handleClose = () => {
  if (!isSubmitting.value) {
    emit('close')
  }
}

const clearError = (field: string) => {
  delete errors.value[field]
}
</script>

<template>
  <Dialog :open="open" @update:open="handleClose">
    <DialogContent class="max-w-lg">
      <DialogHeader>
        <DialogTitle class="text-2xl font-semibold">Create dot</DialogTitle>
      </DialogHeader>

      <form @submit.prevent="handleSubmit" class="space-y-4 mt-4">
        <!-- Block date -->
        <div class="space-y-2">
          <Label for="blockDate">Block date</Label>
          <Popover v-model:open="isCalendarOpen">
            <PopoverTrigger as-child>
              <Button
                variant="outline"
                type="button"
                :class="
                  cn(
                    'w-full justify-start text-left font-normal border-border',
                    !formData.blockDate && 'text-muted-foreground',
                    errors.blockDate && 'border-destructive'
                  )
                "
              >
                <Calendar class="mr-2 h-4 w-4" />
                <span>{{ formatDateRange() }}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent class="w-auto p-0 border-border" align="start">
              <RangeCalendar
                v-model="calendarValue"
                :number-of-months="2"
                :max-value="maxDate"
                @update:model-value="handleDateSelect"
              />
            </PopoverContent>
          </Popover>
          <p v-if="errors.blockDate" class="text-sm text-destructive">{{ errors.blockDate }}</p>
        </div>

        <!-- Company -->
        <div class="space-y-2">
          <Label for="company">Company</Label>
          <Select
            v-model="formData.company"
            :disabled="isSubmitting"
            @update:model-value="clearError('company')"
          >
            <SelectTrigger id="company" :class="errors.company && 'border-destructive'">
              <SelectValue placeholder="Select company" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="option in companyOptions" :key="option.id" :value="option.id">
                {{ option.name }}
              </SelectItem>
            </SelectContent>
          </Select>
          <p v-if="errors.company" class="text-sm text-destructive">{{ errors.company }}</p>
        </div>

        <!-- Driver -->
        <div class="space-y-2">
          <Label for="driver">Driver</Label>
          <Select
            v-model="formData.driver"
            :disabled="isSubmitting || isDriversLoading || !formData.company"
            @update:model-value="clearError('driver')"
          >
            <SelectTrigger id="driver" :class="errors.driver && 'border-destructive'">
              <SelectValue
                :placeholder="
                  isDriversLoading
                    ? 'Loading...'
                    : !formData.company
                      ? 'Select company first'
                      : 'Select driver'
                "
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="option in driverOptions" :key="option.id" :value="option.id">
                {{ option.name }}
              </SelectItem>
              <div
                v-if="!isDriversLoading && formData.company && driverOptions.length === 0"
                class="py-2 px-3 text-sm text-muted-foreground"
              >
                No drivers
              </div>
            </SelectContent>
          </Select>
          <p v-if="errors.driver" class="text-sm text-destructive">{{ errors.driver }}</p>
        </div>

        <!-- Description -->
        <div class="space-y-2">
          <Label for="description">Description</Label>
          <Textarea
            id="description"
            v-model="formData.description"
            placeholder="Enter description"
            maxlength="120"
            rows="4"
            :class="errors.description && 'border-destructive'"
            :disabled="isSubmitting"
            @input="clearError('description')"
          />
          <div class="flex justify-between items-center">
            <p v-if="errors.description" class="text-sm text-destructive">{{ errors.description }}</p>
            <span class="text-sm text-muted-foreground ml-auto">
              {{ formData.description.length }} / 120
            </span>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" @click="handleClose" :disabled="isSubmitting">
            Cancel
          </Button>
          <Button
            type="submit"
            class="bg-primary text-primary-foreground hover:bg-primary/90"
            :disabled="isSubmitting"
          >
            <span v-if="!isSubmitting">Save</span>
            <span v-else>Saving...</span>
          </Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>
</template>
