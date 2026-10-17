import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router'
import { useAuthStore } from '@/modules/Auth/store/authStore'
import { canAccessPath } from './permissions'

const publicRoutes = ['Login', 'RouteEldLiveShare']

const requiresAuth = (route: RouteLocationNormalized): boolean => {
  if (route.name && publicRoutes.includes(route.name as string)) {
    return false
  }

  return true
}

export const authMiddleware = async (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext
): Promise<void> => {
  const authStore = useAuthStore()

  if (!authStore.token) {
    authStore.initAuth()
  }

  const token = authStore.getTokens()
  const continueOrForbid = () => {
    if (canAccessPath(to.path, authStore.getTokens())) next()
    else next({ name: 'Forbidden' })
  }

  if (!requiresAuth(to)) {
    if (token && to.name === 'Login') {
      next('/initial/companies')
      return
    }
    next()
    return
  }

  if (!token) {
    next({ name: 'Login' })
    return
  }

  if (!authStore.loggedIn || !authStore.user) {
    try {
      await authStore.fetchCurrentUser()
      continueOrForbid()
    } catch (error: any) {
      console.error('Failed to fetch user:', error)

      if (error?.response?.status === 401 || error?.response?.data?.code === 550) {
        authStore.clearTokens()
        next({ name: 'Login' })
        return
      }

      console.warn('Could not fetch user data, but token exists. Allowing access.')
      continueOrForbid()
    }
    return
  }

  continueOrForbid()
}

export default authMiddleware
