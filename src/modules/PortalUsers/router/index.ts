import { RouteRecordRaw } from 'vue-router'

const routes: Readonly<RouteRecordRaw[]> = [
  {
    path: '/portal-users',
    name: 'PortalUsers',
    component: () => import('@/modules/PortalUsers/pages/PPortalUsers.vue'),
    meta: {
      layout: 'default',
    },
  },
]

export default routes

