import { beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { createSSRApp, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { createPinia, setActivePinia } from 'pinia'
import Message from '../src/modules/ELD/LogsModule/Boost/components/assistant/CRouteEldAssistantMessage.vue'
import ChatPanel from '../src/modules/ELD/LogsModule/Ai/components/CAiChatPanel.vue'
import DraftTabs from '../src/modules/ELD/LogsModule/Ai/components/CAiDraftTabs.vue'
import { useBoostWorkspaceStore } from '../src/modules/ELD/LogsModule/Boost/store/boostWorkspace.ts'

let pinia

beforeEach(() => {
  pinia = createPinia()
  setActivePinia(pinia)
  globalThis.assistantTestApi = {
    get: async () => ({ data: null }),
    post: async () => ({ data: null }),
  }
})

const render = (component, props) => {
  const app = createSSRApp({ render: () => h(component, props) })
  app.use(pinia)
  return renderToString(app)
}

test('a "Use this option" message shows without its apply marker', async () => {
  const html = await render(Message, {
    item: { kind: 1, text: 'Apply option 2: Split shift [[apply repair=r1 option=o1]]' },
  })
  assert.match(html, /Apply option 2: Split shift/)
  assert.doesNotMatch(html, /\[\[/)
})

test('the chat panel offers the five quick requests and no voice input', async () => {
  const html = await render(ChatPanel, { sessionId: 's1', tabId: 't1', canApply: true })
  for (const chip of ['New shift', 'New break', 'Optimize', 'Add PTI', 'Adjust hours'])
    assert.match(html, new RegExp(`>\\s*${chip}\\s*<`))
  assert.doesNotMatch(html, /aria-label="Voice|mic/i)
  assert.match(html, /placeholder="Type your message/)
})

test('deleting a draft tab is disabled without tab management permission', async () => {
  const store = useBoostWorkspaceStore()
  store.session = {
    id: 's1',
    status: 'DRAFT',
    tabs: [
      { id: 'initial', name: 'Initial', kind: 'INITIAL', position: 0 },
      { id: 'w1', name: 'Working 1', kind: 'WORKING', position: 1 },
      { id: 'w2', name: 'Working 2', kind: 'WORKING', position: 2 },
    ],
  }
  store.activeTabId = 'w2'
  const html = await render(DraftTabs, { canManageTabs: false })
  assert.match(html, />\s*1\s*</)
  assert.match(html, />\s*2\s*</)
  assert.match(html, /aria-label="Delete this draft tab"[^>]*disabled|disabled[^>]*aria-label="Delete this draft tab"/)
})
