<template>
  <slot />
</template>

<script setup lang="ts">
import { onBeforeUnmount, useId, watch } from 'vue'
import type { GeoJSONSource } from 'maplibre-gl'
import type { FeatureCollection, LineString } from 'geojson'
import { injectMap, type MapPosition } from '@/utils/maps'

const props = withDefaults(
  defineProps<{
    path: MapPosition[]
    color: string
    width: number
    opacity?: number
    casingColor?: string
    casingWidth?: number
    casingOpacity?: number
  }>(),
  {
    opacity: 1,
    casingColor: undefined,
    casingWidth: undefined,
    casingOpacity: 1,
  }
)

const map = injectMap()
const lineId = `cmap-line-${useId()}`
const casingId = `${lineId}-casing`

function lineData(path: MapPosition[]): FeatureCollection<LineString> {
  return {
    type: 'FeatureCollection',
    features:
      path.length > 1
        ? [
            {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: path.map((position) => [position.lng, position.lat]),
              },
            },
          ]
        : [],
  }
}

map.addSource(lineId, { type: 'geojson', data: lineData(props.path) })
if (props.casingColor && props.casingWidth) {
  map.addLayer({
    id: casingId,
    type: 'line',
    source: lineId,
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: {
      'line-color': props.casingColor,
      'line-width': props.casingWidth,
      'line-opacity': props.casingOpacity,
    },
  })
}
map.addLayer({
  id: lineId,
  type: 'line',
  source: lineId,
  layout: { 'line-join': 'round', 'line-cap': 'round' },
  paint: {
    'line-color': props.color,
    'line-width': props.width,
    'line-opacity': props.opacity,
  },
})

watch(
  () => props.path,
  (path) => map.getSource<GeoJSONSource>(lineId)?.setData(lineData(path))
)
watch(
  () => [props.color, props.width, props.opacity] as const,
  ([color, width, opacity]) => {
    if (!map.getLayer(lineId)) return
    map.setPaintProperty(lineId, 'line-color', color)
    map.setPaintProperty(lineId, 'line-width', width)
    map.setPaintProperty(lineId, 'line-opacity', opacity)
  }
)

onBeforeUnmount(() => {
  if (map.getLayer(lineId)) map.removeLayer(lineId)
  if (map.getLayer(casingId)) map.removeLayer(casingId)
  if (map.getSource(lineId)) map.removeSource(lineId)
})
</script>
