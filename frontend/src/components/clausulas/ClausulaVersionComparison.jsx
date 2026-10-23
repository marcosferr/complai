import React, { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { showNotification } from '@/store/slices/uiSlice'
import clausulaService from '@/services/clausulaService'
import { getClauseTerm } from '@/lib/utils'

const ClausulaVersionComparison = ({ documentoBaseId, documentoComparadoId, documentType, onClose }) => {
  const [comparison, setComparison] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all') // 'all', 'modified', 'added', 'removed', 'unchanged'
  const dispatch = useDispatch()

  // Get the appropriate term based on document type
  const clauseTerm = getClauseTerm(documentType)

  useEffect(() => {
    fetchComparison()
  }, [documentoBaseId, documentoComparadoId])

  const fetchComparison = async () => {
    try {
      setLoading(true)
      const response = await clausulaService.compareClausulas(documentoBaseId, documentoComparadoId)
      setComparison(response.data || response)
    } catch (error) {
      dispatch(showNotification({ 
        message: 'Error al comparar documentos', 
        type: 'error' 
      }))
      console.error('Error fetching comparison:', error)
    } finally {
      setLoading(false)
    }
  }

  const getFilteredClausulas = () => {
    if (!comparison || !comparison.clausulas) return []
    if (filterStatus === 'all') return comparison.clausulas
    return comparison.clausulas.filter(c => c.status === filterStatus)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'modified':
        return 'bg-yellow-50 border-yellow-300'
      case 'added':
        return 'bg-green-50 border-green-300'
      case 'removed':
        return 'bg-red-50 border-red-300'
      case 'unchanged':
        return 'bg-gray-50 border-gray-200'
      default:
        return 'bg-white border-gray-300'
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'modified':
        return <span className="px-3 py-1 bg-yellow-500 text-white text-xs font-semibold rounded-full">Modificada</span>
      case 'added':
        return <span className="px-3 py-1 bg-green-500 text-white text-xs font-semibold rounded-full">Añadida</span>
      case 'removed':
        return <span className="px-3 py-1 bg-red-500 text-white text-xs font-semibold rounded-full">Eliminada</span>
      case 'unchanged':
        return <span className="px-3 py-1 bg-gray-400 text-white text-xs font-semibold rounded-full">Sin cambios</span>
      default:
        return null
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'modified':
        return 'edit'
      case 'added':
        return 'add_circle'
      case 'removed':
        return 'remove_circle'
      case 'unchanged':
        return 'check_circle'
      default:
        return 'help'
    }
  }

  const highlightDifferences = (baseText, comparadoText) => {
    if (!baseText || !comparadoText) return { base: baseText, comparado: comparadoText }
    
    // Simple word-by-word comparison
    const baseWords = baseText.split(' ')
    const comparadoWords = comparadoText.split(' ')
    
    const maxLength = Math.max(baseWords.length, comparadoWords.length)
    let highlightedBase = []
    let highlightedComparado = []
    
    for (let i = 0; i < maxLength; i++) {
      const baseWord = baseWords[i]
      const comparadoWord = comparadoWords[i]
      
      if (baseWord === comparadoWord) {
        highlightedBase.push(<span key={i}>{baseWord} </span>)
        highlightedComparado.push(<span key={i}>{comparadoWord} </span>)
      } else {
        if (baseWord) {
          highlightedBase.push(<span key={i} className="bg-red-200 text-red-900 px-1 rounded">{baseWord}</span>)
          highlightedBase.push(' ')
        }
        if (comparadoWord) {
          highlightedComparado.push(<span key={i} className="bg-green-200 text-green-900 px-1 rounded">{comparadoWord}</span>)
          highlightedComparado.push(' ')
        }
      }
    }
    
    return { base: highlightedBase, comparado: highlightedComparado }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-6xl w-full max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-500 dark:text-gray-400">Comparando documentos...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!comparison) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-6xl w-full">
          <p className="text-gray-500 dark:text-gray-400">No se pudo cargar la comparación</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Cerrar
          </button>
        </div>
      </div>
    )
  }

  const filteredClausulas = getFilteredClausulas()
  const statusCounts = {
    all: comparison.clausulas.length,
    modified: comparison.clausulas.filter(c => c.status === 'modified').length,
    added: comparison.clausulas.filter(c => c.status === 'added').length,
    removed: comparison.clausulas.filter(c => c.status === 'removed').length,
    unchanged: comparison.clausulas.filter(c => c.status === 'unchanged').length,
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-7xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Comparación de {clauseTerm.charAt(0).toUpperCase() + clauseTerm.slice(1)}s
              </h2>
              <div className="flex gap-6 text-sm text-gray-600 dark:text-gray-400">
                <div>
                  <span className="font-semibold">Documento Base:</span> {comparison.documento_base.titulo}
                </div>
                <div>
                  <span className="font-semibold">Documento Comparado:</span> {comparison.documento_comparado.titulo}
                  {comparison.documento_comparado.es_adenda && (
                    <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
                      Adenda {comparison.documento_comparado.estado_adenda}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <span className="material-icons text-3xl">close</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex gap-2 overflow-x-auto">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === 'all'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            Todas ({statusCounts.all})
          </button>
          <button
            onClick={() => setFilterStatus('modified')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === 'modified'
                ? 'bg-yellow-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            Modificadas ({statusCounts.modified})
          </button>
          <button
            onClick={() => setFilterStatus('added')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === 'added'
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            Añadidas ({statusCounts.added})
          </button>
          <button
            onClick={() => setFilterStatus('removed')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === 'removed'
                ? 'bg-red-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            Eliminadas ({statusCounts.removed})
          </button>
          <button
            onClick={() => setFilterStatus('unchanged')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === 'unchanged'
                ? 'bg-gray-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            Sin cambios ({statusCounts.unchanged})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {filteredClausulas.length === 0 ? (
              <div className="text-center py-12">
                <span className="material-icons text-6xl text-gray-400 mb-4">search_off</span>
                <p className="text-gray-500 dark:text-gray-400">
                  No hay {clauseTerm}s con el filtro seleccionado
                </p>
              </div>
            ) : (
              filteredClausulas.map((clausula, index) => {
                const highlighted = clausula.status === 'modified' && clausula.base && clausula.comparado
                  ? highlightDifferences(clausula.base.contenido, clausula.comparado.contenido)
                  : null

                return (
                  <div
                    key={index}
                    className={`border-2 rounded-lg p-4 ${getStatusColor(clausula.status)}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="material-icons text-2xl">
                          {getStatusIcon(clausula.status)}
                        </span>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {clausula.titulo}
                        </h3>
                      </div>
                      {getStatusBadge(clausula.status)}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Base Document Clause */}
                      <div className={clausula.status === 'added' ? 'opacity-0' : ''}>
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Documento Base
                        </h4>
                        <div className="bg-white dark:bg-gray-900 p-3 rounded border border-gray-300 dark:border-gray-600 text-sm text-gray-800 dark:text-gray-200">
                          {clausula.base ? (
                            highlighted ? highlighted.base : clausula.base.contenido
                          ) : (
                            <span className="text-gray-400 italic">No existe</span>
                          )}
                        </div>
                      </div>

                      {/* Compared Document Clause */}
                      <div className={clausula.status === 'removed' ? 'opacity-0' : ''}>
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Documento Comparado
                        </h4>
                        <div className="bg-white dark:bg-gray-900 p-3 rounded border border-gray-300 dark:border-gray-600 text-sm text-gray-800 dark:text-gray-200">
                          {clausula.comparado ? (
                            highlighted ? highlighted.comparado : clausula.comparado.contenido
                          ) : (
                            <span className="text-gray-400 italic">No existe</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

export default ClausulaVersionComparison
