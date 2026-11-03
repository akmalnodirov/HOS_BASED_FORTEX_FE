import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createSSRApp, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import Message from '../src/modules/ELD/LogsModule/Boost/components/assistant/CRouteEldAssistantMessage.vue'

test('assistant messages render model text as escaped content', async () => {
  const html = await renderToString(
    createSSRApp({
      render: () => h(Message, { item: { kind: 2, text: '<script>apply()</script>' } }),
    })
  )
  assert.match(html, /&lt;script&gt;apply\(\)&lt;\/script&gt;/)
  assert.doesNotMatch(html, /<script>/)
})
