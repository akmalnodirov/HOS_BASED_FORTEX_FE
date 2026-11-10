<template>
  <div class="space-y-1">
    <p
      v-if="!generated"
      class="flex min-h-60 items-center justify-center p-6 text-sm text-muted-foreground"
    >
      To get table variants, assign a task to the AI
    </p>
    <template v-else>
      <p v-if="loadError" role="alert" class="px-4 py-2 text-sm text-destructive">
        {{ loadError }}
        <button type="button" class="ml-2 underline" @click="refresh">Retry</button>
      </p>
      <CAiOptionCard
        v-for="summary in generated.options"
        :key="`${generated.repairId}:${summary.optionId}`"
        :summary="summary"
        :option="liveOptions.get(summary.optionId) ?? null"
        :repair-id="generated.repairId"
        :from-date="fromDate"
        :to-date="toDate"
        :time-zone="timeZone"
        :session-created-at="sessionCreatedAt"
        :in-progress="isInProgress(summary.optionId)"
        :busy="assistant.isBusy"
        :not-prepared="notPreparedOptionId === summary.optionId"
        :expanded="summary.rank === 1"
        @use="use(summary.optionId, $event)"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onActivated, ref, watch } from 'vue'
import { useBoostWorkspaceStore } from '@/modules/ELD/LogsModule/Boost/store/boostWorkspace'
import { useAssistantStore } from '@/modules/Assistant/store/assistant'
import type { RouteEldRepairOption } from '@/modules/ELD/LogsModule/Boost/types/boost'
import { latestRepairOptions } from '../utils/aiOptions'
import CAiOptionCard from './CAiOptionCard.vue'

const props = defineProps<{
  sessionId: string
  tabId: string
  fromDate: string
  toDate: string
  timeZone: string
  sessionCreatedAt?: string | null
}>()
const emit = defineEmits<{ (e: 'use', message: string): void }>()

const assistant = useAssistantStore()
const workspace = useBoostWorkspaceStore()
const liveOptions = ref(new Map<string, RouteEldRepairOption>())
const loadError = ref<string | null>(null)
const usedOptionId = ref<string | null>(null)
const notPreparedOptionId = ref<string | null>(null)

// Only this draft tab's newest set: options never cross tabs or sessions.
const generated = computed(() => latestRepairOptions(assistant.items, props.sessionId, props.tabId))

function isInProgress(optionId: string) {
  return assistant.confirmation?.correction?.optionId === optionId || (assistant.isDeciding && usedOptionId.value === optionId)
}

async function refresh() {
  const current = generated.value
  if (!current) {
    liveOptions.value = new Map()
    return
  }
  try {
    const repair = await workspace.getRepair(current.sessionId, current.tabId, current.repairId)
    if (generated.value?.repairId !== current.repairId) return
    liveOptions.value = new Map(repair.options.map((option) => [option.id, option]))
    loadError.value = null
  } catch (error: any) {
    loadError.value = error?.response?.data?.message || error?.message || 'Could not load the option previews.'
  }
}

function use(optionId: string, message: string) {
  usedOptionId.value = optionId
  notPreparedOptionId.value = null
  emit('use', message)
}

watch(() => generated.value?.repairId, () => void refresh(), { immediate: true })
// Applied or failed decisions change option status; reload it from the repair.
watch(
  () => assistant.appliedCorrections.length,
  () => void refresh()
)
// When the turn after "Use this option" ends without that option's confirmation, say so on its card.
watch(
  () => assistant.isSending || assistant.isProcessing,
  (busy, wasBusy) => {
    if (busy || !wasBusy || !usedOptionId.value) return
    if (assistant.confirmation?.correction?.optionId !== usedOptionId.value)
      notPreparedOptionId.value = usedOptionId.value
    if (!assistant.isDeciding) usedOptionId.value = null
  }
)

// The page is kept alive; edits made on Boost meanwhile can make these options stale.
onActivated(() => void refresh())

defineExpose({ refresh })
</script>
