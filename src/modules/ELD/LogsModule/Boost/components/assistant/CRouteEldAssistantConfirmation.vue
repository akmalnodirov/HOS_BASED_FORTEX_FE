<template>
  <section aria-label="Review correction" class="space-y-3 rounded-lg border p-3">
    <h3 class="text-sm font-medium">{{ confirmation.summary }}</h3>
    <CRouteEldAssistantCorrectionPreview
      v-if="confirmation.correction"
      :preview="confirmation.correction"
    />
    <dl v-else class="space-y-2 text-xs">
      <div v-for="(detail, index) in confirmation.details" :key="index">
        <dt class="font-medium">{{ detail.label }}</dt>
        <dd class="whitespace-pre-wrap break-words">{{ detail.value }}</dd>
      </div>
    </dl>
    <p class="text-xs text-muted-foreground">Expires: {{ confirmation.expiresAt }}</p>
    <p class="text-xs text-muted-foreground">
      Review these exact operations. The driver must accept this factual correction before it can be
      applied to the draft.
    </p>
    <div class="flex flex-wrap gap-2" :aria-busy="busy">
      <Button size="sm" :disabled="busy || !confirmation.correction" @click="emit('decide', true)">
        {{ busy ? 'Recording decision…' : 'Send to driver' }}
      </Button>
      <Button variant="outline" size="sm" :disabled="busy" @click="emit('decide', false)">
        Reject correction
      </Button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'
import type { RouteEldAssistantConfirmation } from '../../types/assistant'
import CRouteEldAssistantCorrectionPreview from './CRouteEldAssistantCorrectionPreview.vue'

defineProps<{ confirmation: RouteEldAssistantConfirmation; busy?: boolean }>()
const emit = defineEmits<{ (event: 'decide', approve: boolean): void }>()
</script>
