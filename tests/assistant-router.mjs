import { createMemoryHistory, createRouter } from 'vue-router'

const page = { render: () => null }

/** A router with the app's assistant-relevant route names, opened at the given path. */
export async function createAssistantRouter(path = '/') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'Home', component: page },
      { path: '/eld/logs', name: 'ELDLogs', component: page },
      { path: '/logs/:id', name: 'ELDLogDetail', component: page },
      { path: '/logs/:id/boost', name: 'ELDBoost', component: page },
      { path: '/logs/:id/ai', name: 'ELDAi', component: page },
    ],
  })
  await router.push(path)
  await router.isReady()
  return router
}
