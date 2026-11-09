<template>
  <section class="flex h-full min-h-0 flex-col bg-background">
    <div ref="listRef" class="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
      <p v-if="!agent.messages.value.length" class="py-6 text-center text-sm text-muted-foreground">
        Ask the dispatcher agent to add a shift, a break or a PTI, optimize the log, adjust hours or
        save the changes. Its changes stay in this draft tab until the session is submitted.
      </p>

      <div
        v-for="item in agent.messages.value"
        :key="item.id"
        :class="item.role === 'user' ? 'flex justify-end' : 'flex justify-start'"
      >
        <div
          v-if="item.pending"
          class="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground animate-pulse"
        >
          Working…
        </div>
        <div
          v-else
          :class="[
            'max-w-[85%] whitespace-pre-wrap break-words rounded-lg px-3 py-2 text-sm',
            item.role === 'user'
              ? 'bg-primary text-primary-foreground'
              : item.isError
                ? 'border border-destructive/30 bg-destructive/5 text-destructive'
                : 'bg-muted',
          ]"
        >
          {{ item.text }}
        </div>
      </div>

      <div
        v-if="notice || isClosed"
        role="alert"
        class="flex items-start justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive"
      >
        <span>{{ notice || 'Disconnected from the dispatcher agent.' }}</span>
        <Button
          v-if="isClosed"
          variant="outline"
          size="sm"
          class="h-7 shrink-0 text-xs"
          @click="agent.connect()"
        >
          Reconnect
        </Button>
      </div>
    </div>

    <div
      v-if="selectedEvent"
      class="flex items-center gap-2 px-4 pb-2 text-xs text-muted-foreground"
    >
      <span>Selected event: {{ selectedEventLabel }}</span>
      <Button
        variant="ghost"
        size="sm"
        class="h-6 px-2 text-xs"
        aria-label="Clear the selected event"
        @click="emit('clear-event')"
      >
        Clear
      </Button>
    </div>

    <div class="flex flex-wrap gap-2 px-4 pb-3">
      <Button
        v-for="chip in CHIPS"
        :key="chip"
        variant="secondary"
        size="sm"
        class="h-9 font-normal"
        :disabled="!canSend"
        @click="sendText(chip)"
      >
        {{ chip }}
      </Button>
    </div>
    <form
      class="flex items-center gap-2 border-t border-border px-4 py-3"
      @submit.prevent="sendDraft"
    >
      <input
        v-model="draft"
        class="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        :placeholder="
          recorder.isRecording.value ? 'Recording… press stop to send' : 'Type your message...'
        "
        aria-label="Message to the dispatcher agent"
        :maxlength="MAX_LENGTH"
        :disabled="recorder.isRecording.value"
      />
      <Button
        v-if="recorder.isSupported"
        type="button"
        size="icon"
        :variant="recorder.isRecording.value ? 'destructive' : 'outline'"
        class="h-9 w-9 shrink-0"
        :aria-label="
          recorder.isRecording.value ? 'Stop and send voice message' : 'Record a voice message'
        "
        :disabled="recorder.isStarting.value || (!canSend && !recorder.isRecording.value)"
        @click="toggleRecording"
      >
        <Square v-if="recorder.isRecording.value" class="h-4 w-4" />
        <Mic v-else class="h-4 w-4" />
      </Button>
      <Button
        type="submit"
        size="icon"
        class="h-9 w-9 shrink-0"
        aria-label="Send"
        :disabled="!canSend || !draft.trim() || recorder.isRecording.value"
      >
        <ArrowUp class="h-4 w-4" />
      </Button>
    </form>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { ArrowUp, Mic, Square } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { formatRouteEldEventTime } from '@/utils/routeEldTimeZone'
import { useEldAgentChat, useVoiceRecorder } from '../composables/useEldAgentChat'
import type { EldAgentContext, EldAgentSelectedEvent } from '../utils/eldAgent'

const MAX_LENGTH = 2000
// The old RouteApp quick actions; each one is sent straight away, as there.
const CHIPS = ['New shift', 'New break', 'Optimize', 'Add PTI', 'Adjust hours'] as const

const props = defineProps<{
  url: string
  sessionId: string
  tabId: string
  token: string
  fromDate?: string
  toDate?: string
  timeZone: string
  selectedEvent: EldAgentSelectedEvent | null
}>()
const emit = defineEmits<{
  (e: 'changed', value: { sessionId: string; tabId: string }): void
  (e: 'clear-event'): void
  // The page keeps this panel mounted while a turn runs, so its reload is not lost.
  (e: 'busy', value: boolean): void
}>()

const draft = ref('')
const listRef = ref<HTMLElement | null>(null)
// Captured when the turn starts, so a reload refreshes the tab the agent actually edited.
let turnContext: { sessionId: string; tabId: string } | null = null
const agent = useEldAgentChat(props.url, () => {
  if (turnContext) emit('changed', turnContext)
})
const recorder = useVoiceRecorder()

const canSend = computed(
  () =>
    Boolean(props.sessionId && props.tabId && props.token) &&
    agent.isOpen.value &&
    !agent.isBusy.value
)
const notice = computed(() => agent.error.value || recorder.error.value)
const isClosed = computed(() => agent.state.value === 'closed')
const selectedEventLabel = computed(() =>
  props.selectedEvent
    ? formatRouteEldEventTime(props.selectedEvent.timestamp, props.timeZone, { second: undefined })
    : ''
)

function context(): EldAgentContext {
  return {
    sessionId: props.sessionId,
    tabId: props.tabId,
    token: props.token,
    fromDate: props.fromDate,
    toDate: props.toDate,
    selectedEvent: props.selectedEvent,
  }
}

function sendText(text: string) {
  const target = { sessionId: props.sessionId, tabId: props.tabId }
  if (!canSend.value || !agent.sendText(context(), text)) return false
  turnContext = target
  return true
}

function sendDraft() {
  if (sendText(draft.value)) draft.value = ''
}

async function toggleRecording() {
  if (!recorder.isRecording.value) {
    await recorder.start()
    return
  }
  const audio = await recorder.stop()
  if (!audio || !canSend.value) return
  const target = { sessionId: props.sessionId, tabId: props.tabId }
  if (await agent.sendAudio(context(), audio)) turnContext = target
}

watch(
  () => agent.isBusy.value,
  (busy) => emit('busy', busy),
  { immediate: true }
)

// The agent keeps one conversation per connection: a different draft starts a new one.
watch(
  () => props.sessionId,
  (sessionId) => {
    draft.value = ''
    if (sessionId) agent.reset()
    else agent.disconnect()
  },
  { immediate: true }
)

watch(
  () => agent.messages.value.length,
  () =>
    void nextTick(() => {
      const list = listRef.value
      if (list) list.scrollTop = list.scrollHeight
    }),
  { flush: 'post' }
)

onBeforeUnmount(() => emit('busy', false))
</script>
