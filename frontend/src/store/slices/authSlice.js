import { createSlice } from '@reduxjs/toolkit'

const token = localStorage.getItem('token')
const refreshToken = localStorage.getItem('refreshToken')

// Safely parse user from localStorage
let user = null
try {
  const userStr = localStorage.getItem('user')
  if (userStr && userStr !== 'undefined' && userStr !== 'null') {
    user = JSON.parse(userStr)
  }
} catch (error) {
  console.error('Error parsing user from localStorage:', error)
  localStorage.removeItem('user')
}

const initialState = {
  user: user,
  token: token,
  refreshToken: refreshToken,
  isAuthenticated: !!token && !!user,
  loading: false,
  error: null
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.loading = true
      state.error = null
    },
    loginSuccess: (state, action) => {
      state.loading = false
      state.isAuthenticated = true
      
      // Handle both login (with user) and refresh (without user) scenarios
      if (action.payload.user) {
        state.user = action.payload.user
        localStorage.setItem('user', JSON.stringify(action.payload.user))
      }
      
      state.token = action.payload.access
      state.refreshToken = action.payload.refresh
      state.error = null
      
      localStorage.setItem('token', action.payload.access)
      localStorage.setItem('refreshToken', action.payload.refresh)
    },
    loginFailure: (state, action) => {
      state.loading = false
      state.isAuthenticated = false
      state.user = null
      state.token = null
      state.refreshToken = null
      state.error = action.payload
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
    },
    logout: (state) => {
      state.isAuthenticated = false
      state.user = null
      state.token = null
      state.refreshToken = null
      state.error = null
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
    },
    updateTokens: (state, action) => {
      // Update tokens without affecting user state (for token refresh)
      state.token = action.payload.access
      state.refreshToken = action.payload.refresh
      localStorage.setItem('token', action.payload.access)
      localStorage.setItem('refreshToken', action.payload.refresh)
    },
    clearError: (state) => {
      state.error = null
    }
  }
})

export const {
  loginStart,
  loginSuccess,
  loginFailure,
  logout,
  updateTokens,
  clearError
} = authSlice.actions

export default authSlice.reducer