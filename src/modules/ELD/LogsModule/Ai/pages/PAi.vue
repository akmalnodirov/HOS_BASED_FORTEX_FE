<template>
  <div class="flex flex-col gap-2 bg-muted/40">
    <section class="bg-background px-4 py-2">
      <CBoostGraph
        :events="graphEvents"
        :from-date="session?.fromDate ?? ''"
        :to-date="session?.toDate ?? ''"
        :time-zone="timeZone"
        :session-created-at="session?.createdAt"
        :free-times="calculations?.freeTimes ?? []"
        :violations="calculations?.violations ?? []"
        :event-issues="calculations?.eventIssues ?? []"
        :is-graph-loading="store.isLoading"
        :selected-event-id="selectedEventId"
        @selected-event="selectEvent"
      />
    </section>

    <div class="grid min-h-[560px] grid-cols-1 gap-2 xl:grid-cols-[7fr_3fr]">
      <div v-if="!session" class="bg-background p-10 text-center text-sm text-muted-foreground">
        Pick dates and create or open a draft, or ask the AI to open one for you.
      </div>
      <section v-else class="flex min-h-0 flex-col bg-background">
        <CAiDraftTabs :can-manage-tabs="canManageTabs" />
        <div class="min-h-0 flex-1 overflow-y-auto">
          <p v-if="!canBoost" role="status" class="p-6 text-center text-sm text-muted-foreground">
            Repair options need the Boost permission. You can still ask the AI about this log.
          </p>
          <CAiOptionsPanel
            v-else-if="tabId"
            ref="optionsRef"
            :session-id="session.id"
            :tab-id="tabId"
            :from-date="session.fromDate"
            :to-date="session.toDate"
            :time-zone="timeZone"
            :session-created-at="session.createdAt"
            @use="useOption"
          />
        </div>
      </section>
      <div class="flex max-h-[720px] min-h-0 flex-col bg-background">
        <div v-if="agentUrl && session && tabId" class="flex gap-1 border-b border-border px-4 py-2" role="tablist">
          <Button
            v-for="mode in CHAT_MODES"
            :key="mode.value"
            size="sm"
            role="tab"
            :aria-selected="chatMode === mode.value"
            :variant="chatMode === mode.value ? 'secondary' : 'ghost'"
            class="h-8 text-xs"
            :disabled="agentBusy && chatMode !== mode.value"
            :title="agentBusy && chatMode !== mode.value ? 'Wait for the dispatcher agent to finish' : undefined"
            @click="chatMode = mode.value"
          >
            {{ mode.label }}
          </Button>
        </div>
        <CAiAgentChatPanel
          v-if="agentUrl && session && tabId && chatMode === 'agent'"
          class="min-h-0 flex-1"
          :url="agentUrl"
          :session-id="session.id"
          :tab-id="tabId"
          :token="authStore.token ?? ''"
          :from-date="session.fromDate"
          :to-date="session.toDate"
          :time-zone="timeZone"
          :selected-event="agentEvent"
          @changed="onApplied"
          @clear-event="agentEvent = null"
          @busy="agentBusy = $event"
        />
        <CAssistantChat
          v-else
          ref="chatRef"
          class="min-h-0 flex-1"
          :can-apply="canBoost"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { storeToRefs } from 'pinia'
import { hasPermission } from '@/router/permissions'
import { useAuthStore } from '@/modules/Auth/store/authStore'
import CBoostGraph from '@/modules/ELD/LogsModule/Boost/components/CBoostGraph.vue'
import { useBoostWorkspaceStore } from '@/modules/ELD/LogsModule/Boost/store/boostWorkspace'
import { useAssistantWorkspaceRefresh } from '@/modules/ELD/LogsModule/Boost/composables/useAssistantWorkspaceRefresh'
import { Button } from '@/components/ui/button'
import CAiAgentChatPanel from '../components/CAiAgentChatPanel.vue'
import CAssistantChat from '@/modules/Assistant/components/CAssistantChat.vue'
import { useAssistantStore } from '@/modules/Assistant/store/assistant'
import { eldAgentUrl, type EldAgentSelectedEvent } from '../utils/eldAgent'
import CAiDraftTabs from '../components/CAiDraftTabs.vue'
import CAiOptionsPanel from '../components/CAiOptionsPanel.vue'

const store = useBoostWorkspaceStore()
const authStore = useAuthStore()
const { session, workspace, activeTabId } = storeToRefs(store)
const assistant = useAssistantStore()
const chatRef = ref<InstanceType<typeof CAssistantChat> | null>(null)
const optionsRef = ref<InstanceType<typeof CAiOptionsPanel> | null>(null)

const allowed = (code: string) => hasPermission(authStore.token, code)
const canBoost = computed(() => allowed('route_eld.log_details.boost'))
const canManageTabs = computed(
  () => session.value?.status === 'DRAFT' && allowed('route_eld.log_details.tabs.manage')
)
const tabId = computed(() => activeTabId.value ?? '')
const calculations = computed(() => workspace.value?.calculations)
// The draft's own driver only, as the Boost graph shows it by default.
const graphEvents = computed(() =>
  (workspace.value?.events ?? [])
    .filter((item) => !item.isDeleted && (item.ownerDriverId || session.value?.driverId) === session.value?.driverId)
    .map((item) => item.event)
)
const timeZone = computed(() => workspace.value?.events[0]?.event.timeZone ?? 'CT')

// A card never applies by itself: it asks the AI, which shows the usual attested confirmation.
// Option cards go to the assistant, also from agent mode, since applying one needs its attested confirmation.
async function useOption(message: string) {
  if (chatMode.value !== 'assistant') {
    if (agentBusy.value) {
      toast.info('Wait for the dispatcher agent to finish before using an option.')
      return
    }
    chatMode.value = 'assistant'
    await nextTick()
  }
  await chatRef.value?.send(message)
}

// The dispatcher agent (eld-logistic-agent) is offered next to the assistant only when it is configured.
const agentUrl = eldAgentUrl(import.meta.env.VITE_APP_AI_AGENT_WS_URL)
const CHAT_MODES = [
  { value: 'assistant', label: 'Assistant' },
  { value: 'agent', label: 'Dispatcher agent' },
] as const
const chatMode = ref<'assistant' | 'agent'>('assistant')
const agentEvent = ref<EldAgentSelectedEvent | null>(null)
const agentBusy = ref(false)

// The assistant's selection lives in its store and goes with the next message while this draft tab is open.
const assistantEventId = computed(() => {
  const selected = assistant.selectedEvent
  return selected && session.value && selected.sessionId === session.value.id && selected.tabId === tabId.value
    ? selected.eventId
    : null
})
const selectedEventId = computed(() =>
  chatMode.value === 'agent' ? (agentEvent.value?.id ?? null) : assistantEventId.value
)

function selectEvent(eventId: string) {
  const selected = graphEvents.value.find((event) => event.id === eventId)
  if (chatMode.value === 'agent') {
    agentEvent.value =
      selected && agentEvent.value?.id !== eventId
        ? { id: selected.id, timestamp: selected.timestamp }
        : null
    return
  }
  assistant.selectedEvent =
    selected && session.value && tabId.value && assistantEventId.value !== eventId
      ? { sessionId: session.value.id, tabId: tabId.value, eventId }
      : null
}

// A selection belongs to one draft tab, and is dropped when a reload no longer has that event.
watch([() => session.value?.id, tabId], () => {
  agentEvent.value = null
})
watch(graphEvents, (events) => {
  const selected = agentEvent.value
  if (selected && !events.some((event) => event.id === selected.id)) agentEvent.value = null
  const eventId = assistantEventId.value
  if (eventId && !events.some((event) => event.id === eventId)) assistant.selectedEvent = null
})

// The dispatcher agent changes the draft outside the assistant chat: reload the workspace and the option status.
const refreshAfterAgent = useAssistantWorkspaceRefresh()
async function onApplied(applied: { sessionId: string; tabId: string }) {
  await refreshAfterAgent(applied)
  await optionsRef.value?.refresh()
}

defineExpose({ chatRef })
</script>
