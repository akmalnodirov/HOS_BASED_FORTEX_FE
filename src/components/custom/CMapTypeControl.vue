<template>
  <div v-if="mapTypeOptions.length > 1" ref="dropdownRef" class="relative">
    <Button
      type="button"
      variant="outline"
      class="h-10 gap-2 bg-card px-3 text-xs shadow-md"
      aria-haspopup="true"
      :aria-expanded="open"
      @click="open = !open"
    >
      <Layers class="h-4 w-4" />{{ currentLabel }}
    </Button>
    <div
      v-if="open"
      class="absolute right-0 top-11 z-50 min-w-36 rounded-md border border-border bg-popover p-2 text-popover-foreground shadow-lg"
      role="radiogroup"
      aria-label="Map type"
    >
      <p class="px-2 py-1 text-[11px] font-semibold text-muted-foreground">Map type</p>
      <button
        v-for="option in mapTypeOptions"
        :key="option.id"
        type="button"
        role="radio"
        :aria-checked="mapType === option.id"
        class="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-xs hover:bg-muted"
        @click="select(option.id)"
      >
        <span
          class="flex h-4 w-4 items-center justify-center rounded-full border-2"
          :class="mapType === option.id ? 'border-primary' : 'border-muted-foreground/40'"
        >
          <span v-if="mapType === option.id" class="h-2 w-2 rounded-full bg-primary" />
        </span>
        {{ option.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onClickOutside, onKeyStroke } from '@vueuse/core'
import { Layers } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { useMapType } from '@/composables/useMapType'
import type { MapType } from '@/utils/maps'

const { mapType, mapTypeOptions, setMapType } = useMapType()
const open = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)
const currentLabel = computed(
  () => mapTypeOptions.find((option) => option.id === mapType.value)?.label || 'Map'
)

onClickOutside(dropdownRef, () => {
  open.value = false
})
onKeyStroke('Escape', () => {
  open.value = false
})

function select(value: MapType) {
  setMapType(value)
  open.value = false
}
</script>
