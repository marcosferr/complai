import React, { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import api from '@/services/api'
import { showNotification } from '@/store/slices/uiSlice'

const ClauseVersionHistory = ({ clausulaId, onClose }) => {
  const dispatch = useDispatch()
  const [versions, setVersions] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedVersions, setSelectedVersions] = useState({ version1: null, version2: null })

  useEffect(() => {
    if (clausulaId) {
      loadVersions()
    }
  }, [clausulaId])

  const loadVersions = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/documentos/clausulas/${clausulaId}/versions/`)
      
      // Response contains: clausula_original, versiones, version_activa
      const { clausula_original, versiones, version_activa } = response.data
      
      // Also load clause-specific adendas
      const adendasResponse = await api.get(`/clausulas/adendas/?clausula=${clausulaId}`)
      const adendasClausula = adendasResponse.data?.results || adendasResponse.data || []
      
      // Filter only applied adendas
      const adendasAplicadas = adendasClausula.filter(a => a.estado === 'APLICADA' || a.estado === 'APLICADA_PARCIALMENTE')
      
      // Combine original clause as version 0 with addendum versions
      let allVersions = [
        {
          id: `original-${clausula_original.id}`,
          numero_version: 0,
          contenido: clausula_original.contenido,
          observaciones: 'Versión original del documento base',
          fecha_creacion: clausula_original.fecha_creacion,
          activa: versiones.length === 0 && adendasAplicadas.length === 0, // Active if no other versions
          clausula_titulo: clausula_original.titulo,
          adenda_info: null,
          isOriginal: true
        },
        ...versiones
      ]
      
      // Add clause adendas as versions
      adendasAplicadas.forEach((adenda, index) => {
        allVersions.push({
          id: `adenda-clausula-${adenda.id}`,
          numero_version: versiones.length + index + 1,
          contenido: adenda.contenido_nuevo,
          observaciones: `Adenda de cláusula: ${adenda.motivo}`,
          fecha_creacion: adenda.fecha_aplicacion || adenda.fecha_creacion,
          activa: false, // We'll mark the last one as active below
          clausula_titulo: clausula_original.titulo,
          adenda_info: {
            tipo: 'clausula',
            estado: adenda.estado,
            motivo: adenda.motivo,
            archivo_nombre: adenda.archivo_nombre
          },
          isClauseAdenda: true
        })
      })
      
      // Sort all versions by date
      allVersions.sort((a, b) => new Date(a.fecha_creacion) - new Date(b.fecha_creacion))
      
      // Reassign version numbers and mark last as active
      allVersions = allVersions.map((v, index) => {
        return {
          ...v,
          numero_version: index,
          activa: index === allVersions.length - 1
        }
      })
      
      setVersions(allVersions)
      
      // Auto-select last two versions for comparison
      if (allVersions.length >= 2) {
        setSelectedVersions({
          version1: allVersions[allVersions.length - 2],
          version2: allVersions[allVersions.length - 1]
        })
      } else if (allVersions.length === 1) {
        setSelectedVersions({
          version1: allVersions[0],
          version2: null
        })
      }
    } catch (error) {
      console.error('Error loading versions:', error)
      dispatch(showNotification({
        message: 'Error cargando versiones de la cláusula',
        type: 'error'
      }))
    } finally {
      setLoading(false)
    }
  }

  const highlightDifferences = (text1, text2) => {
    if (!text1 || !text2) return { text1, text2 }
    
    const words1 = text1.split(/\s+/)
    const words2 = text2.split(/\s+/)
    
    const maxLength = Math.max(words1.length, words2.length)
    const highlighted1 = []
    const highlighted2 = []
    
    for (let i = 0; i < maxLength; i++) {
      const word1 = words1[i]
      const word2 = words2[i]
      
      if (word1 === word2) {
        highlighted1.push(<span key={i} className="text-text-light dark:text-text-dark">{word1} </span>)
        highlighted2.push(<span key={i} className="text-text-light dark:text-text-dark">{word2} </span>)
      } else {
        if (word1) {
          highlighted1.push(
            <span key={`1-${i}`} className="bg-red-200 dark:bg-red-900 text-red-900 dark:text-red-200 px-1 rounded">
              {word1}
            </span>
          )
          highlighted1.push(' ')
        }
        if (word2) {
          highlighted2.push(
            <span key={`2-${i}`} className="bg-green-200 dark:bg-green-900 text-green-900 dark:text-green-200 px-1 rounded">
              {word2}
            </span>
          )
          highlighted2.push(' ')
        }
      }
    }
    
    return { text1: highlighted1, text2: highlighted2 }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-surface-light dark:bg-surface-dark rounded-lg p-8">
          <span className="material-icons animate-spin text-4xl text-primary">refresh</span>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-light dark:bg-surface-dark rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-light dark:border-border-dark">
          <h2 className="text-xl font-bold text-text-light dark:text-text-dark flex items-center gap-2">
            <span className="material-icons text-primary">history</span>
            Historial de Versiones de Cláusula
          </h2>
          <button
            onClick={onClose}
            className="text-subtle-light dark:text-subtle-dark hover:text-text-light dark:hover:text-text-dark"
          >
            <span className="material-icons">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {versions.length === 0 ? (
            <div className="text-center py-12 text-subtle-light dark:text-subtle-dark">
              <span className="material-icons text-6xl mb-4">history</span>
              <p>No hay versiones disponibles para esta cláusula</p>
            </div>
          ) : (
            <>
              {/* Version Selector */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-background-light dark:bg-background-dark rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                    Versión 1 (Anterior)
                  </label>
                  <select
                    value={selectedVersions.version1?.id || ''}
                    onChange={(e) => {
                      const versionId = e.target.value
                      const version = versions.find(v => String(v.id) === String(versionId))
                      setSelectedVersions(prev => ({ ...prev, version1: version }))
                    }}
                    className="w-full px-3 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg focus:ring-primary focus:border-primary text-text-light dark:text-text-dark"
                  >
                    <option value="">Seleccionar versión...</option>
                    {versions.map(version => (
                      <option key={version.id} value={version.id}>
                        Versión {version.numero_version}
                        {version.adenda_info ? ` - Adenda #${version.adenda_info.numero}` : ' - Original'}
                        {' '}({formatDate(version.fecha_creacion)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                    Versión 2 (Actual)
                  </label>
                  <select
                    value={selectedVersions.version2?.id || ''}
                    onChange={(e) => {
                      const versionId = e.target.value
                      const version = versions.find(v => String(v.id) === String(versionId))
                      setSelectedVersions(prev => ({ ...prev, version2: version }))
                    }}
                    className="w-full px-3 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg focus:ring-primary focus:border-primary text-text-light dark:text-text-dark"
                  >
                    <option value="">Seleccionar versión...</option>
                    {versions.map(version => (
                      <option key={version.id} value={version.id}>
                        Versión {version.numero_version}
                        {version.adenda_info ? ` - Adenda #${version.adenda_info.numero}` : ' - Original'}
                        {' '}({formatDate(version.fecha_creacion)})
                        {version.activa && ' (Activa)'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Comparison View */}
              {selectedVersions.version1 && selectedVersions.version2 ? (
                <div className="grid grid-cols-2 gap-4">
                  {/* Version 1 */}
                  <div className="border border-border-light dark:border-border-dark rounded-lg">
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border-b border-border-light dark:border-border-dark">
                      <h3 className="font-semibold text-text-light dark:text-text-dark flex items-center gap-2">
                        <span className="material-icons text-red-600 dark:text-red-400">history</span>
                        Versión {selectedVersions.version1.numero_version}
                      </h3>
                      {selectedVersions.version1.adenda_info && (
                        <div className="text-sm text-subtle-light dark:text-subtle-dark mt-1">
                          {selectedVersions.version1.isClauseAdenda ? (
                            <>
                              <span className="inline-flex items-center px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full text-xs font-medium mr-2">
                                Adenda de Cláusula
                              </span>
                              {selectedVersions.version1.adenda_info.archivo_nombre && (
                                <span className="inline-flex items-center text-xs">
                                  <span className="material-icons text-xs mr-1">attach_file</span>
                                  {selectedVersions.version1.adenda_info.archivo_nombre}
                                </span>
                              )}
                            </>
                          ) : (
                            <p>Adenda #{selectedVersions.version1.adenda_info.numero} - {selectedVersions.version1.adenda_info.titulo}</p>
                          )}
                        </div>
                      )}
                      <p className="text-xs text-subtle-light dark:text-subtle-dark mt-1">
                        {formatDate(selectedVersions.version1.fecha_creacion)}
                      </p>
                    </div>
                    <div className="p-4 whitespace-pre-wrap text-sm">
                      {highlightDifferences(
                        selectedVersions.version1.contenido,
                        selectedVersions.version2.contenido
                      ).text1}
                    </div>
                    {selectedVersions.version1.observaciones && (
                      <div className="p-4 border-t border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark">
                        <p className="text-xs font-medium text-subtle-light dark:text-subtle-dark mb-1">Observaciones:</p>
                        <p className="text-sm text-text-light dark:text-text-dark">{selectedVersions.version1.observaciones}</p>
                      </div>
                    )}
                  </div>

                  {/* Version 2 */}
                  <div className="border border-border-light dark:border-border-dark rounded-lg">
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 border-b border-border-light dark:border-border-dark">
                      <h3 className="font-semibold text-text-light dark:text-text-dark flex items-center gap-2">
                        <span className="material-icons text-green-600 dark:text-green-400">update</span>
                        Versión {selectedVersions.version2.numero_version}
                        {selectedVersions.version2.activa && (
                          <span className="px-2 py-1 bg-primary text-white text-xs rounded">Activa</span>
                        )}
                      </h3>
                      {selectedVersions.version2.adenda_info && (
                        <div className="text-sm text-subtle-light dark:text-subtle-dark mt-1">
                          {selectedVersions.version2.isClauseAdenda ? (
                            <>
                              <span className="inline-flex items-center px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full text-xs font-medium mr-2">
                                Adenda de Cláusula
                              </span>
                              {selectedVersions.version2.adenda_info.archivo_nombre && (
                                <span className="inline-flex items-center text-xs">
                                  <span className="material-icons text-xs mr-1">attach_file</span>
                                  {selectedVersions.version2.adenda_info.archivo_nombre}
                                </span>
                              )}
                            </>
                          ) : (
                            <p>Adenda #{selectedVersions.version2.adenda_info.numero} - {selectedVersions.version2.adenda_info.titulo}</p>
                          )}
                        </div>
                      )}
                      <p className="text-xs text-subtle-light dark:text-subtle-dark mt-1">
                        {formatDate(selectedVersions.version2.fecha_creacion)}
                      </p>
                    </div>
                    <div className="p-4 whitespace-pre-wrap text-sm">
                      {highlightDifferences(
                        selectedVersions.version1.contenido,
                        selectedVersions.version2.contenido
                      ).text2}
                    </div>
                    {selectedVersions.version2.observaciones && (
                      <div className="p-4 border-t border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark">
                        <p className="text-xs font-medium text-subtle-light dark:text-subtle-dark mb-1">Observaciones:</p>
                        <p className="text-sm text-text-light dark:text-text-dark">{selectedVersions.version2.observaciones}</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Single Version View */
                selectedVersions.version1 && (
                  <div className="border border-border-light dark:border-border-dark rounded-lg">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-b border-border-light dark:border-border-dark">
                      <h3 className="font-semibold text-text-light dark:text-text-dark">
                        Versión {selectedVersions.version1.numero_version}
                      </h3>
                      {selectedVersions.version1.adenda_info && (
                        <p className="text-sm text-subtle-light dark:text-subtle-dark mt-1">
                          Adenda #{selectedVersions.version1.adenda_info.numero} - {selectedVersions.version1.adenda_info.titulo}
                        </p>
                      )}
                    </div>
                    <div className="p-4 whitespace-pre-wrap">
                      {selectedVersions.version1.contenido}
                    </div>
                  </div>
                )
              )}

              {/* Version Timeline */}
              <div className="border-t border-border-light dark:border-border-dark pt-6">
                <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-4">
                  Línea de Tiempo de Versiones
                </h3>
                <div className="space-y-3">
                  {versions.slice().reverse().map((version, index) => (
                    <div
                      key={version.id}
                      className={`flex items-start gap-4 p-4 rounded-lg border-2 transition-all hover:shadow-lg ${
                        version.activa
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-500'
                          : 'bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                        version.activa
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-400 dark:bg-gray-600 text-white'
                      }`}>
                        {version.numero_version}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-text-light dark:text-text-dark text-lg">
                            {version.isOriginal ? 'Versión Original' : `Versión ${version.numero_version}`}
                          </span>
                          {version.activa && (
                            <span className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full">
                              ACTIVA
                            </span>
                          )}
                          {version.adenda_info && (
                            <span className="px-3 py-1 bg-blue-500 text-white text-xs font-semibold rounded-full">
                              Adenda #{version.adenda_info.numero}
                            </span>
                          )}
                        </div>
                        {version.adenda_info && (
                          <p className="text-sm text-text-light dark:text-text-dark font-medium mb-1">
                            {version.adenda_info.titulo}
                          </p>
                        )}
                        <p className="text-xs text-subtle-light dark:text-subtle-dark">
                          {formatDate(version.fecha_creacion)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default ClauseVersionHistory
