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
      {{
        confirmation.correction?.isNewStatus
          ? 'Review the actual status and time before adding this event to the draft.'
          : confirmation.correction || requireCorrection
            ? 'Review these exact operations before applying this factual correction to the draft.'
            : 'Review these changes before applying them to the draft.'
      }}
    </p>
    <label v-if="attestationRequired" class="flex items-start gap-2 text-xs">
      <Checkbox
        v-model="attested"
        :disabled="busy || !canApply || isExpired || missingCorrection"
      />
      <span>I confirm these exact changes reflect actual events.</span>
    </label>
    <p v-if="isExpired" role="status" class="text-xs text-amber-600">
      This correction has expired. Reload the chat to check its status.
    </p>
    <div class="flex flex-wrap gap-2" :aria-busy="busy">
      <Button
        size="sm"
        :disabled="busy || !canApply || isExpired || (attestationRequired && !attested) || missingCorrection"
        @click="decide(true)"
      >
        {{ busy ? 'Recording decision…' : 'Apply to draft' }}
      </Button>
      <Button variant="outline" size="sm" :disabled="busy" @click="decide(false)">
        {{
          confirmation.correction?.isNewStatus
            ? 'Reject status event'
            : confirmation.correction || requireCorrection
              ? 'Reject correction'
              : 'Decline'
        }}
      </Button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useNow } from '@vueuse/core'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import type { RouteEldAssistantConfirmation } from '../../types/assistant'
import CRouteEldAssistantCorrectionPreview from './CRouteEldAssistantCorrectionPreview.vue'

const props = withDefaults(
  defineProps<{
    confirmation: RouteEldAssistantConfirmation
    busy?: boolean
    canApply?: boolean
    /** False for a card that applies without the factual attestation (the card's own gate). */
    attestationRequired?: boolean
    /** False in the app-wide chat, whose cards may change a draft without a correction preview. */
    requireCorrection?: boolean
  }>(),
  { canApply: true, attestationRequired: true, requireCorrection: true }
)
const emit = defineEmits<{
  (event: 'decide', approve: boolean, factualAttestation: boolean): void
}>()
const attested = ref(false)
const now = useNow({ interval: 1000 })
const missingCorrection = computed(() => props.requireCorrection && !props.confirmation.correction)
const isExpired = computed(() => {
  const expiry = Date.parse(props.confirmation.expiresAt)
  return !Number.isFinite(expiry) || expiry <= now.value.getTime()
})
watch(
  () => props.confirmation,
  () => {
    attested.value = false
  },
  { deep: true }
)

function decide(approve: boolean) {
  if (props.busy) return
  if (
    approve &&
    (!props.canApply ||
      (props.attestationRequired && !attested.value) ||
      missingCorrection.value ||
      Date.parse(props.confirmation.expiresAt) <= Date.now() ||
      isExpired.value)
  )
    return
  emit('decide', approve, approve && props.attestationRequired && attested.value)
}
</script>
