<template>
  <Sheet :open="open" @update:open="emit('update:open', $event)">
    <SheetContent class="w-full gap-0 sm:max-w-lg">
      <SheetHeader class="flex-row items-center justify-between gap-2 border-b pr-12">
        <div class="space-y-1">
          <SheetTitle>Assistant</SheetTitle>
          <SheetDescription class="text-xs">
            {{ driverName ? `Driver: ${driverName}` : 'Ask about this log session.' }}
          </SheetDescription>
          <p v-if="driverName && otherDriverSelected" class="text-xs text-amber-600">
            Answers cover {{ driverName }}'s log.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          class="h-8 text-xs"
          :disabled="!canClear"
          @click="clearChat"
        >
          Clear chat
        </Button>
      </SheetHeader>

      <div ref="listRef" class="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        <div v-if="assistant.isLoading && !visibleItems.length" class="space-y-3">
          <Skeleton class="ml-auto h-10 w-2/3" />
          <Skeleton class="h-16 w-4/5" />
          <Skeleton class="ml-auto h-10 w-1/2" />
        </div>
        <p v-else-if="assistant.isLoading" class="text-center text-xs text-muted-foreground">
          Loading…
        </p>
        <p
          v-else-if="!visibleItems.length && !isThinking && !assistant.error"
          class="py-6 text-center text-sm text-muted-foreground"
        >
          Ask about violations, errors and warnings, or what to check first in this log.
        </p>

        <CRouteEldAssistantMessage v-for="item in visibleItems" :key="item.id" :item="item" />

        <div v-if="isThinking" class="flex justify-start">
          <div class="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground animate-pulse">
            Thinking…
          </div>
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
            :disabled="assistant.isSending || assistant.isLoading || clearing"
            @click="retry"
          >
            Retry
          </Button>
        </div>
      </div>

      <div class="space-y-2 border-t p-4">
        <div class="flex flex-wrap gap-2">
          <Button
            v-for="chip in chips"
            :key="chip"
            variant="outline"
            size="sm"
            class="h-7 text-xs"
            :disabled="!canSend"
            @click="submit(chip)"
          >
            {{ chip }}
          </Button>
        </div>
        <Textarea
          v-model="draft"
          class="max-h-40 resize-none"
          placeholder="Ask a question about this log"
          aria-label="Message to the assistant"
          :maxlength="MAX_LENGTH"
          @keydown="onKeydown"
        />
        <div class="flex items-center justify-between">
          <span class="text-xs text-muted-foreground">{{ draft.length }}/{{ MAX_LENGTH }}</span>
          <Button size="sm" :disabled="!canSend || !draft.trim()" @click="sendDraft"> Send </Button>
        </div>
      </div>
    </SheetContent>
  </Sheet>
</template>

<script setup lang="ts">
import { computed, nextTick, onActivated, onBeforeUnmount, onDeactivated, ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { RouteEldAssistantItemKind } from '../../types/assistant'
import { useRouteEldAssistantStore } from '../../store/routeEldAssistant'
import CRouteEldAssistantMessage from './CRouteEldAssistantMessage.vue'

const MAX_LENGTH = 2000

const props = defineProps<{
  open: boolean
  sessionId: string
  tabId: string
  driverName?: string
  otherDriverSelected?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const chips = ['Explain violations', 'Explain errors and warnings', 'What should I check first?']

const assistant = useRouteEldAssistantStore()
const draft = ref('')
const clearing = ref(false)
const listRef = ref<HTMLElement | null>(null)
const isActive = ref(true)

const visibleItems = computed(() =>
  assistant.items.filter((item) =>
    item.kind === RouteEldAssistantItemKind.Action
      ? Boolean(item.action?.summary)
      : Boolean(item.text)
  )
)
const isThinking = computed(() => assistant.activeTurn !== null || assistant.isSending)
const canSend = computed(
  () => Boolean(props.sessionId && props.tabId) && !assistant.isBusy && !clearing.value
)
const canClear = computed(
  () =>
    Boolean(props.sessionId) &&
    !assistant.isBusy &&
    !clearing.value &&
    (visibleItems.value.length > 0 || assistant.conversationId !== null || assistant.error !== null)
)

function stopIfHidden(sessionId: string) {
  if (assistant.sessionId !== sessionId) return
  if (!props.open || !isActive.value || props.sessionId !== sessionId) assistant.stopPolling()
}

async function reload() {
  const sessionId = props.sessionId
  if (!sessionId) return
  await assistant.load(sessionId)
  stopIfHidden(sessionId)
}

async function submit(text: string) {
  const sessionId = props.sessionId
  const tabId = props.tabId
  if (!sessionId || !tabId || !canSend.value || !text.trim()) return false
  const accepted = await assistant.send(sessionId, tabId, text)
  stopIfHidden(sessionId)
  return accepted
}

async function sendDraft() {
  const text = draft.value
  const accepted = await submit(text)
  if (accepted && draft.value === text) draft.value = ''
}

async function retry() {
  const text = assistant.resendText
  if (!text) {
    await reload()
    return
  }
  const accepted = await submit(text)
  if (accepted && draft.value.trim() === text.trim()) draft.value = ''
}

async function clearChat() {
  if (!canClear.value) return
  clearing.value = true
  try {
    await assistant.clear(props.sessionId)
  } finally {
    clearing.value = false
  }
}

function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return
  event.preventDefault()
  void sendDraft()
}

function scrollToBottom() {
  void nextTick(() => {
    const list = listRef.value
    if (list) list.scrollTop = list.scrollHeight
  })
}

watch(
  [() => props.open, () => props.sessionId],
  ([open, sessionId], previous) => {
    if (previous && previous[1] !== sessionId) {
      draft.value = ''
    }
    if (open && sessionId) void reload()
    else assistant.stopPolling()
  },
  { immediate: true }
)

watch(
  () => [
    visibleItems.value.length,
    isThinking.value,
    assistant.error,
    assistant.isLoading,
    props.open,
  ],
  scrollToBottom,
  { flush: 'post' }
)

onActivated(() => {
  isActive.value = true
  if (props.open && props.sessionId && !assistant.isSending) void reload()
})
onDeactivated(() => {
  isActive.value = false
  assistant.stopPolling()
})
onBeforeUnmount(() => assistant.stopPolling())
</script>
