import { RouteRecordRaw } from 'vue-router'

const routes: Readonly<RouteRecordRaw[]> = [
  {
    path: '/company',
    name: 'Company',
    component: () => import('@/modules/Company/pages/PCompany.vue'),
    meta: {
      layout: 'default',
    },
  },
]

export default routes
