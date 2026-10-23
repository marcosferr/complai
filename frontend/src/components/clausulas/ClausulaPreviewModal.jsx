import React, { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { showNotification } from '@/store/slices/uiSlice'
import clausulaService from '@/services/clausulaService'
import RichTextContent from '@/components/ui/RichTextContent'

const ClausulaPreviewModal = ({ isOpen, onClose, clausulaId, documentoId }) => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [clausula, setClausula] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && clausulaId) {
      fetchClausulaPreview()
    }
  }, [isOpen, clausulaId])

  const fetchClausulaPreview = async () => {
    try {
      setLoading(true)
      const response = await clausulaService.previewClausula(clausulaId)
      setClausula(response.data)
    } catch (error) {
      console.error('Error fetching clausula preview:', error)
      dispatch(showNotification({
        message: 'Error al cargar vista previa de la cláusula',
        type: 'error'
      }))
    } finally {
      setLoading(false)
    }
  }

  const handleNavigate = () => {
    if (clausula) {
      navigate(`/documentos/${clausula.documento.id}/view#clausula-${clausula.id}`)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Vista Previa de Cláusula
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <span className="material-icons">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <span className="material-icons animate-spin text-4xl text-primary">refresh</span>
            </div>
          ) : clausula ? (
            <div className="space-y-4">
              {/* Document Info */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <span className="material-icons text-blue-600 dark:text-blue-400">description</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Referencia a {clausula.documento.titulo}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {clausula.documento.tipo} • Cláusula {clausula.numero_orden}
                    </p>
                  </div>
                </div>
              </div>

              {/* Clause Title */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-2">
                  {clausula.titulo}
                </h4>
              </div>

              {/* Clause Content */}
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                <RichTextContent
                  value={clausula.contenido}
                  className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed"
                />
              </div>

              {/* Tags */}
              {clausula.etiquetas && clausula.etiquetas.length > 0 && (
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Etiquetas:</p>
                  <div className="flex flex-wrap gap-2">
                    {clausula.etiquetas.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 text-xs rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No se pudo cargar la cláusula
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cerrar
          </button>
          <button
            onClick={handleNavigate}
            disabled={!clausula}
            className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-icons text-base">arrow_forward</span>
            Ir a Cláusula
          </button>
        </div>
      </div>
    </div>
  )
}

export default ClausulaPreviewModal
