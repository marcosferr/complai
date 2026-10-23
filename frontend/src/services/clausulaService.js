import api from './api'

// Clausula CRUD
export const getClausulas = (params = {}) => {
  return api.get('/clausulas/', { params })
}

export const getClausulasByDocumento = (documentoId) => {
  return api.get(`/clausulas/documento/${documentoId}/`)
}

export const getClausula = (id) => {
  return api.get(`/clausulas/${id}/`)
}

export const createClausula = (data) => {
  return api.post('/clausulas/', data)
}

export const updateClausula = (id, data) => {
  return api.put(`/clausulas/${id}/`, data)
}

export const deleteClausula = (id) => {
  return api.delete(`/clausulas/${id}/`)
}

// Relaciones entre clausulas
export const getRelaciones = (params = {}) => {
  return api.get('/clausulas/relaciones/', { params })
}

export const createRelacion = (data) => {
  return api.post('/clausulas/relaciones/', data)
}

export const updateRelacion = (id, data) => {
  return api.put(`/clausulas/relaciones/${id}/`, data)
}

export const deleteRelacion = (id) => {
  return api.delete(`/clausulas/relaciones/${id}/`)
}

// Adendas
export const getAdendas = (params = {}) => {
  return api.get('/clausulas/adendas/', { params })
}

export const createAdenda = (data) => {
  return api.post('/clausulas/adendas/', data)
}

export const updateAdenda = (id, data) => {
  return api.put(`/clausulas/adendas/${id}/`, data)
}

export const deleteAdenda = (id) => {
  return api.delete(`/clausulas/adendas/${id}/`)
}

export const aplicarAdenda = (id) => {
  return api.post(`/clausulas/adendas/${id}/aplicar/`, { aplicar: true })
}

// Comparación de cláusulas entre documentos
export const compareClausulas = (documentoBaseId, documentoComparadoId) => {
  return api.get(`/clausulas/comparar/${documentoBaseId}/${documentoComparadoId}/`)
}

// Preview de cláusula
export const previewClausula = (clausulaId) => {
  return api.get(`/clausulas/${clausulaId}/preview/`)
}

export default {
  getClausulas,
  getClausulasByDocumento,
  getClausula,
  createClausula,
  updateClausula,
  deleteClausula,
  getRelaciones,
  createRelacion,
  updateRelacion,
  deleteRelacion,
  getAdendas,
  createAdenda,
  updateAdenda,
  deleteAdenda,
  aplicarAdenda,
  compareClausulas,
  previewClausula,
}
