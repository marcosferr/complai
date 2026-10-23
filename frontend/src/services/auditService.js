/**
 * Audit Service
 * API calls for audit management
 */
import api from './api'

/**
 * Get all audits for the current tenant
 */
export const getAudits = async () => {
  const response = await api.get('/auditorias/')
  return response.data
}

/**
 * Get audit details
 */
export const getAuditDetail = async (auditId) => {
  const response = await api.get(`/auditorias/${auditId}/`)
  return response.data
}

/**
 * Create a new audit
 */
export const createAudit = async (auditData) => {
  const response = await api.post('/auditorias/', auditData)
  return response.data
}

/**
 * Update an existing audit
 */
export const updateAudit = async (auditId, auditData) => {
  const response = await api.patch(`/auditorias/${auditId}/`, auditData)
  return response.data
}

/**
 * Delete an audit
 */
export const deleteAudit = async (auditId) => {
  const response = await api.delete(`/auditorias/${auditId}/`)
  return response.data
}

/**
 * Add a document to an audit
 */
export const addDocumentToAudit = async (auditId, documentId, notas = '') => {
  const response = await api.post(`/auditorias/${auditId}/add_documento/`, {
    documento_id: documentId,
    notas
  })
  return response.data
}

/**
 * Remove a document from an audit
 */
export const removeDocumentFromAudit = async (auditId, documentId) => {
  const response = await api.delete(`/auditorias/${auditId}/remove_documento/${documentId}/`)
  return response.data
}

/**
 * Upload a file to an audit
 */
export const uploadAuditFile = async (auditId, file, tipo, descripcion = '') => {
  const formData = new FormData()
  formData.append('archivo', file)
  formData.append('tipo', tipo)
  formData.append('descripcion', descripcion)
  
  const response = await api.post(`/auditorias/${auditId}/upload_archivo/`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
  return response.data
}

/**
 * Delete a file from an audit
 */
export const deleteAuditFile = async (auditId, archivoId) => {
  const response = await api.delete(`/auditorias/${auditId}/delete_archivo/${archivoId}/`)
  return response.data
}

/**
 * Get scheduled audits
 */
export const getScheduledAudits = async () => {
  const response = await api.get('/auditorias/programadas/')
  return response.data
}

/**
 * Get completed audits
 */
export const getCompletedAudits = async () => {
  const response = await api.get('/auditorias/completadas/')
  return response.data
}

const auditService = {
  getAudits,
  getAuditDetail,
  createAudit,
  updateAudit,
  deleteAudit,
  addDocumentToAudit,
  removeDocumentFromAudit,
  uploadAuditFile,
  deleteAuditFile,
  getScheduledAudits,
  getCompletedAudits
}

export default auditService
