<template>
  <div class="flex items-center gap-1.5">
    <!-- Traffic toggle button -->
    <button
      type="button"
      :class="
        trafficActive
          ? 'bg-primary text-primary-foreground hover:bg-primary/90'
          : 'bg-white dark:bg-card hover:bg-gray-50 dark:hover:bg-muted text-gray-700 dark:text-foreground'
      "
      class="w-10 h-10 shadow-md rounded-md flex items-center justify-center transition-colors shrink-0"
      title="Traffic layer"
      @click="toggleTraffic"
    >
      <TrafficConeIcon class="w-5 h-5" />
    </button>

    <!-- Map type dropdown -->
    <div ref="dropdownRef" class="relative">
      <button
        type="button"
        class="flex items-center gap-1.5 h-10 px-3 bg-white dark:bg-card shadow-md rounded-md border border-border text-sm font-medium text-foreground hover:bg-gray-50 dark:hover:bg-muted transition-colors"
        @click="open = !open"
      >
        <LayersIcon class="w-4 h-4 text-muted-foreground shrink-0" />
        <span>{{ currentLabel }}</span>
      </button>

      <!-- Dropdown panel -->
      <div
        v-if="open"
        class="absolute right-0 top-full z-50 mt-1.5 min-w-[116px] rounded-md border border-border bg-white p-2 shadow-lg dark:bg-card"
      >
        <p class="mb-1 px-1 text-[11px] font-semibold text-muted-foreground">Layers</p>
        <ul class="flex flex-col gap-0.5">
          <li v-for="type in BASE_TYPES" :key="type.id">
            <button
              type="button"
              class="flex w-full items-center gap-2 rounded px-1 py-1 text-xs text-foreground transition-colors hover:bg-muted/50"
              @click="select(type.id)"
            >
              <!-- Radio indicator -->
              <span
                class="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors"
                :class="modelValue === type.id ? 'border-primary' : 'border-muted-foreground/40'"
              >
                <span v-if="modelValue === type.id" class="w-2 h-2 rounded-full bg-primary" />
              </span>
              {{ type.label }}
            </button>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onClickOutside } from '@vueuse/core'
import { TrafficCone as TrafficConeIcon, Layers as LayersIcon } from 'lucide-vue-next'

const BASE_TYPES = [
  { id: 'roadmap', label: 'Map' },
  // { id: 'hybrid', label: 'Hybrid' },
  // { id: 'satellite', label: 'Satellite' },
  { id: 'hybrid', label: 'Satellite' },
  { id: 'terrain', label: 'Terrain' },
]

const props = withDefaults(
  defineProps<{
    modelValue?: string
    getMap?: () => any
  }>(),
  {
    modelValue: 'roadmap',
    getMap: () => null,
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', val: string): void
}>()

const open = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

onClickOutside(dropdownRef, () => {
  open.value = false
})

const currentLabel = computed(
  () => BASE_TYPES.find((t) => t.id === props.modelValue)?.label ?? 'Map'
)

function select(id: string) {
  emit('update:modelValue', id)
  open.value = false
}

// ─── Traffic overlay ──────────────────────────────────────────────────────────

const trafficActive = ref(false)
let trafficLayer: any = null

function ensureTrafficLayer() {
  if (trafficLayer) return
  const g = (window as any).google
  if (!g?.maps) return
  try {
    trafficLayer = new g.maps.TrafficLayer()
  } catch {
    /* API version may not support it */
  }
}

function toggleTraffic() {
  ensureTrafficLayer()
  if (!trafficLayer) return
  trafficActive.value = !trafficActive.value
  trafficLayer.setMap(trafficActive.value ? (props.getMap?.() ?? null) : null)
}
</script>
