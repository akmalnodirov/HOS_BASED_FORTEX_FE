import type { RouteRecordRaw } from 'vue-router'

const routes: Readonly<RouteRecordRaw[]> = [
  {
    path: '/driver-alerts',
    name: 'DriverAlerts',
    component: () => import('@/modules/DriverAlerts/pages/PDriverAlerts.vue'),
    meta: {
      layout: 'default',
    },
  },
]

export default routes
