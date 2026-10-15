<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="sm:max-w-170">
      <DialogHeader>
        <DialogTitle>Normalize Events</DialogTitle>
        <DialogDescription>
          Select the repair routines to run on the active working tab.
        </DialogDescription>
      </DialogHeader>
      <TooltipProvider :delay-duration="150">
        <div
          role="button"
          tabindex="0"
          class="flex cursor-pointer items-center justify-between rounded-md border bg-muted/30 px-3 py-2.5 text-sm transition-colors hover:bg-muted/60"
          @click="toggleAll"
          @keydown.enter.prevent="toggleAll"
          @keydown.space.prevent="toggleAll"
        >
          <div class="flex items-center gap-2">
            <Checkbox
              :model-value="allSelected"
              @click.stop
              @update:model-value="setAll(Boolean($event))"
            />
            <span class="font-medium">All repair routines</span>
          </div>
          <span class="text-xs font-medium text-primary">
            {{ allSelected ? 'Deselect all' : 'Select all' }}
          </span>
        </div>
        <div class="grid max-h-[52vh] grid-cols-2 gap-2 overflow-y-auto py-2 sm:grid-cols-3">
          <div
            v-for="option in options"
            :key="option.value"
            role="button"
            tabindex="0"
            class="flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm transition-colors hover:bg-muted/50"
            :class="selected.includes(option.value) ? 'border-primary/40 bg-primary/5' : ''"
            @click="toggle(option.value, !selected.includes(option.value))"
            @keydown.enter.prevent="toggle(option.value, !selected.includes(option.value))"
            @keydown.space.prevent="toggle(option.value, !selected.includes(option.value))"
          >
            <Checkbox
              :id="`boost-normalize-${option.value}`"
              :model-value="selected.includes(option.value)"
              @click.stop
              @update:model-value="toggle(option.value, Boolean($event))"
            />
            <span class="min-w-0 flex-1">
              {{ option.label }}
            </span>
            <Tooltip>
              <TooltipTrigger as-child>
                <button
                  type="button"
                  class="inline-flex h-6 w-6 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground"
                  :aria-label="`About ${option.label} normalization`"
                  @click.stop
                >
                  <CircleHelp class="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent class="z-[80] max-w-80 leading-5" side="left">
                {{ option.description }}
              </TooltipContent>
            </Tooltip>
          </div>
          <div
            role="button"
            tabindex="0"
            class="flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm transition-colors hover:bg-muted/50"
            :class="certificationFix ? 'border-primary/40 bg-primary/5' : ''"
            @click="certificationFix = !certificationFix"
            @keydown.enter.prevent="certificationFix = !certificationFix"
            @keydown.space.prevent="certificationFix = !certificationFix"
          >
            <Checkbox
              id="boost-normalize-certification"
              v-model="certificationFix"
              @click.stop
            />
            <span class="min-w-0 flex-1"> Certification fix </span>
            <Tooltip>
              <TooltipTrigger as-child>
                <button
                  type="button"
                  class="inline-flex h-6 w-6 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground"
                  aria-label="About certification normalization"
                  @click.stop
                >
                  <CircleHelp class="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent class="z-[80] max-w-80 leading-5" side="left">
                Runs Certification Fix after the selected repairs and before Sequence.
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </TooltipProvider>
      <DialogFooter>
        <Button variant="outline" @click="$emit('update:open', false)">Cancel</Button>
        <Button
          :disabled="loading || (!selected.length && !certificationFix)"
          @click="$emit('submit', { types: selected, certificationFix })"
        >
          {{ loading ? 'Normalizing...' : 'Normalize' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { CircleHelp } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const props = withDefaults(defineProps<{ open: boolean; loading?: boolean }>(), { loading: false })
defineEmits<{
  'update:open': [value: boolean]
  submit: [payload: { types: string[]; certificationFix: boolean }]
}>()
const selected = ref<string[]>([])
const certificationFix = ref(false)
const options = [
  {
    value: 'future_event',
    label: 'Future events',
    description:
      'Archives provider events whose creation time is later than the workspace session creation time.',
  },
  {
    value: 'malfunction',
    label: 'Malfunctions',
    description:
      'Archives ELD malfunction and data-diagnostic events, including logged and cleared records.',
  },
  {
    value: 'unidentified',
    label: 'Unidentified',
    description:
      'Archives unidentified-driver events and certification events that have no record origin.',
  },
  {
    value: 'sequence',
    label: 'Sequence',
    description:
      'Rebuilds event sequence IDs in reverse chronological order from the newest valid hexadecimal value.',
  },
  {
    value: 'driving',
    label: 'Driving',
    description:
      'Repairs driving periods, removes invalid records inside them, and transfers eligible removed time to a previous rest period.',
  },
  {
    value: 'engine_hours',
    label: 'Engine hours',
    description:
      'Recalculates engine hours per vehicle, replaces negative values with zero, and rounds values to tenths.',
  },
  {
    value: 'intermediate',
    label: 'Intermediate',
    description:
      'Archives invalid intermediate records and inserts missing hourly records during driving.',
  },
  {
    value: 'location',
    label: 'Location',
    description:
      'Makes consecutive stationary events for the same vehicle use the first available location and coordinates in that group.',
  },
  {
    value: 'odometer',
    label: 'Odometer',
    description:
      'Normalizes small odometer differences between consecutive events for the same vehicle and location.',
  },
  {
    value: 'duplicate',
    label: 'Duplicates',
    description:
      'Archives duplicate duty-status and engine-power records and keeps one valid certification per date.',
  },
  {
    value: 'power_up/shut_down',
    label: 'Power events',
    description:
      'Adds missing engine power-up and shut-down records, then removes redundant alternating power transitions.',
  },
  {
    value: 'on_duty',
    label: 'On duty',
    description:
      'Repairs eligible On Duty periods while preserving protected cargo activity and required duty time.',
  },
  {
    value: 'pti',
    label: 'PTI',
    description: 'Repairs PTI after a shift or cycle reset and before driving.',
  },
  {
    value: 'manual_location',
    label: 'Manual location',
    description:
      'Replaces manual Driving and On Duty locations using the nearest eligible main duty event with coordinates.',
  },
  {
    value: 'login_logout',
    label: 'Login/logout',
    description:
      'Adds missing login/logout codes and archives duplicate or invalid alternating records.',
  },
]
const toggle = (value: string, checked: boolean) => {
  selected.value = checked
    ? Array.from(new Set([...selected.value, value]))
    : selected.value.filter((item) => item !== value)
}
const allSelected = computed(
  () => selected.value.length === options.length && certificationFix.value
)
const setAll = (checked: boolean) => {
  selected.value = checked ? options.map((option) => option.value) : []
  certificationFix.value = checked
}
const toggleAll = () => setAll(!allSelected.value)
watch(
  () => props.open,
  (open) => {
    if (open) {
      selected.value = []
      certificationFix.value = false
    }
  }
)
</script>
