<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="sm:max-w-[520px] p-0 gap-0 overflow-hidden">
      <DialogHeader class="px-6 py-4 border-b">
        <DialogTitle class="text-xl font-bold">Boost</DialogTitle>
      </DialogHeader>

      <div class="px-6 py-6 space-y-4">
        <div class="text-sm text-muted-foreground">
          Selected events: <span class="font-medium text-foreground">{{ selectedCount }}</span>
        </div>

        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="text-xs font-medium text-muted-foreground">Hours</label>
            <input
              v-model.number="hours"
              type="number"
              min="0"
              class="mt-1 w-full h-9 rounded border border-border px-3 text-sm"
            />
          </div>
          <div>
            <label class="text-xs font-medium text-muted-foreground">Minutes</label>
            <input
              v-model.number="minutes"
              type="number"
              min="0"
              class="mt-1 w-full h-9 rounded border border-border px-3 text-sm"
            />
          </div>
          <div>
            <label class="text-xs font-medium text-muted-foreground">Seconds</label>
            <input
              v-model.number="seconds"
              type="number"
              min="0"
              class="mt-1 w-full h-9 rounded border border-border px-3 text-sm"
            />
          </div>
        </div>

        <label class="flex items-center gap-2 text-sm">
          <input v-model="reversed" type="checkbox" />
          Reverse (move time backwards)
        </label>
      </div>

      <div class="px-6 py-4 border-t flex items-center justify-end gap-2 bg-white dark:bg-card">
        <Button variant="outline" @click="$emit('update:open', false)">Cancel</Button>
        <Button
          class="bg-black text-white hover:bg-black/90"
          :disabled="loading || selectedCount < 2 || totalSeconds === 0"
          @click="handleSubmit"
        >
          {{ loading ? 'Boosting…' : 'Boost' }}
        </Button>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

const props = withDefaults(
  defineProps<{
    open: boolean
    selectedCount: number
    loading?: boolean
  }>(),
  {
    loading: false,
  }
)

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'submit', payload: { hours: number; minutes: number; seconds: number; reversed: boolean }): void
}>()

const hours = ref(0)
const minutes = ref(0)
const seconds = ref(0)
const reversed = ref(false)

const totalSeconds = computed(() => Math.max(0, hours.value) * 3600 + Math.max(0, minutes.value) * 60 + Math.max(0, seconds.value))

watch(
  () => props.open,
  (open) => {
    if (open) {
      hours.value = 0
      minutes.value = 0
      seconds.value = 0
      reversed.value = false
    }
  }
)

const handleSubmit = () => {
  emit('submit', {
    hours: hours.value,
    minutes: minutes.value,
    seconds: seconds.value,
    reversed: reversed.value,
  })
}
</script>

