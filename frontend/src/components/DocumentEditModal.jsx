import React, { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import api from '@/services/api'
import { showNotification } from '@/store/slices/uiSlice'

const DocumentEditModal = ({ isOpen, onClose, document, onUpdateSuccess }) => {
  const dispatch = useDispatch()
  const [updating, setUpdating] = useState(false)
  const [formData, setFormData] = useState({
    titulo: '',
    tipo: 'CONTRATO',
    fecha_vencimiento: '',
    etiquetas: '',
    estado: 'ACTIVO'
  })

  useEffect(() => {
    if (document) {
      setFormData({
        titulo: document.titulo || '',
        tipo: document.tipo || 'CONTRATO',
        fecha_vencimiento: document.fecha_vencimiento || '',
        etiquetas: Array.isArray(document.etiquetas) ? document.etiquetas.join(', ') : '',
        estado: document.estado || 'ACTIVO'
      })
    }
  }, [document])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setUpdating(true)

    try {
      const data = {
        titulo: formData.titulo,
        tipo: formData.tipo,
        estado: formData.estado
      }
      
      if (formData.fecha_vencimiento) {
        data.fecha_vencimiento = formData.fecha_vencimiento
      }
      
      if (formData.etiquetas) {
        const tags = formData.etiquetas.split(',').map(tag => tag.trim()).filter(tag => tag)
        data.etiquetas = tags
      }

      const response = await api.put(`/documentos/${document.id}/`, data)

      dispatch(showNotification({ 
        message: 'Document updated successfully!', 
        type: 'success' 
      }))

      onUpdateSuccess(response.data)
      onClose()
    } catch (error) {
      const errorMessage = error.response?.data?.detail || error.response?.data?.titulo?.[0] || 'Error updating document'
      dispatch(showNotification({ 
        message: errorMessage, 
        type: 'error' 
      }))
    } finally {
      setUpdating(false)
    }
  }

  if (!isOpen || !document) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-light dark:bg-surface-dark rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-light dark:border-border-dark">
          <h2 className="text-xl font-bold text-text-light dark:text-text-dark flex items-center gap-2">
            <span className="material-icons text-primary">edit</span>
            Editar Documento
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
          {/* Title */}
          <div>
            <label htmlFor="titulo" className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              Título del Documento *
            </label>
            <input
              type="text"
              id="titulo"
              name="titulo"
              value={formData.titulo}
              onChange={handleChange}
              required
              placeholder="Ingrese el título del documento"
              className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:ring-primary focus:border-primary text-text-light dark:text-text-dark"
            />
          </div>

          {/* Type */}
          <div>
            <label htmlFor="tipo" className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              Tipo de Documento *
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

          {/* Status */}
          <div>
            <label htmlFor="estado" className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              Estado *
            </label>
            <select
              id="estado"
              name="estado"
              value={formData.estado}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:ring-primary focus:border-primary text-text-light dark:text-text-dark"
            >
              <option value="BORRADOR">Borrador</option>
              <option value="ACTIVO">Activo</option>
              <option value="VENCIDO">Vencido</option>
              <option value="ARCHIVADO">Archived</option>
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

          {/* File Info */}
          <div className="bg-background-light dark:bg-background-dark p-4 rounded-lg border border-border-light dark:border-border-dark">
            <p className="text-sm font-medium text-text-light dark:text-text-dark mb-2">
              Archivo Actual
            </p>
            <div className="flex items-center gap-2 text-sm text-subtle-light dark:text-subtle-dark">
              <span className="material-icons text-base">description</span>
              <span>{document.filename}</span>
              <span className="text-xs">
                ({(document.file_size / 1024).toFixed(2)} KB)
              </span>
            </div>
            <p className="text-xs text-subtle-light dark:text-subtle-dark mt-2">
              Nota: Para cambiar el archivo, por favor elimine y vuelva a subir el documento
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border-light dark:border-border-dark">
            <button
              type="button"
              onClick={onClose}
              disabled={updating}
              className="px-4 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:bg-background-light dark:hover:bg-background-dark rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={updating}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updating ? (
                <>
                  <span className="material-icons animate-spin text-sm">refresh</span>
                  Actualizando...
                </>
              ) : (
                <>
                  <span className="material-icons text-sm">save</span>
                  Actualizar Documento
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default DocumentEditModal
