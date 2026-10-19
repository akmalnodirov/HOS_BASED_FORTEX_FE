<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="flex h-[min(92vh,900px)] max-w-[min(1500px,calc(100vw-24px))] flex-col overflow-hidden p-0">
      <DialogHeader class="shrink-0 border-b px-5 py-4 pr-12">
        <DialogTitle>Event route and cameras</DialogTitle>
        <DialogDescription>
          {{ selectedEvent?.eventName || 'Selected event' }} · {{ selectedCameraCount }} route cameras
        </DialogDescription>
      </DialogHeader>
      <div v-if="loading" class="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
        <LoaderCircle class="h-5 w-5 animate-spin" /> Loading route and cameras…
      </div>
      <div v-else-if="error" class="flex flex-1 items-center justify-center px-6 text-center text-sm text-destructive">
        {{ error }}
      </div>
      <div v-else class="min-h-0 flex-1 p-4">
        <CBoostEventCameraMap
          v-if="open"
          class="h-full"
          :events="events"
          :analysis="analysis"
          :selected-event-id="selectedEventId"
        />
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { LoaderCircle } from 'lucide-vue-next'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import CBoostEventCameraMap from './CBoostEventCameraMap.vue'
import type { RouteEldEventCameraAnalysis, RouteEldHosEvent } from '../../types/boost'

const props = defineProps<{
  open: boolean
  loading: boolean
  error: string
  events: RouteEldHosEvent[]
  selectedEventId: string
  analysis: RouteEldEventCameraAnalysis | null
}>()
const emit = defineEmits<{ 'update:open': [value: boolean] }>()
const selectedEvent = computed(() => props.events.find((event) => event.id === props.selectedEventId))
const selectedCameraCount = computed(() =>
  props.analysis?.matches.find((match) => match.eventId === props.selectedEventId)?.cameras.length ?? 0
)
</script>
