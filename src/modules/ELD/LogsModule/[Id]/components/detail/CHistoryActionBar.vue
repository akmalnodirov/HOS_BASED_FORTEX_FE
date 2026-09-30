<template>
  <div
    class="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg"
  >
    <div class="flex items-center gap-2">
      <History class="w-5 h-5 text-amber-600 dark:text-amber-400" />
      <span class="font-medium text-amber-800 dark:text-amber-200">History Mode</span>
      <span class="text-sm text-amber-600 dark:text-amber-400">
        ({{ selectionCount }} event(s) selected)
      </span>
    </div>
    <div class="flex items-center gap-2">
      <Button variant="outline" size="sm" @click="$emit('transfer-by-period')">
        <Calendar class="w-4 h-4 mr-2" />
        Transfer by Period
      </Button>
      <Button size="sm" :disabled="!hasSelection" @click="$emit('transfer-selected')">
        <ArrowRight class="w-4 h-4 mr-2" />
        Transfer Selected
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { History, Calendar, ArrowRight } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

interface Props {
  selectionCount: number
  hasSelection: boolean
}

defineProps<Props>()

defineEmits<{
  'transfer-selected': []
  'transfer-by-period': []
}>()
</script>