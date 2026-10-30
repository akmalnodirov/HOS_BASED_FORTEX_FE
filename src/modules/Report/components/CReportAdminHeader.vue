<script setup lang="ts">
import { Search } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'

defineProps<{
  title: string
  subtitle: string
  search: string
  placeholder: string
}>()

const emit = defineEmits<{
  (event: 'update:search', value: string): void
}>()
</script>

<template>
  <div class="mb-5 flex flex-none flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
    <div>
      <h2 class="text-xl font-semibold text-foreground">{{ title }}</h2>
      <p class="mt-1 text-sm text-muted-foreground">{{ subtitle }}</p>
    </div>
    <div class="flex flex-wrap items-center gap-3">
      <div class="relative">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input :model-value="search" :placeholder="placeholder" class="w-64 pl-9" @update:model-value="value => emit('update:search', String(value))" />
      </div>
      <slot />
    </div>
  </div>
</template>
