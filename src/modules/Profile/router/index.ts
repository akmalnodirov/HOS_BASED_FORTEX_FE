import type { RouteRecordRaw } from 'vue-router'

const ProfileRoutes: Array<RouteRecordRaw> = [
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/modules/Profile/pages/PProfile.vue'),
    meta: {
      title: 'Profile',
      requiresAuth: true,
    },
  },
]

export default ProfileRoutes
