import React, { useState } from 'react'
import { useDispatch } from 'react-redux'
import api from '@/services/api'
import { showNotification } from '@/store/slices/uiSlice'
import { htmlToPlainText } from '@/lib/richText'

const AddendaModal = ({ isOpen, onClose, document, onSuccess, clausulas = [] }) => {
  const dispatch = useDispatch()
  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    archivo: null,
    fecha_vigencia: '',
    clausulas_afectadas: []
  })
  const [dragActive, setDragActive] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setFormData(prev => ({ ...prev, archivo: file }))
    }
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFormData(prev => ({ ...prev, archivo: e.dataTransfer.files[0] }))
    }
  }

  const handleClausulaToggle = (clausulaId) => {
    setFormData(prev => ({
      ...prev,
      clausulas_afectadas: prev.clausulas_afectadas.includes(clausulaId)
        ? prev.clausulas_afectadas.filter(id => id !== clausulaId)
        : [...prev.clausulas_afectadas, clausulaId]
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.archivo) {
      dispatch(showNotification({ 
        message: 'Por favor seleccione un archivo para la adenda', 
        type: 'error' 
      }))
      return
    }

    if (!formData.fecha_vigencia) {
      dispatch(showNotification({ 
        message: 'Por favor seleccione una fecha de vigencia', 
        type: 'error' 
      }))
      return
    }

    setUploading(true)

    try {
      const data = new FormData()
      data.append('titulo', formData.titulo)
      data.append('descripcion', formData.descripcion)
      data.append('archivo', formData.archivo)
      data.append('fecha_vigencia', formData.fecha_vigencia)

      const response = await api.post(`/documentos/${document.id}/adendas/`, data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      dispatch(showNotification({ 
        message: 'Adenda creada exitosamente', 
        type: 'success' 
      }))

      // Reset form
      setFormData({
        titulo: '',
        descripcion: '',
        archivo: null,
        fecha_vigencia: '',
        clausulas_afectadas: []
      })

      onSuccess(response.data)
      onClose()
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Error creando adenda'
      dispatch(showNotification({ 
        message: errorMessage, 
        type: 'error' 
      }))
    } finally {
      setUploading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-light dark:bg-surface-dark rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-light dark:border-border-dark">
          <div>
            <h2 className="text-xl font-bold text-text-light dark:text-text-dark flex items-center gap-2">
              <span className="material-icons text-primary">post_add</span>
              Agregar Adenda
            </h2>
            <p className="text-sm text-subtle-light dark:text-subtle-dark mt-1">
              {document.titulo}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-subtle-light dark:text-subtle-dark hover:text-text-light dark:hover:text-text-dark"
          >
            <span className="material-icons">close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label htmlFor="titulo" className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              Título de la Adenda *
            </label>
            <input
              type="text"
              id="titulo"
              name="titulo"
              value={formData.titulo}
              onChange={handleChange}
              required
              placeholder="Ej: Modificación de términos de pago"
              className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:ring-primary focus:border-primary text-text-light dark:text-text-dark"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="descripcion" className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              Descripción
            </label>
            <textarea
              id="descripcion"
              name="descripcion"
              value={formData.descripcion}
              onChange={handleChange}
              rows={3}
              placeholder="Describe los cambios introducidos por esta adenda..."
              className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:ring-primary focus:border-primary text-text-light dark:text-text-dark"
            />
          </div>

          {/* File Upload Area */}
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              Archivo de la Adenda *
            </label>
            <div
              className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-border-light dark:border-border-dark'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                id="file-upload"
                className="hidden"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.txt"
              />
              
              {formData.archivo ? (
                <div className="flex items-center justify-center gap-2">
                  <span className="material-icons text-success">check_circle</span>
                  <span className="text-text-light dark:text-text-dark font-medium">
                    {formData.archivo.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, archivo: null }))}
                    className="text-danger hover:text-danger/80"
                  >
                    <span className="material-icons text-sm">close</span>
                  </button>
                </div>
              ) : (
                <>
                  <span className="material-icons text-4xl text-subtle-light dark:text-subtle-dark mb-2">
                    cloud_upload
                  </span>
                  <p className="text-text-light dark:text-text-dark mb-2">
                    Arrastra el archivo aquí o
                  </p>
                  <label
                    htmlFor="file-upload"
                    className="inline-block bg-primary text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-primary/90 transition-colors font-medium"
                  >
                    Seleccionar Archivo
                  </label>
                  <p className="text-xs text-subtle-light dark:text-subtle-dark mt-2">
                    Formatos soportados: PDF, DOC, DOCX, TXT
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Effective Date */}
          <div>
            <label htmlFor="fecha_vigencia" className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              Fecha de Vigencia *
            </label>
            <input
              type="date"
              id="fecha_vigencia"
              name="fecha_vigencia"
              value={formData.fecha_vigencia}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:ring-primary focus:border-primary text-text-light dark:text-text-dark"
            />
            <p className="text-xs text-subtle-light dark:text-subtle-dark mt-1">
              Fecha en la que esta adenda entra en vigor
            </p>
          </div>

          {/* Affected Clauses (Optional) */}
          {clausulas.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                Cláusulas Afectadas (Opcional)
              </label>
              <div className="border border-border-light dark:border-border-dark rounded-lg p-4 max-h-60 overflow-y-auto bg-background-light dark:bg-background-dark">
                {clausulas.map(clausula => (
                  <label
                    key={clausula.id}
                    className="flex items-start gap-3 p-3 hover:bg-surface-light dark:hover:bg-surface-dark rounded-lg cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={formData.clausulas_afectadas.includes(clausula.id)}
                      onChange={() => handleClausulaToggle(clausula.id)}
                      className="mt-1 w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-text-light dark:text-text-dark">
                        {clausula.titulo}
                      </div>
                      {clausula.contenido && (
                        <div className="text-xs text-subtle-light dark:text-subtle-dark mt-1 line-clamp-2">
                          {htmlToPlainText(clausula.contenido)}
                        </div>
                      )}
                    </div>
                  </label>
                ))}
              </div>
              <p className="text-xs text-subtle-light dark:text-subtle-dark mt-2">
                Selecciona las cláusulas que se ven modificadas por esta adenda
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border-light dark:border-border-dark">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="px-4 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:bg-background-light dark:hover:bg-background-dark rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <span className="material-icons animate-spin text-sm">refresh</span>
                  Creando...
                </>
              ) : (
                <>
                  <span className="material-icons text-sm">post_add</span>
                  Crear Adenda
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddendaModal
