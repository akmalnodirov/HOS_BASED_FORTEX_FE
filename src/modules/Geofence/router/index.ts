import { RouteRecordRaw } from 'vue-router'

const routes: Readonly<RouteRecordRaw[]> = [
  {
    path: '/geofence',
    name: 'Geofence',
    component: () => import('@/modules/Geofence/pages/PGeofence.vue'),
    meta: {
      layout: 'default',
    },
  },
]

export default routes

