import { RouteRecordRaw } from 'vue-router'

const routes: Readonly<RouteRecordRaw[]> = [
  {
    path: '/truck-stops',
    name: 'TruckStops',
    component: () => import('@/modules/TruckStops/pages/PTruckStops.vue'),
    meta: {
      layout: 'default',
    },
  },
]

export default routes

