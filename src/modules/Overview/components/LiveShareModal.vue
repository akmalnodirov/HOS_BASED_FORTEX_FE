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
import { Plus, Minus, Calendar, Check, CheckCircle2, Copy } from 'lucide-vue-next'
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
  shareUrl: string
}

interface Emits {
  'update:open': [value: boolean]
  'add-email': []
  'remove-email': [index: number]
  'add-telegram': []
  'remove-telegram': [index: number]
  submit: []
  'update:email': [index: number, value: string]
  'update:telegram': [index: number, value: string]
  'update:expire-at': [value: Dayjs]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const errors = ref<Record<string, string>>({})
const isCalendarOpen = ref(false)
const copied = ref(false)

const dayjsToCalendarDate = (date: Dayjs): CalendarDate => {
  return new CalendarDate(date.year(), date.month() + 1, date.date())
}

const calendarDateToDayjs = (date: DateValue): Dayjs => {
  return dayjs(new Date(date.year, date.month - 1, date.day))
}

const selectedDate = computed<DateValue>({
  get: () => dayjsToCalendarDate(props.expireAt),
  set: (value: DateValue) => {
    const newDate = calendarDateToDayjs(value)
    const updated = props.expireAt.year(newDate.year()).month(newDate.month()).date(newDate.date())
    emit('update:expire-at', updated)
    isCalendarOpen.value = false
    clearError('expireAt')
  },
})

const selectedTime = computed<string>({
  get: () => props.expireAt.format('HH:mm'),
  set: (value: string) => {
    const [hours, minutes] = value.split(':').map(Number)
    const updated = props.expireAt.hour(hours).minute(minutes)
    emit('update:expire-at', updated)
    clearError('expireAt')
  },
})

const formattedExpireDate = computed(() => {
  return props.expireAt.format('YYYY-MM-DD HH:mm:ss')
})

const validateForm = (): boolean => {
  errors.value = {}
  let isValid = true

  const hasValidEmail = props.emails.some((email) => email.trim() !== '')
  const hasValidTelegram = props.telegrams.some((telegram) => telegram.trim() !== '')

  if (!hasValidEmail && !hasValidTelegram) {
    errors.value.general = 'At least one email or telegram is required'
    isValid = false
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  props.emails.forEach((email, index) => {
    if (email.trim() !== '' && !emailRegex.test(email)) {
      errors.value[`email-${index}`] = 'Invalid email format'
      isValid = false
    }
  })

  if (props.expireAt.isBefore(dayjs())) {
    errors.value.expireAt = 'Expiry date must be in the future'
    isValid = false
  }

  return isValid
}

const handleSubmit = () => {
  if (!validateForm()) {
    return
  }
  emit('submit')
}

const copyLink = async () => {
  if (!props.shareUrl) return
  try {
    await navigator.clipboard.writeText(props.shareUrl)
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch {
    errors.value.general = 'The link could not be copied'
  }
}

const handleClose = () => {
  if (!props.saveLoading) {
    emit('update:open', false)
    errors.value = {}
  }
}

const clearError = (field: string) => {
  delete errors.value[field]
}

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

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) {
      errors.value = {}
      copied.value = false
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
        <div
          v-if="shareUrl"
          class="space-y-3 rounded-md border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/20"
        >
          <div
            class="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300"
          >
            <CheckCircle2 class="h-4 w-4" />
            Live tracking link sent successfully
          </div>
          <div class="flex gap-2">
            <Input :model-value="shareUrl" readonly class="h-10 bg-white dark:bg-card" />
            <Button
              type="button"
              variant="outline"
              size="icon"
              class="h-10 w-10 shrink-0"
              @click="copyLink"
            >
              <Check v-if="copied" class="h-4 w-4 text-emerald-600" />
              <Copy v-else class="h-4 w-4" />
            </Button>
          </div>
        </div>

        <template v-else>
          <!-- General Error -->
          <div
            v-if="errors.general"
            class="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
          >
            <p class="text-sm text-red-600 dark:text-red-400">{{ errors.general }}</p>
          </div>

          <!-- Email Section -->
          <div class="space-y-3">
            <Label>Email</Label>
            <div
              v-for="(email, index) in emails"
              :key="`email-${index}`"
              class="flex gap-2 items-start"
            >
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
            <div
              v-for="(telegram, index) in telegrams"
              :key="`telegram-${index}`"
              class="flex gap-2 items-start"
            >
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
          </div>
        </template>

        <!-- Actions -->
        <div class="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" @click="handleClose" :disabled="saveLoading">
            {{ shareUrl ? 'Done' : 'Cancel' }}
          </Button>
          <Button
            v-if="!shareUrl"
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
