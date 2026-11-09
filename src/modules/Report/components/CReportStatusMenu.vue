<script setup lang="ts">
import { ref } from 'vue'
import { Loader2 } from 'lucide-vue-next'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { operationStatusClass, operationStatusLabel } from '@/modules/Report/utils/operations'

interface StatusOption {
  value: number
  label: string
}

const props = withDefaults(
  defineProps<{
    modelValue: number | null
    options: StatusOption[]
    disabledValues?: number[]
    loading?: boolean
    placeholder?: string
  }>(),
  { disabledValues: () => [], placeholder: 'Select status' }
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: number): void
}>()

const open = ref(false)

function select(value: number) {
  if (props.loading || props.disabledValues.includes(value)) return
  open.value = false
  emit('update:modelValue', value)
}
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <button
        type="button"
        class="inline-flex min-h-8 min-w-32 items-center justify-center whitespace-nowrap rounded-md px-2 py-1 text-xs font-semibold hover:ring-2 hover:ring-primary/30"
        :class="modelValue === null ? 'border border-border bg-background text-muted-foreground' : operationStatusClass(modelValue)"
        :aria-label="modelValue === null ? placeholder : `Change status from ${operationStatusLabel(modelValue)}`"
        :aria-busy="loading"
        :disabled="loading"
        @click.stop
        @keydown.enter.stop
        @keydown.space.stop
      >
        <Loader2 v-if="loading" class="mr-2 h-3.5 w-3.5 animate-spin" />
        {{ modelValue === null ? placeholder : options.find((item) => item.value === modelValue)?.label ?? operationStatusLabel(modelValue) }}
      </button>
    </PopoverTrigger>
    <PopoverContent class="w-44 p-1" align="start">
      <button
        v-for="item in options"
        :key="item.value"
        type="button"
        class="mb-1 flex w-full items-center rounded-md px-2 py-1.5 text-left text-xs font-semibold last:mb-0 hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
        :class="operationStatusClass(item.value)"
        :disabled="disabledValues.includes(item.value)"
        @click.stop="select(item.value)"
      >
        {{ item.label }}
      </button>
    </PopoverContent>
  </Popover>
</template>
