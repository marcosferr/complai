import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  eventos: [],
  loading: false,
  currentView: 'month',
  error: null
}

const calendarioSlice = createSlice({
  name: 'calendario',
  initialState,
  reducers: {
    setEventos: (state, action) => {
      state.eventos = action.payload
    },
    addEvento: (state, action) => {
      state.eventos.push(action.payload)
    },
    updateEvento: (state, action) => {
      const index = state.eventos.findIndex(evento => evento.id === action.payload.id)
      if (index !== -1) {
        state.eventos[index] = action.payload
      }
    },
    removeEvento: (state, action) => {
      state.eventos = state.eventos.filter(evento => evento.id !== action.payload)
    },
    setCurrentView: (state, action) => {
      state.currentView = action.payload
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
  setEventos,
  addEvento,
  updateEvento,
  removeEvento,
  setCurrentView,
  setLoading,
  setError
} = calendarioSlice.actions

export default calendarioSlice.reducer