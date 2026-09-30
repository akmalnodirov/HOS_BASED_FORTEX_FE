<template>
  <div class="w-full select-none">
    <div class="relative w-full h-[240px] overflow-hidden">
      <!-- Grid Lines & Hours -->
      <div class="absolute inset-0 flex">
        <div
          class="w-10 flex flex-col justify-around text-[10px] font-bold text-foreground bg-muted/30 border-r border-border py-4 px-1"
        >
          <span v-for="label in ['OFF', 'SB', 'DR', 'ON']" :key="label">{{ label }}</span>
        </div>

        <div class="flex-1 relative">
          <!-- Horizontal Lines -->
          <div class="absolute inset-0 flex flex-col justify-around">
            <div v-for="i in 4" :key="i" class="w-full border-b border-border/50"></div>
          </div>

          <!-- Vertical Grid -->
          <div class="absolute inset-0 flex">
            <div v-for="h in 24" :key="h" class="flex-1 border-l border-border/50 relative group">
              <span class="absolute -top-1 left-0 -translate-x-1/2 text-[9px] text-muted-foreground">{{
                formatHour(h - 1)
              }}</span>
            </div>
            <div class="flex-1 border-l border-border/50"></div>
          </div>

          <!-- SVG Path for Graph -->
          <svg
            class="absolute inset-0 w-full h-full pointer-events-none"
            preserveAspectRatio="none"
          >
            <!-- Mock Log Line -->
            <path
              d="M 0 45 L 150 45 L 150 145 L 250 145 L 250 45 L 450 45 L 450 195 L 650 195 L 650 45 L 850 45 L 850 45"
              fill="none"
              stroke="#3b82f6"
              stroke-width="2"
              class="transition-all duration-300"
            />
          </svg>
        </div>

        <div
          class="w-12 flex flex-col justify-around text-[10px] font-bold text-foreground bg-muted/30 border-l border-border py-4 px-1"
        >
          <span v-for="time in ['01:00', '12:30', '09:25', '00:25']" :key="time">{{ time }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const formatHour = (h: number) => {
  if (h === 0) return 'M'
  if (h === 12) return 'N'
  if (h === 24) return 'M'
  return h > 12 ? h - 12 : h
}
</script>

<style scoped>
/* Responsive padding for hour labels */
.absolute.-top-1 {
  padding-top: 4px;
}
</style>
