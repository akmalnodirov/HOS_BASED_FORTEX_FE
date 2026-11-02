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
      Pick dates and create or open a draft to work with the AI.
    </div>
    <div v-else class="grid min-h-[560px] grid-cols-1 gap-2 xl:grid-cols-[7fr_3fr]">
      <section class="flex min-h-0 flex-col bg-background">
        <CAiDraftTabs :can-manage-tabs="canManageTabs" />
        <div class="min-h-0 flex-1 overflow-y-auto">
          <p v-if="!canBoost" role="status" class="p-6 text-center text-sm text-muted-foreground">
            Repair options need the Boost permission. You can still ask the AI about this log.
          </p>
          <p v-else class="flex h-full min-h-60 items-center justify-center p-6 text-sm text-muted-foreground">
            To get table variants, assign a task to the AI
          </p>
        </div>
      </section>
      <CAiChatPanel
        v-if="tabId"
        ref="chatRef"
        class="max-h-[720px]"
        :session-id="session.id"
        :tab-id="tabId"
        :can-apply="canBoost"
        @applied="refreshAfterApplied"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { hasPermission } from '@/router/permissions'
import { useAuthStore } from '@/modules/Auth/store/authStore'
import CBoostGraph from '@/modules/ELD/LogsModule/Boost/components/CBoostGraph.vue'
import { useAssistantWorkspaceRefresh } from '@/modules/ELD/LogsModule/Boost/composables/useAssistantWorkspaceRefresh'
import { useBoostWorkspaceStore } from '@/modules/ELD/LogsModule/Boost/store/boostWorkspace'
import CAiChatPanel from '../components/CAiChatPanel.vue'
import CAiDraftTabs from '../components/CAiDraftTabs.vue'

const store = useBoostWorkspaceStore()
const authStore = useAuthStore()
const { session, workspace, activeTabId } = storeToRefs(store)
const chatRef = ref<InstanceType<typeof CAiChatPanel> | null>(null)

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

defineExpose({ chatRef })
</script>
