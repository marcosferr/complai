import React, { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import tareaService from '@/services/tareaService'
import { showNotification } from '@/store/slices/uiSlice'

const RiskLevelManagementModal = ({ isOpen, onClose, onSelect }) => {
  const dispatch = useDispatch()
  const [loading, setLoading] = useState(false)
  const [riskLevels, setRiskLevels] = useState([])
  const [editingRisk, setEditingRisk] = useState(null)
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: ''
  })

  useEffect(() => {
    if (isOpen) {
      fetchRiskLevels()
    }
  }, [isOpen])

  const fetchRiskLevels = async () => {
    try {
      setLoading(true)
      const response = await tareaService.getNivelesRiesgo()
      setRiskLevels(response.data)
    } catch (error) {
      console.error('Error al cargar niveles de riesgo:', error)
      dispatch(showNotification({
        message: 'Error al cargar niveles de riesgo',
        type: 'error'
      }))
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.nombre.trim()) {
      dispatch(showNotification({
        message: 'El nombre es obligatorio',
        type: 'error'
      }))
      return
    }

    try {
      setLoading(true)

      if (editingRisk) {
        // Update existing risk level
        await tareaService.updateNivelRiesgo(editingRisk.id, formData)
        dispatch(showNotification({
          message: 'Nivel de riesgo actualizado exitosamente',
          type: 'success'
        }))
      } else {
        // Create new risk level
        await tareaService.createNivelRiesgo(formData)
        dispatch(showNotification({
          message: 'Nivel de riesgo creado exitosamente',
          type: 'success'
        }))
      }

      // Reset form
      setFormData({ nombre: '', descripcion: '' })
      setEditingRisk(null)

      // Refresh list
      await fetchRiskLevels()
    } catch (error) {
      const errorMsg = error.response?.data?.nombre?.[0] ||
        error.response?.data?.detail ||
        'Error al guardar el nivel de riesgo'
      dispatch(showNotification({
        message: errorMsg,
        type: 'error'
      }))
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (risk) => {
    setEditingRisk(risk)
    setFormData({
      nombre: risk.nombre,
      descripcion: risk.descripcion
    })
  }

  const handleCancelEdit = () => {
    setEditingRisk(null)
    setFormData({ nombre: '', descripcion: '' })
  }

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de que desea eliminar este nivel de riesgo?')) {
      return
    }

    try {
      setLoading(true)
      await tareaService.deleteNivelRiesgo(id)
      dispatch(showNotification({
        message: 'Nivel de riesgo eliminado exitosamente',
        type: 'success'
      }))
      await fetchRiskLevels()
    } catch (error) {
      dispatch(showNotification({
        message: 'Error al eliminar el nivel de riesgo',
        type: 'error'
      }))
    } finally {
      setLoading(false)
    }
  }

  const handleSelectRisk = (risk) => {
    if (onSelect) {
      onSelect(risk)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 dark:bg-black/70 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-3xl bg-white dark:bg-gray-800 rounded-lg shadow-2xl flex flex-col max-h-[95vh] sm:max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
            Gestionar Niveles de Riesgo
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
            type="button"
          >
            <span className="material-icons">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
          {/* Form to add/edit risk level */}
          <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
              {editingRisk ? 'Editar Nivel de Riesgo' : 'Nuevo Nivel de Riesgo'}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Ej: Riesgo Legal"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Descripción
                </label>
                <textarea
                  name="descripcion"
                  value={formData.descripcion}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Descripción del nivel de riesgo (aparecerá como tooltip)"
                />
              </div>

              <div className="flex gap-2">
                {editingRisk && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="material-icons animate-spin text-sm">refresh</span>
                      <span>Procesando...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-icons text-sm">
                        {editingRisk ? 'save' : 'add'}
                      </span>
                      <span>{editingRisk ? 'Actualizar' : 'Agregar'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* List of risk levels */}
          <div>
            <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
              Niveles de Riesgo Disponibles
            </h3>

            {loading && riskLevels.length === 0 ? (
              <div className="text-center py-8">
                <span className="material-icons animate-spin text-4xl text-gray-400">refresh</span>
                <p className="text-gray-500 dark:text-gray-400 mt-2">Cargando...</p>
              </div>
            ) : riskLevels.length === 0 ? (
              <div className="text-center py-8">
                <span className="material-icons text-4xl text-gray-400">info</span>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                  No hay niveles de riesgo disponibles
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {riskLevels.map((risk) => (
                  <div
                    key={risk.id}
                    className="p-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {risk.nombre}
                        </h4>
                        {risk.descripcion && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {risk.descripcion}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-1 ml-2">
                        {onSelect && (
                          <button
                            onClick={() => handleSelectRisk(risk)}
                            className="p-1 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                            title="Seleccionar"
                          >
                            <span className="material-icons text-sm">add_circle</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(risk)}
                          className="p-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                          title="Editar"
                        >
                          <span className="material-icons text-sm">edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(risk.id)}
                          className="p-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          title="Eliminar"
                        >
                          <span className="material-icons text-sm">delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

export default RiskLevelManagementModal
