import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  sidebarOpen: true,
  theme: 'light',
  loading: false,
  notifications: []
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen
    },
    setSidebarOpen: (state, action) => {
      state.sidebarOpen = action.payload
    },
    setTheme: (state, action) => {
      state.theme = action.payload
    },
    setLoading: (state, action) => {
      state.loading = action.payload
    },
    showNotification: (state, action) => {
      state.notifications.push({
        message: action.payload.message,
        type: action.payload.type || 'info',
        id: Date.now()
      })
    },
    hideNotification: (state) => {
      state.notifications.shift()
    }
  }
})

export const {
  toggleSidebar,
  setSidebarOpen,
  setTheme,
  setLoading,
  showNotification,
  hideNotification
} = uiSlice.actions

export default uiSlice.reducer