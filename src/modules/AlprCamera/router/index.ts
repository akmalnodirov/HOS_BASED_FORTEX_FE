import type { RouteRecordRaw } from 'vue-router'

const routes: Readonly<RouteRecordRaw[]> = [
  {
    path: '/alpr-camera/route',
    name: 'AlprCameraRoute',
    component: () => import('@/modules/AlprCamera/pages/PAlprCameraRoute.vue'),
    meta: {
      layout: 'default',
    },
  },
  {
    path: '/alpr-camera/history',
    name: 'AlprCameraHistory',
    component: () => import('@/modules/AlprCamera/pages/PAlprCameraHistory.vue'),
    meta: {
      layout: 'default',
    },
  },
]

export default routes
