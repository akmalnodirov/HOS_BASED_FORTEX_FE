<template>
  <span
    class="px-3 py-1 rounded text-[10px] font-bold text-center uppercase tracking-tight whitespace-nowrap"
    :class="getEventBadgeClass(eventType, eventCode)"
  >
    {{ getEventLabel(eventType, eventCode) }}
  </span>
</template>

<script setup lang="ts">
import { getEventLabel, getEventBadgeClass } from '@/utils/events.ts'

defineProps<{
  eventCode: number
  eventType: number
}>()
</script>
