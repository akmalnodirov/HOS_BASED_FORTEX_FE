import { RouteRecordRaw } from 'vue-router'

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
    component: () => import('@/modules/Overview/pages/POverviewId.vue'),
    props: true,
  },
]

export default routes
