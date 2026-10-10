<template>
  <Dialog v-model:open="open">
    <DialogTrigger as-child>
      <Button variant="outline" size="icon" class="h-8 w-8" title="Graph event markers">
        <Settings2 class="h-4 w-4" />
      </Button>
    </DialogTrigger>
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Graph event markers</DialogTitle>
        <DialogDescription>
          Choose which driver event markers appear on the duty-status graph.
        </DialogDescription>
      </DialogHeader>
      <div
        class="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/30 px-3 py-2.5"
      >
        <span class="text-sm font-medium text-foreground">All markers</span>
        <div class="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            class="h-7 px-2.5 text-xs"
            :disabled="allEnabled"
            @click="emit('toggle-all', true)"
          >
            All on
          </Button>
          <Button
            variant="outline"
            size="sm"
            class="h-7 px-2.5 text-xs"
            :disabled="allDisabled"
            @click="emit('toggle-all', false)"
          >
            All off
          </Button>
        </div>
      </div>
      <div class="grid gap-2 sm:grid-cols-2">
        <label
          v-for="option in options"
          :key="option.id"
          class="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-border px-3 py-2.5 transition-colors hover:bg-muted/40"
        >
          <span class="flex min-w-0 items-center gap-2.5 text-sm font-medium text-foreground">
            <span
              class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
              :style="{
                color: option.color,
                backgroundColor: `${option.color}14`,
              }"
            >
              <component :is="option.icon" class="h-4 w-4" />
            </span>
            <span class="truncate">{{ option.label }}</span>
          </span>
          <Switch
            :model-value="modelValue[option.id]"
            @update:model-value="(value) => emit('toggle', option.id, value)"
          />
        </label>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Settings2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import type {
  RouteEldLogGraphMarkerOption,
  RouteEldLogGraphMarkerType,
} from '../../composables/useRouteEldLogGraphMarkers'

const props = defineProps<{
  options: RouteEldLogGraphMarkerOption[]
  modelValue: Record<RouteEldLogGraphMarkerType, boolean>
}>()
const emit = defineEmits<{
  (event: 'toggle', type: RouteEldLogGraphMarkerType, enabled: boolean): void
  (event: 'toggle-all', enabled: boolean): void
}>()
const open = ref(false)
const allEnabled = computed(
  () => props.options.length > 0 && props.options.every((option) => props.modelValue[option.id])
)
const allDisabled = computed(() => props.options.every((option) => !props.modelValue[option.id]))
</script>
