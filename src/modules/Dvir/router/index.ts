import { RouteRecordRaw } from 'vue-router'

const routes: Readonly<RouteRecordRaw[]> = [
  {
    path: '/dvir',
    name: 'Dvir',
    component: () => import('@/modules/Dvir/pages/PDvir.vue'),
    meta: {
      layout: 'default',
    },
  },
]

export default routes

