<template>
  <line
    v-for="index in 5"
    :key="index"
    x1="0"
    :y1="height * (index - 1) + topOffset"
    :x2="lineLength"
    :y2="height * (index - 1) + topOffset"
    :stroke="isDarkMode ? 'rgba(220, 220, 220, 0.1)' : '#dcdcdc'"
  ></line>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useDarkMode } from '@/composables/useDarkMode.ts'

const props = defineProps({
  count: {
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
  distance: {
    type: Number,
    required: true,
  },
})

// dark
const { isDarkMode } = useDarkMode()

// Computed property for lineLength calculation
const lineLength = computed(() => {
  // Sum of distances for each hour, based on count and distance
  return props.count * props.distance
})
</script>
