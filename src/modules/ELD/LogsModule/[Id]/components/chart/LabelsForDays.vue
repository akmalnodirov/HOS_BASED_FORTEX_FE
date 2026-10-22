<template>
  <g>
    <text
      ref="verticalSeparator"
      v-for="(item, key) in generatedLabels"
      :key="key"
      stroke-width="2"
      :font-weight="isDayName(item.label) ? 600 : 400"
      :font-size="isDayName(item.label) && item.label.length > 1 ? (edit ? 12 : 16) : edit ? 10 : 14"
      :x="item.x || 0"
      :y="item.y"
      :text-anchor="item.textAnchor"
      :fill="
        isDayName(item.label)
          ? isDarkMode
            ? '#FFFFFFB2'
            : '#222222'
          : isDarkMode
            ? '#9295A1'
            : '#9295A1'
      "
    >
      {{ item.label }}
    </text>
  </g>
</template>

<script lang="ts" setup>
import { computed, type PropType } from 'vue'
import { useDarkMode } from '@/composables/useDarkMode.ts'

const props = defineProps({
  count: {
    type: Number,
    required: true,
  },
  dayNames: {
    type: Array as PropType<string[]>,
    required: true,
  },
  distance: {
    type: Number,
    required: true,
  },
  edit: {
    type: Boolean,
    default: false,
  },
})

const { isDarkMode } = useDarkMode()

const isDayName = (label: string) => Number.isNaN(Number(label))
const generateHourLabel = (hour: number, dayNames: string[]): string => {
  const adjustedHour = hour % 24
  if (adjustedHour === 0 && dayNames?.length > 0) {
    return dayNames[Math.floor(hour / 24) % dayNames.length]
  } else if (adjustedHour === 12) {
    return 'N'
  } else {
    return String(adjustedHour % 12 || 12)
  }
}

const generatedLabels = computed(() => {
  return Array.from({ length: props.count }, (_, i) => {
    const label = generateHourLabel(i, props.dayNames)
    return {
      label,
      x: i * props.distance,
      y: 14.104166666666668,
      textAnchor: i === 0 ? 'start' : 'middle',
    }
  })
})
</script>
