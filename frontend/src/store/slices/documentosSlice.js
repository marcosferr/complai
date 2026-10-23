import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  list: [],
  current: null,
  loading: false,
  error: null
}

const documentosSlice = createSlice({
  name: 'documentos',
  initialState,
  reducers: {
    setDocumentos: (state, action) => {
      state.list = action.payload
    },
    addDocumento: (state, action) => {
      state.list.unshift(action.payload)
    },
    updateDocumento: (state, action) => {
      const index = state.list.findIndex(doc => doc.id === action.payload.id)
      if (index !== -1) {
        state.list[index] = action.payload
      }
    },
    removeDocumento: (state, action) => {
      state.list = state.list.filter(doc => doc.id !== action.payload)
    },
    setCurrentDocumento: (state, action) => {
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
  setDocumentos,
  addDocumento,
  updateDocumento,
  removeDocumento,
  setCurrentDocumento,
  setLoading,
  setError
} = documentosSlice.actions

export default documentosSlice.reducer