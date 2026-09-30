<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Modal, ModalContent, ModalHeader, ModalTitle } from '@/components/custom/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { TimePicker } from '@/components/custom/time-picker'
import { Plus, Minus, Calendar } from 'lucide-vue-next'
import dayjs, { type Dayjs } from 'dayjs'
import { CalendarDate } from '@internationalized/date'
import type { DateValue } from 'reka-ui'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  emails: string[]
  telegrams: string[]
  expireAt: Dayjs
  saveLoading: boolean
}

interface Emits {
  'update:open': [value: boolean]
  'add-email': []
  'remove-email': [index: number]
  'add-telegram': []
  'remove-telegram': [index: number]
  'submit': []
  'update:email': [index: number, value: string]
  'update:telegram': [index: number, value: string]
  'update:expire-at': [value: Dayjs]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Validation errors
const errors = ref<Record<string, string>>({})
const isCalendarOpen = ref(false)

// Calendar Date conversion utilities
const dayjsToCalendarDate = (date: Dayjs): CalendarDate => {
  return new CalendarDate(date.year(), date.month() + 1, date.date())
}

const calendarDateToDayjs = (date: DateValue): Dayjs => {
  return dayjs(new Date(date.year, date.month - 1, date.day))
}

// Selected date for Calendar component
const selectedDate = computed<DateValue>({
  get: () => dayjsToCalendarDate(props.expireAt),
  set: (value: DateValue) => {
    const newDate = calendarDateToDayjs(value)
    // Preserve existing time when date changes
    const updated = props.expireAt
      .year(newDate.year())
      .month(newDate.month())
      .date(newDate.date())
    emit('update:expire-at', updated)
    isCalendarOpen.value = false
    clearError('expireAt')
  },
})

// Selected time for TimePicker component
const selectedTime = computed<string>({
  get: () => props.expireAt.format('HH:mm'),
  set: (value: string) => {
    const [hours, minutes] = value.split(':').map(Number)
    const updated = props.expireAt.hour(hours).minute(minutes)
    emit('update:expire-at', updated)
    clearError('expireAt')
  },
})

// Formatted display for date/time
const formattedExpireDate = computed(() => {
  return props.expireAt.format('YYYY-MM-DD HH:mm:ss')
})

// Validation
const validateForm = (): boolean => {
  errors.value = {}
  let isValid = true

  // Check if at least one email or telegram is provided and not empty
  const hasValidEmail = props.emails.some((email) => email.trim() !== '')
  const hasValidTelegram = props.telegrams.some((telegram) => telegram.trim() !== '')

  if (!hasValidEmail && !hasValidTelegram) {
    errors.value.general = 'At least one email or telegram is required'
    isValid = false
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  props.emails.forEach((email, index) => {
    if (email.trim() !== '' && !emailRegex.test(email)) {
      errors.value[`email-${index}`] = 'Invalid email format'
      isValid = false
    }
  })

  // Check if expire date is in the future
  if (props.expireAt.isBefore(dayjs())) {
    errors.value.expireAt = 'Expiry date must be in the future'
    isValid = false
  }

  return isValid
}

// Handle submit
const handleSubmit = () => {
  if (!validateForm()) {
    return
  }
  emit('submit')
}

// Handle close
const handleClose = () => {
  if (!props.saveLoading) {
    emit('update:open', false)
    // Clear errors when closing
    errors.value = {}
  }
}

// Clear specific error
const clearError = (field: string) => {
  delete errors.value[field]
}

// Email handlers
const handleEmailInput = (index: number, value: string) => {
  emit('update:email', index, value)
  clearError(`email-${index}`)
  clearError('general')
}

const handleAddEmail = () => {
  emit('add-email')
}

const handleRemoveEmail = (index: number) => {
  emit('remove-email', index)
  clearError(`email-${index}`)
}

// Telegram handlers
const handleTelegramInput = (index: number, value: string) => {
  emit('update:telegram', index, value)
  clearError('general')
}

const handleAddTelegram = () => {
  emit('add-telegram')
}

const handleRemoveTelegram = (index: number) => {
  emit('remove-telegram', index)
}

// Reset errors when modal opens/closes
watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) {
      errors.value = {}
    }
  }
)
</script>

<template>
  <Modal :open="open" @update:open="handleClose">
    <ModalContent max-width="2xl">
      <ModalHeader>
        <ModalTitle class="text-2xl font-semibold">Live Share</ModalTitle>
      </ModalHeader>

      <form @submit.prevent="handleSubmit" class="space-y-6 mt-4">
        <!-- General Error -->
        <div v-if="errors.general" class="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p class="text-sm text-red-600 dark:text-red-400">{{ errors.general }}</p>
        </div>

        <!-- Email Section -->
        <div class="space-y-3">
          <Label>Email</Label>
          <div v-for="(email, index) in emails" :key="`email-${index}`" class="flex gap-2 items-start">
            <div class="flex-1 space-y-1">
              <Input
                :model-value="email"
                @input="handleEmailInput(index, ($event.target as HTMLInputElement).value)"
                type="email"
                placeholder="Email"
                :class="errors[`email-${index}`] && 'border-red-500'"
                :disabled="saveLoading"
              />
              <p v-if="errors[`email-${index}`]" class="text-sm text-red-600 dark:text-red-400">
                {{ errors[`email-${index}`] }}
              </p>
            </div>
            <Button
              v-if="emails.length > 1"
              @click="handleRemoveEmail(index)"
              type="button"
              variant="outline"
              size="icon"
              class="shrink-0 h-10 w-10 border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
              :disabled="saveLoading"
            >
              <Minus class="w-4 h-4" />
            </Button>
            <Button
              @click="handleAddEmail"
              type="button"
              variant="outline"
              size="icon"
              class="shrink-0 h-10 w-10"
              :disabled="saveLoading"
            >
              <Plus class="w-4 h-4" />
            </Button>
          </div>
        </div>

        <!-- Telegram Section -->
        <div class="space-y-3">
          <Label>Telegram</Label>
          <div v-for="(telegram, index) in telegrams" :key="`telegram-${index}`" class="flex gap-2 items-start">
            <div class="flex-1">
              <Input
                :model-value="telegram"
                @input="handleTelegramInput(index, ($event.target as HTMLInputElement).value)"
                type="text"
                placeholder="Telegram username"
                :disabled="saveLoading"
              />
            </div>
            <Button
              v-if="telegrams.length > 1"
              @click="handleRemoveTelegram(index)"
              type="button"
              variant="outline"
              size="icon"
              class="shrink-0 h-10 w-10 border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
              :disabled="saveLoading"
            >
              <Minus class="w-4 h-4" />
            </Button>
            <Button
              @click="handleAddTelegram"
              type="button"
              variant="outline"
              size="icon"
              class="shrink-0 h-10 w-10"
              :disabled="saveLoading"
            >
              <Plus class="w-4 h-4" />
            </Button>
          </div>
        </div>

        <!-- Expire Date Section -->
        <div class="space-y-3">
          <Label>Expire date</Label>
          <div class="grid grid-cols-2 gap-3">
            <!-- Date Picker -->
            <Popover v-model:open="isCalendarOpen">
              <PopoverTrigger as-child>
                <Button
                  variant="outline"
                  :disabled="saveLoading"
                  :class="
                    cn(
                      'w-full justify-start text-left font-normal',
                      errors.expireAt && 'border-red-500'
                    )
                  "
                >
                  <Calendar class="mr-2 h-4 w-4" />
                  <span>{{ expireAt.format('YYYY-MM-DD') }}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent class="w-auto p-0" align="start">
                <CalendarComponent
                  v-model="selectedDate"
                  :disabled-dates="{
                    before: new Date(),
                  }"
                />
              </PopoverContent>
            </Popover>

            <!-- Time Picker -->
            <TimePicker
              v-model="selectedTime"
              placeholder="Select time"
              :disabled="saveLoading"
              :class="errors.expireAt && 'border-red-500'"
            />
          </div>
          <p v-if="errors.expireAt" class="text-sm text-red-600 dark:text-red-400">
            {{ errors.expireAt }}
          </p>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            Selected: {{ formattedExpireDate }}
          </p>
        </div>

        <Separator />

        <!-- Actions -->
        <div class="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            @click="handleClose"
            :disabled="saveLoading"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            class="bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-gray-200 dark:text-gray-900 min-w-[100px]"
            :disabled="saveLoading"
          >
            <span v-if="!saveLoading">Send</span>
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
              Sending...
            </span>
          </Button>
        </div>
      </form>
    </ModalContent>
  </Modal>
</template>
