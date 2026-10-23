import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { showNotification } from '@/store/slices/uiSlice'
import documentService from '@/services/documentService'
import clausulaService from '@/services/clausulaService'
import DocumentTimeline from '@/components/documentos/DocumentTimeline'
import ClausulaVersionComparison from '@/components/clausulas/ClausulaVersionComparison'
import ClauseVersionHistory from '@/components/clausulas/ClauseVersionHistory'
import { getClauseTerm } from '@/lib/utils'

const DocumentView = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  
  const [document, setDocument] = useState(null)
  const [clausulas, setClausulas] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedTags, setSelectedTags] = useState([])
  const [activeClausula, setActiveClausula] = useState(null)
  const [searchResults, setSearchResults] = useState([])
  const [enmiendas, setEnmiendas] = useState([])
  const [showAmendmentHistory, setShowAmendmentHistory] = useState(false)
  const [viewMode, setViewMode] = useState('document') // 'document' or 'timeline'
  const [showComparisonMenu, setShowComparisonMenu] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [comparisonDocs, setComparisonDocs] = useState(null)
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [selectedClausulaForHistory, setSelectedClausulaForHistory] = useState(null)
  
  const contentRef = useRef(null)
  const clausulaRefs = useRef({})
  
  useEffect(() => {
    fetchDocumentAndClausulas()
  }, [id])
  
  useEffect(() => {
    // Handle scroll to track active clause
    const handleScroll = () => {
      if (!contentRef.current) return
      
      const scrollPosition = contentRef.current.scrollTop + 100
      
      for (const [clausulaId, ref] of Object.entries(clausulaRefs.current)) {
        if (ref && ref.offsetTop <= scrollPosition && 
            ref.offsetTop + ref.offsetHeight > scrollPosition) {
          setActiveClausula(parseInt(clausulaId))
          break
        }
      }
    }
    
    const content = contentRef.current
    if (content) {
      content.addEventListener('scroll', handleScroll)
      return () => content.removeEventListener('scroll', handleScroll)
    }
  }, [clausulas])
  
  useEffect(() => {
    performSearch()
  }, [searchTerm, document])
  
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
  
  const fetchDocumentAndClausulas = async () => {
    try {
      setLoading(true)
      const docData = await documentService.getDocumentDetail(id)
      setDocument(docData)
      
      // Fetch clausulas by documento
      try {
        const clausulasResponse = await clausulaService.getClausulasByDocumento(id)
        const clausulasData = clausulasResponse.data || []
        setClausulas(clausulasData)
        
        // Fetch amendments for all clausulas
        const allEnmiendas = []
        for (const clausula of clausulasData) {
          if (clausula.enmiendas && clausula.enmiendas.length > 0) {
            allEnmiendas.push(...clausula.enmiendas.map(e => ({...e, clausulaId: clausula.id})))
          }
        }
        setEnmiendas(allEnmiendas.sort((a, b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion)))
      } catch (clausulaError) {
        console.error('Error loading clausulas:', clausulaError)
        // Continue even if clausulas fail to load
        setClausulas([])
      }
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
  
  const performSearch = () => {
    if (!searchTerm.trim() || !document) {
      setSearchResults([])
      return
    }
    
    const results = []
    const searchLower = searchTerm.toLowerCase()
    
    // Search in transcription
    if (document.transcripcion_editable) {
      const text = document.transcripcion_editable
      let index = text.toLowerCase().indexOf(searchLower)
      
      while (index !== -1) {
        const start = Math.max(0, index - 50)
        const end = Math.min(text.length, index + searchTerm.length + 50)
        const snippet = text.substring(start, end)
        
        results.push({
          type: 'transcription',
          snippet: snippet,
          position: index
        })
        
        index = text.toLowerCase().indexOf(searchLower, index + 1)
        if (results.length >= 10) break // Limit results
      }
    }
    
    // Search in clausulas
    clausulas.forEach(clausula => {
      if (clausula.titulo?.toLowerCase().includes(searchLower) ||
          clausula.contenido?.toLowerCase().includes(searchLower)) {
        results.push({
          type: 'clausula',
          clausula: clausula,
          snippet: clausula.contenido?.substring(0, 100)
        })
      }
    })
    
    setSearchResults(results)
  }
  
  const scrollToClausula = (clausulaId) => {
    const ref = clausulaRefs.current[clausulaId]
    if (ref && contentRef.current) {
      const offsetTop = ref.offsetTop - 100
      contentRef.current.scrollTo({
        top: offsetTop,
        behavior: 'smooth'
      })
      setActiveClausula(clausulaId)
    }
  }
  
  const getCategories = () => {
    const categories = new Set()
    clausulas.forEach(c => {
      if (c.categoria) categories.add(c.categoria)
    })
    return Array.from(categories)
  }
  
  const getTags = () => {
    const tags = new Set()
    clausulas.forEach(c => {
      if (c.etiquetas && Array.isArray(c.etiquetas)) {
        c.etiquetas.forEach(tag => tags.add(tag))
      }
    })
    return Array.from(tags)
  }
  
  const getFilteredClausulas = () => {
    let filtered = [...clausulas]
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(c => c.categoria === selectedCategory)
    }
    
    if (selectedTags.length > 0) {
      filtered = filtered.filter(c => 
        c.etiquetas && c.etiquetas.some(tag => selectedTags.includes(tag))
      )
    }
    
    return filtered
  }
  
  const toggleTag = (tag) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }
  
  const getCategoryColor = (categoria) => {
    const colors = {
      'Obligaciones': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      'General': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      'Financiero': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      'Riesgo Alto': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      'Propiedad': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    }
    return colors[categoria] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
  }
  
  const highlightSearchTerm = (text) => {
    if (!searchTerm.trim() || !text) return text
    
    const regex = new RegExp(`(${searchTerm})`, 'gi')
    const parts = text.split(regex)
    
    return parts.map((part, index) => 
      regex.test(part) 
        ? <mark key={index} className="bg-yellow-200 dark:bg-yellow-600">{part}</mark>
        : part
    )
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-subtle-light dark:text-subtle-dark">Cargando documento...</p>
        </div>
      </div>
    )
  }
  
  if (!document) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-subtle-light dark:text-subtle-dark">Documento no encontrado</p>
      </div>
    )
  }
  
  const filteredClausulas = getFilteredClausulas()
  
  return (
    <>
    <div className="flex h-[calc(100vh-6rem)] bg-background-light dark:bg-background-dark">
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto" ref={contentRef}>
        <div className="max-w-4xl mx-auto p-8">
          {/* Header */}
          <div className="mb-8">
            <Link 
              to="/documentos"
              className="flex items-center gap-2 text-sm text-primary hover:underline mb-4"
            >
              <span className="material-icons text-base">arrow_back</span>
              Volver a Documentos
            </Link>
            
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-3xl font-bold text-text-light dark:text-text-dark">
                    {document.titulo || document.nombre_archivo}
                  </h2>
                  {/* Document Tags */}
                  {document.tipo && (
                    <span className="px-3 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary">
                      {document.tipo}
                    </span>
                  )}
                  {document.estado && (
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                      document.estado === 'ACTIVO' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                      document.estado === 'BORRADOR' ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' :
                      document.estado === 'VENCIDO' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                    }`}>
                      {document.estado}
                    </span>
                  )}
                  {document.es_adenda && document.estado_adenda && (
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                      document.estado_adenda === 'VIGENTE' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                      document.estado_adenda === 'REEMPLAZADA' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                      'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                    }`}>
                      Adenda {document.numero_adenda || ''} - {document.estado_adenda}
                    </span>
                  )}
                </div>
                <p className="text-subtle-light dark:text-subtle-dark mt-1">
                  ID del Documento: #{document.id}
                </p>
                {/* Objetos Regulados del documento (campo interno: etiquetas) */}
                {document.etiquetas && document.etiquetas.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {document.etiquetas.map((tag, i) => (
                      <span 
                        key={i}
                        className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="relative w-1/3">
                <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-subtle-light dark:text-subtle-dark">
                  search
                </span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar en el documento..."
                  className="w-full pl-10 pr-4 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                />
              </div>
            </div>
            
            {/* View Mode Toggle and Actions */}
            <div className="mt-6 flex justify-between items-center border-b border-border-light dark:border-border-dark">
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('document')}
                  className={`px-4 py-2 font-medium text-sm transition-colors ${
                    viewMode === 'document'
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-subtle-light dark:text-subtle-dark hover:text-text-light dark:hover:text-text-dark'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="material-icons text-sm">description</span>
                    Vista de Documento
                  </span>
                </button>
                <button
                  onClick={() => setViewMode('timeline')}
                  className={`px-4 py-2 font-medium text-sm transition-colors ${
                    viewMode === 'timeline'
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-subtle-light dark:text-subtle-dark hover:text-text-light dark:hover:text-text-dark'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="material-icons text-sm">timeline</span>
                    Vista de Timeline
                  </span>
                </button>
              </div>
              
              <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadOriginal}
                disabled={downloading || !document.archivo}
                title={document.archivo
                  ? 'Descargar el archivo original tal como se subió'
                  : 'Este documento no tiene archivo original'}
                className="px-4 py-2 border border-border-light dark:border-border-dark text-text-light dark:text-text-dark rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <span className={`material-icons text-sm ${downloading ? 'animate-spin' : ''}`}>
                  {downloading ? 'sync' : 'download'}
                </span>
                {downloading ? 'Descargando…' : 'Descargar original'}
              </button>

              {/* Comparison Button */}
              {(document.documento_padre_info || (document.documentos_hijos_info && document.documentos_hijos_info.length > 0)) && (
                <div className="relative">
                  <button
                    onClick={() => setShowComparisonMenu(!showComparisonMenu)}
                    className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors flex items-center gap-2"
                  >
                    <span className="material-icons text-sm">compare</span>
                    Comparar Versiones
                  </button>
                  
                  {showComparisonMenu && (
                    <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                      <div className="py-2">
                        {document.documento_padre_info && (
                          <button
                            onClick={() => {
                              setComparisonDocs({
                                base: document.documento_padre_info.id,
                                compared: document.id
                              })
                              setShowComparisonMenu(false)
                            }}
                            className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
                          >
                            Comparar con {document.documento_padre_info.titulo}
                          </button>
                        )}
                        {document.documentos_hijos_info && document.documentos_hijos_info.map(hijo => (
                          <button
                            key={hijo.id}
                            onClick={() => {
                              setComparisonDocs({
                                base: document.id,
                                compared: hijo.id
                              })
                              setShowComparisonMenu(false)
                            }}
                            className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
                          >
                            Comparar con {hijo.titulo}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              </div>
            </div>
          </div>
          
          {/* Conditional Content Based on View Mode */}
          {viewMode === 'timeline' ? (
            <div className="mt-6 bg-surface-light dark:bg-surface-dark rounded-lg shadow-sm border border-border-light dark:border-border-dark">
              <DocumentTimeline 
                document={document} 
                childDocuments={document.documentos_hijos_info || []} 
              />
            </div>
          ) : (
            <div className="mt-6 bg-surface-light dark:bg-surface-dark p-8 rounded-lg shadow-sm border border-border-light dark:border-border-dark">
            <div className="prose prose-lg dark:prose-invert max-w-none text-text-light dark:text-text-dark">
              {/* Document Description */}
              {document.descripcion && (
                <p className="lead text-subtle-light dark:text-subtle-dark mb-6">
                  {highlightSearchTerm(document.descripcion)}
                </p>
              )}
              
              {/* Note: Transcription is hidden in this view, available in DocumentDetailView */}
              
              {/* Clausulas */}
              {filteredClausulas.length > 0 ? (
                filteredClausulas.map((clausula, index) => (
                  <div 
                    key={clausula.id}
                    id={`clausula-${clausula.id}`}
                    ref={el => clausulaRefs.current[clausula.id] = el}
                    className={`pt-8 ${index > 0 ? 'border-t border-border-light dark:border-border-dark mt-8' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3 flex-1">
                        <h3 className="text-xl font-semibold text-primary">
                          {clausula.numero_referencia || `${index + 1}`}. {highlightSearchTerm(clausula.titulo)}
                        </h3>
                        <button
                          onClick={() => {
                            setSelectedClausulaForHistory(clausula)
                            setShowVersionHistory(true)
                          }}
                          className="flex items-center gap-1 px-3 py-1 bg-primary/10 hover:bg-primary/20 text-primary rounded-md transition-colors text-sm"
                          title="Ver historial de versiones"
                        >
                          <span className="material-icons text-sm">history</span>
                          Versiones
                        </button>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {/* Tags a la derecha del título */}
                        {clausula.etiquetas && clausula.etiquetas.length > 0 && (
                          <>
                            {clausula.etiquetas.map(tag => {
                              // Determinar color según el tipo de tag
                              let tagColorClass = 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                              
                              if (tag.toLowerCase().includes('obligaci') || tag.toLowerCase().includes('servicio')) {
                                tagColorClass = 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                              } else if (tag.toLowerCase().includes('financiero') || tag.toLowerCase().includes('pago')) {
                                tagColorClass = 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                              } else if (tag.toLowerCase().includes('riesgo') || tag.toLowerCase().includes('confidencial')) {
                                tagColorClass = 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                              } else if (tag.toLowerCase().includes('propiedad') || tag.toLowerCase().includes('intelectual')) {
                                tagColorClass = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                              }
                              
                              return (
                                <span 
                                  key={tag}
                                  className={`px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap ${tagColorClass}`}
                                >
                                  {tag}
                                </span>
                              )
                            })}
                          </>
                        )}
                        {/* Categoría */}
                        {clausula.categoria && (
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(clausula.categoria)}`}>
                            {clausula.categoria}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-2 text-text-light dark:text-text-dark">
                      {highlightSearchTerm(clausula.contenido)}
                    </div>
                    
                    {/* Metadata */}
                    {(clausula.fecha_vencimiento || clausula.criticidad) && (
                      <div className="flex items-center gap-4 mt-3 text-sm text-subtle-light dark:text-subtle-dark">
                        {clausula.fecha_vencimiento && (
                          <span className="flex items-center gap-1">
                            <span className="material-icons text-sm">calendar_today</span>
                            Vence: {new Date(clausula.fecha_vencimiento).toLocaleDateString('es-ES')}
                          </span>
                        )}
                        {clausula.criticidad && (
                          <span className={`flex items-center gap-1 ${
                            clausula.criticidad === 'ALTA' ? 'text-red-600 dark:text-red-400' :
                            clausula.criticidad === 'MEDIA' ? 'text-yellow-600 dark:text-yellow-400' :
                            'text-green-600 dark:text-green-400'
                          }`}>
                            <span className="material-icons text-sm">priority_high</span>
                            {clausula.criticidad}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <span className="material-icons text-6xl text-subtle-light dark:text-subtle-dark mb-4">description</span>
                  <p className="text-subtle-light dark:text-subtle-dark">
                    No se encontraron {getClauseTerm(document?.tipo)}s con los filtros aplicados
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
        </div>
      </div>
      
      {/* Sidebar - only show in document view */}
      {viewMode === 'document' && (
      <aside className="w-80 bg-surface-light dark:bg-surface-dark border-l border-border-light dark:border-border-dark p-6 overflow-y-auto">
        {/* Filters */}
        <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-4">
          Filtros de {getClauseTerm(document?.tipo).charAt(0).toUpperCase() + getClauseTerm(document?.tipo).slice(1)}s
        </h3>
        
        <div className="space-y-4 mb-6">
          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-subtle-light dark:text-subtle-dark mb-2">
              Filtrar por categoría
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-md focus:outline-none focus:ring-2 focus:ring-primary py-2 px-3 text-sm text-text-light dark:text-text-dark"
            >
              <option value="all">Todas las categorías</option>
              {getCategories().map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          
          {/* Tag Filters */}
          <div>
            <label className="block text-sm font-medium text-subtle-light dark:text-subtle-dark mb-2">
              Filtrar por tags
            </label>
            {getTags().length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {getTags().map(tag => {
                  const isSelected = selectedTags.includes(tag)
                  // Get color based on category-like naming
                  let colorClass = 'bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  
                  if (tag.toLowerCase().includes('obligaci') || tag.toLowerCase().includes('servicio')) {
                    colorClass = 'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800'
                  } else if (tag.toLowerCase().includes('financiero') || tag.toLowerCase().includes('pago') || tag.toLowerCase().includes('honorario')) {
                    colorClass = 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-300 dark:hover:bg-green-800'
                  } else if (tag.toLowerCase().includes('riesgo') || tag.toLowerCase().includes('confidencial')) {
                    colorClass = 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-300 dark:hover:bg-red-800'
                  } else if (tag.toLowerCase().includes('propiedad') || tag.toLowerCase().includes('intelectual')) {
                    colorClass = 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-300 dark:hover:bg-yellow-800'
                  }
                  
                  // Add ring if selected
                  if (isSelected) {
                    colorClass += ' ring-2 ring-primary'
                  }
                  
                  return (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1 text-sm rounded-full transition-all ${colorClass}`}
                    >
                      {tag}
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs text-subtle-light dark:text-subtle-dark italic">
                No hay tags disponibles
              </p>
            )}
          </div>
          
          {/* Clear Filters */}
          {(selectedCategory !== 'all' || selectedTags.length > 0) && (
            <button
              onClick={() => {
                setSelectedCategory('all')
                setSelectedTags([])
              }}
              className="w-full px-3 py-2 text-sm text-primary hover:bg-primary/10 rounded-md transition-colors"
            >
              Limpiar filtros
            </button>
          )}
        </div>
        
        {/* Amendments History */}
        {enmiendas.length > 0 && (
          <div className="border-t border-border-light dark:border-border-dark pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text-light dark:text-text-dark">
                Enmiendas
              </h3>
              <button
                onClick={() => setShowAmendmentHistory(!showAmendmentHistory)}
                className="text-sm text-primary hover:underline"
              >
                {showAmendmentHistory ? 'Ocultar' : 'Ver Historial'}
              </button>
            </div>
            
            {showAmendmentHistory && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {enmiendas.map((enmienda) => (
                  <div 
                    key={enmienda.id}
                    className={`p-3 rounded-lg border text-sm ${
                      enmienda.esta_aplicada 
                        ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' 
                        : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-2 h-2 rounded-full ${
                        enmienda.esta_aplicada ? 'bg-green-500' : 'bg-gray-400'
                      }`}></span>
                      <span className="font-medium text-text-light dark:text-text-dark">
                        {enmienda.esta_aplicada ? 'Aplicada' : 'Pendiente'}
                      </span>
                    </div>
                    <p className="text-xs text-subtle-light dark:text-subtle-dark line-clamp-2">
                      {enmienda.motivo}
                    </p>
                    <p className="text-xs text-subtle-light dark:text-subtle-dark mt-1">
                      {new Date(enmienda.fecha_creacion).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                ))}
              </div>
            )}
            
            {/* Latest Amendment Badge */}
            {!showAmendmentHistory && enmiendas.some(e => e.esta_aplicada) && (
              <div className="p-3 rounded-lg bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  <span className="text-sm font-medium text-green-800 dark:text-green-300">
                    Última enmienda aplicada
                  </span>
                </div>
                <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                  {enmiendas.find(e => e.esta_aplicada)?.fecha_aplicacion 
                    ? new Date(enmiendas.find(e => e.esta_aplicada).fecha_aplicacion).toLocaleDateString('es-ES')
                    : 'Fecha no disponible'}
                </p>
              </div>
            )}
          </div>
        )}
        
        {/* Clause Navigation */}
        <div className="border-t border-border-light dark:border-border-dark pt-6">
          <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-4">
            {getClauseTerm(document?.tipo).charAt(0).toUpperCase() + getClauseTerm(document?.tipo).slice(1)}s del Documento
          </h3>
          
          <nav>
            <ul className="space-y-2">
              {filteredClausulas.map((clausula, index) => (
                <li key={clausula.id}>
                  <button
                    onClick={() => scrollToClausula(clausula.id)}
                    className={`block w-full text-left text-sm px-3 py-2 rounded-md transition-colors ${
                      activeClausula === clausula.id
                        ? 'bg-primary/10 text-primary font-bold'
                        : 'text-subtle-light dark:text-subtle-dark hover:text-primary dark:hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {clausula.numero_referencia || `${index + 1}`}. {clausula.titulo}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        
        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mt-6 border-t border-border-light dark:border-border-dark pt-6">
            <h4 className="text-base font-semibold text-text-light dark:text-text-dark mb-3">
              Resultados de la búsqueda ({searchResults.length})
            </h4>
            <div className="space-y-3">
              {searchResults.map((result, index) => (
                <div key={index} className="text-sm">
                  {result.type === 'clausula' ? (
                    <>
                      <button
                        onClick={() => scrollToClausula(result.clausula.id)}
                        className="font-medium text-primary hover:underline text-left"
                      >
                        {result.clausula.titulo}
                      </button>
                      <p className="text-xs text-subtle-light dark:text-subtle-dark mt-1 line-clamp-2">
                        "{highlightSearchTerm(result.snippet)}"
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-subtle-light dark:text-subtle-dark">
                      "{highlightSearchTerm(result.snippet)}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>
      )}
    </div>
    
    {/* Clause Version Comparison Modal */}
    {comparisonDocs && (
      <ClausulaVersionComparison
        documentoBaseId={comparisonDocs.base}
        documentoComparadoId={comparisonDocs.compared}
        documentType={documento?.tipo}
        onClose={() => setComparisonDocs(null)}
      />
    )}
    
    {/* Clause Version History Modal */}
    {showVersionHistory && selectedClausulaForHistory && (
      <ClauseVersionHistory
        clausulaId={selectedClausulaForHistory.id}
        onClose={() => {
          setShowVersionHistory(false)
          setSelectedClausulaForHistory(null)
        }}
      />
    )}
  </>
  )
}

export default DocumentView
