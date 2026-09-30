import { RouteRecordRaw } from 'vue-router'

const routes: Readonly<RouteRecordRaw[]> = [
  {
    path: '/users/roles',
    name: 'UsersRoles',
    component: () => import('@/modules/UserManager/Roles/pages/PRoles.vue'),
    meta: {
      layout: 'default',
    },
  },
  {
    path: '/users/permissions',
    name: 'UsersPermissions',
    component: () => import('@/modules/UserManager/Permissions/pages/PPermissions.vue'),
    meta: {
      layout: 'default',
    },
  },
]

export default routes
