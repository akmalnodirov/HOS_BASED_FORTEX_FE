<template>
  <div class="relative isolate h-full w-full">
    <div class="absolute inset-0">
      <div ref="containerRef" class="h-full w-full" />
    </div>
    <slot v-if="ready" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, provide, ref, shallowRef, watch } from 'vue'
import { useResizeObserver } from '@vueuse/core'
import {
  Map as MapLibreMap,
  NavigationControl,
  type LayerSpecification,
  type MapMouseEvent,
  type StyleSpecification,
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useDarkMode } from '@/composables/useDarkMode'
import { useMapType } from '@/composables/useMapType'
import {
  BASE_SOURCE_IDS,
  buildMapStyle,
  mapInjectionKey,
  prepareMapRuntime,
  type MapPosition,
} from '@/utils/maps'

const props = withDefaults(
  defineProps<{
    center?: MapPosition
    zoom?: number
    zoomControl?: boolean
  }>(),
  {
    center: () => ({ lat: 39.5, lng: -98.35 }),
    zoom: 4,
    zoomControl: true,
  }
)

const emit = defineEmits<{
  ready: [map: MapLibreMap]
  click: [event: MapMouseEvent]
}>()

const containerRef = ref<HTMLElement | null>(null)
const map = shallowRef<MapLibreMap | null>(null)
const ready = ref(false)
const { isDarkMode } = useDarkMode()
const { mapType } = useMapType()

provide(mapInjectionKey, map)

onMounted(() => {
  if (!containerRef.value) return
  prepareMapRuntime()
  const instance = new MapLibreMap({
    container: containerRef.value,
    style: buildMapStyle(isDarkMode.value, mapType.value),
    center: props.center,
    zoom: props.zoom,
    attributionControl: { compact: true },
    dragRotate: false,
    pitchWithRotate: false,
    touchPitch: false,
  })
  instance.touchZoomRotate.disableRotation()
  instance.keyboard.disableRotation()
  if (props.zoomControl)
    instance.addControl(new NavigationControl({ showCompass: false }), 'bottom-right')
  instance.on('click', (event) => {
    const target = event.originalEvent.target
    if (target instanceof Element && target.closest('.maplibregl-marker')) return
    emit('click', event)
  })
  instance.once('style.load', () => {
    ready.value = true
    emit('ready', instance)
  })
  map.value = instance
})

useResizeObserver(containerRef, () => map.value?.resize())

function isOverlayLayer(layer: LayerSpecification) {
  if (layer.type === 'background') return false
  return !('source' in layer && BASE_SOURCE_IDS.has(layer.source))
}

watch([isDarkMode, mapType], ([dark, type]) => {
  const instance = map.value
  if (!instance) return
  instance.setStyle(buildMapStyle(dark, type), {
    transformStyle: (previous, style): StyleSpecification => {
      if (!previous) return style
      const overlaySources = Object.fromEntries(
        Object.entries(previous.sources).filter(([id]) => !BASE_SOURCE_IDS.has(id))
      )
      return {
        ...style,
        sources: { ...overlaySources, ...style.sources },
        layers: [...style.layers, ...previous.layers.filter(isOverlayLayer)],
      }
    },
  })
})

onUnmounted(() => {
  map.value?.remove()
  map.value = null
})

defineExpose({
  getMap: () => (ready.value ? map.value : null),
})
</script>
