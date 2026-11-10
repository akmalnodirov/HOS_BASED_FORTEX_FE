<template>
  <div v-if="!isAiPage" class="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
    <section
      v-if="assistant.isOpen"
      class="flex h-[600px] max-h-[calc(100vh-120px)] w-[420px] max-w-[calc(100vw-48px)] flex-col overflow-hidden rounded-lg border border-border bg-background shadow-xl"
      aria-label="Llora AI"
    >
      <header
        class="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border px-3"
      >
        <div class="min-w-0">
          <h2 class="text-sm font-medium">Llora AI</h2>
          <p v-if="focusLabel" class="truncate text-xs text-muted-foreground">{{ focusLabel }}</p>
        </div>
        <div class="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            class="h-7 text-xs"
            :disabled="assistant.isSending || assistant.isDeciding || assistant.isLoading"
            @click="assistant.newChat()"
          >
            New chat
          </Button>
          <button
            type="button"
            aria-label="Close Llora AI"
            class="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground"
            @click="assistant.isOpen = false"
          >
            <X class="h-4 w-4" />
          </button>
        </div>
      </header>
      <CAssistantChat class="min-h-0 flex-1" :can-apply="canBoost" />
    </section>

    <button
      type="button"
      class="flex h-14 w-14 items-center justify-center rounded-full bg-foreground text-background shadow-lg"
      :aria-label="assistant.isOpen ? 'Close Llora AI' : 'Open Llora AI'"
      @click="assistant.isOpen = !assistant.isOpen"
    >
      <Sparkles class="h-6 w-6" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Sparkles, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/modules/Auth/store/authStore'
import { hasPermission } from '@/router/permissions'
import CAssistantChat from './CAssistantChat.vue'
import { useAssistantStore } from '../store/assistant'
import { useAssistantFocus } from '../composables/useAssistantFocus'
import { navigationRoute } from '../utils/focus'
import { useAssistantWorkspaceRefresh } from '@/modules/ELD/LogsModule/Boost/composables/useAssistantWorkspaceRefresh'
import { useAssistantDraftTab } from '../composables/useAssistantDraftTab'

const assistant = useAssistantStore()
const auth = useAuthStore()
const focus = useAssistantFocus()
const route = useRoute()
const router = useRouter()
const refreshWorkspace = useAssistantWorkspaceRefresh()
const draftTab = useAssistantDraftTab()

// The AI page shows the same chat inline, so the floating one stays out of the way there.
const isAiPage = computed(() => route.name === 'ELDAi')
const canBoost = computed(() => hasPermission(auth.token, 'route_eld.log_details.boost'))
const focusLabel = computed(() => {
  const value = focus.value
  if (value.sessionId) return `Draft ${value.fromDate ?? ''} – ${value.toDate ?? ''}`.trim()
  if (value.driverId) return "This driver's logs"
  return value.page === 'logs' ? 'All drivers' : ''
})

// Signing in as someone else without a page reload must not show the previous user's chat.
watch(
  () => (auth.token ? (auth.user?.id ?? null) : null),
  (userId) => assistant.claim(userId),
  { immediate: true }
)

// The dock is always mounted, so it alone reloads the open draft once per correction applied while the user
// works; corrections already in the chat's history never replay. Another draft reloads when it is opened.
watch(
  () => assistant.appliedCorrections,
  () => {
    const value = focus.value
    for (const correction of assistant.takeNewlyApplied()) {
      const { sessionId, tabId } = correction.preview
      if (
        sessionId.toLowerCase() === value.sessionId?.toLowerCase() &&
        tabId.toLowerCase() === value.tabId?.toLowerCase()
      )
        void refreshWorkspace({ sessionId, tabId })
    }
  }
)

// A decided card that named a draft tab (shift, normalize, a kept or deleted optimize preview) reloads that draft
// once when it is open, on that tab or on the latest tab when the preview is gone.
watch(
  () => assistant.items,
  () => {
    for (const navigation of assistant.takeDecidedDrafts()) void draftTab.reload(navigation)
  }
)

// A card whose changes sit on a preview tab of the open draft shows that tab once, so the page shows the changes
// (and the base tab's stale "editable" state is replaced) while the user decides.
const shownPreviews = new Set<string>()
watch(
  () => assistant.confirmation,
  (card) => {
    const navigation = card?.navigation
    if (!card || !navigation || shownPreviews.has(card.id) || !draftTab.isOpen(navigation)) return
    shownPreviews.add(card.id)
    void draftTab.reload(navigation)
  }
)

// Opening the dock shows what changed meanwhile (another tab, a lost answer).
watch(
  () => assistant.isOpen,
  (open) => {
    if (open) assistant.refreshIfIdle()
  }
)

// A draft the assistant opened during a reply is shown on the driver's AI page, once.
watch(
  () => assistant.pendingNavigation,
  (navigation) => {
    if (!navigation) return
    assistant.takeNavigation()
    const value = focus.value
    const showing =
      value.sessionId?.toLowerCase() === navigation.sessionId.toLowerCase() &&
      value.tabId?.toLowerCase() === navigation.tabId.toLowerCase()
    if (!showing) void router.push(navigationRoute(navigation))
  }
)
</script>
