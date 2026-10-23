import React, { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import api from '@/services/api'
import tareaService from '@/services/tareaService'
import clausulaService from '@/services/clausulaService'
import { showNotification } from '@/store/slices/uiSlice'
import RichTextEditor from '@/components/ui/RichTextEditor'
import RiskLevelManagementModal from './RiskLevelManagementModal'
import ResponsablesMultiSelect from './ResponsablesMultiSelect'
import {
  AssessmentOptionGroup,
  IMPACTO_OPTIONS,
  PRIORIDAD_OPTIONS,
  PROBABILIDAD_OPTIONS,
  RiskMultiSelectField,
} from './RiskAssessmentFields'

const TaskCreateModal = ({ isOpen, onClose, onCreated }) => {
  const dispatch = useDispatch()
  const [loading, setLoading] = useState(false)
  const [areas, setAreas] = useState([])
  const [users, setUsers] = useState([])
  const [clausulas, setClausulas] = useState([])
  const [allTags, setAllTags] = useState([])
  const [nivelesRiesgo, setNivelesRiesgo] = useState([])
  const [showRiskModal, setShowRiskModal] = useState(false)
  
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    clausula: '',
    prioridad: 'MEDIA',
    impacto: 'MEDIO',
    probabilidad: 'MEDIA',
    fecha_vencimiento: '',
    area: '',
    responsables: [],
    niveles_riesgo: [],
    notas: '',
    tags: [],
    notificacion_config: {
      habilitada: true,
      intervalos_dias: [7, 1]  // Default: 7 and 1 days before
    }
  })

  const [newTag, setNewTag] = useState('')
  const [customInterval, setCustomInterval] = useState('')

  useEffect(() => {
    if (isOpen) {
      fetchAreas()
      fetchUsers()
      fetchClausulas()
      fetchTags()
      fetchNivelesRiesgo()
    }
  }, [isOpen])

  const fetchAreas = async () => {
    try {
      const response = await tareaService.getAreas()
      setAreas(response.data)
    } catch (error) {
      console.error('Error al cargar áreas:', error)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await api.get('/auth/users/')
      setUsers(response.data.results || response.data)
    } catch (error) {
      console.error('Error al cargar usuarios:', error)
    }
  }

  const fetchClausulas = async () => {
    try {
      const response = await clausulaService.getClausulas()
      setClausulas(response.data.results || response.data)
    } catch (error) {
      console.error('Error al cargar cláusulas:', error)
    }
  }

  const fetchTags = async () => {
    try {
      const response = await tareaService.getTags()
      setAllTags(response.data)
    } catch (error) {
      console.error('Error al cargar tags:', error)
    }
  }

  const fetchNivelesRiesgo = async () => {
    try {
      const response = await tareaService.getNivelesRiesgo()
      setNivelesRiesgo(response.data)
    } catch (error) {
      console.error('Error al cargar niveles de riesgo:', error)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleAssessmentChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleToggleRisk = (riskId) => {
    setFormData(prev => ({
      ...prev,
      niveles_riesgo: prev.niveles_riesgo.includes(riskId)
        ? prev.niveles_riesgo.filter(id => id !== riskId)
        : [...prev.niveles_riesgo, riskId]
    }))
  }

  const handleSelectRisk = (risk) => {
    // Add risk to selection if not already selected
    if (!formData.niveles_riesgo.includes(risk.id)) {
      setFormData(prev => ({
        ...prev,
        niveles_riesgo: [...prev.niveles_riesgo, risk.id]
      }))
    }
    setShowRiskModal(false)
  }

  const handleAddTag = (tag) => {
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }))
      setNewTag('')
    }
  }

  const handleRemoveTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const handleAddNewTag = () => {
    const trimmedTag = newTag.trim()
    if (trimmedTag) {
      handleAddTag(trimmedTag)
    }
  }

  const handleNotificationToggle = () => {
    setFormData(prev => ({
      ...prev,
      notificacion_config: {
        ...prev.notificacion_config,
        habilitada: !prev.notificacion_config.habilitada
      }
    }))
  }

  const handleIntervalToggle = (days) => {
    setFormData(prev => {
      const currentIntervals = prev.notificacion_config.intervalos_dias
      const newIntervals = currentIntervals.includes(days)
        ? currentIntervals.filter(d => d !== days)
        : [...currentIntervals, days].sort((a, b) => b - a) // Sort descending
      
      return {
        ...prev,
        notificacion_config: {
          ...prev.notificacion_config,
          intervalos_dias: newIntervals
        }
      }
    })
  }

  const handleAddCustomInterval = () => {
    const interval = parseInt(customInterval)
    if (!isNaN(interval) && interval >= 0 && interval <= 365) {
      if (!formData.notificacion_config.intervalos_dias.includes(interval)) {
        setFormData(prev => ({
          ...prev,
          notificacion_config: {
            ...prev.notificacion_config,
            intervalos_dias: [...prev.notificacion_config.intervalos_dias, interval].sort((a, b) => b - a)
          }
        }))
        setCustomInterval('')
      } else {
        dispatch(showNotification({ 
          message: 'Este intervalo ya está agregado', 
          type: 'warning' 
        }))
      }
    } else {
      dispatch(showNotification({ 
        message: 'Ingrese un número válido entre 0 y 365', 
        type: 'error' 
        }))
    }
  }

  const handleRemoveInterval = (days) => {
    setFormData(prev => ({
      ...prev,
      notificacion_config: {
        ...prev.notificacion_config,
        intervalos_dias: prev.notificacion_config.intervalos_dias.filter(d => d !== days)
      }
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validaciones
    if (!formData.titulo) {
      dispatch(showNotification({ 
        message: 'El título es obligatorio', 
        type: 'error' 
      }))
      return
    }

    if (!formData.area) {
      dispatch(showNotification({ 
        message: 'El área es obligatoria', 
        type: 'error' 
      }))
      return
    }

    if (!formData.fecha_vencimiento) {
      dispatch(showNotification({ 
        message: 'La fecha de vencimiento es obligatoria', 
        type: 'error' 
      }))
      return
    }

    try {
      setLoading(true)
      
      // Preparar datos para enviar
      const dataToSend = {
        ...formData,
        area: Number(formData.area),
        clausula: formData.clausula ? Number(formData.clausula) : null
      }

      await tareaService.createTarea(dataToSend)
      
      dispatch(showNotification({ 
        message: 'Tarea creada exitosamente', 
        type: 'success' 
      }))
      
      // Reset form
      setFormData({
        titulo: '',
        descripcion: '',
        clausula: '',
        prioridad: 'MEDIA',
        impacto: 'MEDIO',
        probabilidad: 'MEDIA',
        fecha_vencimiento: '',
        area: '',
        responsables: [],
        niveles_riesgo: [],
        notas: '',
        tags: [],
        notificacion_config: {
          habilitada: true,
          intervalos_dias: [7, 1]
        }
      })
      setCustomInterval('')
      
      onCreated && onCreated()
      onClose()
    } catch (error) {
      const errorMsg = error.response?.data?.area?.[0] || 
                       error.response?.data?.detail || 
                       'Error al crear la tarea'
      dispatch(showNotification({ 
        message: errorMsg, 
        type: 'error' 
      }))
    } finally {
      setLoading(false)
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
      <div className="relative w-full max-w-2xl lg:max-w-3xl bg-white dark:bg-gray-800 rounded-lg shadow-2xl flex flex-col max-h-[95vh] sm:max-h-[90vh]">
        {/* Header - Fixed */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
            Nueva Obligación
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
            type="button"
          >
            <span className="material-icons">close</span>
          </button>
        </div>

        {/* Body - Scrollable */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
          <div className="space-y-4">
            {/* Título */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Título *
              </label>
              <input
                type="text"
                name="titulo"
                value={formData.titulo}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Ingrese el título de la obligación"
              />
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Descripción
              </label>
              <RichTextEditor
                value={formData.descripcion}
                onChange={(html) => setFormData((prev) => ({ ...prev, descripcion: html }))}
                placeholder="Descripción detallada de la obligación"
                minHeight="6rem"
              />
            </div>

            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-900/30 p-4 space-y-4">
              <div className="flex items-center gap-2">
                <span className="material-icons text-primary text-base">balance</span>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Evaluación y Riesgos
                </h3>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <AssessmentOptionGroup
                    label="Prioridad"
                    name="prioridad"
                    value={formData.prioridad}
                    options={PRIORIDAD_OPTIONS}
                    onChange={handleAssessmentChange}
                    helperText="Urgencia con que debe atenderse la obligación contractual."
                  />

                  <AssessmentOptionGroup
                    label="Impacto en el negocio"
                    name="impacto"
                    value={formData.impacto}
                    options={IMPACTO_OPTIONS}
                    onChange={handleAssessmentChange}
                    helperText="Severidad de las consecuencias si el riesgo se materializa."
                  />

                  <AssessmentOptionGroup
                    label="Probabilidad de ocurrencia"
                    name="probabilidad"
                    value={formData.probabilidad}
                    options={PROBABILIDAD_OPTIONS}
                    onChange={handleAssessmentChange}
                    helperText="Qué tan probable es el evento según controles y antecedentes."
                  />
                </div>

                <RiskMultiSelectField
                  levels={nivelesRiesgo}
                  selectedIds={formData.niveles_riesgo}
                  onToggle={handleToggleRisk}
                  onManage={() => setShowRiskModal(true)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Área */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Área *
                </label>
                <select
                  name="area"
                  value={formData.area}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Seleccione un área</option>
                  {areas.map(area => (
                    <option key={area.id} value={area.id}>
                      {area.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Fecha de Vencimiento */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Fecha de Vencimiento *
                </label>
                <input
                  type="date"
                  name="fecha_vencimiento"
                  value={formData.fecha_vencimiento}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              {/* Cláusula */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cláusula Relacionada
                </label>
                <select
                  name="clausula"
                  value={formData.clausula}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Sin cláusula</option>
                  {clausulas.map(clausula => (
                    <option key={clausula.id} value={clausula.id}>
                      {clausula.titulo}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Responsables */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Responsables
              </label>
              <ResponsablesMultiSelect
                users={users}
                value={formData.responsables}
                onChange={(selected) => setFormData((prev) => ({ ...prev, responsables: selected }))}
                placeholder="Seleccionar responsables"
              />
            </div>

            {/* Objetos Regulados (campo interno: tags/etiquetas) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Objetos Regulados
              </label>
              
              {/* Tags seleccionados */}
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {formData.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 sm:px-3 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 rounded-full text-xs sm:text-sm font-medium flex items-center gap-1 sm:gap-2"
                    >
                      <span className="material-icons text-xs sm:text-sm">label</span>
                      <span className="max-w-[100px] truncate">{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-purple-900 dark:hover:text-purple-100"
                      >
                        <span className="material-icons text-xs sm:text-sm">close</span>
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Selector de tags existentes */}
              {allTags.length > 0 && (
                <div className="mb-3">
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                    Seleccionar de existentes:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {allTags
                      .filter(tag => !formData.tags.includes(tag))
                      .map((tag, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleAddTag(tag)}
                          className="px-2 sm:px-3 py-1 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded text-xs sm:text-sm hover:bg-purple-100 hover:text-purple-800 dark:hover:bg-purple-900/30 dark:hover:text-purple-300 transition-colors"
                        >
                          + {tag}
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {/* Input para nuevo objeto regulado */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddNewTag()
                    }
                  }}
                  placeholder="Nuevo objeto regulado"
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={handleAddNewTag}
                  className="px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-1"
                >
                  <span className="material-icons text-sm">add</span>
                  <span className="hidden sm:inline text-sm">Agregar</span>
                </button>
              </div>
            </div>

            {/* Notas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notas
              </label>
              <textarea
                name="notas"
                value={formData.notas}
                onChange={handleChange}
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Notas adicionales"
              />
            </div>

            {/* Configuración de Notificaciones */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900/30">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="material-icons text-primary dark:text-primary-light">notifications_active</span>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Notificaciones Programadas
                  </h3>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.notificacion_config.habilitada}
                    onChange={handleNotificationToggle}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 dark:peer-focus:ring-primary/50 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                  <span className="ml-2 text-xs text-gray-600 dark:text-gray-400">
                    {formData.notificacion_config.habilitada ? 'Habilitado' : 'Deshabilitado'}
                  </span>
                </label>
              </div>

              {formData.notificacion_config.habilitada && (
                <>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                    Recibirás notificaciones automáticas los días seleccionados antes del vencimiento
                  </p>

                  {/* Intervalos comunes */}
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Intervalos comunes:
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[30, 14, 7, 3, 1].map(days => (
                        <button
                          key={days}
                          type="button"
                          onClick={() => handleIntervalToggle(days)}
                          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                            formData.notificacion_config.intervalos_dias.includes(days)
                              ? 'bg-primary text-white'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                          }`}
                        >
                          {days} día{days !== 1 ? 's' : ''}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Intervalo personalizado */}
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Intervalo personalizado:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={customInterval}
                        onChange={(e) => setCustomInterval(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleAddCustomInterval()
                          }
                        }}
                        min="0"
                        max="365"
                        placeholder="Días antes"
                        className="flex-1 px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomInterval}
                        className="px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-1 text-xs"
                      >
                        <span className="material-icons text-xs">add</span>
                        Agregar
                      </button>
                    </div>
                  </div>

                  {/* Intervalos seleccionados */}
                  {formData.notificacion_config.intervalos_dias.length > 0 && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Intervalos activos ({formData.notificacion_config.intervalos_dias.length}):
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {formData.notificacion_config.intervalos_dias.map(days => (
                          <span
                            key={days}
                            className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded text-xs font-medium flex items-center gap-1"
                          >
                            <span className="material-icons text-xs">schedule</span>
                            {days} día{days !== 1 ? 's' : ''} antes
                            <button
                              type="button"
                              onClick={() => handleRemoveInterval(days)}
                              className="hover:text-blue-900 dark:hover:text-blue-100"
                            >
                              <span className="material-icons text-xs">close</span>
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer - Fixed */}
        <div className="flex items-center justify-end gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-3 sm:px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            type="button"
            className="px-3 sm:px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1 sm:gap-2"
          >
            {loading ? (
              <>
                <span className="material-icons animate-spin text-sm">refresh</span>
                <span className="hidden sm:inline">Creando...</span>
              </>
            ) : (
              <>
                <span className="material-icons text-sm">check</span>
                <span>Crear</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Risk Level Management Modal */}
      <RiskLevelManagementModal
        isOpen={showRiskModal}
        onClose={() => {
          setShowRiskModal(false)
          fetchNivelesRiesgo() // Refresh the list
        }}
        onSelect={handleSelectRisk}
      />
    </div>
  )
}

export default TaskCreateModal
