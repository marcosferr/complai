import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import clausulaService from '@/services/clausulaService'

// Async thunks
export const fetchClausulas = createAsyncThunk(
  'clausulas/fetchClausulas',
  async (params, { rejectWithValue }) => {
    try {
      const response = await clausulaService.getClausulas(params)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message)
    }
  }
)

export const fetchClausulasByDocumento = createAsyncThunk(
  'clausulas/fetchByDocumento',
  async (documentoId, { rejectWithValue }) => {
    try {
      const response = await clausulaService.getClausulasByDocumento(documentoId)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message)
    }
  }
)

export const fetchClausula = createAsyncThunk(
  'clausulas/fetchClausula',
  async (id, { rejectWithValue }) => {
    try {
      const response = await clausulaService.getClausula(id)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message)
    }
  }
)

export const createClausula = createAsyncThunk(
  'clausulas/create',
  async (data, { rejectWithValue }) => {
    try {
      const response = await clausulaService.createClausula(data)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message)
    }
  }
)

export const updateClausula = createAsyncThunk(
  'clausulas/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await clausulaService.updateClausula(id, data)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message)
    }
  }
)

export const deleteClausula = createAsyncThunk(
  'clausulas/delete',
  async (id, { rejectWithValue }) => {
    try {
      await clausulaService.deleteClausula(id)
      return id
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message)
    }
  }
)

// Relaciones
export const createRelacion = createAsyncThunk(
  'clausulas/createRelacion',
  async (data, { rejectWithValue }) => {
    try {
      const response = await clausulaService.createRelacion(data)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message)
    }
  }
)

export const deleteRelacion = createAsyncThunk(
  'clausulas/deleteRelacion',
  async (id, { rejectWithValue }) => {
    try {
      await clausulaService.deleteRelacion(id)
      return id
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message)
    }
  }
)

const initialState = {
  clausulas: [],
  currentClausula: null,
  loading: false,
  error: null,
  filters: {
    documento: null,
  },
}

const clausulasSlice = createSlice({
  name: 'clausulas',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload }
    },
    clearCurrentClausula: (state) => {
      state.currentClausula = null
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch clausulas
      .addCase(fetchClausulas.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchClausulas.fulfilled, (state, action) => {
        state.loading = false
        state.clausulas = action.payload
      })
      .addCase(fetchClausulas.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      // Fetch by documento
      .addCase(fetchClausulasByDocumento.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchClausulasByDocumento.fulfilled, (state, action) => {
        state.loading = false
        state.clausulas = action.payload
      })
      .addCase(fetchClausulasByDocumento.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      // Fetch single clausula
      .addCase(fetchClausula.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchClausula.fulfilled, (state, action) => {
        state.loading = false
        state.currentClausula = action.payload
      })
      .addCase(fetchClausula.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      // Create clausula
      .addCase(createClausula.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(createClausula.fulfilled, (state, action) => {
        state.loading = false
        state.clausulas.push(action.payload)
      })
      .addCase(createClausula.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      // Update clausula
      .addCase(updateClausula.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(updateClausula.fulfilled, (state, action) => {
        state.loading = false
        const index = state.clausulas.findIndex((c) => c.id === action.payload.id)
        if (index !== -1) {
          state.clausulas[index] = action.payload
        }
        if (state.currentClausula?.id === action.payload.id) {
          state.currentClausula = action.payload
        }
      })
      .addCase(updateClausula.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      // Delete clausula
      .addCase(deleteClausula.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(deleteClausula.fulfilled, (state, action) => {
        state.loading = false
        state.clausulas = state.clausulas.filter((c) => c.id !== action.payload)
        if (state.currentClausula?.id === action.payload) {
          state.currentClausula = null
        }
      })
      .addCase(deleteClausula.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
  },
})

export const { clearError, setFilters, clearCurrentClausula } = clausulasSlice.actions

export default clausulasSlice.reducer
