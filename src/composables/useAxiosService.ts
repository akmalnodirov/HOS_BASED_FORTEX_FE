import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios'
import { toast } from 'vue-sonner'
import router from '@/router'
import { useAuthStore } from '@/modules/Auth/store/authStore'

// Types
interface ApiError {
  message: string
  errors?: Record<string, string[]> | Array<Record<string, string | string[]>>
  statusCode?: number
}

interface RequestConfig extends AxiosRequestConfig {
  _retry?: boolean
  _skipErrorHandling?: boolean
  _showSuccessToast?: boolean
  _successMessage?: string
}

// Error messages mapping
const ERROR_MESSAGES: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized - Please log in again',
  403: 'Forbidden - You do not have permission',
  404: 'Resource not found',
  408: 'Request timeout',
  409: 'Conflict - Resource already exists',
  422: 'Validation Error',
  429: 'Too many requests - Please try again later',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
}

class ApiService {
  private axiosInstance: AxiosInstance
  private isRefreshing = false
  private failedQueue: Array<{
    resolve: (value?: unknown) => void
    reject: (reason?: unknown) => void
  }> = []

  private getAuthStore() {
    return useAuthStore()
  }

  constructor(baseURL?: string) {
    const apiUrl = baseURL || import.meta.env.VITE_APP_BASE_URL

    this.axiosInstance = axios.create({
      baseURL: apiUrl,
      // timeout: 50000, // 30 seconds
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.setupInterceptors()
  }

  private setupInterceptors(): void {
    // Request Interceptor
    this.axiosInstance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = this.getAuthStore().getTokens()

        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`
        }

        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    // Response Interceptor
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => {
        // Show success toast if configured
        const config = response.config as RequestConfig
        if (config._showSuccessToast && config._successMessage) {
          toast.success(config._successMessage)
        }
        return response
      },
      async (error: AxiosError<ApiError>) => {
        const originalRequest = error.config as RequestConfig

        // Skip error handling if requested
        if (originalRequest?._skipErrorHandling) {
          return Promise.reject(error)
        }

        // Handle 401 - Unauthorized
        if (error.response?.status === 401) {
          if (!originalRequest._retry) {
            if (this.isRefreshing) {
              // Wait for token refresh
              return new Promise((resolve, reject) => {
                this.failedQueue.push({ resolve, reject })
              })
                .then(() => {
                  return this.axiosInstance(originalRequest)
                })
                .catch((err) => {
                  return Promise.reject(err)
                })
            }

            originalRequest._retry = true
            this.isRefreshing = true

            try {
              // Attempt to refresh token
              await this.refreshToken()
              this.processQueue(null)
              return this.axiosInstance(originalRequest)
            } catch (refreshError) {
              this.processQueue(refreshError)
              this.handleLogout()
              return Promise.reject(refreshError)
            } finally {
              this.isRefreshing = false
            }
          } else {
            this.handleLogout()
          }
        }

        // Handle other errors
        this.handleError(error)
        return Promise.reject(error)
      }
    )
  }

  private processQueue(error: unknown): void {
    this.failedQueue.forEach((promise) => {
      if (error) {
        promise.reject(error)
      } else {
        promise.resolve()
      }
    })

    this.failedQueue = []
  }

  private async refreshToken(): Promise<void> {
    const refreshToken = this.getAuthStore().getRefreshToken()

    if (!refreshToken) {
      throw new Error('No refresh token available')
    }

    try {
      // Call refresh token API
      // Note: Adjust the endpoint based on your actual API
      interface RefreshTokenResponse {
        successResult?: {
          token: string
          refreshToken: string
        }
        token?: string
        refreshToken?: string
      }

      const response = await axios.post<RefreshTokenResponse>(
        `${this.axiosInstance.defaults.baseURL}/api/auth/refresh`,
        { refreshToken },
        {
          _skipErrorHandling: true, // Skip error handling to avoid infinite loop
        } as RequestConfig
      )

      // Handle different response formats
      let newToken: string
      let newRefreshToken: string

      if (response.data.successResult) {
        newToken = response.data.successResult.token
        newRefreshToken = response.data.successResult.refreshToken
      } else if (response.data.token) {
        newToken = response.data.token
        newRefreshToken = response.data.refreshToken || refreshToken
      } else {
        throw new Error('Invalid refresh token response')
      }

      // Update tokens in store
      this.getAuthStore().setTokens(newToken, newRefreshToken)
    } catch (error) {
      console.error('Token refresh failed:', error)
      throw error
    }
  }

  private handleLogout(): void {
    this.getAuthStore().clearTokens()
    toast.error('Session expired. Please log in again.')
    router.push({ name: 'Login' })
  }

  private handleError(error: AxiosError<ApiError>): void {
    if (axios.isCancel(error)) {
      console.log('Request canceled:', error.message)
      return
    }

    // Network error
    if (!error.response) {
      if (error.code === 'ECONNABORTED') {
        toast.error('Request timeout. Please try again.')
      } else if (error.message === 'Network Error') {
        toast.error('Network error. Please check your connection.')
      } else {
        toast.error('An unexpected error occurred.')
      }
      return
    }

    const { status, data } = error.response

    // Handle validation errors (422)
    if (status === 422 && data?.errors) {
      this.handleValidationErrors(data)
      return
    }

    // Handle other errors
    const message = data?.message || ERROR_MESSAGES[status] || 'An error occurred'
    toast.error(message)
  }

  private handleValidationErrors(errorData: ApiError): void {
    const errors = errorData.errors

    if (!errors) {
      toast.error(errorData.message || 'Validation error')
      return
    }

    // Handle array of errors
    if (Array.isArray(errors)) {
      const firstError = errors[0]
      if (firstError) {
        for (const key in firstError) {
          const errorValue = firstError[key]
          if (Array.isArray(errorValue)) {
            toast.error(errorValue[0])
            return
          } else if (typeof errorValue === 'string') {
            toast.error(errorValue)
            return
          }
        }
      }
    }
    // Handle object of errors
    else {
      for (const key in errors) {
        const errorValue = errors[key]
        if (Array.isArray(errorValue)) {
          toast.error(errorValue[0])
          return
        } else if (typeof errorValue === 'string') {
          toast.error(errorValue)
          return
        }
      }
    }

    toast.error('Validation error occurred')
  }

  // HTTP Methods
  public async get<T = unknown>(url: string, config?: RequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.get<T>(url, config)
  }

  public async post<T = unknown, D = unknown>(
    url: string,
    data?: D,
    config?: RequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.axiosInstance.post<T>(url, data, config)
  }

  public async put<T = unknown, D = unknown>(
    url: string,
    data?: D,
    config?: RequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.axiosInstance.put<T>(url, data, config)
  }

  public async patch<T = unknown, D = unknown>(
    url: string,
    data?: D,
    config?: RequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.axiosInstance.patch<T>(url, data, config)
  }

  public async delete<T = unknown>(url: string, config?: RequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.delete<T>(url, config)
  }

  // Utility methods
  public getInstance(): AxiosInstance {
    return this.axiosInstance
  }

  public setBaseURL(baseURL: string): void {
    this.axiosInstance.defaults.baseURL = baseURL
  }

  public setHeader(key: string, value: string): void {
    this.axiosInstance.defaults.headers.common[key] = value
  }

  public removeHeader(key: string): void {
    delete this.axiosInstance.defaults.headers.common[key]
  }
}

// Export singleton instance
const apiService = new ApiService()

// Composable
export function useApi(baseURL?: string) {
  const service = baseURL ? new ApiService(baseURL) : apiService

  return {
    get: service.get.bind(service),
    post: service.post.bind(service),
    put: service.put.bind(service),
    patch: service.patch.bind(service),
    delete: service.delete.bind(service),
    getInstance: service.getInstance.bind(service),
    setBaseURL: service.setBaseURL.bind(service),
    setHeader: service.setHeader.bind(service),
    removeHeader: service.removeHeader.bind(service),
  }
}

// Export default instance
export default apiService
