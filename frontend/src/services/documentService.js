/**
 * Document Service
 * API calls for document management, AI processing, and clause extraction
 */
import api, { downloadProtectedFile } from './api'
import { buildDownloadFilename } from '@/lib/utils'

/**
 * Get all documents for the current tenant
 */
export const getDocuments = async () => {
  const response = await api.get('/documentos/')
  return response.data
}

/**
 * Get document details including AI processing info
 */
export const getDocumentDetail = async (documentId) => {
  const response = await api.get(`/documentos/${documentId}/`)
  return response.data
}

/**
 * Create a new document
 */
export const createDocument = async (documentData) => {
  const response = await api.post('/documentos/', documentData)
  return response.data
}

/**
 * Update document
 */
export const updateDocument = async (documentId, documentData) => {
  const response = await api.patch(`/documentos/${documentId}/`, documentData)
  return response.data
}

/**
 * Delete document
 */
export const deleteDocument = async (documentId) => {
  const response = await api.delete(`/documentos/${documentId}/`)
  return response.data
}

/**
 * Upload document with file
 */
export const uploadDocument = async (formData) => {
  const response = await api.post('/documentos/upload/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 60000, // 60 seconds for file upload
  })
  return response.data
}

/**
 * Reprocess document with OCR and AI
 */
export const reprocessDocument = async (documentId) => {
  const response = await api.post(`/documentos/${documentId}/reprocess/`)
  return response.data
}

/**
 * Update editable transcription
 */
export const updateTranscripcion = async (documentId, transcripcionData) => {
  const response = await api.patch(`/documentos/${documentId}/transcripcion/`, {
    transcripcion_editable: transcripcionData
  })
  return response.data
}

/**
 * Accept extracted clauses and create them
 * @param {number} documentId 
 * @param {object} options - { accept_all: boolean } or { clausula_indices: number[] }
 */
export const acceptClausulas = async (documentId, options) => {
  const response = await api.post(`/documentos/${documentId}/accept-clausulas/`, options)
  return response.data
}

/**
 * Accept all extracted clauses
 */
export const acceptAllClausulas = async (documentId) => {
  return acceptClausulas(documentId, { accept_all: true })
}

/**
 * Accept specific clauses by indices
 */
export const acceptSpecificClausulas = async (documentId, indices) => {
  return acceptClausulas(documentId, { clausula_indices: indices })
}

/**
 * Descarga el archivo original que se subió al crear el documento.
 *
 * El archivo se sirve por el endpoint protegido /api/media/ (JWT), no por una
 * URL pública, así que la descarga pasa por axios y termina en un blob.
 * El nombre se reconstruye desde el título porque en el disco el archivo se
 * guarda como <uuid>.<ext>.
 *
 * @param {object} documento - Documento con al menos { titulo, archivo, filename }
 */
export const downloadOriginalFile = async (documento) => {
  if (!documento?.archivo) {
    throw new Error('El documento no tiene un archivo original asociado')
  }

  const nombreDescarga = buildDownloadFilename(
    documento.titulo,
    documento.filename || documento.archivo
  )

  await downloadProtectedFile(documento.archivo, nombreDescarga)
}

/**
 * Get all addendums for a document
 */
export const getDocumentAdendas = async (documentId) => {
  const response = await api.get(`/documentos/${documentId}/adendas/`)
  return response.data
}

/**
 * Create a new addendum for a document
 */
export const createAdenda = async (documentId, formData) => {
  const response = await api.post(`/documentos/${documentId}/adendas/`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

/**
 * Get addendum detail
 */
export const getAdendaDetail = async (documentId, adendaId) => {
  const response = await api.get(`/documentos/${documentId}/adendas/${adendaId}/`)
  return response.data
}

/**
 * Update addendum
 */
export const updateAdenda = async (documentId, adendaId, data) => {
  const response = await api.patch(`/documentos/${documentId}/adendas/${adendaId}/`, data)
  return response.data
}

/**
 * Delete addendum
 */
export const deleteAdenda = async (documentId, adendaId) => {
  const response = await api.delete(`/documentos/${documentId}/adendas/${adendaId}/`)
  return response.data
}

/**
 * Get file history for a document
 */
export const getFileHistory = async (documentId) => {
  const response = await api.get(`/documentos/${documentId}/file-history/`)
  return response.data
}

/**
 * Upload a new file version for a document
 */
export const uploadFileVersion = async (documentId, formData) => {
  const response = await api.post(`/documentos/${documentId}/file-history/`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

/**
 * Link a parent document
 */
export const linkParentDocument = async (documentId, parentDocumentId) => {
  const response = await api.post(`/documentos/${documentId}/link-parent/`, {
    documento_padre_id: parentDocumentId
  })
  return response.data
}

/**
 * Unlink parent document
 */
export const unlinkParentDocument = async (documentId) => {
  const response = await api.delete(`/documentos/${documentId}/unlink-parent/`)
  return response.data
}

/**
 * Link an auxiliary document
 */
export const linkAuxiliaryDocument = async (documentId, auxiliaryDocumentId) => {
  const response = await api.post(`/documentos/${documentId}/link-auxiliary/`, {
    documento_auxiliar_id: auxiliaryDocumentId
  })
  return response.data
}

/**
 * Unlink an auxiliary document
 */
export const unlinkAuxiliaryDocument = async (documentId, auxiliaryDocumentId) => {
  const response = await api.delete(`/documentos/${documentId}/unlink-auxiliary/${auxiliaryDocumentId}/`)
  return response.data
}

/**
 * Save graph layout (node positions and viewport) for a document
 */
export const saveGraphLayout = async (documentId, layout) => {
  const response = await api.post(`/documentos/${documentId}/graph-layout/`, {
    posiciones_grafo: layout
  })
  return response.data
}

export default {
  getDocuments,
  getDocumentDetail,
  createDocument,
  updateDocument,
  deleteDocument,
  uploadDocument,
  downloadOriginalFile,
  reprocessDocument,
  updateTranscripcion,
  acceptClausulas,
  acceptAllClausulas,
  acceptSpecificClausulas,
  getDocumentAdendas,
  createAdenda,
  getAdendaDetail,
  updateAdenda,
  deleteAdenda,
  getFileHistory,
  uploadFileVersion,
  linkParentDocument,
  unlinkParentDocument,
  linkAuxiliaryDocument,
  unlinkAuxiliaryDocument,
}
