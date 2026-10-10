<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <button
        type="button"
        class="flex h-10 min-w-[190px] items-center justify-between gap-3 rounded-md border border-border bg-card px-3 transition-colors hover:bg-muted"
      >
        <span class="flex items-center gap-2">
          <Calendar class="h-4 w-4 text-muted-foreground" />
          <span class="text-sm text-foreground">{{ label }}</span>
        </span>
        <ChevronDown class="h-4 w-4 text-muted-foreground" />
      </button>
    </PopoverTrigger>
    <PopoverContent class="w-72 p-3" align="end">
      <div class="mb-3 flex items-center justify-between">
        <button
          type="button"
          class="rounded-md p-1.5 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="pickerYear <= 2000"
          @click="pickerYear--"
        >
          <ChevronLeft class="h-4 w-4" />
        </button>
        <span class="text-sm font-semibold text-foreground">{{ pickerYear }}</span>
        <button
          type="button"
          class="rounded-md p-1.5 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="pickerYear >= maximumYear"
          @click="pickerYear++"
        >
          <ChevronRight class="h-4 w-4" />
        </button>
      </div>
      <div class="grid grid-cols-3 gap-1.5">
        <button
          v-for="(name, index) in monthNames"
          :key="name"
          type="button"
          class="h-9 rounded-md text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-35"
          :class="buttonClass(index + 1)"
          :disabled="isDisabled(index + 1)"
          @click="selectMonth(index + 1)"
        >
          {{ name }}
        </button>
      </div>
    </PopoverContent>
  </Popover>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

const props = defineProps<{
  modelValue: string
  maximum: string
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
}>()

const open = ref(false)
const pickerYear = ref(Number(props.modelValue.slice(0, 4)))
const maximumYear = computed(() => Number(props.maximum.slice(0, 4)))
const monthNames = Array.from({ length: 12 }, (_, index) =>
  new Intl.DateTimeFormat('en-US', { month: 'short' }).format(new Date(2000, index, 1))
)
const label = computed(() => {
  const [year, month] = props.modelValue.split('-').map(Number)
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(
    new Date(year, month - 1, 1)
  )
})

watch(
  () => props.modelValue,
  (value) => {
    pickerYear.value = Number(value.slice(0, 4))
  }
)

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function valueFor(month: number): string {
  return `${pickerYear.value}-${pad(month)}`
}

function isDisabled(month: number): boolean {
  return valueFor(month) > props.maximum
}

function buttonClass(month: number): string {
  return valueFor(month) === props.modelValue
    ? 'bg-primary text-primary-foreground'
    : 'text-foreground hover:bg-muted'
}

function selectMonth(month: number) {
  if (isDisabled(month)) return
  emit('update:modelValue', valueFor(month))
  open.value = false
}
</script>
