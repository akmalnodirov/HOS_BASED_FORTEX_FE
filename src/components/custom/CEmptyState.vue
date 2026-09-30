<script setup lang="ts">
import type { LucideIcon } from 'lucide-vue-next'

interface Props {
  icon?: LucideIcon
  title?: string
  description?: string
}

withDefaults(defineProps<Props>(), {
  title: 'No data available',
  description: 'There are no items to display at the moment.',
})
</script>

<template>
  <div class="flex flex-col items-center justify-center py-12 px-4 text-center">
    <div v-if="icon" class="mb-4">
      <component :is="icon" class="w-12 h-12 text-gray-300 dark:text-gray-600" />
    </div>
    <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
      {{ title }}
    </h3>
    <p v-if="description" class="text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
      {{ description }}
    </p>
    <div class="mt-6">
      <slot name="actions" />
    </div>
  </div>
</template>
