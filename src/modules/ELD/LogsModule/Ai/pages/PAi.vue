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
        <CAssistantChat
          ref="chatRef"
          class="min-h-0 flex-1"
          :can-apply="canBoost"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { hasPermission } from '@/router/permissions'
import { useAuthStore } from '@/modules/Auth/store/authStore'
import CBoostGraph from '@/modules/ELD/LogsModule/Boost/components/CBoostGraph.vue'
import { useBoostWorkspaceStore } from '@/modules/ELD/LogsModule/Boost/store/boostWorkspace'
import CAssistantChat from '@/modules/Assistant/components/CAssistantChat.vue'
import { useAssistantStore } from '@/modules/Assistant/store/assistant'
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
async function useOption(message: string) {
  await chatRef.value?.send(message)
}

// The assistant's selection lives in its store and goes with the next message while this draft tab is open.
const assistantEventId = computed(() => {
  const selected = assistant.selectedEvent
  return selected && session.value && selected.sessionId === session.value.id && selected.tabId === tabId.value
    ? selected.eventId
    : null
})
const selectedEventId = computed(() => assistantEventId.value)

function selectEvent(eventId: string) {
  const selected = graphEvents.value.find((event) => event.id === eventId)
  assistant.selectedEvent =
    selected && session.value && tabId.value && assistantEventId.value !== eventId
      ? { sessionId: session.value.id, tabId: tabId.value, eventId }
      : null
}

// A selection belongs to one draft tab, and is dropped when a reload no longer has that event.
watch(graphEvents, (events) => {
  const eventId = assistantEventId.value
  if (eventId && !events.some((event) => event.id === eventId)) assistant.selectedEvent = null
})

defineExpose({ chatRef })
</script>
