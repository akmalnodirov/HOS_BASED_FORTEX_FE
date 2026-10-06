<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronDown, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import CCustomCheckbox from '@/components/custom/CCustomCheckbox.vue'
import type { IftaSelectOption } from '../types'

const props = withDefaults(
  defineProps<{
    modelValue: string[]
    options: IftaSelectOption[]
    placeholder?: string
    searchable?: boolean
    showChips?: boolean
    disabled?: boolean
    searchPlaceholder?: string
  }>(),
  {
    placeholder: 'Select',
    searchable: false,
    showChips: false,
    disabled: false,
    searchPlaceholder: 'Search',
  }
)
const emit = defineEmits<{ (e: 'update:modelValue', value: string[]): void }>()
const search = ref('')
const selected = computed(() => new Set(props.modelValue))
const selectedOptions = computed(() =>
  props.options.filter((option) => selected.value.has(option.value))
)
const filteredOptions = computed(() =>
  props.options.filter((option) =>
    option.label.toLowerCase().includes(search.value.trim().toLowerCase())
  )
)
const summary = computed(() => {
  if (!props.modelValue.length) return props.placeholder
  if (props.modelValue.length === 1) return selectedOptions.value[0]?.label || props.modelValue[0]
  return `${props.modelValue.length} selected`
})
function toggle(value: string) {
  if (props.disabled) return
  search.value = ''
  emit(
    'update:modelValue',
    selected.value.has(value)
      ? props.modelValue.filter((item) => item !== value)
      : [...props.modelValue, value]
  )
}
</script>

<template>
  <div>
    <Popover>
      <PopoverTrigger as-child>
        <Button
          type="button"
          variant="outline"
          :disabled="disabled"
          class="w-full justify-between font-normal"
        >
          <span class="truncate" :class="{ 'text-muted-foreground': !modelValue.length }">{{
            summary
          }}</span>
          <ChevronDown class="h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" class="w-[var(--reka-popover-trigger-width)] min-w-60 p-0">
        <div v-if="searchable" class="p-2 border-b border-border">
          <Input
            v-model="search"
            :placeholder="searchPlaceholder"
            :aria-label="searchPlaceholder"
          />
        </div>
        <div class="max-h-64 overflow-y-auto py-1">
          <div
            v-for="option in filteredOptions"
            :key="option.value"
            class="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-accent"
            @click="toggle(option.value)"
          >
            <CCustomCheckbox
              :checked="selected.has(option.value)"
              :disabled="disabled"
              :aria-label="option.label"
              @update:checked="toggle(option.value)"
            />
            <span class="truncate">{{ option.label }}</span>
          </div>
          <div
            v-if="!filteredOptions.length"
            class="py-4 text-center text-sm text-muted-foreground"
          >
            No matches
          </div>
        </div>
        <div v-if="modelValue.length" class="p-2 border-t border-border">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            :disabled="disabled"
            @click="emit('update:modelValue', [])"
            >Clear ({{ modelValue.length }})</Button
          >
        </div>
      </PopoverContent>
    </Popover>
    <div v-if="showChips && selectedOptions.length" class="flex flex-wrap gap-2 mt-2">
      <span
        v-for="option in selectedOptions"
        :key="option.value"
        class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
      >
        {{ option.label }}
        <button
          type="button"
          :disabled="disabled"
          :aria-label="`Remove ${option.label}`"
          class="ml-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          @click="toggle(option.value)"
        >
          <X class="h-3 w-3" />
        </button>
      </span>
    </div>
  </div>
</template>
