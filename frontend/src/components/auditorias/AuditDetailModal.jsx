import React, { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { showNotification } from '@/store/slices/uiSlice'
import { downloadProtectedFile } from '@/services/api'
import auditService from '@/services/auditService'
import documentService from '@/services/documentService'
import AuditModal from './AuditModal'

const AuditDetailModal = ({ isOpen, onClose, audit, onUpdate }) => {
  const dispatch = useDispatch()
  const [activeTab, setActiveTab] = useState('overview')
  const [auditDetail, setAuditDetail] = useState(null)
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedDocuments, setSelectedDocuments] = useState([])
  const [uploadingFile, setUploadingFile] = useState(false)

  useEffect(() => {
    if (isOpen && audit) {
      fetchAuditDetail()
      fetchDocuments()
    }
  }, [isOpen, audit])

  const fetchAuditDetail = async () => {
    try {
      setLoading(true)
      const data = await auditService.getAuditDetail(audit.id)
      setAuditDetail(data)
    } catch (error) {
      dispatch(showNotification({
        message: 'Error al cargar detalles de la auditoría',
        type: 'error'
      }))
    } finally {
      setLoading(false)
    }
  }

  const fetchDocuments = async () => {
    try {
      const data = await documentService.getDocuments()
      setDocuments(data.results || data)
    } catch (error) {
      console.error('Error loading documents:', error)
    }
  }

  const handleAddDocuments = async () => {
    if (selectedDocuments.length === 0) {
      dispatch(showNotification({
        message: 'Seleccione al menos un documento',
        type: 'error'
      }))
      return
    }

    try {
      for (const docId of selectedDocuments) {
        await auditService.addDocumentToAudit(audit.id, docId)
      }
      
      await fetchAuditDetail()
      setSelectedDocuments([])
      dispatch(showNotification({
        message: 'Documentos agregados exitosamente',
        type: 'success'
      }))
    } catch (error) {
      dispatch(showNotification({
        message: 'Error al agregar documentos',
        type: 'error'
      }))
    }
  }

  const handleRemoveDocument = async (documentId) => {
    try {
      await auditService.removeDocumentFromAudit(audit.id, documentId)
      await fetchAuditDetail()
      dispatch(showNotification({
        message: 'Documento removido exitosamente',
        type: 'success'
      }))
    } catch (error) {
      dispatch(showNotification({
        message: 'Error al remover documento',
        type: 'error'
      }))
    }
  }

  const handleFileUpload = async (e, tipo) => {
    const file = e.target.files[0]
    if (!file) return

    setUploadingFile(true)
    try {
      await auditService.uploadAuditFile(audit.id, file, tipo)
      await fetchAuditDetail()
      dispatch(showNotification({
        message: 'Archivo subido exitosamente',
        type: 'success'
      }))
    } catch (error) {
      dispatch(showNotification({
        message: 'Error al subir archivo',
        type: 'error'
      }))
    } finally {
      setUploadingFile(false)
    }
  }

  const handleDeleteFile = async (archivoId) => {
    try {
      await auditService.deleteAuditFile(audit.id, archivoId)
      await fetchAuditDetail()
      dispatch(showNotification({
        message: 'Archivo eliminado exitosamente',
        type: 'success'
      }))
    } catch (error) {
      dispatch(showNotification({
        message: 'Error al eliminar archivo',
        type: 'error'
      }))
    }
  }

  const handleEditSuccess = (updatedAudit) => {
    setAuditDetail(updatedAudit)
    setEditModalOpen(false)
    onUpdate(updatedAudit)
  }

  const getEstadoBadge = (estado) => {
    const config = {
      'PROGRAMADA': 'bg-audit/10 text-audit',
      'EN_PROGRESO': 'bg-warning/10 text-warning',
      'COMPLETADA': 'bg-success/10 text-success',
      'CANCELADA': 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
    }
    return config[estado] || config['PROGRAMADA']
  }

  const getEstadoLabel = (estado) => {
    const labels = {
      'PROGRAMADA': 'Programada',
      'EN_PROGRESO': 'En Progreso',
      'COMPLETADA': 'Completada',
      'CANCELADA': 'Cancelada',
    }
    return labels[estado] || estado
  }

  const toggleDocumentSelection = (docId) => {
    setSelectedDocuments(prev =>
      prev.includes(docId)
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    )
  }

  if (!isOpen || !audit) return null

  const availableDocuments = documents.filter(doc =>
    !auditDetail?.documentos?.some(ad => ad.documento === doc.id)
  )

  return (
    <>
      <AuditModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSuccess={handleEditSuccess}
        audit={auditDetail}
      />

      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-surface-light dark:bg-surface-dark rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="border-b border-border-light dark:border-border-dark p-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-text-light dark:text-text-dark mb-2">
                  {audit.titulo}
                </h2>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium px-3 py-1 rounded-full ${getEstadoBadge(audit.estado)}`}>
                    {getEstadoLabel(audit.estado)}
                  </span>
                  <span className="text-sm text-subtle-light dark:text-subtle-dark">
                    {new Date(audit.fecha_programada).toLocaleDateString('es-ES')}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditModalOpen(true)}
                  className="text-primary hover:bg-primary/10 px-3 py-2 rounded-lg transition-colors"
                >
                  <span className="material-icons">edit</span>
                </button>
                <button
                  onClick={onClose}
                  className="text-subtle-light dark:text-subtle-dark hover:text-text-light dark:hover:text-text-dark"
                >
                  <span className="material-icons">close</span>
                </button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-border-light dark:border-border-dark">
            <div className="flex gap-6 px-6">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'overview'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-subtle-light dark:text-subtle-dark hover:text-text-light dark:hover:text-text-dark'
                }`}
              >
                Resumen
              </button>
              <button
                onClick={() => setActiveTab('documents')}
                className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'documents'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-subtle-light dark:text-subtle-dark hover:text-text-light dark:hover:text-text-dark'
                }`}
              >
                Documentos ({auditDetail?.documentos?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('files')}
                className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'files'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-subtle-light dark:text-subtle-dark hover:text-text-light dark:hover:text-text-dark'
                }`}
              >
                Archivos ({auditDetail?.archivos?.length || 0})
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : (
              <>
                {activeTab === 'overview' && auditDetail && (
                  <div className="space-y-6">
                    {auditDetail.descripcion && (
                      <div>
                        <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-2">
                          Descripción
                        </h3>
                        <p className="text-subtle-light dark:text-subtle-dark">
                          {auditDetail.descripcion}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium text-subtle-light dark:text-subtle-dark mb-1">
                          Fecha Programada
                        </h4>
                        <p className="text-text-light dark:text-text-dark">
                          {new Date(auditDetail.fecha_programada).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                      {auditDetail.fecha_inicio && (
                        <div>
                          <h4 className="text-sm font-medium text-subtle-light dark:text-subtle-dark mb-1">
                            Fecha de Inicio
                          </h4>
                          <p className="text-text-light dark:text-text-dark">
                            {new Date(auditDetail.fecha_inicio).toLocaleDateString('es-ES')}
                          </p>
                        </div>
                      )}
                      {auditDetail.fecha_finalizacion && (
                        <div>
                          <h4 className="text-sm font-medium text-subtle-light dark:text-subtle-dark mb-1">
                            Fecha de Finalización
                          </h4>
                          <p className="text-text-light dark:text-text-dark">
                            {new Date(auditDetail.fecha_finalizacion).toLocaleDateString('es-ES')}
                          </p>
                        </div>
                      )}
                      {auditDetail.responsable_nombre && (
                        <div>
                          <h4 className="text-sm font-medium text-subtle-light dark:text-subtle-dark mb-1">
                            Responsable
                          </h4>
                          <p className="text-text-light dark:text-text-dark">
                            {auditDetail.responsable_nombre}
                          </p>
                        </div>
                      )}
                    </div>

                    {auditDetail.hallazgos && (
                      <div>
                        <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-2">
                          Hallazgos
                        </h3>
                        <p className="text-subtle-light dark:text-subtle-dark whitespace-pre-wrap">
                          {auditDetail.hallazgos}
                        </p>
                      </div>
                    )}

                    {auditDetail.recomendaciones && (
                      <div>
                        <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-2">
                          Recomendaciones
                        </h3>
                        <p className="text-subtle-light dark:text-subtle-dark whitespace-pre-wrap">
                          {auditDetail.recomendaciones}
                        </p>
                      </div>
                    )}

                    {auditDetail.conclusion && (
                      <div>
                        <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-2">
                          Conclusión
                        </h3>
                        <p className="text-subtle-light dark:text-subtle-dark whitespace-pre-wrap">
                          {auditDetail.conclusion}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'documents' && (
                  <div className="space-y-6">
                    {/* Add Documents Section */}
                    <div className="bg-background-light dark:bg-background-dark p-4 rounded-lg">
                      <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-3">
                        Agregar Documentos
                      </h3>
                      <div className="space-y-2 max-h-64 overflow-y-auto mb-3">
                        {availableDocuments.length === 0 ? (
                          <p className="text-sm text-subtle-light dark:text-subtle-dark">
                            No hay documentos disponibles para agregar
                          </p>
                        ) : (
                          availableDocuments.map(doc => (
                            <label
                              key={doc.id}
                              className="flex items-center gap-3 p-2 hover:bg-surface-light dark:hover:bg-surface-dark rounded cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={selectedDocuments.includes(doc.id)}
                                onChange={() => toggleDocumentSelection(doc.id)}
                                className="rounded text-primary focus:ring-primary"
                              />
                              <span className="text-sm text-text-light dark:text-text-dark">
                                {doc.titulo}
                              </span>
                            </label>
                          ))
                        )}
                      </div>
                      {selectedDocuments.length > 0 && (
                        <button
                          onClick={handleAddDocuments}
                          className="w-full bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                        >
                          Agregar {selectedDocuments.length} documento(s)
                        </button>
                      )}
                    </div>

                    {/* Current Documents */}
                    <div>
                      <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-3">
                        Documentos de la Auditoría
                      </h3>
                      {auditDetail?.documentos?.length === 0 ? (
                        <p className="text-sm text-subtle-light dark:text-subtle-dark text-center py-8">
                          No hay documentos asignados a esta auditoría
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {auditDetail?.documentos?.map(docAudit => (
                            <div
                              key={docAudit.id}
                              className="flex items-center justify-between p-3 bg-background-light dark:bg-background-dark rounded-lg"
                            >
                              <div className="flex-1">
                                <p className="text-sm font-medium text-text-light dark:text-text-dark">
                                  {docAudit.documento_detalle?.titulo}
                                </p>
                                <p className="text-xs text-subtle-light dark:text-subtle-dark">
                                  {docAudit.documento_detalle?.tipo}
                                </p>
                              </div>
                              <button
                                onClick={() => handleRemoveDocument(docAudit.documento)}
                                className="text-danger hover:bg-danger/10 px-3 py-1 rounded transition-colors"
                              >
                                <span className="material-icons text-sm">delete</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'files' && (
                  <div className="space-y-6">
                    {/* Upload Files */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-background-light dark:bg-background-dark p-4 rounded-lg">
                        <h3 className="text-sm font-semibold text-text-light dark:text-text-dark mb-3">
                          Documentos Preparatorios
                        </h3>
                        <label className="block">
                          <input
                            type="file"
                            onChange={(e) => handleFileUpload(e, 'PREPARATORIO')}
                            disabled={uploadingFile}
                            className="hidden"
                          />
                          <div className="border-2 border-dashed border-border-light dark:border-border-dark rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors">
                            <span className="material-icons text-4xl text-subtle-light dark:text-subtle-dark mb-2">
                              upload_file
                            </span>
                            <p className="text-sm text-subtle-light dark:text-subtle-dark">
                              Subir documento preparatorio
                            </p>
                          </div>
                        </label>
                      </div>

                      <div className="bg-background-light dark:bg-background-dark p-4 rounded-lg">
                        <h3 className="text-sm font-semibold text-text-light dark:text-text-dark mb-3">
                          Documentos Respaldatorios
                        </h3>
                        <label className="block">
                          <input
                            type="file"
                            onChange={(e) => handleFileUpload(e, 'RESPALDATORIO')}
                            disabled={uploadingFile}
                            className="hidden"
                          />
                          <div className="border-2 border-dashed border-border-light dark:border-border-dark rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors">
                            <span className="material-icons text-4xl text-subtle-light dark:text-subtle-dark mb-2">
                              upload_file
                            </span>
                            <p className="text-sm text-subtle-light dark:text-subtle-dark">
                              Subir documento respaldatorio
                            </p>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Uploaded Files List */}
                    <div>
                      <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-3">
                        Archivos Subidos
                      </h3>
                      {auditDetail?.archivos?.length === 0 ? (
                        <p className="text-sm text-subtle-light dark:text-subtle-dark text-center py-8">
                          No hay archivos subidos
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {auditDetail?.archivos?.map(archivo => (
                            <div
                              key={archivo.id}
                              className="flex items-center justify-between p-3 bg-background-light dark:bg-background-dark rounded-lg"
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <span className="material-icons text-primary">
                                  {archivo.tipo === 'PREPARATORIO' ? 'folder' : 'verified'}
                                </span>
                                <div>
                                  <p className="text-sm font-medium text-text-light dark:text-text-dark">
                                    {archivo.nombre_archivo}
                                  </p>
                                  <p className="text-xs text-subtle-light dark:text-subtle-dark">
                                    {archivo.tipo === 'PREPARATORIO' ? 'Preparatorio' : 'Respaldatorio'} • 
                                    {new Date(archivo.fecha_subida).toLocaleDateString('es-ES')}
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => downloadProtectedFile(archivo.archivo, archivo.nombre_archivo)}
                                  className="text-primary hover:bg-primary/10 px-3 py-1 rounded transition-colors"
                                >
                                  <span className="material-icons text-sm">download</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteFile(archivo.id)}
                                  className="text-danger hover:bg-danger/10 px-3 py-1 rounded transition-colors"
                                >
                                  <span className="material-icons text-sm">delete</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default AuditDetailModal
