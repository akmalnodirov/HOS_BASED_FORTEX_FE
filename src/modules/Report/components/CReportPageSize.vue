<template>
  <div class="flex items-center gap-2 text-xs text-muted-foreground">
    <span class="whitespace-nowrap">Page size</span>
    <Select :model-value="modelValue" @update:model-value="value => emit('update:modelValue', String(value))">
      <SelectTrigger class="h-8 w-24 bg-background text-xs"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All</SelectItem>
        <SelectItem value="25">25</SelectItem>
        <SelectItem value="50">50</SelectItem>
        <SelectItem value="100">100</SelectItem>
      </SelectContent>
    </Select>
  </div>
</template>

<script setup lang="ts">
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
</script>
