<template>
  <div class="space-y-3">
    <div class="flex items-center gap-2">
      <Input
        :model-value="location.location"
        @update:model-value="emit('update:location', $event as string)"
        placeholder="Location"
        class="flex-1"
      />
      <Button
        v-if="showRemove"
        @click="emit('remove')"
        variant="ghost"
        size="icon"
        class="h-10 w-10 shrink-0 hover:bg-accent"
      >
        <X class="w-4 h-4 text-muted-foreground" />
      </Button>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div class="relative">
        <Input
          :model-value="location.latitude"
          @update:model-value="emit('update:latitude', $event as string)"
          placeholder="Latitude"
          class="pr-20"
        />
        <div class="absolute right-1 top-1 flex gap-1">
          <Button
            @click="emit('copy', 'latitude')"
            variant="ghost"
            size="icon"
            class="h-8 w-8 hover:bg-accent"
            title="Copy"
            tabindex="-1"
          >
            <Copy class="w-3.5 h-3.5 text-muted-foreground" />
          </Button>
          <Button
            @click="emit('paste', 'latitude')"
            variant="ghost"
            size="icon"
            class="h-8 w-8 hover:bg-accent"
            title="Paste"
            tabindex="-1"
          >
            <Clipboard class="w-3.5 h-3.5 text-muted-foreground" />
          </Button>
        </div>
      </div>

      <div class="relative">
        <Input
          :model-value="location.longitude"
          @update:model-value="emit('update:longitude', $event as string)"
          placeholder="Longitude"
          class="pr-20"
        />
        <div class="absolute right-1 top-1 flex gap-1">
          <Button
            @click="emit('copy', 'longitude')"
            variant="ghost"
            size="icon"
            class="h-8 w-8 hover:bg-accent"
            title="Copy"
            tabindex="-1"
          >
            <Copy class="w-3.5 h-3.5 text-muted-foreground" />
          </Button>
          <Button
            @click="emit('paste', 'longitude')"
            variant="ghost"
            size="icon"
            class="h-8 w-8 hover:bg-accent"
            title="Paste"
            tabindex="-1"
          >
            <Clipboard class="w-3.5 h-3.5 text-muted-foreground" />
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
<!-- src/components/audit/LocationFields.vue -->
<script setup lang="ts">
import { Copy, Clipboard, X } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { LocationField } from '@/modules/Tools/Audit/types'

interface Props {
  location: LocationField
  showRemove?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:location', value: string): void
  (e: 'update:latitude', value: string): void
  (e: 'update:longitude', value: string): void
  (e: 'copy', type: 'latitude' | 'longitude'): void
  (e: 'paste', type: 'latitude' | 'longitude'): void
  (e: 'remove'): void
}>()
</script>
