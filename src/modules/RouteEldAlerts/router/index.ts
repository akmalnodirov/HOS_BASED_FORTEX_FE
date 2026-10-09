import type { RouteRecordRaw } from 'vue-router'

const routes: Readonly<RouteRecordRaw[]> = [
  {
    path: '/route-eld-alerts',
    name: 'RouteEldAlerts',
    component: () => import('@/modules/RouteEldAlerts/pages/PRouteEldAlerts.vue'),
    meta: {
      layout: 'default',
    },
  },
  {
    path: '/dvir',
    redirect: '/route-eld-alerts',
  },
]

export default routes
