import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { useBoostWorkspaceStore } from '@/modules/ELD/LogsModule/Boost/store/boostWorkspace'
import type { AssistantNavigation } from '../types'
import { navigationRoute } from '../utils/focus'

const DRAFT_PAGES = new Set(['ELDBoost', 'ELDAi'])

/** The newest working tab of a session's tab list, as the draft's editable tab. */
export function latestWorkingTabId(tabs: { id: string; kind: string; position: number }[]) {
  return (
    [...tabs].filter((tab) => tab.kind === 'WORKING').sort((a, b) => b.position - a.position)[0]
      ?.id ?? null
  )
}

/**
 * Shows a draft tab the assistant worked on. On a Boost or AI page of that draft it reloads the draft (its tabs change
 * when an optimize preview is made, kept or deleted) on that tab, or on the latest tab when it is gone; elsewhere it
 * opens the driver's AI page on it when asked to.
 */
export function useAssistantDraftTab() {
  const route = useRoute()
  const router = useRouter()
  const workspace = useBoostWorkspaceStore()

  function isOpen(navigation: AssistantNavigation) {
    return (
      DRAFT_PAGES.has(String(route.name)) &&
      workspace.session?.id.toLowerCase() === navigation.sessionId.toLowerCase()
    )
  }

  async function reload(navigation: AssistantNavigation) {
    if (!isOpen(navigation)) return false
    try {
      await workspace.loadSession(navigation.sessionId, navigation.tabId)
      const session = workspace.session
      if (!session || session.id.toLowerCase() !== navigation.sessionId.toLowerCase()) return false
      const target = session.tabs.some((tab) => tab.id === navigation.tabId)
        ? navigation.tabId
        : latestWorkingTabId(session.tabs)
      if (target && target !== workspace.activeTabId) await workspace.selectTab(target)
      if (workspace.activeTabId && route.query.tabId !== workspace.activeTabId) {
        await router.replace({ query: { ...route.query, tabId: workspace.activeTabId } })
      }
      return true
    } catch {
      toast.error(
        'The draft changed, but it could not be reloaded. Reload the page to see the latest events.'
      )
      return false
    }
  }

  /** Shows the tab: reloads it in place on its draft's page, otherwise opens the driver's AI page on it. */
  async function show(navigation: AssistantNavigation) {
    if (await reload(navigation)) return
    await router.push(navigationRoute(navigation))
  }

  return { isOpen, reload, show }
}
