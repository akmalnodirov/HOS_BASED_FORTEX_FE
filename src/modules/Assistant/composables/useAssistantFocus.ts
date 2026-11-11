import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/modules/Auth/store/authStore'
import { useBoostWorkspaceStore } from '@/modules/ELD/LogsModule/Boost/store/boostWorkspace'
import { useAssistantStore } from '../store/assistant'
import { assistantFocusFor } from '../utils/focus'

/** The page the user is on, as the focus the next assistant message is sent with. */
export function useAssistantFocus() {
  const route = useRoute()
  const auth = useAuthStore()
  const workspace = useBoostWorkspaceStore()
  const assistant = useAssistantStore()
  return computed(() =>
    assistantFocusFor({
      routeName: typeof route.name === 'string' ? route.name : null,
      driverId: typeof route.params.id === 'string' ? route.params.id : null,
      query: route.query,
      companyId: auth.companyId,
      session: workspace.session,
      activeTabId: workspace.activeTabId,
      selectedEvent: assistant.selectedEvent,
    })
  )
}
