<template>
  <div class="p-[16px_24px]">
    <div class="grid 2xl:grid-cols-7 lg:grid-cols-6 gap-4">
      <!-- All Checkbox -->
      <div
        class="flex items-center space-x-2 lg:max-w-full border border-[#DBDBDB] dark:border-border rounded-md 2xl:p-3 lg:p-2.5 cursor-pointer bg-[#F7F7F7] dark:bg-muted/30 hover:bg-muted/50 transition-colors"
        :class="{ 'opacity-50 cursor-not-allowed': disabled }"
        @click="!disabled && toggleAll()"
      >
        <CCustomCheckbox
          :checked="selectAll"
          :disabled="disabled"
          @update:checked="!disabled && toggleAll()"
        />
        <span class="text-sm font-normal leading-none select-none">All</span>
      </div>

      <!-- Individual Filters -->
      <div
        v-for="option in options"
        :key="option.id"
        class="flex items-center space-x-2 lg:max-w-full border border-[#DBDBDB] dark:border-border rounded-md 2xl:p-3 lg:p-2.5 cursor-pointer bg-[#F7F7F7] dark:bg-muted/30 hover:bg-muted/50 transition-colors"
        :class="{ 'opacity-50 cursor-not-allowed': disabled }"
        @click="!disabled && toggleOption(option.id)"
      >
        <CCustomCheckbox
          :checked="modelValue[option.id]"
          :disabled="disabled"
          @update:checked="!disabled && toggleOption(option.id)"
        />
        <span class="text-sm font-normal leading-none select-none">
          {{ option.name }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import CCustomCheckbox from '@/components/custom/CCustomCheckbox.vue'
import type { OptimizeCategory } from '../../Boost/types/boost'

const props = defineProps<{
  options: OptimizeCategory[]
  modelValue: Record<string, boolean>
  selectAll: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: Record<string, boolean>): void
  (e: 'update:selectAll', value: boolean): void
}>()

const toggleAll = () => {
  emit('update:selectAll', !props.selectAll)
}

const toggleOption = (id: string) => {
  const newValue = { ...props.modelValue }
  newValue[id] = !newValue[id]
  emit('update:modelValue', newValue)
}
</script>
