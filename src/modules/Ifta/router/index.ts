import { RouteRecordRaw } from 'vue-router'

const routes: Readonly<RouteRecordRaw[]> = [
  {
    path: '/ifta',
    name: 'Ifta',
    component: () => import('@/modules/Ifta/pages/PIfta.vue'),
    meta: {
      layout: 'default',
    },
  },
]

export default routes

