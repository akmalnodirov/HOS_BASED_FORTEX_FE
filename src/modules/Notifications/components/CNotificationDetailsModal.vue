<template>
  <Dialog
    :open="!!notification"
    @update:open="
      (value) => {
        if (!value) emit('close')
      }
    "
  >
    <DialogContent class="max-h-[90vh] max-w-2xl overflow-y-auto">
      <DialogHeader><DialogTitle>Notification details</DialogTitle></DialogHeader>
      <template v-if="notification">
        <div class="grid gap-3 sm:grid-cols-2">
          <div
            v-for="field in fields"
            :key="field.label"
            class="rounded-md border border-border bg-muted/20 px-3 py-2"
          >
            <div class="text-[11px] uppercase tracking-wide text-muted-foreground">
              {{ field.label }}
            </div>
            <div class="mt-1 break-words text-sm font-medium">{{ field.value }}</div>
          </div>
        </div>
        <div
          v-if="hasCoordinates"
          class="relative mt-2 h-72 overflow-hidden rounded-md border border-border"
        >
          <div class="absolute right-3 top-3 z-10">
            <CMapTypeControl />
          </div>
          <CMap ref="mapRef" :center="mapCenter" :zoom="12" @ready="fitMarkers">
            <CMapMarker
              v-if="driverPosition"
              :position="driverPosition"
              :z-index="showDriverInfo ? 2 : 1"
            >
              <div class="relative">
                <button
                  type="button"
                  class="rounded-full border-2 border-white bg-blue-600 p-2 text-white shadow-lg"
                  :title="notification.driverName"
                  @click.stop="showDriverInfo = true"
                >
                  <Truck class="h-4 w-4" />
                </button>
                <CMapMarkerInfo
                  v-if="showDriverInfo"
                  placement="left"
                  :title="notification.driverName || 'Driver'"
                  :rows="driverRows"
                  @close="showDriverInfo = false"
                />
              </div>
            </CMapMarker>
            <CMapMarker
              v-if="targetPosition"
              :position="targetPosition"
              :z-index="showTargetInfo ? 2 : 1"
            >
              <div class="relative">
                <button
                  type="button"
                  class="rounded-full border-2 border-white bg-emerald-600 p-2 text-white shadow-lg"
                  :title="notification.title"
                  @click.stop="showTargetInfo = true"
                >
                  <MapPin class="h-4 w-4" />
                </button>
                <CMapMarkerInfo
                  v-if="showTargetInfo"
                  placement="right"
                  :title="notification.title"
                  :rows="targetRows"
                  @close="showTargetInfo = false"
                />
              </div>
            </CMapMarker>
          </CMap>
        </div>
        <p v-else class="text-xs text-muted-foreground">
          Map unavailable: Coordinates were not provided.
        </p>
        <div class="flex justify-end">
          <Button variant="outline" @click="emit('close')">Close</Button>
        </div>
      </template>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { MapPin, Truck } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import CMap from '@/components/custom/CMap.vue'
import CMapMarker from '@/components/custom/CMapMarker.vue'
import CMapTypeControl from '@/components/custom/CMapTypeControl.vue'
import CMapMarkerInfo from '@/components/custom/CMapMarkerInfo.vue'
import { mapMarkerInfoPadding, positionsBounds } from '@/utils/maps'
import type { NotificationItem } from '../types'

const props = defineProps<{ notification: NotificationItem | null }>()
const emit = defineEmits<{ (event: 'close'): void }>()
const mapRef = ref<InstanceType<typeof CMap> | null>(null)
const showDriverInfo = ref(true)
const showTargetInfo = ref(true)
const getMap = () => mapRef.value?.getMap() ?? null
const driverPosition = computed(() =>
  props.notification?.latitude != null && props.notification?.longitude != null
    ? { lat: props.notification.latitude, lng: props.notification.longitude }
    : null
)
const targetPosition = computed(() =>
  props.notification?.targetLatitude != null && props.notification?.targetLongitude != null
    ? { lat: props.notification.targetLatitude, lng: props.notification.targetLongitude }
    : null
)
const hasCoordinates = computed(() => !!driverPosition.value || !!targetPosition.value)
const mapCenter = computed(() => driverPosition.value || targetPosition.value || { lat: 0, lng: 0 })
const driverRows = computed(() => {
  const item = props.notification
  if (!item) return []
  return [
    { label: 'Company', value: item.companyName },
    { label: 'Location', value: item.location },
    { label: 'Time', value: new Date(item.occurredAt).toLocaleString() },
    { label: 'Reason', value: item.title },
    { label: 'Details', value: item.detail },
  ]
})
const targetRows = computed(() =>
  props.notification
    ? [
        { label: 'Location', value: props.notification.targetLocation },
        ...props.notification.targetRows,
      ]
    : []
)
watch(
  () => props.notification,
  () => {
    showDriverInfo.value = true
    showTargetInfo.value = true
    void nextTick(() => fitMarkers())
  }
)
function fitMarkers(instance?: MapLibreMap) {
  const map = instance ?? getMap()
  if (!map || !hasCoordinates.value) return
  if (
    !driverPosition.value ||
    !targetPosition.value ||
    (driverPosition.value.lat === targetPosition.value.lat &&
      driverPosition.value.lng === targetPosition.value.lng)
  ) {
    map.jumpTo({ center: mapCenter.value, zoom: 12 })
    map.panBy([0, -75], { duration: 0 })
    return
  }
  const bounds = positionsBounds([driverPosition.value, targetPosition.value])
  if (bounds) map.fitBounds(bounds, { padding: mapMarkerInfoPadding(map), duration: 0 })
}
const fields = computed(() => {
  const item = props.notification
  if (!item) return []
  return [
    { label: 'Driver', value: item.driverName || '—' },
    { label: 'Type', value: item.type.toUpperCase() },
    { label: 'Reason', value: item.title },
    { label: 'Details', value: item.detail || '—' },
    { label: 'Location', value: item.location || '—' },
    {
      label: 'Occurred',
      value: Number.isNaN(new Date(item.occurredAt).getTime())
        ? '—'
        : new Date(item.occurredAt).toLocaleString(),
    },
    { label: 'Read', value: item.isRead ? 'Yes' : 'No' },
    {
      label: 'Resolved',
      value: item.resolvedAt
        ? new Date(item.resolvedAt).toLocaleString()
        : item.type === 'station' || item.type === 'alpr'
          ? 'No'
          : '—',
    },
  ]
})
</script>
