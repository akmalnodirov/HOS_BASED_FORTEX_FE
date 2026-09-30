import { RouteRecordRaw } from 'vue-router'

const routes: Readonly<RouteRecordRaw[]> = [
  {
    path: '/drivers',
    name: 'Drivers',
    component: () => import('@/modules/Drivers/pages/PDrivers.vue'),
    meta: {
      layout: 'default',
    },
  },
]

export default routes

