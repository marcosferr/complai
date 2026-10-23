import React, { useState } from 'react'
import { useDispatch } from 'react-redux'
import { showNotification } from '@/store/slices/uiSlice'
import auditService from '@/services/auditService'

const AuditModal = ({ isOpen, onClose, onSuccess, audit = null }) => {
  const dispatch = useDispatch()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    titulo: audit?.titulo || '',
    descripcion: audit?.descripcion || '',
    fecha_programada: audit?.fecha_programada || '',
    fecha_inicio: audit?.fecha_inicio || '',
    fecha_finalizacion: audit?.fecha_finalizacion || '',
    estado: audit?.estado || 'PROGRAMADA',
    hallazgos: audit?.hallazgos || '',
    recomendaciones: audit?.recomendaciones || '',
    conclusion: audit?.conclusion || ''
  })

  React.useEffect(() => {
    if (isOpen) {
      if (audit) {
        setFormData({
          titulo: audit.titulo || '',
          descripcion: audit.descripcion || '',
          fecha_programada: audit.fecha_programada || '',
          fecha_inicio: audit.fecha_inicio || '',
          fecha_finalizacion: audit.fecha_finalizacion || '',
          estado: audit.estado || 'PROGRAMADA',
          hallazgos: audit.hallazgos || '',
          recomendaciones: audit.recomendaciones || '',
          conclusion: audit.conclusion || ''
        })
      } else {
        setFormData({
          titulo: '',
          descripcion: '',
          fecha_programada: '',
          fecha_inicio: '',
          fecha_finalizacion: '',
          estado: 'PROGRAMADA',
          hallazgos: '',
          recomendaciones: '',
          conclusion: ''
        })
      }
    }
  }, [audit, isOpen])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.titulo.trim()) {
      dispatch(showNotification({
        message: 'El título es requerido',
        type: 'error'
      }))
      return
    }

    if (!formData.fecha_programada) {
      dispatch(showNotification({
        message: 'La fecha programada es requerida',
        type: 'error'
      }))
      return
    }

    setLoading(true)

    try {
      const payload = {
        ...formData,
        fecha_inicio: formData.fecha_inicio || null,
        fecha_finalizacion: formData.fecha_finalizacion || null
      }

      let result
      if (audit) {
        result = await auditService.updateAudit(audit.id, payload)
      } else {
        result = await auditService.createAudit(payload)
      }
      
      onSuccess(result)
      handleClose()
    } catch (error) {
      dispatch(showNotification({
        message: error.response?.data?.error || 'Error al guardar la auditoría',
        type: 'error'
      }))
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      titulo: '',
      descripcion: '',
      fecha_programada: '',
      fecha_inicio: '',
      fecha_finalizacion: '',
      estado: 'PROGRAMADA',
      hallazgos: '',
      recomendaciones: '',
      conclusion: ''
    })
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-surface-light dark:bg-surface-dark rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-surface-light dark:bg-surface-dark border-b border-border-light dark:border-border-dark p-6 z-10">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-text-light dark:text-text-dark">
              {audit ? 'Editar Auditoría' : 'Nueva Auditoría'}
            </h2>
            <button
              onClick={handleClose}
              className="text-subtle-light dark:text-subtle-dark hover:text-text-light dark:hover:text-text-dark"
            >
              <span className="material-icons">close</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Título */}
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              Título *
            </label>
            <input
              type="text"
              name="titulo"
              value={formData.titulo}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-text-light dark:text-text-dark"
              placeholder="Ej: Auditoría de Seguridad 2024"
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              Descripción
            </label>
            <textarea
              name="descripcion"
              value={formData.descripcion}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-text-light dark:text-text-dark"
              placeholder="Describe el objetivo de la auditoría..."
            />
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                Fecha Programada *
              </label>
              <input
                type="date"
                name="fecha_programada"
                value={formData.fecha_programada}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-text-light dark:text-text-dark"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                Fecha Inicio
              </label>
              <input
                type="date"
                name="fecha_inicio"
                value={formData.fecha_inicio}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-text-light dark:text-text-dark"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                Fecha Finalización
              </label>
              <input
                type="date"
                name="fecha_finalizacion"
                value={formData.fecha_finalizacion}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-text-light dark:text-text-dark"
              />
            </div>
          </div>

          {/* Estado */}
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              Estado
            </label>
            <select
              name="estado"
              value={formData.estado}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-text-light dark:text-text-dark"
            >
              <option value="PROGRAMADA">Programada</option>
              <option value="EN_PROGRESO">En Progreso</option>
              <option value="COMPLETADA">Completada</option>
              <option value="CANCELADA">Cancelada</option>
            </select>
          </div>

          {/* Hallazgos */}
          {formData.estado !== 'PROGRAMADA' && (
            <>
              <div>
                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                  Hallazgos
                </label>
                <textarea
                  name="hallazgos"
                  value={formData.hallazgos}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-text-light dark:text-text-dark"
                  placeholder="Describe los hallazgos de la auditoría..."
                />
              </div>

              {/* Recomendaciones */}
              <div>
                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                  Recomendaciones
                </label>
                <textarea
                  name="recomendaciones"
                  value={formData.recomendaciones}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-text-light dark:text-text-dark"
                  placeholder="Proporciona recomendaciones basadas en los hallazgos..."
                />
              </div>

              {/* Conclusión */}
              {formData.estado === 'COMPLETADA' && (
                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                    Conclusión
                  </label>
                  <textarea
                    name="conclusion"
                    value={formData.conclusion}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-text-light dark:text-text-dark"
                    placeholder="Conclusión final de la auditoría..."
                  />
                </div>
              )}
            </>
          )}

          {/* Buttons */}
          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-subtle-light dark:text-subtle-dark hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading && (
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
              )}
              {audit ? 'Actualizar' : 'Crear'} Auditoría
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AuditModal
