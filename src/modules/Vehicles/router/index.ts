import { RouteRecordRaw } from 'vue-router'

const routes: Readonly<RouteRecordRaw[]> = [
  {
    path: '/vehicles',
    name: 'Vehicles',
    component: () => import('@/modules/Vehicles/pages/PVehicles.vue'),
    meta: {
      layout: 'default',
    },
  },
]

export default routes

