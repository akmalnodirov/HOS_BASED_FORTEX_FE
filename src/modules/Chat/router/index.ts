import { RouteRecordRaw } from 'vue-router'

const routes: Readonly<RouteRecordRaw[]> = [
  {
    path: '/chat',
    name: 'Chat',
    component: () => import('@/modules/Chat/pages/PChat.vue'),
    meta: {
      layout: 'default',
    },
  },
]

export default routes

