<template>
  <line
    v-for="i in count"
    :key="i"
    :x1="i * distance - distance / 4"
    :y1="topOffset"
    :x2="i * distance - distance / 4"
    :y2="height * 4 + topOffset"
    fill="none"
    :stroke-dasharray="`0,${(height * 3) / 4},${(height * 1) / 4},${(height * 3) / 4},${(height * 1) / 4},${(height * 3) / 4},${(height * 1) / 4},${(height * 3) / 4},${(height * 1) / 4},${(height * 3) / 4},${(height * 1) / 4},${(height * 3) / 4},${(height * 1) / 4},${(height * 3) / 4},${(height * 1) / 4},${(height * 3) / 4},${(height * 1) / 4},${(height * 3) / 4},${(height * 1) / 4},${(height * 3) / 4},${(height * 1) / 4},${(height * 3) / 4},${(height * 1) / 4},${(height * 3) / 4},${(height * 1) / 4},${(height * 3) / 4},${(height * 1) / 4},${(height * 3) / 4},${(height * 1) / 4},${(height * 3) / 4},${(height * 1) / 4},${(height * 3) / 4},${(height * 1) / 4}`"
    stroke-width="1"
    stroke-opacity="1"
    :stroke="isDarkMode ? 'rgba(220, 220, 220, 0.1)' : '#dcdcdc'"
  ></line>
  <line
    v-for="i in count"
    :key="i + 'a'"
    :x1="i * distance - (distance * 3) / 4"
    :y1="topOffset"
    :x2="i * distance - (distance * 3) / 4"
    :y2="height * 4 + topOffset"
    fill="none"
    :stroke-dasharray="`0,${(height * 3) / 4},${(height * 1) / 4},${(height * 3) / 4},${(height * 1) / 4},${(height * 3) / 4},${(height * 1) / 4},${(height * 3) / 4},${(height * 1) / 4},${(height * 3) / 4},${(height * 1) / 4},${(height * 3) / 4},${(height * 1) / 4},${(height * 3) / 4},${(height * 1) / 4},${(height * 3) / 4},${(height * 1) / 4},${(height * 3) / 4},${(height * 1) / 4},${(height * 3) / 4},${(height * 1) / 4},${(height * 3) / 4},${(height * 1) / 4},${(height * 3) / 4},${(height * 1) / 4},${(height * 3) / 4},${(height * 1) / 4},${(height * 3) / 4},${(height * 1) / 4},${(height * 3) / 4},${(height * 1) / 4},${(height * 3) / 4},${(height * 1) / 4}`"
    stroke-width="1"
    stroke-opacity="1"
    :stroke="isDarkMode ? 'rgba(220, 220, 220, 0.1)' : '#dcdcdc'"
  ></line>
</template>

<script lang="ts" setup>
import { useDarkMode } from '@/composables/useDarkMode.ts'

defineProps({
  count: {
    type: Number,
    required: true,
  },
  distance: {
    type: Number,
    required: true,
  },
  height: {
    type: Number,
    required: true,
  },
  topOffset: {
    type: Number,
    required: true,
    default: 20,
  },
})

const { isDarkMode } = useDarkMode()
</script>
