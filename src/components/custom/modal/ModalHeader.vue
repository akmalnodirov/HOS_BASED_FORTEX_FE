<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils.ts'

interface Props {
  class?: HTMLAttributes['class']
}

defineProps<Props>()
</script>

<template>
  <div class="mb-5" :class="cn('flex flex-col space-y-1.5 text-center sm:text-left', $attrs.class)">
    <slot />
  </div>
</template>
