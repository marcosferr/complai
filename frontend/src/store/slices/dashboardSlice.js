import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import dashboardService from '../../services/dashboardService'

// Obtener estadísticas del dashboard
export const fetchDashboardStats = createAsyncThunk(
  'dashboard/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await dashboardService.getStats()
      return response.data
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Error al cargar estadísticas'
      )
    }
  }
)

const initialState = {
  stats: null,
  loading: false,
  error: null,
}

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    clearDashboard: (state) => {
      state.stats = null
      state.loading = false
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch stats
      .addCase(fetchDashboardStats.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchDashboardStats.fulfilled, (state, action) => {
        state.loading = false
        state.stats = action.payload
        state.error = null
      })
      .addCase(fetchDashboardStats.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
  },
})

export const { clearDashboard } = dashboardSlice.actions
export default dashboardSlice.reducer
