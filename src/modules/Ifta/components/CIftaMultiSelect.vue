<template>
  <div>
    <div v-if="showChips && selectedOptions.length" class="mb-2 flex flex-wrap gap-1.5">
      <span
        v-for="option in selectedOptions"
        :key="option.value"
        class="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2 py-0.5 text-xs text-foreground"
      >
        {{ option.label }}
        <button
          type="button"
          class="text-muted-foreground hover:text-foreground"
          @click="toggle(option.value)"
        >
          <X class="h-3 w-3" />
        </button>
      </span>
    </div>
    <Popover>
      <PopoverTrigger as-child>
        <button
          type="button"
          class="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-border bg-white px-3 text-sm dark:bg-card"
        >
          <span
            class="truncate"
            :class="modelValue.length ? 'text-foreground' : 'text-muted-foreground'"
          >
            {{ summary }}
          </span>
          <ChevronDown class="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent class="w-[var(--reka-popover-trigger-width)] min-w-[240px] p-0" align="start">
        <div v-if="searchable" class="border-b border-border p-2">
          <Input v-model="search" :placeholder="searchPlaceholder" class="h-8" />
        </div>
        <div class="max-h-64 overflow-auto py-1">
          <button
            v-for="option in filtered"
            :key="option.value"
            type="button"
            class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-accent dark:hover:bg-muted"
            @click="toggle(option.value)"
          >
            <span
              class="flex h-4 w-4 shrink-0 items-center justify-center rounded border"
              :class="
                selected.has(option.value)
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border'
              "
            >
              <Check v-if="selected.has(option.value)" class="h-3 w-3" />
            </span>
            <span class="truncate">{{ option.label }}</span>
          </button>
          <div v-if="!filtered.length" class="px-3 py-4 text-center text-xs text-muted-foreground">
            No matches
          </div>
        </div>
        <div v-if="modelValue.length" class="border-t border-border p-2">
          <button
            type="button"
            class="text-xs text-muted-foreground hover:text-foreground"
            @click="emit('update:modelValue', [])"
          >
            Clear ({{ modelValue.length }})
          </button>
        </div>
      </PopoverContent>
    </Popover>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Check, ChevronDown, X } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface Option {
  value: string
  label: string
}

const props = withDefaults(
  defineProps<{
    modelValue: string[]
    options: Option[]
    placeholder?: string
    searchable?: boolean
    searchPlaceholder?: string
    showChips?: boolean
  }>(),
  { placeholder: 'Select', searchable: false, searchPlaceholder: 'Search', showChips: false }
)
const emit = defineEmits<{ (event: 'update:modelValue', value: string[]): void }>()

const search = ref('')
const selected = computed(() => new Set(props.modelValue))
const filtered = computed(() => {
  const term = search.value.trim().toLowerCase()
  if (!term) return props.options
  return props.options.filter((option) => option.label.toLowerCase().includes(term))
})
const selectedOptions = computed(() =>
  props.options.filter((option) => selected.value.has(option.value))
)
const summary = computed(() => {
  if (!props.modelValue.length) return props.placeholder
  if (props.modelValue.length === 1) {
    const match = props.options.find((option) => option.value === props.modelValue[0])
    return match?.label ?? props.modelValue[0]
  }
  return `${props.modelValue.length} selected`
})

function toggle(value: string) {
  search.value = ''
  emit(
    'update:modelValue',
    selected.value.has(value)
      ? props.modelValue.filter((item) => item !== value)
      : [...props.modelValue, value]
  )
}
</script>
