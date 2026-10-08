<template>
  <ul
    :style="{ marginTop: `${topOffset + 10}px`, fontSize: `${edit ? 11 : 13}px` }"
    class="h-fit shrink-0 w-16 relative text-foreground"
  >
    <li
      v-if="route.path.includes('boost') || route.path.includes('ai')"
      class="uppercase text-xs font-bold flex items-center justify-center absolute -top-[18px] left-3"
    >
      {{ dayName }}
    </li>
    <li :style="{ height: `${height}px` }" class="font-bold flex items-center justify-center">
      {{
        isNaN(dailySummary?.dailyOffDuty)
          ? '0.00'
          : convertSecondsToHoursFraction(dailySummary?.dailyOffDuty) + ' h'
      }}
    </li>
    <li :style="{ height: `${height}px` }" class="font-bold flex items-center justify-center">
      {{
        isNaN(dailySummary?.dailySleeperBerth)
          ? '0.00'
          : convertSecondsToHoursFraction(dailySummary?.dailySleeperBerth) + ' h'
      }}
    </li>
    <li :style="{ height: `${height}px` }" class="font-bold flex items-center justify-center">
      {{
        isNaN(dailySummary?.dailyDriving)
          ? '0.00'
          : convertSecondsToHoursFraction(dailySummary?.dailyDriving) + ' h'
      }}
    </li>
    <li :style="{ height: `${height}px` }" class="font-bold flex items-center justify-center">
      {{
        isNaN(dailySummary?.dailyOnDuty)
          ? '0.00'
          : convertSecondsToHoursFraction(dailySummary?.dailyOnDuty) + ' h'
      }}
    </li>
  </ul>
</template>

<script setup lang="ts">
import { convertSecondsToHoursFraction } from '@/helpers/time.ts'
import { useRoute } from 'vue-router'

const route = useRoute()

const props = defineProps<{
  dayName: string
  dailySummary: any
  height: number
  topOffset: number
  edit: boolean
}>()
</script>
