<template>
  <div
    class="pointer-events-none absolute left-4 right-4 top-4 z-10 grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3"
  >
    <div class="pointer-events-auto">
      <CMapTypeControl
        :model-value="mapType"
        :get-map="getMap"
        @update:model-value="emit('update:mapType', $event)"
      />
    </div>
    <div
      class="pointer-events-auto max-w-full justify-self-center overflow-x-auto rounded-md border border-border bg-card p-1 shadow-md"
    >
      <div class="flex items-center gap-1 whitespace-nowrap">
        <button
          v-for="option in filterOptions"
          :key="option.id"
          type="button"
          class="flex h-8 items-center gap-1.5 rounded px-2.5 text-xs font-medium transition-colors"
          :class="
            currentFilter === option.id
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          "
          :aria-pressed="currentFilter === option.id"
          @click="emit('update:currentFilter', option.id)"
        >
          <span
            v-if="option.id !== 'all'"
            class="h-2 w-2 rounded-full"
            :class="option.colorClass"
          />
          {{ option.label }} <span class="opacity-70">{{ option.count }}</span>
        </button>
      </div>
    </div>
    <div class="pointer-events-auto">
      <Button
        variant="outline"
        size="icon"
        class="h-10 w-10 bg-card shadow-md"
        :title="isFullscreen ? 'Exit fullscreen' : 'Fullscreen'"
        :aria-label="isFullscreen ? 'Exit fullscreen' : 'Fullscreen'"
        @click="emit('toggle-fullscreen')"
      >
        <Minimize v-if="isFullscreen" class="h-4 w-4" />
        <Maximize v-else class="h-4 w-4" />
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Maximize, Minimize } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import CMapTypeControl, { type MapType } from '@/components/custom/CMapTypeControl.vue'

export interface MapFilterOption {
  id: string
  label: string
  count: number
  colorClass?: string
}

withDefaults(
  defineProps<{
    mapType: MapType
    filterOptions: MapFilterOption[]
    currentFilter: string
    isFullscreen: boolean
    getMap?: () => any
  }>(),
  { getMap: () => null }
)

const emit = defineEmits<{
  'update:mapType': [value: MapType]
  'update:currentFilter': [value: string]
  'toggle-fullscreen': []
}>()
</script>
