import axios, { AxiosResponse } from 'axios'
import type {
  User,
  LoginCredentials,
  LoginResponse,
  RefreshTokenResponse
} from '../types/auth'

const SAFE_HTTP_METHODS = new Set(['get', 'head', 'options'])

const getCSRFTokenFromCookie = (): string | null => {
  if (typeof document === 'undefined') {
    return null
  }

  const cookiePrefix = 'XSRF-TOKEN='
  const tokenCookie = document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith(cookiePrefix))

  if (!tokenCookie) {
    return null
  }

  const rawToken = decodeURIComponent(tokenCookie.substring(cookiePrefix.length))
  return rawToken.split('.')[0] || null
}

// Polyfill for crypto.randomUUID if not available
const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback UUID v4 generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

class AuthService {
  private baseURL = '/auth'

  private decodeJwtPayload(token: string): Record<string, any> | null {
    try {
      const payload = token.split('.')[1]
      if (!payload) return null
      return JSON.parse(atob(payload))
    } catch {
      return null
    }
  }

  private isLikelyAccessToken(token: string): boolean {
    const payload = this.decodeJwtPayload(token)
    if (!payload || typeof payload !== 'object') {
      return false
    }

    if (typeof payload.type === 'string') {
      return payload.type === 'access'
    }

    return Boolean(
      payload.username ||
      payload.permissions ||
      Array.isArray(payload.roles)
    )
  }

  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    // Always call backend API
    const response: AxiosResponse<LoginResponse> = await axios.post(
      `${this.baseURL}/login`,
      credentials,
      {
        withCredentials: true, // Send cookies
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )

    if (response.data.success) {
      const { accessToken, refreshToken, user } = response.data

      // Set token in axios headers for all future requests
      this.setAuthToken(accessToken)

      // Persist tokens and user data
      const storage = credentials.rememberMe ? localStorage : sessionStorage
      storage.setItem('accessToken', accessToken)
      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', refreshToken)
      storage.setItem('refreshToken', refreshToken)
      storage.setItem('user', JSON.stringify(user))

      console.log('✅ Login successful - tokens stored')
    }

    return response.data
  }

  async logout(): Promise<void> {
    try {
      await axios.post(`${this.baseURL}/logout`, undefined, {
        withCredentials: true,
        headers: {
          'Authorization': `Bearer ${this.getStoredToken()}`
        }
      })
    } finally {
      // Clear everything
      this.clearAuthToken()
      this.clearStorage()
      console.log('✅ Logout successful - tokens cleared')
    }
  }

  private clearStorage(): void {
    // Clear from both storages
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    sessionStorage.removeItem('accessToken')
    sessionStorage.removeItem('refreshToken')
    sessionStorage.removeItem('user')
  }

  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    const response: AxiosResponse<RefreshTokenResponse> = await axios.post(
      `${this.baseURL}/refresh`,
      { refreshToken },
      {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )

    if (response.data.success) {
      const { accessToken, refreshToken: newRefreshToken, user } = response.data

      // Update token in axios headers
      this.setAuthToken(accessToken)

      // Update persisted tokens in the same storage that was used
      const storage = localStorage.getItem('refreshToken') ? localStorage : sessionStorage
      storage.setItem('accessToken', accessToken)
      storage.setItem('refreshToken', newRefreshToken)
      storage.setItem('user', JSON.stringify(user))

      console.log('✅ Token refreshed successfully')
    }

    return response.data
  }

  async getCurrentUser(): Promise<User> {
    const token = this.getStoredToken()
    const response: AxiosResponse<{ success: boolean; data: User }> = await axios.get(
      `${this.baseURL}/users/me`,
      {
        withCredentials: true,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    )

    return response.data.data
  }

  async updateProfile(profileData: Partial<User>): Promise<User> {
    const response: AxiosResponse<{ success: boolean; data: User }> = await axios.put(
      `${this.baseURL}/users/me`,
      profileData
    )

    return response.data.data
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await axios.post(`${this.baseURL}/users/me/change-password`, {
      currentPassword,
      newPassword
    })
  }

  async validateToken(): Promise<boolean> {
    try {
      await axios.post(`${this.baseURL}/validate`)
      return true
    } catch {
      return false
    }
  }

  setAuthToken(token: string): void {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      console.log('🔑 Auth token set in axios headers')
    }
  }

  clearAuthToken(): void {
    delete axios.defaults.headers.common['Authorization']
    console.log('🔓 Auth token cleared from axios headers')
  }

  getStoredToken(): string | null {
    // Read from persisted storage
    return localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken')
  }

  initializeAuth(): void {
    // Initialize auth token from storage on app start
    const token = this.getStoredToken()
    if (token) {
      if (!this.isLikelyAccessToken(token)) {
        this.clearStorage()
        this.clearAuthToken()
        console.warn('Ignoring stale non-access token found in accessToken storage')
        return
      }

      this.setAuthToken(token)
      console.log('🔄 Auth token restored from storage')
    }
  }
}

export const authService = new AuthService()

// Initialize auth on service creation
authService.initializeAuth()

// Axios interceptors for token management
axios.interceptors.request.use(
  (config) => {
    // Ensure token is always in headers
    const token = authService.getStoredToken()
    if (token && !config.headers['Authorization']) {
      config.headers['Authorization'] = `Bearer ${token}`
    }

    // Attach CSRF token for state-changing requests protected by double-submit cookie middleware.
    const method = String(config.method || 'get').toLowerCase()
    if (!SAFE_HTTP_METHODS.has(method) && !config.headers['X-XSRF-TOKEN']) {
      const csrfToken = getCSRFTokenFromCookie()
      if (csrfToken) {
        config.headers['X-XSRF-TOKEN'] = csrfToken
      }
    }

    // Add correlation ID for request tracking
    config.headers['x-correlation-id'] = generateUUID()

    // Ensure credentials are sent
    config.withCredentials = true

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for handling token expiration
let isRefreshing = false
let failedQueue: any[] = []

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

axios.interceptors.response.use(
  (response) => {
    return response
  },
  async (error) => {
    const originalRequest = error.config

    // Handle 401 errors (token expired)
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue the request while token is being refreshed
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(token => {
          originalRequest.headers['Authorization'] = `Bearer ${token}`
          return axios(originalRequest)
        }).catch(err => {
          return Promise.reject(err)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      const refreshToken = localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken')

      if (!refreshToken) {
        // No refresh token, logout
        isRefreshing = false
        const event = new CustomEvent('auth:logout-required')
        window.dispatchEvent(event)
        return Promise.reject(error)
      }

      try {
        const response = await authService.refreshToken(refreshToken)
        const { accessToken } = response

        authService.setAuthToken(accessToken)
        originalRequest.headers['Authorization'] = `Bearer ${accessToken}`

        processQueue(null, accessToken)
        isRefreshing = false

        return axios(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        isRefreshing = false

        // Refresh failed, logout
        const event = new CustomEvent('auth:logout-required')
        window.dispatchEvent(event)

        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

