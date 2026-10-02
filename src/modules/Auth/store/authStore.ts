import { defineStore } from 'pinia'
import router from '@/router'
import { useApi } from '@/composables/useAxiosService'
import type { User, CurrentUserResponse, CurrentUserCompany } from '@/modules/Auth/types'
import { setApiTimeZone, clearApiTimeZone } from '@/composables/useTimezone'

export const useAuthStore = defineStore('authStore', {
  state: () => ({
    user: null as User | null,
    company: null as CurrentUserCompany | null,
    loggedIn: false,
    token: null as string | null,
    refreshToken: null as string | null,
  }),
  getters: {
    isAuthenticated: (state) => !!state.token && state.loggedIn,
    getUser: (state) => state.user,
    getCompany: (state) => state.company,
    // Get companyId from carrier object
    companyId: (state) => state.company?.id || null,
    // Get clientId from carrier.provider object
    clientId: (state) => state.company?.client?.id || null,
  },
  actions: {
    // Initialize auth state from localStorage
    initAuth() {
      const token = localStorage.getItem('token')
      const refreshToken = localStorage.getItem('refreshToken')

      if (token) {
        this.token = token
        this.refreshToken = refreshToken
        // Don't set loggedIn here, wait for user data fetch
      }
    },
    getTokens() {
      return this.token || localStorage.getItem('token')
    },
    getRefreshToken() {
      return this.refreshToken || localStorage.getItem('refreshToken')
    },
    setTokens(token: string, refreshToken?: string) {
      this.token = token
      if (refreshToken) {
        this.refreshToken = refreshToken
        localStorage.setItem('refreshToken', refreshToken)
      }
      localStorage.setItem('token', token)
    },
    clearTokens() {
      this.token = null
      this.refreshToken = null
      this.user = null
      this.company = null
      this.loggedIn = false
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      // Clear API timezone on logout
      clearApiTimeZone()
    },
    setUser(user: User) {
      this.user = user
      this.loggedIn = true
    },
    setCompany(company: CurrentUserCompany | null) {
      this.company = company
    },
    async fetchCurrentUser() {
      try {
        const companyId = localStorage.getItem('companyId')
        const url = companyId
          ? `/api/users/current-user?companyId=${companyId}`
          : '/api/users/current-user'
        const res = await useApi().get<CurrentUserResponse>(url)

        // Current-user API returns successResult with user and carrier objects
        const result = res.data?.successResult
        if (result?.user) {
          this.setUser(result.user)

          // Save carrier data
          const company = result.carrier
            ? { ...result.carrier, client: result.carrier.provider }
            : null
          if (company) this.setCompany(company)

          // Save carrier timezone from API response (highest priority)
          if (company?.timeZoneInfo?.ianaId) {
            setApiTimeZone(company.timeZoneInfo.ianaId)
            console.log('Company timezone set from API:', company.timeZoneInfo.ianaId)
          }

          return result.user
        }

        // If no user data found but user is already set from login, don't throw error
        if (this.user) {
          console.warn('No user data from API, using existing user data')
          return this.user
        }

        throw new Error('No user data found')
      } catch (err: unknown) {
        console.error('fetchCurrentUser error:', err)

        if (err && typeof err === 'object' && 'response' in err) {
          const apiError = err as { response?: { data?: { code?: number } } }
          if (apiError.response?.data?.code === 550) {
            this.clearTokens()
            throw err
          }
        }

        // If user is already set from login, don't throw error
        if (this.user) {
          console.warn('fetchCurrentUser failed, using existing user data')
          return this.user
        }

        throw err
      }
    },
    async logout() {
      this.clearTokens()
      await router.push({ name: 'Login' })
    },
  },
})
