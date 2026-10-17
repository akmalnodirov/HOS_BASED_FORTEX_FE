import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { useApi } from '@/composables/useAxiosService'
import { useAuthStore } from '@/modules/Auth/store/authStore'
import type { LoginCredentials, LoginResponse } from '@/modules/Auth/types'

interface LoginErrors {
  username: string
  password: string
}

export function useLogin() {
  const router = useRouter()
  const api = useApi()
  const authStore = useAuthStore()

  const username = ref('')
  const password = ref('')
  const isLoading = ref(false)
  const errors = ref<LoginErrors>({
    username: '',
    password: '',
  })

  const validateForm = (): boolean => {
    errors.value = {
      username: '',
      password: '',
    }

    let isValid = true

    if (!username.value.trim()) {
      errors.value.username = 'Username is required'
      isValid = false
    }

    if (!password.value) {
      errors.value.password = 'Password is required'
      isValid = false
    } else if (password.value.length < 6) {
      errors.value.password = 'Password must be at least 6 characters'
      isValid = false
    }

    return isValid
  }

  const clearError = (field: keyof LoginErrors): void => {
    errors.value[field] = ''
  }

  const clearAllErrors = (): void => {
    errors.value = {
      username: '',
      password: '',
    }
  }

  const resetForm = (): void => {
    username.value = ''
    password.value = ''
    clearAllErrors()
  }

  const login = async (credentials: LoginCredentials): Promise<LoginResponse> => {
    try {
      const response = await api.post<LoginResponse>('/api/auth/login', credentials)

      const { successResult } = response.data
      const { token, refreshToken, user } = successResult

      authStore.clearSelectedCompany()
      authStore.setTokens(token, refreshToken)

      if (user) {
        authStore.setUser(user)
      }

      return response.data
    } catch (error: unknown) {
      throw error
    }
  }

  const handleSubmit = async (): Promise<void> => {
    if (!validateForm()) {
      return
    }

    isLoading.value = true

    try {
      await login({ username: username.value, password: password.value })

      toast.success('Login Successful', {
        description: 'Welcome back!',
        position: 'top-right',
        duration: 3_000,
      })

      try {
        await authStore.fetchCurrentUser()
      } catch (error) {
        console.warn('Could not fetch current user, using login data:', error)
      }

      await router.replace('/initial/companies')

      resetForm()
    } catch (error: unknown) {
      console.error('Login error:', error)

      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as {
          response?: { data?: { errors?: Record<string, string | string[]> } }
        }
        if (apiError.response?.data?.errors) {
          const apiErrors = apiError.response.data.errors
          if (apiErrors.username) {
            errors.value.username = Array.isArray(apiErrors.username)
              ? apiErrors.username[0]
              : apiErrors.username
          }
          if (apiErrors.password) {
            errors.value.password = Array.isArray(apiErrors.password)
              ? apiErrors.password[0]
              : apiErrors.password
          }
        }
      }

    } finally {
      isLoading.value = false
    }
  }

  return {
    username,
    password,
    isLoading,
    errors,

    validateForm,
    clearError,
    clearAllErrors,
    resetForm,
    handleSubmit,
    login,
  }
}
