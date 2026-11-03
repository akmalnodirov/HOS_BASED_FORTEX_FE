import { toast } from 'vue-sonner'
import { useBoostWorkspaceStore } from '../store/boostWorkspace'

export function useAssistantWorkspaceRefresh() {
  const store = useBoostWorkspaceStore()
  return async (applied: { sessionId: string; tabId: string }) => {
    if (store.session?.id !== applied.sessionId || store.activeTabId !== applied.tabId) return
    try {
      await store.refreshWorkspace()
    } catch {
      if (store.session?.id !== applied.sessionId || store.activeTabId !== applied.tabId) return
      toast.error(
        'The correction was applied to the draft, but the workspace could not be refreshed. Reload the tab to see the updated events.'
      )
    }
  }
}
