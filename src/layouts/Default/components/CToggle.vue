<template>
  <div
    v-if="isOpen"
    class="fixed top-[12px] z-[51] transition-all duration-300"
    :class="[isOpen ? 'left-[228px]' : 'left-[-5px]']"
  >
    <Button
      class="h-10 w-10 rounded-lg cursor-pointer bg-white dark:bg-card border border-gray-300 dark:border-border shadow-md hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-lg transition-all"
      size="icon"
      @click="emit('toggle')"
    >
      <div class="flex items-center justify-center">
        <ChevronLeft class="w-4 h-4 text-gray-700 dark:text-gray-300" />
        <ChevronRight class="w-4 h-4 text-gray-700 dark:text-gray-300 -ml-2" />
      </div>
    </Button>
  </div>
</template>

<script setup lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle'): void
}>()
</script>
