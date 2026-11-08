<template>
  <Teleport :to="element">
    <slot />
  </Teleport>
</template>

<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'
import { Marker, type PositionAnchor } from 'maplibre-gl'
import { injectMap, type MapPosition } from '@/utils/maps'

const props = withDefaults(
  defineProps<{
    position: MapPosition
    anchor?: PositionAnchor
    offset?: [number, number]
    zIndex?: number
  }>(),
  {
    anchor: 'center',
    offset: () => [0, 0],
    zIndex: undefined,
  }
)

const map = injectMap()
const element = document.createElement('div')
const marker = new Marker({ element, anchor: props.anchor, offset: props.offset })
  .setLngLat(props.position)
  .addTo(map)

watch(
  () => [props.position.lat, props.position.lng],
  () => marker.setLngLat(props.position)
)
watch(
  () => [props.offset[0], props.offset[1]],
  () => marker.setOffset(props.offset)
)
watch(
  () => props.zIndex,
  (value) => {
    element.style.zIndex = value == null ? '' : String(value)
  },
  { immediate: true }
)

onBeforeUnmount(() => marker.remove())
</script>
