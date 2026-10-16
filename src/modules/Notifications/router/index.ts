import { RouteRecordRaw } from 'vue-router'

const routes: Readonly<RouteRecordRaw[]> = [
  {
    path: '/notifications',
    name: 'Notifications',
    component: () => import('@/modules/Notifications/pages/PNotifications.vue'),
    meta: {
      layout: 'default',
    },
  },
]

export default routes
