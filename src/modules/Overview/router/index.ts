import { RouteRecordRaw } from 'vue-router'
import POverviewId from '@/modules/Overview/pages/POverviewId.vue'

const routes: Readonly<RouteRecordRaw[]> = [
  {
    path: '/overview',
    name: 'Overview',
    component: () => import('@/modules/Overview/pages/POverview.vue'),
    meta: {
      layout: 'default',
    },
  },
  {
    path: '/overview/:id',
    name: 'OverviewDetail',
    component: POverviewId,
    props: true,
  },
]

export default routes
