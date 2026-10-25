import api from './api'

// Tarea CRUD
export const getTareas = (params = {}) => {
  return api.get('/tareas/', { params })
}

export const getTarea = (id) => {
  return api.get(`/tareas/${id}/`)
}

export const createTarea = (data) => {
  return api.post('/tareas/', data)
}

export const createTareasMultiples = (tareasData) => {
  return api.post('/tareas/crear-multiples/', { tareas: tareasData })
}

// PATCH y no PUT: los dos llamadores mandan sólo los campos que cambiaron
// (la descripción, o la evaluación de riesgo). Con PUT, DRF valida el objeto
// completo y devolvía 400 exigiendo 'titulo' y 'fecha_vencimiento', así que
// ambas ediciones en línea fallaban siempre.
export const updateTarea = (id, data) => {
  return api.patch(`/tareas/${id}/`, data)
}

export const deleteTarea = (id) => {
  return api.delete(`/tareas/${id}/`)
}

// Único camino para corregir el título y la fecha de vencimiento: en el serializer
// ambos son de solo lectura, así que updateTarea() los ignora en silencio. Este
// endpoint exige rol habilitado y deja registro en la línea de tiempo.
// data: { titulo?, fecha_vencimiento?, motivo? } — motivo obligatorio si cambia la fecha.
export const editarObligacion = (tareaId, data) => {
  return api.patch(`/tareas/${tareaId}/editar/`, data)
}

// Filtros especiales
export const getTareasPorClausula = (clausulaId) => {
  return api.get(`/tareas/clausula/${clausulaId}/`)
}

export const getMisTareas = (params = {}) => {
  return api.get('/tareas/mis-tareas/', { params })
}

export const getAreas = () => {
  return api.get('/tareas/areas/')
}

// Checklist
export const agregarChecklistItem = (tareaId, data) => {
  return api.post(`/tareas/${tareaId}/checklist/`, data)
}

export const actualizarChecklistItem = (tareaId, itemId, data) => {
  return api.patch(`/tareas/${tareaId}/checklist/${itemId}/`, data)
}

export const eliminarChecklistItem = (tareaId, itemId) => {
  return api.delete(`/tareas/${tareaId}/checklist/${itemId}/eliminar/`)
}

export const marcarChecklistItem = (tareaId, itemId) => {
  return api.post(`/tareas/${tareaId}/checklist/${itemId}/marcar/`)
}

// Comentarios
export const getComentarios = (tareaId) => {
  return api.get(`/tareas/${tareaId}/comentarios/`)
}

export const agregarComentario = (tareaId, data) => {
  return api.post(`/tareas/${tareaId}/comentarios/`, data)
}

export const actualizarComentario = (tareaId, comentarioId, data) => {
  return api.put(`/tareas/${tareaId}/comentarios/${comentarioId}/`, data)
}

export const eliminarComentario = (tareaId, comentarioId) => {
  return api.delete(`/tareas/${tareaId}/comentarios/${comentarioId}/`)
}

// Archivos de respaldo
export const getArchivosRespaldo = (tareaId) => {
  return api.get(`/tareas/${tareaId}/archivos/`)
}

export const subirArchivo = (tareaId, formData) => {
  return api.post(`/tareas/${tareaId}/archivos/`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

export const eliminarArchivo = (tareaId, archivoId) => {
  return api.delete(`/tareas/${tareaId}/archivos/${archivoId}/`)
}

// Actualizar responsable
export const actualizarResponsables = (tareaId, userIds) => {
  return api.patch(`/tareas/${tareaId}/responsable/`, { responsables: userIds })
}

// Actualizar área
export const actualizarArea = (tareaId, areaId) => {
  return api.patch(`/tareas/${tareaId}/area/`, { area: areaId })
}

// Actualizar tags
export const actualizarTagsTarea = (tareaId, tags) => {
  return api.patch(`/tareas/${tareaId}/tags/`, { tags })
}

// ===== NUEVO SISTEMA DE ETAPAS Y ESTADOS =====

// Cambiar estado dentro de la etapa actual
export const cambiarEstadoEtapa = (tareaId, data) => {
  // data: { estado_etapa, observaciones?, documento_adjunto? }
  const formData = new FormData()
  formData.append('estado_etapa', data.estado_etapa)
  if (data.observaciones) {
    formData.append('observaciones', data.observaciones)
  }
  if (data.documento_adjunto) {
    formData.append('documento_adjunto', data.documento_adjunto)
  }

  return api.patch(`/tareas/${tareaId}/estado-etapa/`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

// Avanzar tarea a la siguiente etapa
export const avanzarEtapa = (tareaId, observaciones = '') => {
  return api.post(`/tareas/${tareaId}/avanzar-etapa/`, { observaciones })
}

// Devolver tarea a etapa anterior con observaciones
export const devolverConObservaciones = (tareaId, data) => {
  // data: { observaciones, documento_adjunto? }
  const formData = new FormData()
  formData.append('observaciones', data.observaciones)
  if (data.documento_adjunto) {
    formData.append('documento_adjunto', data.documento_adjunto)
  }

  return api.post(`/tareas/${tareaId}/devolver/`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

// Registrar remisión al Rectorado (solo Administrador/a de Contrato)
export const registrarRemisionRectorado = (tareaId, data) => {
  // data: { fecha_remision_rectorado, numero_expediente_rectorado?, documento_rectorado? }
  const formData = new FormData()
  formData.append('fecha_remision_rectorado', data.fecha_remision_rectorado)
  if (data.numero_expediente_rectorado) {
    formData.append('numero_expediente_rectorado', data.numero_expediente_rectorado)
  }
  if (data.documento_rectorado) {
    formData.append('documento_rectorado', data.documento_rectorado)
  }

  return api.post(`/tareas/${tareaId}/remision-rectorado/`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

// Obtener historial completo de cambios de estado
export const obtenerHistorial = (tareaId) => {
  return api.get(`/tareas/${tareaId}/historial/`)
}

// Obtener estadísticas de tareas por etapa
export const obtenerEstadisticas = (etapa = null) => {
  const params = etapa ? { etapa } : {}
  return api.get('/tareas/estadisticas/', { params })
}

// Cambiar etapa directamente (solo Administrador/a de Contrato)
export const cambiarEtapaDirecto = (tareaId, data) => {
  // data: { etapa_destino, estado_destino, observaciones? }
  return api.post(`/tareas/${tareaId}/cambiar-etapa/`, data)
}

// Obtener todos los tags disponibles
export const getTags = () => {
  return api.get('/tareas/tags/')
}

// Niveles de Riesgo
export const getNivelesRiesgo = () => {
  return api.get('/tareas/niveles-riesgo/')
}

export const createNivelRiesgo = (data) => {
  return api.post('/tareas/niveles-riesgo/', data)
}

export const updateNivelRiesgo = (id, data) => {
  return api.put(`/tareas/niveles-riesgo/${id}/`, data)
}

export const deleteNivelRiesgo = (id) => {
  return api.delete(`/tareas/niveles-riesgo/${id}/`)
}

// ===== PRESENTACIONES =====

// Obtener presentaciones de una tarea
export const getPresentaciones = (tareaId) => {
  return api.get(`/tareas/${tareaId}/presentaciones/`)
}

// Archivar una nueva presentación (solo Administrador/a de Contrato)
export const archivarPresentacion = (tareaId, data) => {
  // data: { nombre, descripcion? }
  return api.post(`/tareas/${tareaId}/presentaciones/archivar/`, data)
}

export default {
  getTareas,
  getTarea,
  createTarea,
  createTareasMultiples,
  updateTarea,
  deleteTarea,
  editarObligacion,
  getTareasPorClausula,
  getMisTareas,
  agregarChecklistItem,
  actualizarChecklistItem,
  eliminarChecklistItem,
  marcarChecklistItem,
  getComentarios,
  agregarComentario,
  actualizarComentario,
  eliminarComentario,
  getArchivosRespaldo,
  subirArchivo,
  eliminarArchivo,
  actualizarResponsables,
  actualizarArea,
  actualizarTagsTarea,
  getAreas,
  getTags,
  // Nuevos endpoints del sistema de etapas
  cambiarEstadoEtapa,
  avanzarEtapa,
  devolverConObservaciones,
  registrarRemisionRectorado,
  obtenerHistorial,
  obtenerEstadisticas,
  cambiarEtapaDirecto,
  // Niveles de Riesgo
  getNivelesRiesgo,
  createNivelRiesgo,
  updateNivelRiesgo,
  deleteNivelRiesgo,
  // Presentaciones
  getPresentaciones,
  archivarPresentacion,
}
