<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="sm:max-w-125">
      <DialogHeader>
        <DialogTitle>Expand / Reduce Event</DialogTitle>
        <DialogDescription
          >Change the duration of the selected duty-status event.</DialogDescription
        >
      </DialogHeader>
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-2">
          <Button :variant="mode === 'expand' ? 'default' : 'outline'" @click="mode = 'expand'">
            Expand
          </Button>
          <Button :variant="mode === 'reduce' ? 'default' : 'outline'" @click="mode = 'reduce'">
            Reduce
          </Button>
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="text-xs font-medium text-muted-foreground">Hours</label>
            <Input v-model.number="hours" type="number" min="0" />
          </div>
          <div>
            <label class="text-xs font-medium text-muted-foreground">Minutes</label>
            <Input v-model.number="minutes" type="number" min="0" max="59" />
          </div>
          <div>
            <label class="text-xs font-medium text-muted-foreground">Seconds</label>
            <Input v-model.number="seconds" type="number" min="0" max="59" />
          </div>
        </div>
        <label class="flex items-center gap-2 text-sm">
          <Checkbox v-model:checked="ensurePti" /> Ensure PTI event
        </label>
      </div>
      <DialogFooter>
        <Button variant="outline" @click="$emit('update:open', false)">Cancel</Button>
        <Button :disabled="loading || durationSeconds <= 0" @click="submit">
          {{ loading ? 'Applying...' : 'Apply' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const props = withDefaults(defineProps<{ open: boolean; loading?: boolean }>(), { loading: false })
const emit = defineEmits<{
  'update:open': [value: boolean]
  submit: [payload: { durationSeconds: number; mode: 'expand' | 'reduce'; ensurePti: boolean }]
}>()
const mode = ref<'expand' | 'reduce'>('expand')
const hours = ref(0)
const minutes = ref(0)
const seconds = ref(0)
const ensurePti = ref(false)
const durationSeconds = computed(() => hours.value * 3600 + minutes.value * 60 + seconds.value)
watch(
  () => props.open,
  (open) => {
    if (!open) return
    mode.value = 'expand'
    hours.value = 0
    minutes.value = 0
    seconds.value = 0
    ensurePti.value = false
  }
)
const submit = () =>
  emit('submit', {
    durationSeconds: durationSeconds.value,
    mode: mode.value,
    ensurePti: ensurePti.value,
  })
</script>
