<template>
  <div v-if="item.kind === RouteEldAssistantItemKind.User && item.text" class="flex justify-end">
    <div
      class="max-w-[85%] whitespace-pre-wrap break-words rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
    >
      {{ stripApplyMarker(item.text) }}
    </div>
  </div>
  <div
    v-else-if="item.kind === RouteEldAssistantItemKind.Assistant && item.text"
    class="flex justify-start"
  >
    <div class="max-w-[85%] whitespace-pre-wrap break-words rounded-lg bg-muted px-3 py-2 text-sm">
      {{ item.text }}
    </div>
  </div>
  <div
    v-else-if="item.kind === RouteEldAssistantItemKind.Action && item.action"
    class="space-y-3 text-xs"
  >
    <p class="whitespace-pre-wrap break-words text-muted-foreground">{{ item.action.summary }}</p>
    <section v-if="item.action.correction" class="space-y-3 rounded-lg border p-3">
      <p role="status" class="font-medium">{{ correctionStatus }}</p>
      <CRouteEldAssistantCorrectionPreview :preview="item.action.correction.preview" />
      <p v-if="item.action.correction.errorMessage" role="alert" class="text-destructive">
        {{ item.action.correction.errorMessage }}
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import CRouteEldAssistantCorrectionPreview from './CRouteEldAssistantCorrectionPreview.vue'
import { stripApplyMarker } from '@/modules/ELD/LogsModule/Ai/utils/aiOptions'
import { RouteEldAssistantItemKind, type RouteEldAssistantItem } from '../../types/assistant'

const props = defineProps<{
  item: RouteEldAssistantItem
}>()
const correctionStatus = computed(() => {
  switch (props.item.action?.correction?.status) {
    case 'awaitingDriverAcceptance':
      return 'Waiting for driver acceptance. No changes applied.'
    case 'applied':
      return 'Applied to draft.'
    case 'declined':
      return 'Correction declined. No changes applied.'
    case 'expired':
      return 'Correction expired. No changes applied.'
    case 'failed':
      return 'Correction could not be applied.'
    default:
      return 'Check correction status before continuing.'
  }
})
</script>
