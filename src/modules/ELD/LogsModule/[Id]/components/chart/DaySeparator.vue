<template>
  <svg ref="svgElementDaySeparator">
    <path
      v-for="(separatorPath, index) in separators"
      :key="index"
      :ref="addSeparatorRef"
      fill="none"
      :d="separatorPath"
      :data-key="index"
      stroke-width="2"
      stroke-opacity="1"
      :stroke="isDarkMode ? '#7588BF' : '#465a95'"
    ></path>
  </svg>
</template>

<script lang="ts" setup>
import { onMounted, ref, watch } from 'vue'
import { useDarkMode } from '@/composables/useDarkMode.ts'

const separators = ref([])
const separatorRefs = ref([])

const { isDarkMode } = useDarkMode()

const addSeparatorRef = (el) => {
  if (el) separatorRefs.value.push(el)
}

const props = defineProps({
  count: {
    type: Number,
    required: true,
  },
  topOffset: {
    type: Number,
    required: true,
    default: 20,
  },
  height: {
    type: Number,
    required: true,
    default: 12,
  },
  distance: {
    type: Number,
    required: true,
  },
})

const calculateSeparators = (count) => {
  let start = 0
  let separatorPaths = []
  for (let i = 0; i < count; i++) {
    let newX = 0
    if (i % 24 === 0 && i !== 0) {
      newX = start + i * props.distance
      separatorPaths.push(`M ${newX} ${props.topOffset} L ${newX} ${props.height * 5}`)
    }
  }
  return separatorPaths
}

watch([() => props.count, () => props.distance], ([newCount]) => {
  separators.value = calculateSeparators(newCount)
})

onMounted(() => {
  separators.value = calculateSeparators(props.count)
})

defineExpose({
  separatorRefs,
})
</script>
