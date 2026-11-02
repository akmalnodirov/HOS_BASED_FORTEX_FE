<template>
  <section class="flex h-full min-h-0 flex-col bg-background">
    <div ref="listRef" class="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
      <div v-if="assistant.isLoading && !visibleItems.length" class="space-y-3">
        <Skeleton class="ml-auto h-10 w-2/3" />
        <Skeleton class="h-16 w-4/5" />
      </div>
      <p
        v-else-if="!visibleItems.length && !assistant.isProcessing && !assistant.error"
        class="py-6 text-center text-sm text-muted-foreground"
      >
        Ask the AI to fix a violation, or describe an actual event correction and its reason.
      </p>

      <CRouteEldAssistantMessage v-for="item in visibleItems" :key="item.id" :item="item" />

      <CRouteEldAssistantConfirmation
        v-if="assistant.confirmation"
        :key="`${assistant.confirmation.id}:${sessionId}:${tabId}`"
        :confirmation="assistant.confirmation"
        :can-apply="canApply && confirmationMatchesContext"
        :busy="assistant.isDeciding || assistant.isLoading"
        @decide="decide"
      />
      <p
        v-if="assistant.confirmation && !confirmationMatchesContext"
        role="status"
        class="text-xs text-amber-600"
      >
        This change belongs to another draft tab. Return to that tab to apply it, or reject it here.
      </p>
      <p
        v-else-if="assistant.confirmation && !canApply"
        role="status"
        class="text-xs text-amber-600"
      >
        Applying changes requires Boost permission. You can still reject this change.
      </p>

      <div v-if="assistant.isProcessing" class="text-sm text-muted-foreground animate-pulse">
        Thinking…
      </div>

      <div
        v-if="assistant.error"
        role="alert"
        class="flex items-start justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive"
      >
        <span class="whitespace-pre-wrap break-words">{{ assistant.error }}</span>
        <Button
          variant="outline"
          size="sm"
          class="h-7 shrink-0 text-xs"
          :disabled="assistant.isBusy"
          @click="retry"
        >
          Retry
        </Button>
      </div>
    </div>

    <div class="flex flex-wrap gap-2 px-4 pb-3">
      <Button
        v-for="chip in CHIPS"
        :key="chip.label"
        variant="secondary"
        size="sm"
        class="h-9 font-normal"
        :disabled="!canSend"
        @click="fill(chip.text)"
      >
        {{ chip.label }}
      </Button>
    </div>
    <form class="flex items-center gap-2 border-t border-border px-4 py-3" @submit.prevent="sendDraft">
      <input
        ref="inputRef"
        v-model="draft"
        class="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        placeholder="Type your message..."
        aria-label="Message to the AI"
        :maxlength="MAX_LENGTH"
      />
      <Button
        type="submit"
        size="icon"
        class="h-9 w-9 shrink-0"
        aria-label="Send"
        :disabled="!canSend || !draft.trim()"
      >
        <ArrowUp class="h-4 w-4" />
      </Button>
    </form>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onActivated, onBeforeUnmount, onDeactivated, ref, watch } from 'vue'
import { ArrowUp } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import CRouteEldAssistantConfirmation from '@/modules/ELD/LogsModule/Boost/components/assistant/CRouteEldAssistantConfirmation.vue'
import CRouteEldAssistantMessage from '@/modules/ELD/LogsModule/Boost/components/assistant/CRouteEldAssistantMessage.vue'
import { useRouteEldAssistantStore } from '@/modules/ELD/LogsModule/Boost/store/routeEldAssistant'
import { RouteEldAssistantItemKind } from '@/modules/ELD/LogsModule/Boost/types/assistant'

const MAX_LENGTH = 2000
// Each chip fills the input with an editable request; it never sends on its own.
const CHIPS = [
  { label: 'New shift', text: 'Plan a new shift starting at ' },
  { label: 'New break', text: 'Add a 30-minute break to fix the break violation' },
  { label: 'Optimize', text: 'Suggest options to fix the violations in this draft' },
  { label: 'Add PTI', text: 'Add a pre-trip inspection (on duty) at ' },
  { label: 'Adjust hours', text: 'Adjust the driving hours so the 11-hour limit is not exceeded' },
] as const

const props = defineProps<{ sessionId: string; tabId: string; canApply: boolean }>()
const emit = defineEmits<{ (e: 'applied', value: { sessionId: string; tabId: string }): void }>()

const assistant = useRouteEldAssistantStore()
const draft = ref('')
const listRef = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)
const isActive = ref(true)
const refreshedProposals = new Set<string>()

const visibleItems = computed(() =>
  assistant.items.filter((item) =>
    item.kind === RouteEldAssistantItemKind.Action
      ? Boolean(item.action?.summary || item.action?.correction)
      : item.kind !== RouteEldAssistantItemKind.RepairOptions && Boolean(item.text)
  )
)
const confirmationMatchesContext = computed(() => {
  const preview = assistant.confirmation?.correction
  return Boolean(preview && preview.sessionId === props.sessionId && preview.tabId === props.tabId)
})
const canSend = computed(() => Boolean(props.sessionId && props.tabId) && !assistant.isBusy)

function fill(text: string) {
  draft.value = text
  void nextTick(() => inputRef.value?.focus())
}

/** Sends one message for the active draft tab; true when the server accepted it. */
async function send(text: string) {
  const sessionId = props.sessionId
  const tabId = props.tabId
  if (!sessionId || !tabId || !canSend.value || !text.trim()) return false
  const accepted = await assistant.send(sessionId, tabId, text)
  if (!isActive.value) assistant.stopPolling()
  return accepted
}

async function sendDraft() {
  const text = draft.value
  if (await send(text)) {
    if (draft.value === text) draft.value = ''
  }
}

async function retry() {
  const text = assistant.resendText
  if (text) await send(text)
  else if (props.sessionId) await assistant.load(props.sessionId)
}

async function decide(approve: boolean, factualAttestation: boolean) {
  if (approve && (!props.canApply || !confirmationMatchesContext.value || !isActive.value)) return
  await assistant.decide(props.sessionId, props.tabId, approve, factualAttestation)
}

watch(
  [() => props.sessionId, () => props.tabId],
  ([sessionId, tabId], previous) => {
    assistant.setContext(sessionId, tabId)
    if (previous && previous[0] !== sessionId) refreshedProposals.clear()
    if (previous && (previous[0] !== sessionId || previous[1] !== tabId)) draft.value = ''
    if (sessionId) void assistant.load(sessionId)
    else assistant.stopPolling()
  },
  { immediate: true, flush: 'sync' }
)

watch(
  () => [assistant.appliedCorrections, props.sessionId, props.tabId, isActive.value] as const,
  ([proposals, , , active]) => {
    if (!active) return
    for (const proposal of proposals) {
      if (refreshedProposals.has(proposal.id)) continue
      const preview = proposal.preview
      if (preview.sessionId !== props.sessionId || preview.tabId !== props.tabId) continue
      refreshedProposals.add(proposal.id)
      emit('applied', { sessionId: preview.sessionId, tabId: preview.tabId })
    }
  }
)

watch(
  () => [assistant.confirmation?.id, visibleItems.value.length, assistant.isProcessing, assistant.error],
  () =>
    void nextTick(() => {
      const list = listRef.value
      if (list) list.scrollTop = list.scrollHeight
    }),
  { flush: 'post' }
)

onActivated(() => {
  isActive.value = true
  if (props.sessionId && !assistant.isSending) void assistant.load(props.sessionId)
})
onDeactivated(() => {
  isActive.value = false
  assistant.stopPolling()
})
onBeforeUnmount(() => assistant.stopPolling())

defineExpose({ send })
</script>
