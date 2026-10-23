import axios from 'axios'
import { store } from '@/store'
import { logout, updateTokens } from '@/store/slices/authSlice'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = store.getState().auth.token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Handle 401 errors (unauthorized)
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return api(originalRequest)
          })
          .catch(err => {
            return Promise.reject(err)
          })
      }

      originalRequest._retry = true
      isRefreshing = true

      const refreshToken = store.getState().auth.refreshToken

      if (!refreshToken) {
        // No refresh token available, logout
        store.dispatch(logout())
        window.location.href = '/login'
        return Promise.reject(error)
      }

      try {
        const response = await axios.post(`${API_BASE_URL}/auth/refresh/`, {
          refresh: refreshToken,
        })

        const { access, refresh } = response.data
        
        // Update tokens in store (new refresh token from rotation)
        store.dispatch(updateTokens({ access, refresh }))

        // Update authorization header for original request
        originalRequest.headers.Authorization = `Bearer ${access}`
        
        // Process queued requests
        processQueue(null, access)
        
        isRefreshing = false

        // Retry original request with new token
        return api(originalRequest)
      } catch (refreshError) {
        // Refresh failed, logout user
        processQueue(refreshError, null)
        isRefreshing = false
        
        store.dispatch(logout())
        window.location.href = '/login'
        
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

/**
 * Convert a /media/ URL to the protected /api/media/ endpoint
 * Note: Returns path relative to API base URL (without leading /api/)
 * @param {string} url - Original media URL (e.g., /media/documents/file.pdf)
 * @returns {string} - Protected URL relative to baseURL (e.g., /media/documents/file.pdf)
 */
export const getProtectedMediaUrl = (url) => {
  if (!url) return null
  
  // Extract the media path and return it for the protected endpoint
  // The axios baseURL already includes /api, so we just need /media/...
  if (url.includes('/media/')) {
    const mediaPath = url.split('/media/')[1]
    // For axios requests, return relative to baseURL (which is /api)
    // So /media/... becomes the endpoint that maps to /api/media/...
    return `/media/${mediaPath}`
  }
  
  return url
}

/**
 * Get the full protected media URL for use in src attributes (images, videos)
 * This returns the complete URL including the API base and auth token as query param
 * @param {string} url - Original media URL
 * @returns {string} - Full protected URL for src attributes with token
 */
export const getProtectedMediaSrcUrl = (url) => {
  if (!url) return null
  
  if (url.includes('/media/')) {
    const mediaPath = url.split('/media/')[1]
    const token = store.getState().auth.token
    const baseUrl = `${API_BASE_URL}/media/${mediaPath}`
    
    // Add token as query parameter for img/video src attributes
    if (token) {
      return `${baseUrl}?token=${token}`
    }
    return baseUrl
  }
  
  return url
}

/**
 * Download a protected media file with JWT authentication
 * @param {string} url - The media URL to download
 * @param {string} filename - Optional filename for the download
 * @returns {Promise<void>}
 */
export const downloadProtectedFile = async (url, filename = null) => {
  try {
    const protectedUrl = getProtectedMediaUrl(url)
    
    const response = await api.get(protectedUrl, {
      responseType: 'blob',
    })
    
    // Create blob URL and trigger download
    const blob = new Blob([response.data], { type: response.headers['content-type'] })
    const blobUrl = window.URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = filename || extractFilename(url) || 'download'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // Clean up blob URL
    window.URL.revokeObjectURL(blobUrl)
  } catch (error) {
    console.error('Error downloading file:', error)
    throw error
  }
}

/**
 * Open a protected media file in a new tab (for PDFs, images, etc.)
 * @param {string} url - The media URL to open
 * @returns {Promise<void>}
 */
export const openProtectedFile = async (url) => {
  try {
    const protectedUrl = getProtectedMediaUrl(url)
    
    const response = await api.get(protectedUrl, {
      responseType: 'blob',
    })
    
    // Create blob URL and open in new tab
    const blob = new Blob([response.data], { type: response.headers['content-type'] })
    const blobUrl = window.URL.createObjectURL(blob)
    
    window.open(blobUrl, '_blank')
  } catch (error) {
    console.error('Error opening file:', error)
    throw error
  }
}

/**
 * Extract filename from URL
 */
const extractFilename = (url) => {
  if (!url) return null
  const parts = url.split('/')
  return parts[parts.length - 1]
}

export default api