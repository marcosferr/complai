import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  list: [],
  current: null,
  loading: false,
  error: null
}

const auditoriasSlice = createSlice({
  name: 'auditorias',
  initialState,
  reducers: {
    setAuditorias: (state, action) => {
      state.list = action.payload
    },
    addAuditoria: (state, action) => {
      state.list.unshift(action.payload)
    },
    updateAuditoria: (state, action) => {
      const index = state.list.findIndex(auditoria => auditoria.id === action.payload.id)
      if (index !== -1) {
        state.list[index] = action.payload
      }
    },
    removeAuditoria: (state, action) => {
      state.list = state.list.filter(auditoria => auditoria.id !== action.payload)
    },
    setCurrentAuditoria: (state, action) => {
      state.current = action.payload
    },
    setLoading: (state, action) => {
      state.loading = action.payload
    },
    setError: (state, action) => {
      state.error = action.payload
    }
  }
})

export const {
  setAuditorias,
  addAuditoria,
  updateAuditoria,
  removeAuditoria,
  setCurrentAuditoria,
  setLoading,
  setError
} = auditoriasSlice.actions

export default auditoriasSlice.reducer