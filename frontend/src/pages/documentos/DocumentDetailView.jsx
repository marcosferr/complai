import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { showNotification } from '@/store/slices/uiSlice'
import { downloadProtectedFile } from '@/services/api'
import documentService from '@/services/documentService'
import AddendaModal from '@/components/documentos/AddendaModal'
import FileHistoryPanel from '@/components/documentos/FileHistoryPanel'
import ClauseVersionHistory from '@/components/clausulas/ClauseVersionHistory'
import { getClauseTerm } from '@/lib/utils'
import RichTextContent from '@/components/ui/RichTextContent'

const DocumentDetailView = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  
  const [document, setDocument] = useState(null)
  const [loading, setLoading] = useState(true)
  const [reprocessing, setReprocessing] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [editingTranscription, setEditingTranscription] = useState(false)
  const [transcriptionText, setTranscriptionText] = useState('')
  const [selectedClausulas, setSelectedClausulas] = useState([])
  const [activeTab, setActiveTab] = useState('overview') // overview, transcription, clauses, addendums, fileHistory
  const [showAddendaModal, setShowAddendaModal] = useState(false)
  const [adendas, setAdendas] = useState([])
  const [loadingAdendas, setLoadingAdendas] = useState(false)
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [selectedClausulaForHistory, setSelectedClausulaForHistory] = useState(null)
  
  useEffect(() => {
    fetchDocument()
  }, [id])
  
  useEffect(() => {
    if (document?.transcripcion_editable) {
      setTranscriptionText(document.transcripcion_editable)
    }
  }, [document])
  
  const fetchDocument = async () => {
    try {
      setLoading(true)
      const data = await documentService.getDocumentDetail(id)
      setDocument(data)
    } catch (error) {
      dispatch(showNotification({ 
        message: 'Error al cargar el documento', 
        type: 'error' 
      }))
      navigate('/documentos')
    } finally {
      setLoading(false)
    }
  }
  
  const handleDownloadOriginal = async () => {
    if (!document?.archivo) {
      dispatch(showNotification({ 
        message: 'Este documento no tiene un archivo original para descargar', 
        type: 'error' 
      }))
      return
    }

    try {
      setDownloading(true)
      await documentService.downloadOriginalFile(document)
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
  
  const handleReprocess = async () => {
    try {
      setReprocessing(true)
      await documentService.reprocessDocument(id)
      dispatch(showNotification({ 
        message: 'Reprocesamiento iniciado. El documento será procesado en breve.', 
        type: 'success' 
      }))
      
      // Poll for updates every 5 seconds
      const interval = setInterval(async () => {
        const updated = await documentService.getDocumentDetail(id)
        setDocument(updated)
        
        if (updated.estado_procesamiento_ia !== 'PROCESANDO') {
          clearInterval(interval)
          setReprocessing(false)
          
          if (updated.estado_procesamiento_ia === 'COMPLETADO') {
            dispatch(showNotification({ 
              message: 'Documento procesado exitosamente', 
              type: 'success' 
            }))
          } else if (updated.estado_procesamiento_ia === 'ERROR') {
            dispatch(showNotification({ 
              message: 'Error al procesar el documento', 
              type: 'error' 
            }))
          }
        }
      }, 5000)
      
      // Stop polling after 2 minutes
      setTimeout(() => {
        clearInterval(interval)
        setReprocessing(false)
      }, 120000)
      
    } catch (error) {
      setReprocessing(false)
      dispatch(showNotification({ 
        message: error.response?.data?.error || 'Error al reprocesar', 
        type: 'error' 
      }))
    }
  }
  
  const handleSaveTranscription = async () => {
    try {
      await documentService.updateTranscripcion(id, transcriptionText)
      setDocument({ ...document, transcripcion_editable: transcriptionText })
      setEditingTranscription(false)
      dispatch(showNotification({ 
        message: 'Transcripción actualizada exitosamente', 
        type: 'success' 
      }))
    } catch (error) {
      dispatch(showNotification({ 
        message: 'Error al actualizar transcripción', 
        type: 'error' 
      }))
    }
  }
  
  const toggleClausulaSelection = (index) => {
    setSelectedClausulas(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    )
  }
  
  const handleAcceptSelected = async () => {
    if (selectedClausulas.length === 0) {
      dispatch(showNotification({ 
        message: `Selecciona al menos una ${getClauseTerm(document?.tipo)}`, 
        type: 'warning' 
      }))
      return
    }
    
    try {
      const result = await documentService.acceptSpecificClausulas(id, selectedClausulas)
      dispatch(showNotification({ 
        message: result.message, 
        type: 'success' 
      }))
      setSelectedClausulas([])
      fetchDocument() // Refresh to show updated data
    } catch (error) {
      dispatch(showNotification({ 
        message: `Error al crear ${getClauseTerm(document?.tipo)}s`, 
        type: 'error' 
      }))
    }
  }
  
  const handleAcceptAll = async () => {
    try {
      const result = await documentService.acceptAllClausulas(id)
      dispatch(showNotification({ 
        message: result.message, 
        type: 'success' 
      }))
      setSelectedClausulas([])
      fetchDocument()
    } catch (error) {
      dispatch(showNotification({ 
        message: `Error al crear ${getClauseTerm(document?.tipo)}s`, 
        type: 'error' 
      }))
    }
  }
  
  const getProcessingStatusBadge = (estado) => {
    const config = {
      'PENDIENTE': { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-800 dark:text-gray-200', icon: 'schedule' },
      'PROCESANDO': { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-800 dark:text-blue-200', icon: 'sync' },
      'COMPLETADO': { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-800 dark:text-green-200', icon: 'check_circle' },
      'ERROR': { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-800 dark:text-red-200', icon: 'error' },
    }
    const { bg, text, icon } = config[estado] || config['PENDIENTE']
    
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-medium px-3 py-1 rounded-full ${bg} ${text}`}>
        <span className="material-icons text-sm">{icon}</span>
        {estado}
      </span>
    )
  }
  
  const getImportanceBadge = (importancia) => {
    const config = {
      'ALTA': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      'MEDIA': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'BAJA': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    }
    return config[importancia] || config['MEDIA']
  }

  const loadAdendas = async () => {
    try {
      setLoadingAdendas(true)
      const response = await documentService.getDocumentAdendas(id)
      setAdendas(response)
    } catch (error) {
      console.error('Error loading adendas:', error)
      dispatch(showNotification({
        message: 'Error cargando adendas',
        type: 'error'
      }))
    } finally {
      setLoadingAdendas(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'addendums' && document) {
      loadAdendas()
    }
  }, [activeTab, document])

  const handleAddendaSuccess = (newAdenda) => {
    setAdendas(prev => [newAdenda, ...prev])
    fetchDocument() // Refresh document to update any related data
  }

  const handleViewClauseHistory = (clausula) => {
    setSelectedClausulaForHistory(clausula)
    setShowVersionHistory(true)
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-subtle-light dark:text-subtle-dark">Cargando documento...</p>
        </div>
      </div>
    )
  }
  
  if (!document) return null
  
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/documentos')}
          className="flex items-center gap-2 text-subtle-light dark:text-subtle-dark hover:text-text-light dark:hover:text-text-dark mb-4"
        >
          <span className="material-icons">arrow_back</span>
          Volver a documentos
        </button>
        
        <div className="bg-surface-light dark:bg-surface-dark rounded-lg border border-border-light dark:border-border-dark p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-text-light dark:text-text-dark mb-2">
                {document.titulo}
              </h1>
              <div className="flex gap-2 flex-wrap">
                <span className="text-xs font-medium px-3 py-1 rounded-full bg-primary/10 text-primary">
                  {document.tipo}
                </span>
                {/* Objetos Regulados (campo interno: etiquetas) */}
                {document.etiquetas?.map((tag, i) => (
                  <span key={i} className="text-xs px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => navigate(`/documentos/${id}/view`)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                <span className="material-icons">description</span>
                Vista Documento
              </button>
              <button
                onClick={handleDownloadOriginal}
                disabled={downloading || !document.archivo}
                title={document.archivo
                  ? 'Descargar el archivo original tal como se subió'
                  : 'Este documento no tiene archivo original'}
                className="flex items-center gap-2 px-4 py-2 border border-border-light dark:border-border-dark text-text-light dark:text-text-dark rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span className={`material-icons ${downloading ? 'animate-spin' : ''}`}>
                  {downloading ? 'sync' : 'download'}
                </span>
                {downloading ? 'Descargando…' : 'Descargar original'}
              </button>
              <button
                onClick={handleReprocess}
                disabled={reprocessing || document.estado_procesamiento_ia === 'PROCESANDO'}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span className={`material-icons ${reprocessing ? 'animate-spin' : ''}`}>
                  {reprocessing ? 'sync' : 'replay'}
                </span>
                Reprocesar
              </button>
            </div>
          </div>
          
          {/* Processing Status */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-text-light dark:text-text-dark">
                Estado de procesamiento IA:
              </span>
              {getProcessingStatusBadge(document.estado_procesamiento_ia)}
            </div>
            
            {document.fecha_procesamiento && (
              <div className="text-sm text-subtle-light dark:text-subtle-dark">
                Procesado: {new Date(document.fecha_procesamiento).toLocaleString()}
              </div>
            )}
            
            {document.clausulas_extraidas_ia?.length > 0 && (
              <div className="text-sm text-subtle-light dark:text-subtle-dark">
                {document.clausulas_extraidas_ia.length} {getClauseTerm(document?.tipo)}s extraídas
              </div>
            )}
          </div>
          
          {/* Error Message */}
          {document.error_procesamiento && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start gap-2">
                <span className="material-icons text-red-600 dark:text-red-400">error</span>
                <div>
                  <h4 className="font-semibold text-red-800 dark:text-red-200 mb-1">
                    Error de procesamiento
                  </h4>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    {document.error_procesamiento}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Tabs */}
      <div className="bg-surface-light dark:bg-surface-dark rounded-lg border border-border-light dark:border-border-dark">
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
              onClick={() => setActiveTab('transcription')}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'transcription'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-subtle-light dark:text-subtle-dark hover:text-text-light dark:hover:text-text-dark'
              }`}
            >
              Transcripción
            </button>
            <button
              onClick={() => setActiveTab('clauses')}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'clauses'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-subtle-light dark:text-subtle-dark hover:text-text-light dark:hover:text-text-dark'
              }`}
            >
              {getClauseTerm(document?.tipo).charAt(0).toUpperCase() + getClauseTerm(document?.tipo).slice(1)}s Extraídas
              {document.clausulas_extraidas_ia?.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
                  {document.clausulas_extraidas_ia.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('addendums')}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'addendums'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-subtle-light dark:text-subtle-dark hover:text-text-light dark:hover:text-text-dark'
              }`}
            >
              Adendas
              {adendas.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
                  {adendas.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('fileHistory')}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'fileHistory'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-subtle-light dark:text-subtle-dark hover:text-text-light dark:hover:text-text-dark'
              }`}
            >
              Historial de Archivos
            </button>
          </div>
        </div>
        
        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-3">
                  Información del Documento
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm text-subtle-light dark:text-subtle-dark mb-1">Estado</p>
                    <p className="font-medium text-text-light dark:text-text-dark">{document.estado}</p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm text-subtle-light dark:text-subtle-dark mb-1">Versión</p>
                    <p className="font-medium text-text-light dark:text-text-dark">v{document.version}</p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm text-subtle-light dark:text-subtle-dark mb-1">Fecha de creación</p>
                    <p className="font-medium text-text-light dark:text-text-dark">
                      {new Date(document.fecha_creacion).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm text-subtle-light dark:text-subtle-dark mb-1">{getClauseTerm(document?.tipo).charAt(0).toUpperCase() + getClauseTerm(document?.tipo).slice(1)}s creadas</p>
                    <p className="font-medium text-text-light dark:text-text-dark">{document.clausulas_count || 0}</p>
                  </div>
                </div>
              </div>
              
              {document.palabras_clave?.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-3">
                    Palabras Clave
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {document.palabras_clave.map((keyword, i) => (
                      <span key={i} className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full">
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'transcription' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-text-light dark:text-text-dark">
                  Transcripción del Documento
                </h3>
                {!editingTranscription ? (
                  <button
                    onClick={() => setEditingTranscription(true)}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    <span className="material-icons text-sm">edit</span>
                    Editar
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingTranscription(false)
                        setTranscriptionText(document.transcripcion_editable || '')
                      }}
                      className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSaveTranscription}
                      className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      Guardar
                    </button>
                  </div>
                )}
              </div>
              
              {editingTranscription ? (
                <textarea
                  value={transcriptionText}
                  onChange={(e) => setTranscriptionText(e.target.value)}
                  className="w-full h-96 p-4 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg focus:ring-primary focus:border-primary text-text-light dark:text-text-dark font-mono text-sm"
                  placeholder="Transcripción del documento..."
                />
              ) : (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg max-h-96 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm text-text-light dark:text-text-dark font-mono">
                    {document.transcripcion_editable || document.contenido_extraido || 'No hay transcripción disponible'}
                  </pre>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'clauses' && (
            <div className="space-y-4">
              {document.clausulas_extraidas_ia && document.clausulas_extraidas_ia.length > 0 ? (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-text-light dark:text-text-dark">
                      Cláusulas Extraídas por IA
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={handleAcceptSelected}
                        disabled={selectedClausulas.length === 0}
                        className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Crear Seleccionadas ({selectedClausulas.length})
                      </button>
                      <button
                        onClick={handleAcceptAll}
                        className="px-4 py-2 text-sm border border-primary text-primary rounded-lg hover:bg-primary/10 transition-colors"
                      >
                        Crear Todas
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {document.clausulas_extraidas_ia.map((clausula, index) => (
                      <div
                        key={index}
                        className={`p-4 border rounded-lg transition-colors ${
                          clausula.aceptada
                            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                            : selectedClausulas.includes(index)
                            ? 'bg-primary/5 border-primary'
                            : 'bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={clausula.aceptada || selectedClausulas.includes(index)}
                            disabled={clausula.aceptada}
                            onChange={() => !clausula.aceptada && toggleClausulaSelection(index)}
                            className="mt-1 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-semibold text-text-light dark:text-text-dark">
                                {clausula.titulo}
                              </span>
                              <span className="text-xs text-subtle-light dark:text-subtle-dark">
                                #{clausula.numero_orden}
                              </span>
                              {clausula.categoria && (
                                <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                                  {clausula.categoria}
                                </span>
                              )}
                              {clausula.importancia && (
                                <span className={`text-xs px-2 py-0.5 rounded-full ${getImportanceBadge(clausula.importancia)}`}>
                                  {clausula.importancia}
                                </span>
                              )}
                              {clausula.requiere_accion && (
                                <span className="text-xs px-2 py-0.5 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded-full">
                                  Requiere acción
                                </span>
                              )}
                              {clausula.aceptada && (
                                <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full flex items-center gap-1">
                                  <span className="material-icons text-xs">check</span>
                                  Creada
                                </span>
                              )}
                            </div>
                            {/* Cláusulas extraídas por la IA: llegan en texto plano,
                                pero el renderizador acepta ambos formatos. */}
                            <RichTextContent
                              value={clausula.contenido}
                              className="text-sm text-subtle-light dark:text-subtle-dark"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <span className="material-icons text-6xl text-subtle-light dark:text-subtle-dark mb-4">
                    description
                  </span>
                  <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-2">
                    No hay cláusulas extraídas
                  </h3>
                  <p className="text-subtle-light dark:text-subtle-dark mb-4">
                    El documento aún no ha sido procesado con IA o no se encontraron cláusulas.
                  </p>
                  <button
                    onClick={handleReprocess}
                    disabled={reprocessing}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Procesar Documento
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Addendums Tab */}
          {activeTab === 'addendums' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-text-light dark:text-text-dark">
                  Adendas del Documento
                </h3>
                <button
                  onClick={() => setShowAddendaModal(true)}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
                >
                  <span className="material-icons text-sm">post_add</span>
                  Agregar Adenda
                </button>
              </div>

              {loadingAdendas ? (
                <div className="flex items-center justify-center py-12">
                  <span className="material-icons animate-spin text-4xl text-primary">refresh</span>
                </div>
              ) : adendas.length > 0 ? (
                <div className="space-y-4">
                  {adendas.map((adenda) => (
                    <div
                      key={adenda.id}
                      className="p-4 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                            #{adenda.numero}
                          </div>
                          <div>
                            <h4 className="font-semibold text-text-light dark:text-text-dark">
                              {adenda.titulo}
                            </h4>
                            <p className="text-sm text-subtle-light dark:text-subtle-dark">
                              {adenda.descripcion}
                            </p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                          adenda.estado === 'VIGENTE'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : adenda.estado === 'REEMPLAZADA'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {adenda.estado}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-subtle-light dark:text-subtle-dark">
                        <span className="flex items-center gap-1">
                          <span className="material-icons text-sm">event</span>
                          Vigencia: {new Date(adenda.fecha_vigencia).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="material-icons text-sm">schedule</span>
                          Creada: {new Date(adenda.fecha_creacion).toLocaleDateString()}
                        </span>
                        {adenda.filename && (
                          <button
                            onClick={() => downloadProtectedFile(adenda.archivo, adenda.filename)}
                            className="flex items-center gap-1 text-primary hover:underline"
                          >
                            <span className="material-icons text-sm">download</span>
                            Descargar
                          </button>
                        )}
                      </div>

                      {adenda.clausulas_afectadas && adenda.clausulas_afectadas.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-border-light dark:border-border-dark">
                          <p className="text-xs font-medium text-subtle-light dark:text-subtle-dark mb-2">
                            Cláusulas afectadas:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {adenda.clausulas_afectadas.map((clausula) => (
                              <span
                                key={clausula.id}
                                className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs rounded"
                              >
                                {clausula.titulo}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <span className="material-icons text-6xl text-subtle-light dark:text-subtle-dark mb-4">
                    post_add
                  </span>
                  <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-2">
                    No hay adendas
                  </h3>
                  <p className="text-subtle-light dark:text-subtle-dark mb-4">
                    Este documento no tiene adendas. Las adendas permiten modificar cláusulas específicas sin cambiar el documento base.
                  </p>
                  <button
                    onClick={() => setShowAddendaModal(true)}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Agregar Primera Adenda
                  </button>
                </div>
              )}
            </div>
          )}

          {/* File History Tab */}
          {activeTab === 'fileHistory' && (
            <FileHistoryPanel documentId={id} />
          )}
        </div>
      </div>

      {/* Modals */}
      {showAddendaModal && (
        <AddendaModal
          isOpen={showAddendaModal}
          onClose={() => setShowAddendaModal(false)}
          document={document}
          onSuccess={handleAddendaSuccess}
          clausulas={document.clausulas_extraidas_ia || []}
        />
      )}

      {showVersionHistory && selectedClausulaForHistory && (
        <ClauseVersionHistory
          clausulaId={selectedClausulaForHistory.id}
          onClose={() => {
            setShowVersionHistory(false)
            setSelectedClausulaForHistory(null)
          }}
        />
      )}
    </div>
  )
}

export default DocumentDetailView
