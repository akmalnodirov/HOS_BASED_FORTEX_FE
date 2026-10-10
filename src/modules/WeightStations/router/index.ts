import type { RouteRecordRaw } from 'vue-router'

const routes: Readonly<RouteRecordRaw[]> = [
  {
    path: '/eld/weight-stations',
    name: 'WeightStations',
    component: () => import('@/modules/WeightStations/pages/PWeightStations.vue'),
    meta: {
      layout: 'default',
    },
  },
]

export default routes
