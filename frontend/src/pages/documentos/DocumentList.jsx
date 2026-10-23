import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import api from '@/services/api'
import { showNotification } from '@/store/slices/uiSlice'
import { startDocumentosTutorial } from '@/store/slices/tutorialSlice'
import DocumentUploadModal from '@/components/DocumentUploadModal'
import DocumentEditModal from '@/components/DocumentEditModal'
import ConfirmDialog from '@/components/ConfirmDialog'
import ClausulaTab from '@/components/clausulas/ClausulaTab'
import DocumentGraph from '@/components/documentos/DocumentGraph'
import ClausulaModal from '@/components/clausulas/ClausulaModal'
import TaskDetailModal from '@/components/tareas/TaskDetailModal'
import DocumentRelationshipPanel from '@/components/documentos/DocumentRelationshipPanel'
import clausulaService from '@/services/clausulaService'
import documentService from '@/services/documentService'
import { getClauseTerm } from '@/lib/utils'

const DocumentList = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { tutorialStep } = useSelector(state => state.tutorial)
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDocument, setSelectedDocument] = useState(null)
  const [downloading, setDownloading] = useState(false)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [documentToDelete, setDocumentToDelete] = useState(null)
  const [activeTab, setActiveTab] = useState('clauses') // clauses, transcription, details, graph
  const [clausulasForGraph, setClausulaForGraph] = useState([])
  const [parentClausulasForGraph, setParentClausulaForGraph] = useState([])
  const [auxiliaryClausulasForGraph, setAuxiliaryClausulasForGraph] = useState([])
  const [selectedClausula, setSelectedClausula] = useState(null)
  const [selectedTarea, setSelectedTarea] = useState(null)
  const [clausulaModalOpen, setClausulaModalOpen] = useState(false)
  const [tareaModalOpen, setTareaModalOpen] = useState(false)
  const [hasStartedDocumentosTutorial, setHasStartedDocumentosTutorial] = useState(false)

  // Auto-start documentos tutorial if sidebar tutorial was completed but documentos wasn't
  useEffect(() => {
    const sidebarCompleted = tutorialStep?.sidebar === true
    const documentosNotCompleted = tutorialStep?.documentos !== true
    
    if (sidebarCompleted && documentosNotCompleted && !hasStartedDocumentosTutorial) {
      setHasStartedDocumentosTutorial(true)
      const timer = setTimeout(() => {
        dispatch(startDocumentosTutorial())
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [tutorialStep?.sidebar, tutorialStep?.documentos, hasStartedDocumentosTutorial, dispatch])

  useEffect(() => {
    fetchDocuments()
  }, [])

  useEffect(() => {
    if (selectedDocument && activeTab === 'graph') {
      loadClausulasForGraph()
    }
  }, [selectedDocument, activeTab])

  const loadClausulasForGraph = async () => {
    if (!selectedDocument) return
    try {
      // Load current document clauses
      const response = await clausulaService.getClausulasByDocumento(selectedDocument.id)
      setClausulaForGraph(response.data)
      
      // Load parent document clauses if exists
      if (selectedDocument.documento_padre_info?.id) {
        try {
          const parentResponse = await clausulaService.getClausulasByDocumento(selectedDocument.documento_padre_info.id)
          setParentClausulaForGraph(parentResponse.data || [])
        } catch (parentError) {
          console.error('Error loading parent clausulas for graph:', parentError)
          setParentClausulaForGraph([])
        }
      } else {
        setParentClausulaForGraph([])
      }

      // Load auxiliary documents' clauses if they exist
      if (selectedDocument.documentos_auxiliares_info && selectedDocument.documentos_auxiliares_info.length > 0) {
        try {
          const auxiliaryClausulasPromises = selectedDocument.documentos_auxiliares_info.map(auxDoc =>
            clausulaService.getClausulasByDocumento(auxDoc.id)
              .then(res => ({ 
                documentoId: auxDoc.id, 
                documentoTitulo: auxDoc.titulo,
                clausulas: res.data || [] 
              }))
              .catch(err => {
                console.error(`Error loading auxiliary clausulas for doc ${auxDoc.id}:`, err)
                return { documentoId: auxDoc.id, documentoTitulo: auxDoc.titulo, clausulas: [] }
              })
          )
          const auxiliaryResults = await Promise.all(auxiliaryClausulasPromises)
          setAuxiliaryClausulasForGraph(auxiliaryResults)
        } catch (auxError) {
          console.error('Error loading auxiliary clausulas for graph:', auxError)
          setAuxiliaryClausulasForGraph([])
        }
      } else {
        setAuxiliaryClausulasForGraph([])
      }
    } catch (error) {
      console.error('Error loading clausulas for graph:', error)
      setClausulaForGraph([])
    }
  }

  const fetchDocuments = async () => {
    try {
      setLoading(true)
      const response = await api.get('/documentos/')
      const docs = response.data.results || response.data
      setDocuments(sortDocuments(docs))
    } catch (error) {
      dispatch(showNotification({ 
        message: 'Error al cargar documentos', 
        type: 'error' 
      }))
    } finally {
      setLoading(false)
    }
  }

  const refreshSelectedDocument = async () => {
    // Refetch the documents list
    await fetchDocuments()
    
    // Also refetch the selected document to get updated relationship data
    if (selectedDocument?.id) {
      try {
        const response = await api.get(`/documentos/${selectedDocument.id}/`)
        setSelectedDocument(response.data)
      } catch (error) {
        console.error('Error refreshing selected document:', error)
      }
    }
  }

  const getStatusBadge = (estado) => {
    const statusConfig = {
      'ACTIVO': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'BORRADOR': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
      'VENCIDO': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      'ARCHIVADO': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    }
    return statusConfig[estado] || statusConfig['BORRADOR']
  }

  const filteredDocuments = documents.filter(doc =>
    doc.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.tipo.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleUploadSuccess = (newDocument) => {
    setDocuments(prev => sortDocuments([newDocument, ...prev]))
    setSelectedDocument(newDocument)
  }

  const handleUpdateSuccess = (updatedDocument) => {
    setDocuments(prev => sortDocuments(
      prev.map(doc => doc.id === updatedDocument.id ? updatedDocument : doc)
    ))
    setSelectedDocument(updatedDocument)
  }

  const handleEdit = () => {
    if (selectedDocument) {
      setEditModalOpen(true)
    }
  }

  const handleDownload = async () => {
    if (!selectedDocument?.archivo) {
      dispatch(showNotification({ 
        message: 'Este documento no tiene un archivo original para descargar', 
        type: 'error' 
      }))
      return
    }

    try {
      setDownloading(true)
      await documentService.downloadOriginalFile(selectedDocument)

      dispatch(showNotification({ 
        message: 'Descarga iniciada', 
        type: 'success' 
      }))
    } catch (error) {
      dispatch(showNotification({ 
        message: 'Error al descargar el archivo', 
        type: 'error' 
      }))
    } finally {
      setDownloading(false)
    }
  }

  const handleDeleteClick = () => {
    if (selectedDocument) {
      setDocumentToDelete(selectedDocument)
      setDeleteDialogOpen(true)
    }
  }

  const sortDocuments = (docs) => {
    return [...docs].sort((a, b) => {
      // Primero los fijados
      if (a.fijado && !b.fijado) return -1
      if (!a.fijado && b.fijado) return 1
      
      // Dentro de los fijados, por fecha_fijado descendente
      if (a.fijado && b.fijado) {
        const aDate = a.fecha_fijado ? new Date(a.fecha_fijado) : new Date(0)
        const bDate = b.fecha_fijado ? new Date(b.fecha_fijado) : new Date(0)
        return bDate - aDate
      }
      
      // Para los no fijados, por fecha_creacion descendente
      const aDate = new Date(a.fecha_creacion || 0)
      const bDate = new Date(b.fecha_creacion || 0)
      return bDate - aDate
    })
  }

  const handleTogglePin = async () => {
    if (!selectedDocument) return

    // Estado optimista
    const wasPinned = selectedDocument.fijado
    const optimisticPinned = !wasPinned
    const optimisticFechaFijado = optimisticPinned ? new Date().toISOString() : null

    // Actualizar estado optimista inmediatamente
    const optimisticDocument = {
      ...selectedDocument,
      fijado: optimisticPinned,
      fecha_fijado: optimisticFechaFijado
    }

    setSelectedDocument(optimisticDocument)
    
    // Reordenar la lista optimistamente
    setDocuments(prev => sortDocuments(
      prev.map(doc => 
        doc.id === selectedDocument.id 
          ? optimisticDocument
          : doc
      )
    ))

    try {
      const response = await api.post(`/documentos/${selectedDocument.id}/toggle-pin/`)
      
      // Actualizar con la respuesta real del servidor
      const serverDocument = {
        ...selectedDocument,
        fijado: response.data.fijado,
        fecha_fijado: response.data.fecha_fijado
      }
      
      setSelectedDocument(serverDocument)
      setDocuments(prev => sortDocuments(
        prev.map(doc => 
          doc.id === selectedDocument.id 
            ? serverDocument
            : doc
        )
      ))
      
      dispatch(showNotification({ 
        message: response.data.message, 
        type: 'success' 
      }))
    } catch (error) {
      // Revertir cambios optimistas en caso de error
      setSelectedDocument(selectedDocument)
      setDocuments(prev => sortDocuments(
        prev.map(doc => 
          doc.id === selectedDocument.id 
            ? selectedDocument
            : doc
        )
      ))
      
      const errorMessage = error.response?.data?.error || 'Error al cambiar el estado de fijado'
      dispatch(showNotification({ 
        message: errorMessage, 
        type: 'error' 
      }))
    }
  }

  const handleDeleteConfirm = async () => {
    if (!documentToDelete) return

    try {
      await api.delete(`/documentos/${documentToDelete.id}/`)
      
      dispatch(showNotification({ 
        message: 'Documento eliminado correctamente', 
        type: 'success' 
      }))

      // Remove from list
      setDocuments(prev => prev.filter(doc => doc.id !== documentToDelete.id))
      
      // Clear selection if deleted document was selected
      if (selectedDocument?.id === documentToDelete.id) {
        setSelectedDocument(null)
      }
      
      setDeleteDialogOpen(false)
      setDocumentToDelete(null)
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Error al eliminar el documento'
      dispatch(showNotification({ 
        message: errorMessage, 
        type: 'error' 
      }))
    }
  }

  return (
    <>
      <DocumentUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUploadSuccess={handleUploadSuccess}
        availableDocuments={documents}
      />
      
      <DocumentEditModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        document={selectedDocument}
        onUpdateSuccess={handleUpdateSuccess}
      />

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false)
          setDocumentToDelete(null)
        }}
        onConfirm={handleDeleteConfirm}
        title="Eliminar Documento"
        message={`¿Estás seguro de que deseas eliminar "${documentToDelete?.titulo}"? El documento será archivado y no será visible en la lista.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
      {/* Left Column - Document List */}
      <div className="col-span-1 lg:col-span-4">
        <div 
          data-tutorial="documentos-header"
          className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-4 sm:mb-6"
        >
          <div className="flex items-start gap-2">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-text-light dark:text-text-dark">Gestión de Documentos</h2>
              <p className="text-sm sm:text-base text-subtle-light dark:text-subtle-dark">
                Administra contratos, políticas y documentación legal de cumplimiento
              </p>
            </div>
            <button 
              onClick={() => dispatch(startDocumentosTutorial())}
              title="Ver tutorial de documentos"
              className="p-1.5 text-subtle-light dark:text-subtle-dark hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
            >
              <span className="material-icons text-lg">help_outline</span>
            </button>
          </div>
          <button 
            onClick={() => setUploadModalOpen(true)}
            title="Subir un nuevo documento legal"
            data-tutorial="documentos-upload-button"
            className="bg-primary text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium hover:bg-primary/90 transition-colors whitespace-nowrap"
          >
            <span className="material-icons text-base">add</span>
            <span className="hidden sm:inline">Subir Documento</span>
            <span className="sm:hidden">Subir</span>
          </button>
        </div>

        {/* Search Bar */}
        <div 
          data-tutorial="documentos-search"
          className="relative mb-4 sm:mb-6"
        >
          <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-subtle-light dark:text-subtle-dark text-base sm:text-xl">
            search
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar documentos..."
            className="w-full pl-10 pr-4 py-2 text-sm sm:text-base bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg focus:ring-primary focus:border-primary text-text-light dark:text-text-dark"
          />
        </div>

        <h3 className="text-base sm:text-lg font-semibold text-text-light dark:text-text-dark mb-3 sm:mb-4">Documentos</h3>

        {/* Document Cards */}
        <div 
          data-tutorial="documentos-list"
          className="space-y-3 sm:space-y-4"
        >
          {loading ? (
            <div className="text-center py-8 text-sm sm:text-base text-subtle-light dark:text-subtle-dark">
              Cargando documentos...
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-8 text-sm sm:text-base text-subtle-light dark:text-subtle-dark">
              No se encontraron documentos
            </div>
          ) : (
            filteredDocuments.map((doc, index) => (
              <div
                key={doc.id}
                onClick={() => setSelectedDocument(doc)}
                className={`p-3 sm:p-4 rounded-lg border cursor-pointer transition-all active:scale-[0.98] ${
                  selectedDocument?.id === doc.id
                    ? 'bg-primary/5 dark:bg-primary/10 border-l-4 border-primary'
                    : 'bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark hover:border-primary/50 dark:hover:border-primary/50'
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm sm:text-base font-semibold text-text-light dark:text-text-dark truncate flex items-center gap-2">
                      {doc.fijado && (
                        <span className="material-icons text-yellow-500 text-base" title="Documento fijado">
                          push_pin
                        </span>
                      )}
                      {doc.titulo}
                    </h4>
                    <p className="text-xs sm:text-sm text-subtle-light dark:text-subtle-dark mt-1 line-clamp-2">
                      {doc.fecha_creacion ? new Date(doc.fecha_creacion).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${getStatusBadge(doc.estado)}`}>
                    {doc.estado}
                  </span>
                </div>
                <div className="mt-3 sm:mt-4 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-md font-medium">
                        {doc.tipo}
                      </span>
                      {doc.etiquetas?.slice(0, 3).map((tag, i) => (
                        <span key={i} className="text-xs bg-gray-100 dark:bg-gray-800 text-subtle-light dark:text-subtle-dark px-2 py-1 rounded-md border border-border-light dark:border-border-dark">
                          {tag}
                        </span>
                      ))}
                      {doc.etiquetas?.length > 3 && (
                        <span className="text-xs text-subtle-light dark:text-subtle-dark px-1 py-1">
                          +{doc.etiquetas.length - 3}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-subtle-light dark:text-subtle-dark">
                      {doc.fecha_creacion ? new Date(doc.fecha_creacion).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Column - Document Detail */}
      <div 
        data-tutorial="documento-detail"
        className="col-span-1 lg:col-span-8 bg-surface-light dark:bg-surface-dark rounded-lg border border-border-light dark:border-border-dark self-start"
      >
        {selectedDocument ? (
          <div>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 p-4 sm:p-6 border-b border-border-light dark:border-border-dark">
              <div className="flex-1 min-w-0">
                <h3 className="text-xl sm:text-2xl font-bold text-text-light dark:text-text-dark mb-2">
                  {selectedDocument.titulo}
                </h3>
                <p className="text-xs sm:text-sm text-subtle-light dark:text-subtle-dark mb-3 line-clamp-2">
                  {selectedDocument.fecha_creacion ? new Date(selectedDocument.fecha_creacion).toLocaleDateString() : 'N/A'}
                </p>
                <div className="flex gap-2 items-center flex-wrap">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${getStatusBadge(selectedDocument.estado)}`}>
                    {selectedDocument.estado}
                  </span>
                  <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full whitespace-nowrap">
                    {selectedDocument.tipo}
                  </span>
                  {selectedDocument.etiquetas && selectedDocument.etiquetas.slice(0, 3).map((tag, i) => (
                    <span key={i} className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full whitespace-nowrap">
                      {tag}
                    </span>
                  ))}
                  {selectedDocument.etiquetas && selectedDocument.etiquetas.length > 3 && (
                    <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full whitespace-nowrap">
                      +{selectedDocument.etiquetas.length - 3} más
                    </span>
                  )}
                  {selectedDocument.fecha_creacion && (
                    <span className="text-xs sm:text-sm text-subtle-light dark:text-subtle-dark whitespace-nowrap">
                      {new Date(selectedDocument.fecha_creacion).toISOString().split('T')[0]}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 sm:justify-end sm:max-w-[55%]">
                <button 
                  onClick={handleTogglePin}
                  title={selectedDocument.fijado ? "Desfijar documento" : "Fijar documento"}
                  data-tutorial="documento-pin-button"
                  className={`flex items-center gap-1 px-2 py-2 text-xs sm:text-sm rounded-lg transition-colors whitespace-nowrap ${
                    selectedDocument.fijado 
                      ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-200' 
                      : 'text-subtle-light dark:text-subtle-dark hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <span className="material-icons text-base sm:text-lg">
                    {selectedDocument.fijado ? 'push_pin' : 'push_pin_outlined'}
                  </span>
                  <span className="hidden sm:inline">
                    {selectedDocument.fijado ? 'Desfijar' : 'Fijar'}
                  </span>
                </button>
                <button 
                  onClick={() => navigate(`/documentos/${selectedDocument.id}/view`)}
                  title="Ver el documento completo en una vista dedicada"
                  data-tutorial="documento-view-button"
                  className="flex items-center gap-1 sm:gap-2 px-3 py-2 text-xs sm:text-sm bg-primary text-white hover:bg-primary/90 rounded-lg transition-colors"
                >
                  <span className="material-icons text-base sm:text-lg">description</span>
                  <span className="hidden sm:inline">Vista Documento</span>
                  <span className="sm:hidden">Vista</span>
                </button>
                <button 
                  onClick={() => navigate(`/documentos/${selectedDocument.id}`)}
                  title="Ver detalles completos del documento"
                  className="flex items-center gap-1 sm:gap-2 px-3 py-2 text-xs sm:text-sm text-subtle-light dark:text-subtle-dark hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <span className="material-icons text-base sm:text-lg">visibility</span>
                  <span className="hidden sm:inline">Ver Detalles</span>
                  <span className="sm:hidden">Detalles</span>
                </button>
                <button 
                  onClick={handleDownload}
                  disabled={downloading || !selectedDocument.archivo}
                  title={selectedDocument.archivo
                    ? 'Descargar el archivo original tal como se subió'
                    : 'Este documento no tiene archivo original'}
                  data-tutorial="documento-download-button"
                  className="flex items-center gap-1 sm:gap-2 px-3 py-2 text-xs sm:text-sm text-subtle-light dark:text-subtle-dark hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className={`material-icons text-base sm:text-lg ${downloading ? 'animate-spin' : ''}`}>
                    {downloading ? 'sync' : 'download'}
                  </span>
                  <span className="hidden sm:inline">{downloading ? 'Descargando…' : 'Descargar'}</span>
                </button>
                <button 
                  onClick={handleEdit}
                  title="Editar la información del documento"
                  className="flex items-center gap-1 sm:gap-2 px-3 py-2 text-xs sm:text-sm text-subtle-light dark:text-subtle-dark hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <span className="material-icons text-base sm:text-lg">edit</span>
                  <span className="hidden sm:inline">Editar</span>
                </button>
                <button 
                  onClick={handleDeleteClick}
                  title="Eliminar documento"
                  className="flex items-center gap-1 sm:gap-2 px-3 py-2 text-xs sm:text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <span className="material-icons text-base sm:text-lg">delete</span>
                  <span className="hidden sm:inline">Eliminar</span>
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div 
              data-tutorial="documento-tabs"
              className="border-b border-border-light dark:border-border-dark overflow-x-auto"
            >
              <div className="flex gap-3 sm:gap-6 px-4 sm:px-6 min-w-max">
                <button
                  onClick={() => setActiveTab('clauses')}
                  data-tutorial="clausulas-tab"
                  className={`py-2 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === 'clauses'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-subtle-light dark:text-subtle-dark hover:text-text-light dark:hover:text-text-dark'
                  }`}
                >
                  {getClauseTerm(selectedDocument?.tipo).charAt(0).toUpperCase() + getClauseTerm(selectedDocument?.tipo).slice(1)}s
                </button>
                <button
                  onClick={() => setActiveTab('graph')}
                  className={`py-2 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === 'graph'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-subtle-light dark:text-subtle-dark hover:text-text-light dark:hover:text-text-dark'
                  }`}
                >
                  Grafo
                </button>
                <button
                  onClick={() => setActiveTab('transcription')}
                  className={`py-2 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === 'transcription'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-subtle-light dark:text-subtle-dark hover:text-text-light dark:hover:text-text-dark'
                  }`}
                >
                  Transcripción
                </button>
                <button
                  onClick={() => setActiveTab('relationships')}
                  className={`py-2 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === 'relationships'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-subtle-light dark:text-subtle-dark hover:text-text-light dark:hover:text-text-dark'
                  }`}
                >
                  Relaciones
                </button>
                <button
                  onClick={() => setActiveTab('details')}
                  className={`py-2 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === 'details'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-subtle-light dark:text-subtle-dark hover:text-text-light dark:hover:text-text-dark'
                  }`}
                >
                  Detalles
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div className="p-4 sm:p-6">
              {activeTab === 'clauses' && (
                <ClausulaTab documento={selectedDocument} />
              )}

              {activeTab === 'graph' && (
                <DocumentGraph 
                  documento={selectedDocument} 
                  clausulas={clausulasForGraph}
                  parentClausulas={parentClausulasForGraph}
                  auxiliaryClausulas={auxiliaryClausulasForGraph}
                  onClausulaClick={(clausula) => {
                    setSelectedClausula(clausula)
                    setClausulaModalOpen(true)
                  }}
                  onTareaClick={(tarea) => {
                    setSelectedTarea(tarea)
                    setTareaModalOpen(true)
                  }}
                  onLayoutSaved={(layout) => {
                    setSelectedDocument((prev) => prev ? { ...prev, posiciones_grafo: layout } : prev)
                    setDocuments((prev) => prev.map((doc) =>
                      doc.id === selectedDocument?.id ? { ...doc, posiciones_grafo: layout } : doc
                    ))
                  }}
                />
              )}

              {activeTab === 'transcription' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-base sm:text-lg font-semibold text-text-light dark:text-text-dark mb-3">
                      Contenido Extraído
                    </h4>
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 sm:p-4 rounded-lg max-h-96 overflow-y-auto">
                      <p className="text-xs sm:text-sm text-subtle-light dark:text-subtle-dark leading-relaxed whitespace-pre-wrap break-words">
                        {selectedDocument.contenido_extraido || 'No hay contenido extraído disponible para este documento.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'relationships' && (
                <DocumentRelationshipPanel 
                  documento={selectedDocument}
                  onUpdate={refreshSelectedDocument}
                />
              )}

              {activeTab === 'details' && (
                <div className="space-y-4 sm:space-y-6">
                  {/* Objetos Regulados (campo interno: etiquetas) */}
                  {selectedDocument.etiquetas && selectedDocument.etiquetas.length > 0 && (
                    <div>
                      <h4 className="text-base sm:text-lg font-semibold text-text-light dark:text-text-dark mb-3">
                        Objetos Regulados
                      </h4>
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        {selectedDocument.etiquetas.map((tag, i) => (
                          <span key={i} className="text-xs bg-primary/10 text-primary px-2 sm:px-3 py-1 rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="text-base sm:text-lg font-semibold text-text-light dark:text-text-dark mb-3">
                      Información del Documento
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <p className="text-xs sm:text-sm text-subtle-light dark:text-subtle-dark">Creado por</p>
                        <p className="text-sm sm:text-base text-text-light dark:text-text-dark break-words">
                          {selectedDocument.creado_por || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm text-subtle-light dark:text-subtle-dark">Fecha de creación</p>
                        <p className="text-sm sm:text-base text-text-light dark:text-text-dark">
                          {selectedDocument.fecha_creacion 
                            ? new Date(selectedDocument.fecha_creacion).toLocaleDateString()
                            : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm text-subtle-light dark:text-subtle-dark">Última modificación</p>
                        <p className="text-sm sm:text-base text-text-light dark:text-text-dark">
                          {selectedDocument.ultima_modificacion 
                            ? new Date(selectedDocument.ultima_modificacion).toLocaleDateString()
                            : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm text-subtle-light dark:text-subtle-dark">Versión</p>
                        <p className="text-sm sm:text-base text-text-light dark:text-text-dark">
                          v{selectedDocument.version || 1}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center px-4">
            <span className="material-icons text-5xl sm:text-6xl text-subtle-light dark:text-subtle-dark mb-4">
              description
            </span>
            <h3 className="text-lg sm:text-xl font-semibold text-text-light dark:text-text-dark mb-2">
              Selecciona un documento
            </h3>
            <p className="text-sm sm:text-base text-subtle-light dark:text-subtle-dark">
              Selecciona un documento de la lista para ver sus detalles
            </p>
          </div>
        )}
      </div>
    </div>
    
    {/* Modals for Clausula and Tarea Details */}
    {clausulaModalOpen && (
      <ClausulaModal
        clausula={selectedClausula}
        onClose={() => {
          setClausulaModalOpen(false)
          setSelectedClausula(null)
        }}
        onSave={() => {
          loadClausulasForGraph()
          setClausulaModalOpen(false)
          setSelectedClausula(null)
        }}
      />
    )}
    
    <TaskDetailModal
      isOpen={tareaModalOpen}
      onClose={() => {
        setTareaModalOpen(false)
        setSelectedTarea(null)
      }}
      onUpdate={() => {
        loadClausulasForGraph()
      }}
      tarea={selectedTarea}
    />
    </>
  )
}

export default DocumentList