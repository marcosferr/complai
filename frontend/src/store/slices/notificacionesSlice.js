import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import notificationService from '@/services/notificationService'

// Async thunks
export const fetchNotifications = createAsyncThunk(
  'notificaciones/fetchNotifications',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await notificationService.getNotifications(params)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message)
    }
  }
)

export const fetchUnreadCount = createAsyncThunk(
  'notificaciones/fetchUnreadCount',
  async (_, { rejectWithValue }) => {
    try {
      const response = await notificationService.getUnreadCount()
      return response.data.count
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message)
    }
  }
)

export const markNotificationAsRead = createAsyncThunk(
  'notificaciones/markAsRead',
  async (id, { rejectWithValue }) => {
    try {
      const response = await notificationService.markAsRead(id)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message)
    }
  }
)

export const markAllNotificationsAsRead = createAsyncThunk(
  'notificaciones/markAllAsRead',
  async (_, { rejectWithValue }) => {
    try {
      const response = await notificationService.markAllAsRead()
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message)
    }
  }
)

const initialState = {
  list: [],
  noLeidas: 0,
  loading: false,
  error: null,
  pagination: {
    count: 0,
    next: null,
    previous: null,
  }
}

const notificacionesSlice = createSlice({
  name: 'notificaciones',
  initialState,
  reducers: {
    addNotificacion: (state, action) => {
      state.list.unshift(action.payload)
      if (!action.payload.leida) {
        state.noLeidas += 1
      }
    },
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch notifications
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false
        state.list = action.payload.results || action.payload
        state.pagination = {
          count: action.payload.count || action.payload.length,
          next: action.payload.next,
          previous: action.payload.previous,
        }
        state.noLeidas = state.list.filter(n => !n.leida).length
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      
      // Fetch unread count
      .addCase(fetchUnreadCount.fulfilled, (state, action) => {
        state.noLeidas = action.payload
      })
      
      // Mark as read
      .addCase(markNotificationAsRead.fulfilled, (state, action) => {
        const notification = state.list.find(n => n.id === action.payload.id)
        if (notification && !notification.leida) {
          notification.leida = true
          state.noLeidas = Math.max(0, state.noLeidas - 1)
        }
      })
      
      // Mark all as read
      .addCase(markAllNotificationsAsRead.fulfilled, (state) => {
        state.list.forEach(notification => {
          notification.leida = true
        })
        state.noLeidas = 0
      })
  }
})

export const {
  addNotificacion,
  clearError,
} = notificacionesSlice.actions

export default notificacionesSlice.reducer