import React, { useState } from 'react'
import { useDispatch } from 'react-redux'
import api from '@/services/api'
import { showNotification } from '@/store/slices/uiSlice'

const DocumentUploadModal = ({ isOpen, onClose, onUploadSuccess, availableDocuments = [] }) => {
  const dispatch = useDispatch()
  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState({
    titulo: '',
    tipo: 'CONTRATO',
    archivo: null,
    fecha_vencimiento: '',
    etiquetas: ''
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.archivo) {
      dispatch(showNotification({ 
        message: 'Please select a file to upload', 
        type: 'error' 
      }))
      return
    }

    setUploading(true)

    try {
      const data = new FormData()
      data.append('titulo', formData.titulo)
      data.append('tipo', formData.tipo)
      data.append('archivo', formData.archivo)
      
      if (formData.fecha_vencimiento) {
        data.append('fecha_vencimiento', formData.fecha_vencimiento)
      }
      
      if (formData.etiquetas) {
        const tags = formData.etiquetas.split(',').map(tag => tag.trim())
        data.append('etiquetas', JSON.stringify(tags))
      }

      const response = await api.post('/documentos/upload/', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      dispatch(showNotification({ 
        message: 'Document uploaded successfully! Processing...', 
        type: 'success' 
      }))

      // Reset form
      setFormData({
        titulo: '',
        tipo: 'CONTRATO',
        archivo: null,
        fecha_vencimiento: '',
        etiquetas: ''
      })

      onUploadSuccess(response.data)
      onClose()
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Error uploading document'
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
      <div className="bg-surface-light dark:bg-surface-dark rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-light dark:border-border-dark">
          <h2 className="text-xl font-bold text-text-light dark:text-text-dark flex items-center gap-2">
            <span className="material-icons text-primary">upload_file</span>
            Upload Legal Document
          </h2>
          <button
            onClick={onClose}
            className="text-subtle-light dark:text-subtle-dark hover:text-text-light dark:hover:text-text-dark"
          >
            <span className="material-icons">close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* File Upload Area */}
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              Document File *
            </label>
            <div
              className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
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
                  <span className="material-icons text-5xl text-subtle-light dark:text-subtle-dark mb-2">
                    cloud_upload
                  </span>
                  <p className="text-text-light dark:text-text-dark mb-2">
                    Drag and drop your file here, or
                  </p>
                  <label
                    htmlFor="file-upload"
                    className="inline-block bg-primary text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-primary/90 transition-colors font-medium"
                  >
                    Browse Files
                  </label>
                  <p className="text-xs text-subtle-light dark:text-subtle-dark mt-2">
                    Supported formats: PDF, DOC, DOCX, TXT
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Title */}
          <div>
            <label htmlFor="titulo" className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              Document Title *
            </label>
            <input
              type="text"
              id="titulo"
              name="titulo"
              value={formData.titulo}
              onChange={handleChange}
              required
              placeholder="Enter document title"
              className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:ring-primary focus:border-primary text-text-light dark:text-text-dark"
            />
          </div>

          {/* Type */}
          <div>
            <label htmlFor="tipo" className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              Document Type *
            </label>
            <select
              id="tipo"
              name="tipo"
              value={formData.tipo}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:ring-primary focus:border-primary text-text-light dark:text-text-dark"
            >
              <option value="CONTRATO">Contrato</option>
              <option value="PBC">Pliego de Bases y Condiciones PBC</option>
              <option value="LEYES_REGULACIONES">Leyes y Regulaciones</option>
              <option value="RFP_PROPUESTA">RFP/Propuesta</option>
              <option value="POLITICAS">Políticas</option>
              <option value="TERMINOS_CONDICIONES">Términos y Condiciones</option>
              <option value="ACUERDO">Acuerdo</option>
            </select>
          </div>

          {/* Expiration Date */}
          <div>
            <label htmlFor="fecha_vencimiento" className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              Expiration Date (Optional)
            </label>
            <input
              type="date"
              id="fecha_vencimiento"
              name="fecha_vencimiento"
              value={formData.fecha_vencimiento}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:ring-primary focus:border-primary text-text-light dark:text-text-dark"
            />
          </div>

          {/* Objetos Regulados (campo interno: etiquetas) */}
          <div>
            <label htmlFor="etiquetas" className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              Objetos Regulados (Opcional)
            </label>
            <input
              type="text"
              id="etiquetas"
              name="etiquetas"
              value={formData.etiquetas}
              onChange={handleChange}
              placeholder="Ingrese objetos regulados separados por comas"
              className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:ring-primary focus:border-primary text-text-light dark:text-text-dark"
            />
            <p className="text-xs text-subtle-light dark:text-subtle-dark mt-1">
              Ejemplo: MSA, Plantilla, 2024
            </p>
          </div>

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
                  Subiendo...
                </>
              ) : (
                <>
                  <span className="material-icons text-sm">upload</span>
                  Subir Documento
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default DocumentUploadModal
