import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router'
import { useAuthStore } from '@/modules/Auth/store/authStore'

// Public routes that don't require authentication
const publicRoutes = ['Login']

// Check if route requires authentication
const requiresAuth = (route: RouteLocationNormalized): boolean => {
  // Check by route name
  if (route.name && publicRoutes.includes(route.name as string)) {
    return false
  }

  // All other routes require authentication
  return true
}

// Authentication middleware
export const authMiddleware = async (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext
): Promise<void> => {
  const authStore = useAuthStore()

  // Initialize auth state from localStorage if not already initialized
  if (!authStore.token) {
    authStore.initAuth()
  }

  const token = authStore.getTokens()

  // Check if route is public (Login page)
  if (!requiresAuth(to)) {
    // If token exists, redirect to companies page instead of showing login
    if (token) {
      next('/initial/companies')
      return
    }
    next()
    return
  }

  // Route requires authentication - check token
  if (!token) {
    // No token in localStorage, redirect to login
    next({ name: 'Login' })
    return
  }

  // Token exists, check if user data is loaded
  if (!authStore.loggedIn || !authStore.user) {
    try {
      // Try to fetch current user data
      await authStore.fetchCurrentUser()
      next()
    } catch (error: any) {
      console.error('Failed to fetch user:', error)

      // Only redirect to login if it's a 401 (Unauthorized) or specific auth error
      // This prevents redirecting when API is temporarily unavailable
      if (error?.response?.status === 401 || error?.response?.data?.code === 550) {
        authStore.clearTokens()
        next({ name: 'Login' })
        return
      }

      // For other errors (network, 5xx, etc), allow access if token exists
      // The token will be validated on next API call
      console.warn('Could not fetch user data, but token exists. Allowing access.')
      next()
    }
    return
  }

  // User is authenticated and data is loaded
  next()
}

// Export default middleware function
export default authMiddleware
