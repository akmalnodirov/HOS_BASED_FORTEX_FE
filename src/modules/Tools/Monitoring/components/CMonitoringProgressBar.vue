<template>
  <div class="space-y-2">
    <div class="flex items-center justify-between text-sm">
      <span class="text-muted-foreground"> {{ completed }} / {{ total }} Analysis </span>
    </div>
    <div class="flex gap-1 flex-wrap">
      <div
        v-for="(segment, index) in segments"
        :key="index"
        :class="[
          'w-2 h-4 rounded-xs transition-all',
          segment === 'problem' && 'bg-[#F0F0F0]',
          segment === 'clear' && 'bg-[#589E67]',
        ]"
      />
    </div>
  </div>
</template>
<!-- src/components/monitoring/ProgressBar.vue -->
<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  completed: number
  total: number
  problems: number
}

const props = defineProps<Props>()

// Calculate counts
const clearCount = props.completed - props.problems

// Generate segments array
const segments = ref<('problem' | 'clear')[]>([])

// Fill segments
for (let i = 0; i < clearCount; i++) {
  segments.value.push('clear')
}
for (let i = 0; i < props.problems; i++) {
  segments.value.push('problem')
}
</script>
