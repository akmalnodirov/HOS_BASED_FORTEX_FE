<template>
  <path
    :d="path"
    fill="none"
    stroke-width="1"
    stroke-opacity="1"
    :stroke="isDarkMode ? 'rgba(220, 220, 220, 0.1)' : '#DCDCDC'"
  ></path>
</template>

<script lang="ts" setup>
import { ref, watch, onMounted } from 'vue'
import { useDarkMode } from '@/composables/useDarkMode.ts'

const props = defineProps({
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

const path = ref('')

const generatePath = (count: number, distance: number, height: number, topOffset: number) => {
  let d = ''
  for (let i = 0; i <= count; i++) {
    const x = i * distance
    d += `M${x},${topOffset} L${x},${height * 4 + topOffset} `
  }
  return d
}

onMounted(() => {
  path.value = generatePath(props.count, props.distance, props.height, props.topOffset)
})

watch(
  () => [props.count, props.distance, props.height, props.topOffset],
  ([newCount, newDistance, newHeight, newTopOffset]) => {
    path.value = generatePath(newCount as number, newDistance as number, newHeight as number, newTopOffset as number)
  }
)
</script>
