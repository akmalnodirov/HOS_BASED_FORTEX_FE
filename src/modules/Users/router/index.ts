import { RouteRecordRaw } from 'vue-router'

const routes: Readonly<RouteRecordRaw[]> = [
  {
    path: '/users',
    name: 'Users',
    component: () => import('@/modules/Users/pages/PUsers.vue'),
    meta: {
      layout: 'default',
    },
  },
]

export default routes

