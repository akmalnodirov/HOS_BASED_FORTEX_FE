import type { RouteRecordRaw } from 'vue-router'

const routes: Readonly<RouteRecordRaw[]> = [
  {
    path: '/eld/event-sessions',
    alias: '/eld/unidentified',
    name: 'ELDEventSessions',
    component: () => import('@/modules/ELD/EventSessions/pages/PELDEventSessions.vue'),
    meta: {
      layout: 'default',
    },
  },
]

export default routes
