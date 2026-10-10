import type { RouteRecordRaw } from 'vue-router'

const routes: Readonly<RouteRecordRaw[]> = [
  {
    path: '/vehicle-reports',
    name: 'VehicleReports',
    component: () => import('@/modules/VehicleReports/pages/PVehicleReports.vue'),
    meta: {
      layout: 'default',
    },
  },
]

export default routes
