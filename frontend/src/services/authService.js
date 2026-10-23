/**
 * Authentication Service
 * Handles token refresh, auto-refresh scheduling, and auth state management
 */
import axios from 'axios'
import { store } from '@/store'
import { loginSuccess, updateTokens, logout } from '@/store/slices/authSlice'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

// Token refresh interval (refresh every 10 minutes for 15-minute tokens)
const TOKEN_REFRESH_INTERVAL = 10 * 60 * 1000 // 10 minutes in milliseconds

let refreshIntervalId = null

/**
 * Parse JWT token to get expiration time
 */
const parseJwt = (token) => {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch (error) {
    console.error('Error parsing JWT token:', error)
    return null
  }
}

/**
 * Check if token is expired or will expire soon (within 2 minutes)
 */
const isTokenExpiringSoon = (token) => {
  if (!token) return true

  const decoded = parseJwt(token)
  if (!decoded || !decoded.exp) return true

  const expirationTime = decoded.exp * 1000 // Convert to milliseconds
  const currentTime = Date.now()
  const timeUntilExpiry = expirationTime - currentTime

  // Token expires in less than 2 minutes
  return timeUntilExpiry < 2 * 60 * 1000
}

/**
 * Refresh the access token using the refresh token
 */
export const refreshAccessToken = async () => {
  try {
    const state = store.getState().auth
    const { refreshToken } = state

    if (!refreshToken) {
      throw new Error('No refresh token available')
    }

    const response = await axios.post(`${API_BASE_URL}/auth/refresh/`, {
      refresh: refreshToken,
    })

    const { access, refresh } = response.data

    // Update tokens in store
    store.dispatch(updateTokens({ access, refresh }))

    console.log('Token refreshed successfully')
    return access
  } catch (error) {
    console.error('Token refresh failed:', error)
    
    // If refresh fails, logout the user
    store.dispatch(logout())
    window.location.href = '/login'
    
    throw error
  }
}

/**
 * Start automatic token refresh interval
 */
export const startTokenRefreshInterval = () => {
  // Clear any existing interval
  stopTokenRefreshInterval()

  // Set up periodic token refresh
  refreshIntervalId = setInterval(async () => {
    const state = store.getState().auth
    const { token, isAuthenticated } = state

    if (!isAuthenticated || !token) {
      stopTokenRefreshInterval()
      return
    }

    // Check if token needs refresh
    if (isTokenExpiringSoon(token)) {
      console.log('Token expiring soon, refreshing...')
      try {
        await refreshAccessToken()
      } catch (error) {
        console.error('Failed to refresh token:', error)
        stopTokenRefreshInterval()
      }
    }
  }, TOKEN_REFRESH_INTERVAL)

  console.log('Token refresh interval started')
}

/**
 * Stop automatic token refresh interval
 */
export const stopTokenRefreshInterval = () => {
  if (refreshIntervalId) {
    clearInterval(refreshIntervalId)
    refreshIntervalId = null
    console.log('Token refresh interval stopped')
  }
}

/**
 * Initialize auth service - check token validity and start refresh interval
 */
export const initializeAuth = () => {
  const state = store.getState().auth
  const { token, isAuthenticated } = state

  if (isAuthenticated && token) {
    // Check if token is already expired or expiring soon
    if (isTokenExpiringSoon(token)) {
      console.log('Token expired or expiring soon, refreshing immediately...')
      refreshAccessToken().catch((error) => {
        console.error('Initial token refresh failed:', error)
      })
    }

    // Start the refresh interval
    startTokenRefreshInterval()
  }
}

/**
 * Request password reset
 */
export const requestPasswordReset = async (email) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/password-reset/`, { email })
    return response.data
  } catch (error) {
    throw error
  }
}

/**
 * Confirm password reset
 */
export const confirmPasswordReset = async (uid, token, password, passwordConfirm) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/password-reset/confirm/`, {
      uid,
      token,
      password,
      password_confirm: passwordConfirm
    })
    return response.data
  } catch (error) {
    throw error
  }
}

export default {
  refreshAccessToken,
  startTokenRefreshInterval,
  stopTokenRefreshInterval,
  initializeAuth,
  requestPasswordReset,
  confirmPasswordReset,
}
