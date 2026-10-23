<template>
  <div class="flex min-w-0 flex-wrap items-center justify-center gap-2">
    <div v-if="freeTimesFiltered.length" class="flex min-w-0 items-center gap-1">
      <Button variant="ghost" size="sm" class="h-8 w-8 shrink-0 p-0" aria-label="Previous free times" @click="scrollLeft">
        <ChevronLeft class="h-4 w-4" />
      </Button>
      <div ref="freeTimesContainer" class="max-w-112.5 overflow-hidden" @wheel.prevent="scrollFreeTimesWithWheel">
        <div ref="freeTimesContent" class="flex items-center gap-2 transition-transform duration-300" :style="{ transform: `translateX(-${scrollOffset}px)` }">
          <button
            v-for="(freeTime, index) in freeTimesFiltered"
            :key="freeTime.eventId || index"
            type="button"
            class="shrink-0 rounded-md border border-[#d6e1ff] bg-[#f8f9fd] px-4 py-1.5 text-xs font-medium text-[#090909] transition-colors hover:border-[#b8c8ff] hover:bg-[#e8ecfa] dark:border-border dark:bg-muted dark:text-foreground dark:hover:bg-muted/80"
            @click="$emit('free-time-click', freeTime)"
          >
            {{ formatHHMM(freeTime.freeDurationInSeconds) }}
          </button>
        </div>
      </div>
      <Button variant="ghost" size="sm" class="h-8 w-8 shrink-0 p-0" aria-label="Next free times" @click="scrollRight">
        <ChevronRight class="h-4 w-4" />
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import type { BoostFreeTime } from '@/modules/ELD/LogsModule/[Id]/types/chart.ts'

const props = withDefaults(defineProps<{
  freeTimes?: BoostFreeTime[]
}>(), {
  freeTimes: () => [],
})

defineEmits<{
  (e: 'free-time-click', freeTime: BoostFreeTime): void
}>()

const freeTimesFiltered = computed(() => props.freeTimes.filter((item) => item.freeDurationInSeconds >= 3600))
const freeTimesContainer = ref<HTMLDivElement | null>(null)
const freeTimesContent = ref<HTMLDivElement | null>(null)
const scrollOffset = ref(0)
const scrollStep = 100

watch(() => props.freeTimes, () => { scrollOffset.value = 0 }, { deep: true })

const scrollLeft = () => { scrollOffset.value = Math.max(0, scrollOffset.value - scrollStep) }
const scrollRight = () => {
  if (!freeTimesContainer.value || !freeTimesContent.value) return
  const maxScroll = Math.max(0, freeTimesContent.value.scrollWidth - freeTimesContainer.value.clientWidth)
  scrollOffset.value = Math.min(maxScroll, scrollOffset.value + scrollStep)
}
const scrollFreeTimesWithWheel = (event: WheelEvent) => {
  if (!freeTimesContainer.value || !freeTimesContent.value) return
  const maxScroll = Math.max(0, freeTimesContent.value.scrollWidth - freeTimesContainer.value.clientWidth)
  const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
  scrollOffset.value = Math.max(0, Math.min(maxScroll, scrollOffset.value + delta))
}
const formatHHMM = (seconds: number) => {
  const totalMinutes = Math.floor(Math.max(0, seconds) / 60)
  return `${Math.floor(totalMinutes / 60).toString().padStart(2, '0')}h ${(totalMinutes % 60).toString().padStart(2, '0')}m`
}
</script>
