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

  // State
  const username = ref('')
  const password = ref('')
  const isLoading = ref(false)
  const errors = ref<LoginErrors>({
    username: '',
    password: '',
  })

  // Validation
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

  // Clear error for specific field
  const clearError = (field: keyof LoginErrors): void => {
    errors.value[field] = ''
  }

  // Clear all errors
  const clearAllErrors = (): void => {
    errors.value = {
      username: '',
      password: '',
    }
  }

  // Reset form
  const resetForm = (): void => {
    username.value = ''
    password.value = ''
    clearAllErrors()
  }

  // Login API call
  const login = async (credentials: LoginCredentials): Promise<LoginResponse> => {
    try {
      const response = await api.post<LoginResponse>('/api/auth/login', credentials)

      const { successResult } = response.data
      const { token, refreshToken, user } = successResult

      // Save tokens
      authStore.setTokens(token, refreshToken)

      // Save user data
      if (user) {
        authStore.setUser(user)
      }

      return response.data
    } catch (error: unknown) {
      // Error will be handled by axios interceptor
      throw error
    }
  }

  // Handle form submit
  const handleSubmit = async (): Promise<void> => {
    if (!validateForm()) {
      return
    }

    isLoading.value = true

    try {
      // Call login API
      await login({ username: username.value, password: password.value })

      toast.success('Login Successful', {
        description: 'Welcome back!',
        position: 'top-right',
      })

      // Try to fetch current user to get full user data
      // If it fails, continue with user data from login response
      try {
        await authStore.fetchCurrentUser()
      } catch (error) {
        // If fetchCurrentUser fails, user data from login is already saved
        // Continue with login flow
        console.warn('Could not fetch current user, using login data:', error)
      }

      // Redirect to Companies page (use replace to avoid redirect in history)
      await router.replace('/initial/companies')

      // Reset form after successful login
      resetForm()
    } catch (error: unknown) {
      console.error('Login error:', error)

      // Set field errors if validation errors exist
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

      // Generic error toast is already shown by axios interceptor
    } finally {
      isLoading.value = false
    }
  }

  return {
    // State
    username,
    password,
    isLoading,
    errors,

    // Methods
    validateForm,
    clearError,
    clearAllErrors,
    resetForm,
    handleSubmit,
    login,
  }
}
