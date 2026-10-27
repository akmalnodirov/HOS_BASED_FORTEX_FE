<script setup lang="ts">
export interface HosClockRingStat {
  label: string
  value: string
  color: string
  innerBg: string
  progress: number
}

defineProps<{
  stats: HosClockRingStat[]
  compact?: boolean
  distributed?: boolean
}>()
</script>

<template>
  <div
    :class="distributed
      ? 'grid w-full min-w-[350px] grid-cols-4 items-center'
      : compact
        ? 'flex items-center gap-3 2xl:gap-4'
        : 'flex items-center gap-5 2xl:gap-6'"
  >
    <div v-for="stat in stats" :key="stat.label" class="flex flex-col items-center">
      <span
        class="progress-ring relative flex h-19.25 w-19.25 items-center justify-center rounded-full 2xl:h-20.5 2xl:w-20.5"
        :style="{
          '--progress-angle': `${stat.progress * 3.6}deg`,
          '--progress-color': stat.color,
        }"
      >
        <span class="absolute h-[67px] w-[67px] rounded-full bg-white dark:bg-background 2xl:h-[72px] 2xl:w-[72px]"></span>
        <span
          class="absolute h-[63px] w-[63px] rounded-full transition-colors 2xl:h-[68px] 2xl:w-[68px]"
          :style="{ backgroundColor: stat.innerBg }"
        ></span>
        <span class="relative flex flex-col items-center justify-center leading-tight">
          <span class="text-base font-bold text-foreground">{{ stat.value }}</span>
          <span class="text-[11px] font-semibold" :style="{ color: stat.color }">{{ stat.label }}</span>
        </span>
      </span>
    </div>
  </div>
</template>

<style scoped>
@property --progress-deg {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}

.progress-ring {
  --progress-deg: 0deg;
  background: conic-gradient(var(--progress-color) var(--progress-deg), #f0f0f0 var(--progress-deg));
  animation: progress-fill 1s ease-out forwards;
}

@keyframes progress-fill {
  from { --progress-deg: 0deg; }
  to { --progress-deg: var(--progress-angle); }
}
</style>
