<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-190">
      <DialogHeader>
        <DialogTitle>AI Advice</DialogTitle>
        <DialogDescription
          >Analyze the current working tab and get an actionable repair plan.</DialogDescription
        >
      </DialogHeader>
      <div class="space-y-4">
        <div class="flex gap-2">
          <Select v-model="adviceType">
            <SelectTrigger class="flex-1"><SelectValue placeholder="Advice type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="FULL_REVIEW">Full review</SelectItem>
              <SelectItem value="VIOLATIONS">Violations</SelectItem>
              <SelectItem value="DATA_QUALITY">Data quality</SelectItem>
              <SelectItem value="CERTIFICATION">Certification</SelectItem>
            </SelectContent>
          </Select>
          <Button :disabled="loading" @click="$emit('analyze', adviceType)">
            {{ loading ? 'Analyzing...' : 'Analyze' }}
          </Button>
        </div>

        <div v-if="result" class="space-y-4">
          <div class="rounded-lg border bg-muted/20 p-4">
            <h3 class="font-semibold">{{ result.title }}</h3>
            <p class="mt-2 whitespace-pre-line text-sm text-muted-foreground">
              {{ result.analysis }}
            </p>
          </div>
          <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Metric label="Events" :value="result.metrics.eventCount" />
            <Metric label="Violations" :value="result.metrics.violationCount" />
            <Metric label="Errors" :value="result.metrics.errorCount" />
            <Metric label="Warnings" :value="result.metrics.warningCount" />
          </div>
          <div class="space-y-2">
            <div
              v-for="step in result.steps"
              :key="step.order"
              class="rounded-lg border border-border p-4"
            >
              <div class="flex items-center justify-between gap-3">
                <h4 class="text-sm font-semibold">{{ step.order }}. {{ step.title }}</h4>
                <span class="rounded bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase">
                  {{ step.priority }}
                </span>
              </div>
              <p class="mt-2 text-sm text-muted-foreground">{{ step.detail }}</p>
              <p class="mt-2 text-xs">
                <span class="font-medium">Expected:</span> {{ step.expectedOutcome }}
              </p>
              <ul
                v-if="step.instructions?.length"
                class="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground"
              >
                <li v-for="instruction in step.instructions" :key="instruction">
                  {{ instruction }}
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div
          v-else
          class="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground"
        >
          Select an analysis type to inspect the current workspace.
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" @click="$emit('update:open', false)">Close</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { defineComponent, h, ref } from 'vue'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { RouteEldAiAdvice } from '../../types/boost'

withDefaults(
  defineProps<{ open: boolean; loading?: boolean; result?: RouteEldAiAdvice | null }>(),
  {
    loading: false,
    result: null,
  }
)
defineEmits<{ 'update:open': [value: boolean]; analyze: [adviceType: string] }>()
const adviceType = ref('FULL_REVIEW')
const Metric = defineComponent({
  props: { label: { type: String, required: true }, value: { type: Number, required: true } },
  setup(props) {
    return () =>
      h('div', { class: 'rounded-md border p-3' }, [
        h('p', { class: 'text-[10px] uppercase text-muted-foreground' }, props.label),
        h('p', { class: 'mt-1 text-lg font-semibold' }, String(props.value)),
      ])
  },
})
</script>
