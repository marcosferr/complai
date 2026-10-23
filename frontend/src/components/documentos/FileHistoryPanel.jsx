import React, { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import api, { downloadProtectedFile } from '@/services/api'
import { showNotification } from '@/store/slices/uiSlice'

const FileHistoryPanel = ({ documentId }) => {
  const dispatch = useDispatch()
  const [fileHistory, setFileHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [newFile, setNewFile] = useState(null)
  const [notas, setNotas] = useState('')
  const [showUploadForm, setShowUploadForm] = useState(false)

  useEffect(() => {
    if (documentId) {
      loadFileHistory()
    }
  }, [documentId])

  const loadFileHistory = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/documentos/${documentId}/file-history/`)
      setFileHistory(response.data)
    } catch (error) {
      console.error('Error loading file history:', error)
      dispatch(showNotification({
        message: 'Error cargando historial de archivos',
        type: 'error'
      }))
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setNewFile(file)
    }
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    
    if (!newFile) {
      dispatch(showNotification({
        message: 'Por favor seleccione un archivo',
        type: 'error'
      }))
      return
    }

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('archivo', newFile)
      formData.append('notas', notas)

      await api.post(`/documentos/${documentId}/file-history/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      dispatch(showNotification({
        message: 'Nueva versión subida exitosamente. El documento será reprocesado.',
        type: 'success'
      }))

      // Reset form
      setNewFile(null)
      setNotas('')
      setShowUploadForm(false)

      // Reload history
      await loadFileHistory()
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Error subiendo archivo'
      dispatch(showNotification({
        message: errorMessage,
        type: 'error'
      }))
    } finally {
      setUploading(false)
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <span className="material-icons animate-spin text-4xl text-primary">refresh</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with Upload Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-text-light dark:text-text-dark flex items-center gap-2">
          <span className="material-icons text-primary">history</span>
          Historial de Archivos
        </h3>
        <button
          onClick={() => setShowUploadForm(!showUploadForm)}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
        >
          <span className="material-icons text-sm">
            {showUploadForm ? 'close' : 'upload_file'}
          </span>
          {showUploadForm ? 'Cancelar' : 'Subir Nueva Versión'}
        </button>
      </div>

      {/* Upload Form */}
      {showUploadForm && (
        <form onSubmit={handleUpload} className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              Nuevo Archivo *
            </label>
            <input
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.txt"
              className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:ring-primary focus:border-primary text-text-light dark:text-text-dark"
            />
            {newFile && (
              <p className="text-sm text-success mt-1 flex items-center gap-1">
                <span className="material-icons text-sm">check_circle</span>
                {newFile.name}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              Notas (Opcional)
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
              placeholder="Describe los cambios en esta versión..."
              className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:ring-primary focus:border-primary text-text-light dark:text-text-dark"
            />
          </div>

          <button
            type="submit"
            disabled={uploading || !newFile}
            className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <>
                <span className="material-icons animate-spin text-sm">refresh</span>
                Subiendo...
              </>
            ) : (
              <>
                <span className="material-icons text-sm">upload</span>
                Subir Archivo
              </>
            )}
          </button>
        </form>
      )}

      {/* File History List */}
      <div className="space-y-3">
        {fileHistory.length === 0 ? (
          <div className="text-center py-8 text-subtle-light dark:text-subtle-dark">
            <span className="material-icons text-5xl mb-2">folder_open</span>
            <p>No hay historial de archivos disponible</p>
          </div>
        ) : (
          fileHistory.map((item, index) => (
            <div
              key={item.id}
              className="flex items-start gap-4 p-4 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg hover:shadow-md transition-shadow"
            >
              {/* Version Badge */}
              <div className="flex-shrink-0">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${
                  index === 0
                    ? 'bg-primary text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}>
                  v{item.version_numero}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <h4 className="font-medium text-text-light dark:text-text-dark">
                      {item.filename}
                    </h4>
                    <p className="text-sm text-subtle-light dark:text-subtle-dark">
                      {formatFileSize(item.tamano_archivo)}
                    </p>
                  </div>
                  {index === 0 && (
                    <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded">
                      Actual
                    </span>
                  )}
                </div>

                {item.notas && (
                  <p className="text-sm text-text-light dark:text-text-dark mb-2 bg-background-light dark:bg-background-dark p-2 rounded">
                    {item.notas}
                  </p>
                )}

                <div className="flex items-center gap-4 text-xs text-subtle-light dark:text-subtle-dark">
                  <span className="flex items-center gap-1">
                    <span className="material-icons" style={{ fontSize: '14px' }}>person</span>
                    {item.subido_por_nombre || 'Usuario'}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-icons" style={{ fontSize: '14px' }}>schedule</span>
                    {formatDate(item.fecha_subida)}
                  </span>
                </div>
              </div>

              {/* Download Button */}
              <div className="flex-shrink-0">
                <button
                  onClick={() => downloadProtectedFile(item.archivo, item.nombre_archivo)}
                  className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors inline-flex items-center justify-center"
                  title="Descargar"
                >
                  <span className="material-icons">download</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default FileHistoryPanel
