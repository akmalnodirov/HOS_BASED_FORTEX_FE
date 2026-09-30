import { RouteRecordRaw } from 'vue-router'

const routes: Readonly<RouteRecordRaw[]> = [
  {
    path: '/eld/unidentified',
    name: 'ELDUnidentified',
    component: () => import('@/modules/ELD/Unidentified/pages/PELDUnidentified.vue'),
    meta: {
      layout: 'default',
    },
  },
]

export default routes
