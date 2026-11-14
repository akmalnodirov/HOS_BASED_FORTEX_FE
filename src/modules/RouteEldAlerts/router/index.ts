import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/modules/Auth/store/authStore'
import { hasPermission } from '@/router/permissions'
import { routeEldAlertPages } from '../alertPages'

const routes: Readonly<RouteRecordRaw[]> = [
  ...routeEldAlertPages.map((page) => ({
    path: page.path,
    name: `RouteEldAlerts-${page.type}`,
    component: () => import('@/modules/RouteEldAlerts/pages/PRouteEldAlerts.vue'),
    props: { alertType: page.type },
    meta: { layout: 'default' },
  })),
  {
    path: '/route-eld-alerts',
    name: 'RouteEldAlerts',
    redirect: (to) => {
      const token = useAuthStore().getTokens()
      const requested = routeEldAlertPages.find((page) => page.type === to.query.type)
      const page = requested && hasPermission(token, requested.permission)
        ? requested
        : routeEldAlertPages.find((candidate) => hasPermission(token, candidate.permission)) ?? routeEldAlertPages[0]
      const query = { ...to.query }
      delete query.type
      return { path: page.path, query, hash: to.hash }
    },
  },
  {
    path: '/dvir',
    redirect: '/route-eld-alerts',
  },
]

export default routes
