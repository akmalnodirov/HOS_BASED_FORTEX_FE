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
      />
    </section>

    <div v-if="!session" class="bg-background p-10 text-center text-sm text-muted-foreground">
      <p v-if="handedOff" role="status" class="mb-2 text-foreground">
        Your request is saved. Open or create a draft to send it.
      </p>
      Pick dates and create or open a draft to work with the AI.
    </div>
    <div v-else class="grid min-h-[560px] grid-cols-1 gap-2 xl:grid-cols-[7fr_3fr]">
      <section class="flex min-h-0 flex-col bg-background">
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
      <CAiChatPanel
        v-if="tabId"
        ref="chatRef"
        class="max-h-[720px]"
        :session-id="session.id"
        :tab-id="tabId"
        :can-apply="canBoost"
        @applied="onApplied"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { hasPermission } from '@/router/permissions'
import { useAuthStore } from '@/modules/Auth/store/authStore'
import CBoostGraph from '@/modules/ELD/LogsModule/Boost/components/CBoostGraph.vue'
import { useAssistantWorkspaceRefresh } from '@/modules/ELD/LogsModule/Boost/composables/useAssistantWorkspaceRefresh'
import { useBoostWorkspaceStore } from '@/modules/ELD/LogsModule/Boost/store/boostWorkspace'
import CAiChatPanel from '../components/CAiChatPanel.vue'
import CAiDraftTabs from '../components/CAiDraftTabs.vue'
import CAiOptionsPanel from '../components/CAiOptionsPanel.vue'
import { useAiHandoffStore } from '../store/aiHandoff'
import { useRouteEldAssistantStore } from '@/modules/ELD/LogsModule/Boost/store/routeEldAssistant'

const store = useBoostWorkspaceStore()
const authStore = useAuthStore()
const { session, workspace, activeTabId } = storeToRefs(store)
const chatRef = ref<InstanceType<typeof CAiChatPanel> | null>(null)
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
const refreshAfterApplied = useAssistantWorkspaceRefresh()

// A card never applies by itself: it asks the AI, which shows the usual attested confirmation.
async function useOption(message: string) {
  await chatRef.value?.send(message)
}

async function onApplied(applied: { sessionId: string; tabId: string }) {
  await refreshAfterApplied(applied)
  await optionsRef.value?.refresh()
}

// The launcher's request is sent once, after the draft and tab are open; it is forgotten only once sent.
const route = useRoute()
const handoff = useAiHandoffStore()
const assistant = useRouteEldAssistantStore()
const driverId = computed(() => String(route.params.id ?? ''))
const handedOff = computed(() => handoff.peek(driverId.value))
let handoffInFlight = false
watch(
  // isBusy is watched so a send refused while the chat loads is retried once it is free.
  [() => session.value?.id, tabId, chatRef, handedOff, () => assistant.isBusy],
  async ([sessionId, currentTab, chat, text, busy]) => {
    if (!sessionId || !currentTab || !chat || !text || busy || handoffInFlight) return
    if (session.value?.driverId?.toLowerCase() !== driverId.value.toLowerCase()) return
    handoffInFlight = true
    try {
      if (await chat.send(text)) handoff.take(driverId.value)
    } finally {
      handoffInFlight = false
    }
  },
  { flush: 'post' }
)

defineExpose({ chatRef })
</script>
