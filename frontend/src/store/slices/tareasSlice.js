import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import tareaService from '@/services/tareaService'

// Async thunks
export const fetchTareas = createAsyncThunk(
  'tareas/fetchTareas',
  async (params, { rejectWithValue }) => {
    try {
      const response = await tareaService.getTareas(params)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message)
    }
  }
)

export const fetchTarea = createAsyncThunk(
  'tareas/fetchTarea',
  async (id, { rejectWithValue }) => {
    try {
      const response = await tareaService.getTarea(id)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message)
    }
  }
)

export const createTarea = createAsyncThunk(
  'tareas/create',
  async (data, { rejectWithValue }) => {
    try {
      const response = await tareaService.createTarea(data)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message)
    }
  }
)

export const createTareasMultiples = createAsyncThunk(
  'tareas/createMultiples',
  async (tareasData, { rejectWithValue }) => {
    try {
      const response = await tareaService.createTareasMultiples(tareasData)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message)
    }
  }
)

export const updateTareaData = createAsyncThunk(
  'tareas/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await tareaService.updateTarea(id, data)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message)
    }
  }
)

export const deleteTarea = createAsyncThunk(
  'tareas/delete',
  async (id, { rejectWithValue }) => {
    try {
      await tareaService.deleteTarea(id)
      return id
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message)
    }
  }
)

export const fetchMisTareas = createAsyncThunk(
  'tareas/fetchMisTareas',
  async (params, { rejectWithValue }) => {
    try {
      const response = await tareaService.getMisTareas(params)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message)
    }
  }
)

// Checklist thunks
export const agregarChecklistItem = createAsyncThunk(
  'tareas/agregarChecklistItem',
  async ({ tareaId, data }, { rejectWithValue }) => {
    try {
      const response = await tareaService.agregarChecklistItem(tareaId, data)
      return { tareaId, item: response.data }
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message)
    }
  }
)

export const marcarChecklistItem = createAsyncThunk(
  'tareas/marcarChecklistItem',
  async ({ tareaId, itemId }, { rejectWithValue }) => {
    try {
      const response = await tareaService.marcarChecklistItem(tareaId, itemId)
      return { tareaId, item: response.data }
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message)
    }
  }
)

export const eliminarChecklistItem = createAsyncThunk(
  'tareas/eliminarChecklistItem',
  async ({ tareaId, itemId }, { rejectWithValue }) => {
    try {
      await tareaService.eliminarChecklistItem(tareaId, itemId)
      return { tareaId, itemId }
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message)
    }
  }
)

// Comentarios thunks
export const agregarComentario = createAsyncThunk(
  'tareas/agregarComentario',
  async ({ tareaId, data }, { rejectWithValue }) => {
    try {
      const response = await tareaService.agregarComentario(tareaId, data)
      return { tareaId, comentario: response.data }
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message)
    }
  }
)

export const eliminarComentario = createAsyncThunk(
  'tareas/eliminarComentario',
  async ({ tareaId, comentarioId }, { rejectWithValue }) => {
    try {
      await tareaService.eliminarComentario(tareaId, comentarioId)
      return { tareaId, comentarioId }
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message)
    }
  }
)

// Archivos thunks
export const subirArchivo = createAsyncThunk(
  'tareas/subirArchivo',
  async ({ tareaId, formData }, { rejectWithValue }) => {
    try {
      const response = await tareaService.subirArchivo(tareaId, formData)
      return { tareaId, archivo: response.data }
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message)
    }
  }
)

export const eliminarArchivo = createAsyncThunk(
  'tareas/eliminarArchivo',
  async ({ tareaId, archivoId }, { rejectWithValue }) => {
    try {
      await tareaService.eliminarArchivo(tareaId, archivoId)
      return { tareaId, archivoId }
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message)
    }
  }
)

// Actualizar responsables
export const actualizarResponsables = createAsyncThunk(
  'tareas/actualizarResponsables',
  async ({ tareaId, userIds }, { rejectWithValue }) => {
    try {
      const response = await tareaService.actualizarResponsables(tareaId, userIds)
      return response.data.tarea
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message)
    }
  }
)

// ===== NUEVOS THUNKS PARA SISTEMA DE ETAPAS =====

// Cambiar estado dentro de la etapa actual
export const cambiarEstadoEtapaTarea = createAsyncThunk(
  'tareas/cambiarEstadoEtapa',
  async ({ tareaId, data }, { rejectWithValue }) => {
    try {
      const response = await tareaService.cambiarEstadoEtapa(tareaId, data)
      return response.data.tarea
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message)
    }
  }
)

// Avanzar tarea a siguiente etapa
export const avanzarEtapaTarea = createAsyncThunk(
  'tareas/avanzarEtapa',
  async ({ tareaId, observaciones }, { rejectWithValue }) => {
    try {
      const response = await tareaService.avanzarEtapa(tareaId, observaciones)
      return response.data.tarea
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message)
    }
  }
)

// Devolver tarea con observaciones
export const devolverTareaConObservaciones = createAsyncThunk(
  'tareas/devolverConObservaciones',
  async ({ tareaId, data }, { rejectWithValue }) => {
    try {
      const response = await tareaService.devolverConObservaciones(tareaId, data)
      return response.data.tarea
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message)
    }
  }
)

// Registrar remisión al Rectorado
export const registrarRemisionRectoradoTarea = createAsyncThunk(
  'tareas/registrarRemisionRectorado',
  async ({ tareaId, data }, { rejectWithValue }) => {
    try {
      const response = await tareaService.registrarRemisionRectorado(tareaId, data)
      return response.data.tarea
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message)
    }
  }
)

// Obtener historial de estados
export const fetchHistorialEstados = createAsyncThunk(
  'tareas/fetchHistorialEstados',
  async (tareaId, { rejectWithValue }) => {
    try {
      const response = await tareaService.obtenerHistorial(tareaId)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message)
    }
  }
)

// Obtener estadísticas por etapa
export const fetchEstadisticasEtapas = createAsyncThunk(
  'tareas/fetchEstadisticasEtapas',
  async (etapa = null, { rejectWithValue }) => {
    try {
      const response = await tareaService.obtenerEstadisticas(etapa)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message)
    }
  }
)

// Cambiar etapa directamente (solo Administrador/a de Contrato)
export const cambiarEtapaDirecto = createAsyncThunk(
  'tareas/cambiarEtapaDirecto',
  async ({ tareaId, data }, { rejectWithValue }) => {
    try {
      const response = await tareaService.cambiarEtapaDirecto(tareaId, data)
      return response.data.tarea
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message)
    }
  }
)

const initialState = {
  list: [],
  current: null,
  historialEstados: [],
  estadisticas: null,
  loading: false,
  error: null,
  filters: {
    etapa: null,
    estado_etapa: null,
    prioridad: null,
    area: null,
    responsable: null,
  },
}

const tareasSlice = createSlice({
  name: 'tareas',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload }
    },
    clearCurrentTarea: (state) => {
      state.current = null
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch tareas
      .addCase(fetchTareas.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchTareas.fulfilled, (state, action) => {
        state.loading = false
        state.list = action.payload
      })
      .addCase(fetchTareas.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      // Fetch single tarea
      .addCase(fetchTarea.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchTarea.fulfilled, (state, action) => {
        state.loading = false
        state.current = action.payload
      })
      .addCase(fetchTarea.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      // Create tarea
      .addCase(createTarea.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(createTarea.fulfilled, (state, action) => {
        state.loading = false
        state.list.unshift(action.payload)
      })
      .addCase(createTarea.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      // Create multiple tareas
      .addCase(createTareasMultiples.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(createTareasMultiples.fulfilled, (state, action) => {
        state.loading = false
        // Add all created tasks to the list
        if (action.payload.created && action.payload.created.length > 0) {
          state.list = [...action.payload.created, ...state.list]
        }
      })
      .addCase(createTareasMultiples.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      // Update tarea
      .addCase(updateTareaData.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(updateTareaData.fulfilled, (state, action) => {
        state.loading = false
        const index = state.list.findIndex((t) => t.id === action.payload.id)
        if (index !== -1) {
          state.list[index] = action.payload
        }
        if (state.current?.id === action.payload.id) {
          state.current = action.payload
        }
      })
      .addCase(updateTareaData.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      // Delete tarea
      .addCase(deleteTarea.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(deleteTarea.fulfilled, (state, action) => {
        state.loading = false
        state.list = state.list.filter((t) => t.id !== action.payload)
        if (state.current?.id === action.payload) {
          state.current = null
        }
      })
      .addCase(deleteTarea.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      // Fetch mis tareas
      .addCase(fetchMisTareas.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchMisTareas.fulfilled, (state, action) => {
        state.loading = false
        state.list = action.payload
      })
      .addCase(fetchMisTareas.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      // Actualizar responsables
      .addCase(actualizarResponsables.fulfilled, (state, action) => {
        const index = state.list.findIndex((t) => t.id === action.payload.id)
        if (index !== -1) {
          state.list[index] = action.payload
        }
        if (state.current?.id === action.payload.id) {
          state.current = action.payload
        }
      })
      // Cambiar estado etapa
      .addCase(cambiarEstadoEtapaTarea.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(cambiarEstadoEtapaTarea.fulfilled, (state, action) => {
        state.loading = false
        const index = state.list.findIndex((t) => t.id === action.payload.id)
        if (index !== -1) {
          state.list[index] = action.payload
        }
        if (state.current?.id === action.payload.id) {
          state.current = action.payload
        }
      })
      .addCase(cambiarEstadoEtapaTarea.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      // Avanzar etapa
      .addCase(avanzarEtapaTarea.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(avanzarEtapaTarea.fulfilled, (state, action) => {
        state.loading = false
        const index = state.list.findIndex((t) => t.id === action.payload.id)
        if (index !== -1) {
          state.list[index] = action.payload
        }
        if (state.current?.id === action.payload.id) {
          state.current = action.payload
        }
      })
      .addCase(avanzarEtapaTarea.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      // Devolver con observaciones
      .addCase(devolverTareaConObservaciones.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(devolverTareaConObservaciones.fulfilled, (state, action) => {
        state.loading = false
        const index = state.list.findIndex((t) => t.id === action.payload.id)
        if (index !== -1) {
          state.list[index] = action.payload
        }
        if (state.current?.id === action.payload.id) {
          state.current = action.payload
        }
      })
      .addCase(devolverTareaConObservaciones.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      // Registrar remisión al Rectorado
      .addCase(registrarRemisionRectoradoTarea.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(registrarRemisionRectoradoTarea.fulfilled, (state, action) => {
        state.loading = false
        const index = state.list.findIndex((t) => t.id === action.payload.id)
        if (index !== -1) {
          state.list[index] = action.payload
        }
        if (state.current?.id === action.payload.id) {
          state.current = action.payload
        }
      })
      .addCase(registrarRemisionRectoradoTarea.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      // Fetch historial estados
      .addCase(fetchHistorialEstados.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchHistorialEstados.fulfilled, (state, action) => {
        state.loading = false
        state.historialEstados = action.payload
      })
      .addCase(fetchHistorialEstados.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      // Fetch estadísticas etapas
      .addCase(fetchEstadisticasEtapas.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchEstadisticasEtapas.fulfilled, (state, action) => {
        state.loading = false
        state.estadisticas = action.payload
      })
      .addCase(fetchEstadisticasEtapas.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      // Cambiar etapa directo (Administrador/a de Contrato)
      .addCase(cambiarEtapaDirecto.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(cambiarEtapaDirecto.fulfilled, (state, action) => {
        state.loading = false
        const index = state.list.findIndex((t) => t.id === action.payload.id)
        if (index !== -1) {
          state.list[index] = action.payload
        }
        if (state.current?.id === action.payload.id) {
          state.current = action.payload
        }
      })
      .addCase(cambiarEtapaDirecto.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
  },
})

export const { clearError, setFilters, clearCurrentTarea } = tareasSlice.actions

export default tareasSlice.reducer