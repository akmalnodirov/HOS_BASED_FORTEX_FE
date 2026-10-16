<template>
  <div class="flex items-center gap-1.5">
    <Button
      type="button"
      variant="outline"
      size="icon"
      class="h-10 w-10 bg-card shadow-md"
      :class="
        trafficActive &&
        'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
      "
      title="Traffic layer"
      aria-label="Traffic layer"
      :aria-pressed="trafficActive"
      @click="toggleTraffic"
    >
      <TrafficCone class="h-4 w-4" />
    </Button>
    <div ref="dropdownRef" class="relative">
      <Button
        type="button"
        variant="outline"
        class="h-10 gap-2 bg-card px-3 text-xs shadow-md"
        :aria-expanded="open"
        @click="open = !open"
      >
        <Layers class="h-4 w-4" />{{ currentLabel }}
      </Button>
      <div
        v-if="open"
        class="absolute right-0 top-11 z-50 min-w-36 rounded-md border border-border bg-popover p-2 text-popover-foreground shadow-lg"
      >
        <p class="px-2 py-1 text-[11px] font-semibold text-muted-foreground">Map type</p>
        <button
          v-for="option in mapTypes"
          :key="option.id"
          type="button"
          class="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-xs hover:bg-muted"
          @click="select(option.id)"
        >
          <span
            class="flex h-4 w-4 items-center justify-center rounded-full border-2"
            :class="modelValue === option.id ? 'border-primary' : 'border-muted-foreground/40'"
            ><span v-if="modelValue === option.id" class="h-2 w-2 rounded-full bg-primary"
          /></span>
          {{ option.label }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { onClickOutside } from '@vueuse/core'
import { Layers, TrafficCone } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

export type MapType = 'roadmap' | 'hybrid' | 'terrain'
const mapTypes: { id: MapType; label: string }[] = [
  { id: 'roadmap', label: 'Map' },
  { id: 'hybrid', label: 'Satellite' },
  { id: 'terrain', label: 'Terrain' },
]
const props = withDefaults(defineProps<{ modelValue?: MapType; getMap?: () => any }>(), {
  modelValue: 'roadmap',
  getMap: () => null,
})
const emit = defineEmits<{ (event: 'update:modelValue', value: MapType): void }>()
const open = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)
const trafficActive = ref(false)
const currentLabel = computed(
  () => mapTypes.find((option) => option.id === props.modelValue)?.label || 'Map'
)
let trafficLayer: any = null
onClickOutside(dropdownRef, () => {
  open.value = false
})
onBeforeUnmount(() => {
  trafficLayer?.setMap(null)
  trafficLayer = null
})
function select(value: MapType) {
  emit('update:modelValue', value)
  open.value = false
}
function toggleTraffic() {
  const map = props.getMap?.()
  const googleMaps = (window as any).google?.maps
  if (!map || !googleMaps?.TrafficLayer) return
  if (!trafficLayer) trafficLayer = new googleMaps.TrafficLayer()
  trafficActive.value = !trafficActive.value
  trafficLayer.setMap(trafficActive.value ? map : null)
}
</script>
