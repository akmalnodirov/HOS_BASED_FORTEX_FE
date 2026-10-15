<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { HTMLAttributes } from 'vue'
import { Clock } from 'lucide-vue-next'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Props {
  modelValue?: string
  placeholder?: string
  class?: HTMLAttributes['class']
  disabled?: boolean
  includeSeconds?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Select time',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const isOpen = ref(false)
const hours = ref('00')
const minutes = ref('00')
const seconds = ref('00')
const hoursInput = ref<HTMLInputElement | null>(null)
const minutesInput = ref<HTMLInputElement | null>(null)
const secondsInput = ref<HTMLInputElement | null>(null)

// Parse initial value
watch(
  () => props.modelValue,
  (value) => {
    if (value && value.includes(':')) {
      const [h, m, s = '00'] = value.split(':')
      
      // Update hours only if it differs numerically or if current local value is empty (and strictly different)
      // This prevents overwriting "1" with "01" while typing, which blocks "12"
      if (hours.value === '' || parseInt(hours.value) !== parseInt(h)) {
         hours.value = h.padStart(2, '0')
      }
      
      // Same for minutes
      if (minutes.value === '' || parseInt(minutes.value) !== parseInt(m)) {
         minutes.value = m.padStart(2, '0')
      }

      if (seconds.value === '' || parseInt(seconds.value) !== parseInt(s)) {
        seconds.value = s.padStart(2, '0')
      }
    }
  },
  { immediate: true }
)

// Format time for display
const formattedTime = computed(() => {
  if (!props.modelValue) return props.placeholder
  return props.includeSeconds
    ? `${hours.value}:${minutes.value}:${seconds.value}`
    : `${hours.value}:${minutes.value}`
})

// Update hours
const updateHours = (event: Event) => {
  const target = event.target as HTMLInputElement
  const value = target.value
  
  // Allow empty string during typing
  if (value === '') {
    hours.value = ''
    return
  }
  
  // Remove non-numeric characters
  const numericValue = value.replace(/\D/g, '')
  
  // If empty after removing non-numeric, set to empty
  if (numericValue === '') {
    hours.value = ''
    return
  }
  
  // Parse the numeric value
  let num = parseInt(numericValue, 10)
  
  // If the value is longer than 2 digits, take only first 2
  if (numericValue.length > 2) {
    num = parseInt(numericValue.substring(0, 2), 10)
  }
  
  // Validate range
  if (num > 23) num = 23
  if (num < 0) num = 0
  
  // Store as string without padding during typing (padding will be done on blur)
  hours.value = num.toString()
  emitValue()

  // Auto-focus minutes if 2 digits are entered
  if (numericValue.length >= 2 && minutesInput.value) {
    minutesInput.value.focus()
    // Optional: Select all text in minutes for easy replacement
    minutesInput.value.setSelectionRange(0, minutesInput.value.value.length)
  }
}

// Update minutes
const updateMinutes = (event: Event) => {
  const target = event.target as HTMLInputElement
  const value = target.value
  
  // Allow empty string during typing
  if (value === '') {
    minutes.value = ''
    return
  }
  
  // Remove non-numeric characters
  const numericValue = value.replace(/\D/g, '')
  
  // If empty after removing non-numeric, set to empty
  if (numericValue === '') {
    minutes.value = ''
    return
  }
  
  // Parse the numeric value
  let num = parseInt(numericValue, 10)
  
  // If the value is longer than 2 digits, take only first 2
  if (numericValue.length > 2) {
    num = parseInt(numericValue.substring(0, 2), 10)
  }
  
  // Validate range
  if (num > 59) num = 59
  if (num < 0) num = 0
  
  // Store as string without padding during typing (padding will be done on blur)
  minutes.value = num.toString()
  emitValue()

  if (props.includeSeconds && numericValue.length >= 2 && secondsInput.value) {
    secondsInput.value.focus()
    secondsInput.value.setSelectionRange(0, secondsInput.value.value.length)
  }
}

const updateSeconds = (event: Event) => {
  const target = event.target as HTMLInputElement
  const numericValue = target.value.replace(/\D/g, '')
  if (numericValue === '') {
    seconds.value = ''
    return
  }
  const num = Math.min(59, Math.max(0, parseInt(numericValue.substring(0, 2), 10)))
  seconds.value = num.toString()
  emitValue()
}

// Emit updated value
const emitValue = () => {
  // Only emit if both values are valid (not empty)
  if (
    hours.value !== '' &&
    minutes.value !== '' &&
    (!props.includeSeconds || seconds.value !== '')
  ) {
    const h = hours.value.padStart(2, '0')
    const m = minutes.value.padStart(2, '0')
    const s = seconds.value.padStart(2, '0')
    emit('update:modelValue', props.includeSeconds ? `${h}:${m}:${s}` : `${h}:${m}`)
  }
}

// Increment/decrement functions
const incrementHours = () => {
  const num = (parseInt(hours.value) + 1) % 24
  hours.value = num.toString().padStart(2, '0')
  emitValue()
}

const decrementHours = () => {
  const num = (parseInt(hours.value) - 1 + 24) % 24
  hours.value = num.toString().padStart(2, '0')
  emitValue()
}

const incrementMinutes = () => {
  const num = (parseInt(minutes.value) + 1) % 60
  minutes.value = num.toString().padStart(2, '0')
  emitValue()
}

const decrementMinutes = () => {
  const num = (parseInt(minutes.value) - 1 + 60) % 60
  minutes.value = num.toString().padStart(2, '0')
  emitValue()
}

const incrementSeconds = () => {
  const num = (parseInt(seconds.value || '0') + 1) % 60
  seconds.value = num.toString().padStart(2, '0')
  emitValue()
}

const decrementSeconds = () => {
  const num = (parseInt(seconds.value || '0') - 1 + 60) % 60
  seconds.value = num.toString().padStart(2, '0')
  emitValue()
}

const adjustWithWheel = (unit: 'hours' | 'minutes' | 'seconds', event: WheelEvent) => {
  const increment = event.deltaY < 0
  if (unit === 'hours') {
    if (increment) incrementHours()
    else decrementHours()
  } else if (unit === 'minutes') {
    if (increment) incrementMinutes()
    else decrementMinutes()
  } else if (increment) incrementSeconds()
  else decrementSeconds()
}

// Handle numeric input only
const handleNumericInput = (event: KeyboardEvent) => {
  const allowedKeys = ['Backspace', 'Tab', 'ArrowLeft', 'ArrowRight', 'Delete']
  if (allowedKeys.includes(event.key)) return
  if (!/^\d$/.test(event.key)) {
    event.preventDefault()
  }
}

// Handle input focus to select all or set cursor to end
const handleHoursFocus = (event: FocusEvent) => {
  const target = event.target as HTMLInputElement
  // Select all text for easy replacement, or position cursor at end
  target.setSelectionRange(0, target.value.length)
}

const handleMinutesFocus = (event: FocusEvent) => {
  const target = event.target as HTMLInputElement
  // Select all text for easy replacement, or position cursor at end
  target.setSelectionRange(0, target.value.length)
}

const handleSecondsFocus = (event: FocusEvent) => {
  const target = event.target as HTMLInputElement
  target.setSelectionRange(0, target.value.length)
}

// Handle input blur to format
const handleHoursBlur = () => {
  if (hours.value === '' || hours.value === '0' || isNaN(parseInt(hours.value))) {
    hours.value = '00'
  } else {
    hours.value = hours.value.padStart(2, '0')
  }
  emitValue()
}

const handleMinutesBlur = () => {
  if (minutes.value === '' || minutes.value === '0' || isNaN(parseInt(minutes.value))) {
    minutes.value = '00'
  } else {
    minutes.value = minutes.value.padStart(2, '0')
  }
  emitValue()
}

const handleSecondsBlur = () => {
  if (seconds.value === '' || seconds.value === '0' || isNaN(parseInt(seconds.value))) {
    seconds.value = '00'
  } else {
    seconds.value = seconds.value.padStart(2, '0')
  }
  emitValue()
}

// Set current time
const setCurrentTime = () => {
  const now = new Date()
  hours.value = now.getHours().toString().padStart(2, '0')
  minutes.value = now.getMinutes().toString().padStart(2, '0')
  seconds.value = now.getSeconds().toString().padStart(2, '0')
  emitValue()
}
</script>

<template>
  <Popover v-model:open="isOpen">
    <PopoverTrigger as-child>
      <Button
        variant="outline"
        :disabled="disabled"
        :class="
          cn(
            'w-full justify-start text-left font-normal',
            !modelValue && 'text-muted-foreground',
            props.class
          )
        "
      >
        <Clock class="mr-2 h-4 w-4" />
        <span>{{ formattedTime }}</span>
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-auto p-0" align="start">
      <div class="p-4 space-y-4">
        <!-- Time Display -->
        <div class="flex items-center justify-center gap-2 text-2xl font-semibold">
          <div class="flex flex-col items-center">
            <button
              type="button"
              @click="incrementHours"
              class="p-1 hover:bg-accent rounded"
              :disabled="disabled"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="18 15 12 9 6 15"></polyline>
              </svg>
            </button>
            <input
              ref="hoursInput"
              :value="hours"
              type="text"
              inputmode="numeric"
              maxlength="2"
              class="w-16 text-center text-2xl h-12 p-0 rounded-md border border-input bg-background shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="disabled"
              @input="updateHours"
              @focus="handleHoursFocus"
              @blur="handleHoursBlur"
              @keydown="handleNumericInput"
              @wheel.prevent="adjustWithWheel('hours', $event)"
            />
            <button
              type="button"
              @click="decrementHours"
              class="p-1 hover:bg-accent rounded"
              :disabled="disabled"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
          </div>

          <span class="text-muted-foreground">:</span>

          <div class="flex flex-col items-center">
            <button
              type="button"
              @click="incrementMinutes"
              class="p-1 hover:bg-accent rounded"
              :disabled="disabled"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="18 15 12 9 6 15"></polyline>
              </svg>
            </button>
            <input
              ref="minutesInput"
              :value="minutes"
              type="text"
              inputmode="numeric"
              maxlength="2"
              class="w-16 text-center text-2xl h-12 p-0 rounded-md border border-input bg-background shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="disabled"
              @input="updateMinutes"
              @focus="handleMinutesFocus"
              @blur="handleMinutesBlur"
              @keydown="handleNumericInput"
              @wheel.prevent="adjustWithWheel('minutes', $event)"
            />
            <button
              type="button"
              @click="decrementMinutes"
              class="p-1 hover:bg-accent rounded"
              :disabled="disabled"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
          </div>

          <template v-if="includeSeconds">
            <span class="text-muted-foreground">:</span>

            <div class="flex flex-col items-center">
              <button
                type="button"
                class="p-1 hover:bg-accent rounded"
                :disabled="disabled"
                @click="incrementSeconds"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="18 15 12 9 6 15"></polyline>
                </svg>
              </button>
              <input
                ref="secondsInput"
                :value="seconds"
                type="text"
                inputmode="numeric"
                maxlength="2"
                class="w-16 text-center text-2xl h-12 p-0 rounded-md border border-input bg-background shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="disabled"
                @input="updateSeconds"
                @focus="handleSecondsFocus"
                @blur="handleSecondsBlur"
                @keydown="handleNumericInput"
                @wheel.prevent="adjustWithWheel('seconds', $event)"
              />
              <button
                type="button"
                class="p-1 hover:bg-accent rounded"
                :disabled="disabled"
                @click="decrementSeconds"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
            </div>
          </template>
        </div>

        <!-- Actions -->
        <div class="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            class="flex-1"
            @click="setCurrentTime"
            :disabled="disabled"
          >
            Now
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            class="flex-1"
            @click="isOpen = false"
          >
            OK
          </Button>
        </div>
      </div>
    </PopoverContent>
  </Popover>
</template>
