import { RouteRecordRaw } from 'vue-router'

const routes: Readonly<RouteRecordRaw[]> = [
  {
    path: '/alerts',
    name: 'Alerts',
    component: () => import('@/modules/Alerts/pages/PAlerts.vue'),
    meta: {
      layout: 'default',
    },
  },
]

export default routes
