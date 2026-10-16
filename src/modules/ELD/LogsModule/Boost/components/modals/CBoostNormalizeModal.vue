<template>
  <Dialog :open="open" @update:open="handleOpenChange">
    <DialogContent
      class="flex max-h-[88vh] w-[calc(100vw-2rem)] flex-col overflow-hidden sm:max-w-5xl"
      @escape-key-down="loading && $event.preventDefault()"
      @interact-outside="loading && $event.preventDefault()"
      @pointer-down-outside="loading && $event.preventDefault()"
    >
      <DialogHeader>
        <DialogTitle>Normalize events</DialogTitle>
        <DialogDescription>
          Select the repair routines to run on the active working tab.
        </DialogDescription>
      </DialogHeader>

      <div
        class="grid min-h-0 flex-1 gap-4 overflow-y-auto py-2 md:grid-cols-[minmax(18rem,0.9fr)_minmax(20rem,1.1fr)] md:overflow-hidden"
      >
        <section class="flex min-h-0 flex-col gap-2">
          <div class="flex items-center justify-between gap-3">
            <Label>Normalization options</Label>
            <span class="text-xs tabular-nums text-muted-foreground">
              {{ selectedCount }} of {{ optionCount }} selected
            </span>
          </div>

          <TooltipProvider :delay-duration="150">
            <div
              class="max-h-80 overflow-y-auto rounded-md border border-border md:max-h-none md:min-h-0 md:flex-1"
            >
              <label
                class="sticky top-0 z-10 flex cursor-pointer items-center gap-3 border-b border-border bg-muted px-3 py-2.5 font-medium hover:bg-muted/80"
              >
                <Checkbox
                  :disabled="loading"
                  :model-value="allOptionsState"
                  @update:model-value="setAll(Boolean($event))"
                >
                  <Minus v-if="allOptionsState === 'indeterminate'" class="h-4 w-4" />
                  <Check v-else class="h-4 w-4" />
                </Checkbox>
                <span class="text-sm">All</span>
              </label>

              <div
                v-for="option in options"
                :key="option.value"
                class="flex items-center gap-3 border-b border-border px-3 py-2.5 last:border-b-0 hover:bg-muted/50"
              >
                <Checkbox
                  :id="`boost-normalize-${option.value}`"
                  :model-value="selected.includes(option.value)"
                  :disabled="loading"
                  @update:model-value="toggle(option.value, Boolean($event))"
                />
                <Label
                  :for="`boost-normalize-${option.value}`"
                  class="flex-1 cursor-pointer text-sm font-normal"
                >
                  {{ option.label }}
                </Label>
                <Tooltip>
                  <TooltipTrigger as-child>
                    <button
                      type="button"
                      class="ml-auto inline-flex h-6 w-6 items-center justify-center text-muted-foreground hover:text-foreground"
                      :aria-label="`About ${option.label} normalization`"
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
                class="flex items-center gap-3 border-b border-border px-3 py-2.5 last:border-b-0 hover:bg-muted/50"
              >
                <Checkbox
                  id="boost-normalize-certification"
                  :model-value="certificationFix"
                  :disabled="loading"
                  @update:model-value="setCertificationFix(Boolean($event))"
                />
                <Label
                  for="boost-normalize-certification"
                  class="flex-1 cursor-pointer text-sm font-normal"
                >
                  Certification
                </Label>
                <Tooltip>
                  <TooltipTrigger as-child>
                    <button
                      type="button"
                      class="ml-auto inline-flex h-6 w-6 items-center justify-center text-muted-foreground hover:text-foreground"
                      aria-label="About Certification normalization"
                    >
                      <CircleHelp class="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent class="z-[80] max-w-80 leading-5" side="left">
                    Runs Certification Fix after the selected repairs and before Sequence.
                    Certification failures do not discard successful normalization changes.
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </TooltipProvider>

          <p v-if="selectedCount === 0" class="text-xs text-destructive">
            Select at least one normalization option.
          </p>
        </section>

        <section class="flex min-h-0 flex-col gap-2">
          <Label>Result</Label>
          <div
            v-if="result"
            class="flex min-h-0 flex-1 flex-col gap-3 rounded-md border p-3"
            :class="
              resultHasErrors
                ? 'border-red-300 bg-red-50 text-red-950 dark:border-red-800 dark:bg-red-950/30 dark:text-red-100'
                : 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100'
            "
          >
            <div class="flex items-start gap-2">
              <CircleAlert v-if="resultHasErrors" class="mt-0.5 h-4 w-4 shrink-0" />
              <TriangleAlert v-else class="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p class="text-base opacity-80">
                  {{ result.changedEventCount }}
                  event{{ result.changedEventCount === 1 ? '' : 's' }} changed.
                </p>
                <p class="text-sm font-medium">
                  {{ resultHasErrors ? 'Normalization errors' : 'Normalization details' }}
                </p>
              </div>
            </div>

            <div
              v-if="result.messages.length"
              class="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1"
            >
              <div
                v-for="(message, index) in result.messages"
                :key="`${message.localEventId}:${message.code}:${index}`"
                class="rounded border border-current/20 bg-background/80 px-2.5 py-2 text-xs"
              >
                <div class="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium">
                  <span>{{ normalizeTypeLabel(message.type) }}</span>
                  <span v-if="message.sequenceId" class="font-mono opacity-75">
                    Sequence {{ parseSequenceId(message.sequenceId) }}
                  </span>
                  <span class="font-mono opacity-75">{{ message.code }}</span>
                </div>
                <p class="mt-1 leading-5">{{ message.message }}</p>
              </div>
            </div>
            <p v-else class="text-xs">Normalization completed without additional notices.</p>
          </div>

          <div
            v-else
            class="flex min-h-48 flex-1 items-center justify-center rounded-md border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground"
          >
            Run normalization to see event-specific notices and errors here.
          </div>
        </section>
      </div>

      <DialogFooter>
        <Button variant="outline" :disabled="loading" @click="handleOpenChange(false)">
          Cancel
        </Button>
        <Button :disabled="loading || selectedCount === 0" @click="submit">
          <LoaderCircle v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
          <RefreshCw v-else class="mr-2 h-4 w-4" />
          {{ loading ? 'Normalizing…' : 'Normalize' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  Check,
  CircleAlert,
  CircleHelp,
  LoaderCircle,
  Minus,
  RefreshCw,
  TriangleAlert,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { RouteEldNormalizeResponse, RouteEldNormalizeType } from '../../types/boost'

interface NormalizeOption {
  value: RouteEldNormalizeType
  label: string
  description: string
}

const props = withDefaults(
  defineProps<{
    open: boolean
    loading?: boolean
    result?: RouteEldNormalizeResponse | null
  }>(),
  { loading: false, result: null }
)

const emit = defineEmits<{
  'update:open': [value: boolean]
  'reset-result': []
  submit: [payload: { types: RouteEldNormalizeType[]; certificationFix: boolean }]
}>()

const options: NormalizeOption[] = [
  {
    value: 'future_event',
    label: 'Future event',
    description:
      'Archives provider events whose creation time is later than the workspace session creation time.',
  },
  {
    value: 'malfunction',
    label: 'Malfunction',
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
    value: 'missing_location_or_odometer',
    label: 'No location/odometer',
    description:
      'Fills one missing location or odometer value on editable stationary events using nearby stationary data or surrounding movement anchors.',
  },
  {
    value: 'manual_location',
    label: 'Manual location',
    description:
      'Replaces manual Driving and On Duty locations using the nearest eligible main duty event with coordinates.',
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
    value: 'driving',
    label: 'Driving',
    description:
      'Archives invalid records inside driving periods and transfers eligible removed time to a previous rest period.',
  },
  {
    value: 'duplicate',
    label: 'Duplicate',
    description:
      'Archives duplicate duty-status and engine-power records and keeps one valid certification per date.',
  },
  {
    value: 'pti',
    label: 'PTI',
    description: 'Repairs PTI after a shift or cycle reset and before driving.',
  },
  {
    value: 'power_up/shut_down',
    label: 'Power up/Shut down',
    description:
      'Adds missing engine power-up and shut-down records, then removes redundant alternating power transitions.',
  },
  {
    value: 'intermediate',
    label: 'Intermediate',
    description:
      'Archives orphaned, duplicate, or mistimed intermediate records and inserts missing hourly records during driving.',
  },
  {
    value: 'engine_hours',
    label: 'Engine hours',
    description:
      'Recalculates engine hours per vehicle, replaces negative values with zero, and rounds values to tenths.',
  },
  {
    value: 'sequence',
    label: 'Sequence',
    description:
      'Rebuilds event sequence IDs in reverse chronological order from the newest valid hexadecimal value.',
  },
  {
    value: 'login_logout',
    label: 'Login/Logout',
    description:
      'Adds missing login/logout event codes and archives duplicate or invalid alternating records.',
  },
]

const selected = ref<RouteEldNormalizeType[]>([])
const certificationFix = ref(false)
const selectedCount = computed(() => selected.value.length + (certificationFix.value ? 1 : 0))
const optionCount = options.length + 1
const allOptionsState = computed<boolean | 'indeterminate'>(() => {
  if (selectedCount.value === 0) return false
  if (selectedCount.value === optionCount) return true
  return 'indeterminate'
})
const resultHasErrors = computed(() =>
  Boolean(props.result && !props.result.success && props.result.messages.length)
)

function toggle(value: RouteEldNormalizeType, checked: boolean) {
  emit('reset-result')
  selected.value = checked
    ? Array.from(new Set([...selected.value, value]))
    : selected.value.filter((item) => item !== value)
}

function setAll(checked: boolean) {
  emit('reset-result')
  selected.value = checked ? options.map((option) => option.value) : []
  certificationFix.value = checked
}

function setCertificationFix(checked: boolean) {
  emit('reset-result')
  certificationFix.value = checked
}

function handleOpenChange(value: boolean) {
  if (props.loading && !value) return
  emit('update:open', value)
}

function submit() {
  emit('submit', { types: selected.value, certificationFix: certificationFix.value })
}

function normalizeTypeLabel(type: RouteEldNormalizeType) {
  return options.find((option) => option.value === type)?.label ?? type
}

function parseSequenceId(value: string) {
  const parsed = Number.parseInt(value.replace(/^0x/i, ''), 16)
  return Number.isFinite(parsed) ? parsed : value
}

watch(
  () => props.open,
  (open) => {
    if (!open) return
    selected.value = ['malfunction', 'unidentified']
    certificationFix.value = false
  }
)
</script>
