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
      Review these exact operations before applying this factual correction to the draft.
    </p>
    <label class="flex items-start gap-2 text-xs">
      <Checkbox
        v-model="attested"
        :disabled="busy || !canApply || isExpired || !confirmation.correction"
      />
      <span>I confirm these exact changes reflect actual events.</span>
    </label>
    <p v-if="isExpired" role="status" class="text-xs text-amber-600">
      This correction has expired. Reload the chat to check its status.
    </p>
    <div class="flex flex-wrap gap-2" :aria-busy="busy">
      <Button
        size="sm"
        :disabled="busy || !canApply || isExpired || !attested || !confirmation.correction"
        @click="decide(true)"
      >
        {{ busy ? 'Recording decision…' : 'Apply to draft' }}
      </Button>
      <Button variant="outline" size="sm" :disabled="busy" @click="decide(false)">
        Reject correction
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
  }>(),
  { canApply: true }
)
const emit = defineEmits<{
  (event: 'decide', approve: boolean, factualAttestation: boolean): void
}>()
const attested = ref(false)
const now = useNow({ interval: 1000 })
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
      !attested.value ||
      !props.confirmation.correction ||
      Date.parse(props.confirmation.expiresAt) <= Date.now() ||
      isExpired.value)
  )
    return
  emit('decide', approve, approve && attested.value)
}
</script>
