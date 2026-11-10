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
        {{ emptyHint }}
      </p>

      <template v-for="item in visibleItems" :key="item.id">
        <div
          v-if="item.kind === AssistantItemKind.Navigation && item.navigation"
          class="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-xs"
        >
          <span>Draft {{ item.navigation.fromDate }} – {{ item.navigation.toDate }} is open.</span>
          <Button
            v-if="!isShowing(item.navigation)"
            variant="outline"
            size="sm"
            class="h-7 text-xs"
            @click="open(item.navigation)"
          >
            Open draft
          </Button>
        </div>
        <CRouteEldAssistantMessage v-else :item="item" />
      </template>

      <CRouteEldAssistantConfirmation
        v-if="assistant.confirmation"
        :key="assistant.confirmation.id"
        :confirmation="assistant.confirmation"
        :can-apply="canApplyCard && cardMatchesPage"
        :attestation-required="assistant.confirmation.isAttestationRequired !== false"
        :require-correction="false"
        :busy="assistant.isDeciding || assistant.isLoading"
        @decide="decide"
      />
      <div
        v-if="assistant.confirmation && !cardMatchesPage"
        role="status"
        class="flex flex-wrap items-center gap-2 text-xs text-amber-600"
      >
        <span>
          This change belongs to {{ cardDriverName ? `${cardDriverName}'s` : 'another' }} draft.
          Open it to apply the change, or decline it here.
        </span>
        <Button
          v-if="cardNavigation"
          variant="outline"
          size="sm"
          class="h-7 text-xs"
          @click="open(cardNavigation)"
        >
          Open draft
        </Button>
      </div>
      <p
        v-else-if="assistant.confirmation && !canApplyCard"
        role="status"
        class="text-xs text-amber-600"
      >
        You do not have the permission to apply this change. You can still decline it.
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
          :disabled="!canRetry"
          @click="retry"
        >
          Retry
        </Button>
      </div>
    </div>

    <div
      v-if="focus.selectedEventId"
      class="flex items-center gap-2 px-4 pb-2 text-xs text-muted-foreground"
    >
      <span>The event selected on the graph is sent with your message.</span>
      <button type="button" class="underline" @click="assistant.selectedEvent = null">Clear</button>
    </div>
    <div class="flex flex-wrap gap-2 px-4 pb-3">
      <Button
        v-for="chip in CHIPS"
        :key="chip.label"
        variant="secondary"
        size="sm"
        class="h-8 font-normal"
        :disabled="!canSend"
        @click="fill(chip.text)"
      >
        {{ chip.label }}
      </Button>
    </div>
    <form
      class="flex items-center gap-2 border-t border-border px-4 py-3"
      @submit.prevent="sendDraft"
    >
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
import { computed, nextTick, onActivated, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowUp } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import CRouteEldAssistantConfirmation from '@/modules/ELD/LogsModule/Boost/components/assistant/CRouteEldAssistantConfirmation.vue'
import CRouteEldAssistantMessage from '@/modules/ELD/LogsModule/Boost/components/assistant/CRouteEldAssistantMessage.vue'
import { useAuthStore } from '@/modules/Auth/store/authStore'
import { useAssistantStore } from '../store/assistant'
import { useAssistantFocus } from '../composables/useAssistantFocus'
import { navigationRoute } from '../utils/focus'
import { AssistantItemKind, type AssistantNavigation } from '../types'

const MAX_LENGTH = 2000
// Each chip fills the input with an editable request; it never sends on its own.
const CHIPS = [
  { label: 'New shift', text: 'Plan a new shift starting at ' },
  { label: 'New break', text: 'Add a 30-minute break to fix the break violation' },
  { label: 'Optimize', text: 'Suggest options to fix the violations in this draft' },
  { label: 'Add PTI', text: 'Add a pre-trip inspection (on duty) at ' },
  { label: 'Adjust hours', text: 'Adjust the driving hours so the 11-hour limit is not exceeded' },
] as const

const props = withDefaults(defineProps<{ canApply?: boolean }>(), { canApply: false })

const assistant = useAssistantStore()
const auth = useAuthStore()
const focus = useAssistantFocus()
const router = useRouter()
const draft = ref('')
const listRef = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)

const visibleItems = computed(() =>
  assistant.items.filter((item) => {
    if (item.kind === AssistantItemKind.Action)
      return Boolean(item.action?.summary || item.action?.correction)
    if (item.kind === AssistantItemKind.Navigation) return Boolean(item.navigation)
    return item.kind !== AssistantItemKind.RepairOptions && Boolean(item.text)
  })
)
const emptyHint = computed(() =>
  focus.value.sessionId
    ? 'Ask the AI to fix a violation, or describe an actual event correction and its reason.'
    : focus.value.driverId
      ? "Ask about this driver's logs. Say which dates when it matters."
      : 'Ask about a driver’s logs. Name the driver and the dates, and the AI finds or opens the draft.'
)
const canSend = computed(() => !assistant.isBusy)
// Retry also recovers a card left behind by a lost decision answer: it resends the message or reloads the chat.
const canRetry = computed(
  () =>
    !assistant.isSending && !assistant.isDeciding && !assistant.isLoading && !assistant.isProcessing
)

// The draft a card changes: its correction preview's, else the draft the turn worked on.
const cardTarget = computed(() => {
  const preview = assistant.confirmation?.correction
  if (preview) return { sessionId: preview.sessionId, tabId: preview.tabId }
  const turnFocus = assistant.activeTurn?.focus
  return turnFocus?.sessionId ? { sessionId: turnFocus.sessionId, tabId: turnFocus.tabId } : null
})
const cardMatchesPage = computed(() => {
  const target = cardTarget.value
  if (!target) return true
  return (
    sameId(target.sessionId, focus.value.sessionId) &&
    (!target.tabId || sameId(target.tabId, focus.value.tabId))
  )
})
const cardDriverName = computed(() => assistant.activeTurn?.focus?.driverName ?? null)
const cardNavigation = computed<AssistantNavigation | null>(() => {
  const turnFocus = assistant.activeTurn?.focus
  const target = cardTarget.value
  if (!turnFocus?.driverId || !turnFocus.fromDate || !turnFocus.toDate || !target?.tabId)
    return null
  if (!sameId(turnFocus.sessionId, target.sessionId)) return null
  return {
    driverId: turnFocus.driverId,
    sessionId: target.sessionId,
    tabId: target.tabId,
    fromDate: turnFocus.fromDate,
    toDate: turnFocus.toDate,
  }
})
// The server says whether the current user may apply the card; older replies without it use the page's permission.
const canApplyCard = computed(() => assistant.confirmation?.canApply ?? props.canApply)

function sameId(left: string | null | undefined, right: string | null | undefined) {
  return Boolean(left && right && left.toLowerCase() === right.toLowerCase())
}

function isShowing(navigation: AssistantNavigation) {
  return (
    sameId(navigation.sessionId, focus.value.sessionId) &&
    sameId(navigation.tabId, focus.value.tabId)
  )
}

function open(navigation: AssistantNavigation) {
  void router.push(navigationRoute(navigation))
}

function fill(text: string) {
  draft.value = text
  void nextTick(() => inputRef.value?.focus())
}

/** Sends one message with the current page's focus; true when the server accepted it. */
async function send(text: string) {
  if (!canSend.value || !text.trim()) return false
  return assistant.send(text, focus.value)
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
  else await assistant.load()
}

async function decide(approve: boolean, factualAttestation: boolean) {
  if (approve && (!canApplyCard.value || !cardMatchesPage.value)) return
  await assistant.decide(approve, factualAttestation)
}

// The chat belongs to the signed-in user; it loads once per user.
watch(
  () => (auth.token ? (auth.user?.id ?? null) : null),
  (userId) => assistant.ensureLoaded(userId),
  { immediate: true }
)

watch(
  () => [
    assistant.confirmation?.id,
    visibleItems.value.length,
    assistant.isProcessing,
    assistant.error,
  ],
  () =>
    void nextTick(() => {
      const list = listRef.value
      if (list) list.scrollTop = list.scrollHeight
    }),
  { flush: 'post' }
)

// The AI page is kept alive; coming back shows what changed meanwhile.
onActivated(() => assistant.refreshIfIdle())

defineExpose({ send, fill })
</script>
