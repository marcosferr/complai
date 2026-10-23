import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { createTareasMultiples } from '@/store/slices/tareasSlice'
import { fetchClausulasByDocumento } from '@/store/slices/clausulasSlice'
import tareaService from '@/services/tareaService'
import clausulaService from '@/services/clausulaService'
import api from '@/services/api'
import { useRolePermissions } from '@/hooks/useRolePermissions'
import { getClauseTerm } from '@/lib/utils'
import { truncateRich } from '@/lib/richText'
import RichTextContent from '@/components/ui/RichTextContent'
import RichTextEditor from '@/components/ui/RichTextEditor'
import RiskLevelManagementModal from '@/components/tareas/RiskLevelManagementModal'
import ResponsablesMultiSelect from '@/components/tareas/ResponsablesMultiSelect'
import {
  AssessmentOptionGroup,
  getOptionMeta,
  IMPACTO_OPTIONS,
  PRIORIDAD_OPTIONS,
  PROBABILIDAD_OPTIONS,
  RiskMultiSelectField,
} from '@/components/tareas/RiskAssessmentFields'

export default function TareaModal({ clausula, documento, onClose }) {
  const dispatch = useDispatch()
  const { user } = useSelector((state) => state.auth)
  const { permissions } = useRolePermissions()

  // Get the appropriate term based on document type
  const clauseTerm = getClauseTerm(documento?.tipo)
  
  // List of obligations to create
  const [obligaciones, setObligaciones] = useState([])
  
  // Current form data for a single obligation
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [areas, setAreas] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [allTags, setAllTags] = useState([])
  const [newTag, setNewTag] = useState('')
  const [customInterval, setCustomInterval] = useState('')
  const [nivelesRiesgo, setNivelesRiesgo] = useState([])
  const [showRiskModal, setShowRiskModal] = useState(false)
  const [showClausulaContent, setShowClausulaContent] = useState(false)
  const [clausulaDetalle, setClausulaDetalle] = useState(null)
  const [loadingClausula, setLoadingClausula] = useState(false)

  // Auto-fill deadline with 30 days from now
  useEffect(() => {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 30)
    setFormData((prev) => ({
      ...prev,
      fecha_vencimiento: futureDate.toISOString().split('T')[0],
    }))
  }, [])

  useEffect(() => {
    const cargarAreasYUsuarios = async () => {
      try {
        const [areasResponse, usuariosResponse, tagsResponse, nivelesRiesgoResponse] = await Promise.all([
          tareaService.getAreas(),
          api.get('/auth/users/'),
          tareaService.getTags(),
          tareaService.getNivelesRiesgo(),
        ])
        setAreas(areasResponse.data)
        setUsuarios(usuariosResponse.data.results || usuariosResponse.data)
        setAllTags(tagsResponse.data)
        setNivelesRiesgo(nivelesRiesgoResponse.data)
      } catch (err) {
        console.error('Error al cargar datos auxiliares de tareas:', err)
      }
    }

    cargarAreasYUsuarios()
  }, [])

  const loadClausulaDetalle = async () => {
    if (!clausula?.id) return
    
    setLoadingClausula(true)
    try {
      const response = await clausulaService.getClausula(clausula.id)
      setClausulaDetalle(response.data)
    } catch (err) {
      console.error('Error al cargar detalle de cláusula:', err)
    } finally {
      setLoadingClausula(false)
    }
  }

  const toggleClausulaContent = () => {
    if (!showClausulaContent && !clausulaDetalle) {
      loadClausulaDetalle()
    }
    setShowClausulaContent(!showClausulaContent)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleAssessmentChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleToggleRisk = (riskId) => {
    setFormData((prev) => ({
      ...prev,
      niveles_riesgo: prev.niveles_riesgo.includes(riskId)
        ? prev.niveles_riesgo.filter((id) => id !== riskId)
        : [...prev.niveles_riesgo, riskId],
    }))
  }

  const handleSelectRisk = (risk) => {
    // Add risk to selection if not already selected
    if (!formData.niveles_riesgo.includes(risk.id)) {
      setFormData((prev) => ({
        ...prev,
        niveles_riesgo: [...prev.niveles_riesgo, risk.id],
      }))
    }
    setShowRiskModal(false)
  }

  const fetchNivelesRiesgo = async () => {
    try {
      const response = await tareaService.getNivelesRiesgo()
      setNivelesRiesgo(response.data)
    } catch (error) {
      console.error('Error al cargar niveles de riesgo:', error)
    }
  }

  const handleAddTag = (tag) => {
    if (tag && !formData.tags.includes(tag)) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, tag],
      }))
      setNewTag('')
    }
  }

  const handleRemoveTag = (tagToRemove) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }))
  }

  const handleAddNewTag = () => {
    const trimmedTag = newTag.trim()
    if (trimmedTag) {
      handleAddTag(trimmedTag)
    }
  }

  const handleAddObligacion = () => {
    // Validate required fields
    if (!formData.titulo.trim()) {
      setError('El título es requerido')
      return
    }
    if (!formData.descripcion.trim()) {
      setError('La descripción es requerida')
      return
    }
    if (!formData.fecha_vencimiento) {
      setError('La fecha de vencimiento es requerida')
      return
    }
    if (permissions.areaRequiredInTasks && !formData.area) {
      setError('El área es requerida para tu rol')
      return
    }

    // Add to list
    setObligaciones([...obligaciones, { ...formData }])
    
    // Reset form but keep shared context and assessment fields for faster batch entry
    setFormData({
      titulo: '',
      descripcion: '',
      prioridad: formData.prioridad,
      impacto: formData.impacto,
      probabilidad: formData.probabilidad,
      fecha_vencimiento: formData.fecha_vencimiento,
      area: formData.area,
      responsables: formData.responsables,
      niveles_riesgo: formData.niveles_riesgo,
      notas: '',
      tags: formData.tags,
      notificacion_config: formData.notificacion_config,
    })
    
    setError(null)
  }

  const handleRemoveObligacion = (index) => {
    setObligaciones(obligaciones.filter((_, i) => i !== index))
  }

  const handleEditObligacion = (index) => {
    setFormData(obligaciones[index])
    setObligaciones(obligaciones.filter((_, i) => i !== index))
  }
  const handleNotificationToggle = () => {
    setFormData((prev) => ({
      ...prev,
      notificacion_config: {
        ...prev.notificacion_config,
        habilitada: !prev.notificacion_config.habilitada,
      },
    }))
  }

  const handleIntervalToggle = (days) => {
    setFormData((prev) => {
      const currentIntervals = prev.notificacion_config.intervalos_dias
      const newIntervals = currentIntervals.includes(days)
        ? currentIntervals.filter((d) => d !== days)
        : [...currentIntervals, days].sort((a, b) => b - a) // Sort descending

      return {
        ...prev,
        notificacion_config: {
          ...prev.notificacion_config,
          intervalos_dias: newIntervals,
        },
      }
    })
  }

  const handleAddCustomInterval = () => {
    const interval = parseInt(customInterval)
    if (!isNaN(interval) && interval >= 0 && interval <= 365) {
      if (!formData.notificacion_config.intervalos_dias.includes(interval)) {
        setFormData((prev) => ({
          ...prev,
          notificacion_config: {
            ...prev.notificacion_config,
            intervalos_dias: [...prev.notificacion_config.intervalos_dias, interval].sort((a, b) => b - a),
          },
        }))
        setCustomInterval('')
      }
    }
  }

  const handleRemoveInterval = (days) => {
    setFormData((prev) => ({
      ...prev,
      notificacion_config: {
        ...prev.notificacion_config,
        intervalos_dias: prev.notificacion_config.intervalos_dias.filter((d) => d !== days),
      },
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Check if we have any obligations to create
      let tareasToCreate = [...obligaciones]
      
      // If there's data in the form, validate and add it
      if (formData.titulo.trim() || formData.descripcion.trim()) {
        if (!formData.titulo.trim()) {
          setError('El título es requerido')
          setLoading(false)
          return
        }
        if (!formData.descripcion.trim()) {
          setError('La descripción es requerida')
          setLoading(false)
          return
        }
        if (!formData.fecha_vencimiento) {
          setError('La fecha de vencimiento es requerida')
          setLoading(false)
          return
        }
        if (permissions.areaRequiredInTasks && !formData.area) {
          setError('El área es requerida para tu rol')
          setLoading(false)
          return
        }
        tareasToCreate.push({ ...formData })
      }

      if (tareasToCreate.length === 0) {
        setError('Debes agregar al menos una obligación')
        setLoading(false)
        return
      }

      // Prepare all tasks with clausula reference
      const tareasData = tareasToCreate.map(tarea => ({
        ...tarea,
        clausula: clausula.id,
        area: tarea.area ? Number(tarea.area) : null,
        responsables: tarea.responsables,
      }))

      // Create all tasks at once
      await dispatch(createTareasMultiples(tareasData)).unwrap()

      // Refresh clausulas to update task count
      dispatch(fetchClausulasByDocumento(clausula.documento))
      onClose()
    } catch (err) {
      setError(err.message || 'Error al crear las obligaciones')
    } finally {
      setLoading(false)
    }
  }

  // Calculate total tasks to create (including current form if filled)
  const getTotalTasks = () => {
    let total = obligaciones.length
    if (formData.titulo) total += 1
    return total
  }

  const getSelectedRiskNames = (riskIds = []) => nivelesRiesgo
    .filter((nivel) => riskIds.includes(nivel.id))
    .map((nivel) => nivel.nombre)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <form onSubmit={handleSubmit} className="relative z-50 w-full max-w-2xl bg-white dark:bg-gray-800 rounded-lg shadow-2xl flex flex-col max-h-[95vh] sm:max-h-[90vh]">
        {/* Header - Fixed */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
            Nueva(s) Obligación(es)
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <span className="material-icons">close</span>
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-200 flex-1 min-w-0">
                  <strong>{clauseTerm.charAt(0).toUpperCase() + clauseTerm.slice(1)}:</strong> <span className="break-words">{clausula.titulo}</span>
                </p>
                <button
                  type="button"
                  onClick={toggleClausulaContent}
                  className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800 rounded transition-colors flex-shrink-0"
                  title={`Ver contenido de la ${clauseTerm}`}
                >
                  👁️
                </button>
              </div>
            </div>

            {/* Clause Content Viewer */}
            {showClausulaContent && (
              <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                {loadingClausula ? (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                    <span className="material-icons animate-spin">refresh</span>
                    <p className="text-xs sm:text-sm mt-2">Cargando detalle...</p>
                  </div>
                ) : clausulaDetalle ? (
                  <div className="max-h-60 overflow-y-auto">
                    <div className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-900">
                      <h4 className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Contenido de la {clauseTerm.charAt(0).toUpperCase() + clauseTerm.slice(1)}
                      </h4>
                      <RichTextContent
                        value={clausulaDetalle.contenido}
                        className="text-xs sm:text-sm text-gray-700 dark:text-gray-300"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                    <p className="text-xs sm:text-sm">No se pudo cargar el detalle de la {clauseTerm}</p>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3">
                <p className="text-xs sm:text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            {/* Lista de obligaciones agregadas */}
            {obligaciones.length > 0 && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-green-800 dark:text-green-200">
                    Obligaciones agregadas ({obligaciones.length})
                  </h4>
                </div>
                <div className="space-y-2">
                  {obligaciones.map((obligacion, index) => (
                    <div key={index} className="bg-white dark:bg-gray-800 border border-green-200 dark:border-green-700 rounded p-2 flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {obligacion.titulo}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                          {truncateRich(obligacion.descripcion, 160)}
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {[ 
                            { label: 'Prioridad', meta: getOptionMeta(PRIORIDAD_OPTIONS, obligacion.prioridad) },
                            { label: 'Impacto', meta: getOptionMeta(IMPACTO_OPTIONS, obligacion.impacto) },
                            { label: 'Probabilidad', meta: getOptionMeta(PROBABILIDAD_OPTIONS, obligacion.probabilidad) },
                          ].map(({ label, meta }) => meta && (
                            <span
                              key={`${label}-${meta.value}`}
                              className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200 text-[11px] font-medium cursor-help"
                              title={meta.description}
                            >
                              {label}: {meta.label}
                            </span>
                          ))}
                          {getSelectedRiskNames(obligacion.niveles_riesgo).map((riskName) => (
                            <span
                              key={`${obligacion.titulo}-${riskName}`}
                              className="px-2 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 text-[11px] font-medium"
                            >
                              {riskName}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
                          <span>{obligacion.fecha_vencimiento}</span>
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleEditObligacion(index)}
                          className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800 rounded transition-colors"
                          title="Editar"
                        >
                          <span className="material-icons text-sm">edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveObligacion(index)}
                          className="p-1 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-800 rounded transition-colors"
                          title="Eliminar"
                        >
                          <span className="material-icons text-sm">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Formulario para nueva obligación */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                {obligaciones.length > 0 ? 'Agregar otra obligación' : 'Nueva Obligación'}
              </h4>

              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 mt-3">
                Título de la obligación *
              </label>
              <input
                type="text"
                name="titulo"
                value={formData.titulo}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: Revisar cumplimiento de confidencialidad"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Descripción *
              </label>
              <RichTextEditor
                value={formData.descripcion}
                onChange={(html) => setFormData((prev) => ({ ...prev, descripcion: html }))}
                placeholder="Descripción detallada de la obligación..."
                minHeight="6rem"
              />
            </div>

            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-900/30 p-4 space-y-4">
              <div className="flex items-center gap-2">
                <span className="material-icons text-blue-600 dark:text-blue-400 text-base">balance</span>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Evaluación y Riesgos
                </h4>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <AssessmentOptionGroup
                    label="Prioridad *"
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
                    helperText="Magnitud de las consecuencias si el riesgo se materializa."
                  />

                  <AssessmentOptionGroup
                    label="Probabilidad de ocurrencia"
                    name="probabilidad"
                    value={formData.probabilidad}
                    options={PROBABILIDAD_OPTIONS}
                    onChange={handleAssessmentChange}
                    helperText="Estimación basada en controles y antecedentes."
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
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Fecha de vencimiento *
                </label>
                <input
                  type="date"
                  name="fecha_vencimiento"
                  value={formData.fecha_vencimiento}
                  onChange={handleChange}
                  required
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Área responsable {permissions.areaRequiredInTasks && '*'}
                {!permissions.canEditArea && (
                  <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">(Solo lectura)</span>
                )}
              </label>
              <select
                name="area"
                value={formData.area}
                onChange={handleChange}
                required={permissions.areaRequiredInTasks}
                disabled={!permissions.canEditArea}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
              >
                <option value="">
                  {permissions.areaRequiredInTasks ? 'Selecciona un área' : 'Sin área asignada (opcional)'}
                </option>
                {areas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.nombre}
                  </option>
                ))}
              </select>
              {!permissions.areaRequiredInTasks && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  El área es opcional para roles de compliance
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Responsables
              </label>
              <ResponsablesMultiSelect
                users={usuarios}
                value={formData.responsables}
                onChange={(selected) => setFormData((prev) => ({ ...prev, responsables: selected }))}
                placeholder="Seleccionar responsables"
              />
            </div>

            {/* Objetos Regulados (campo interno: tags/etiquetas) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Objetos Regulados
                {!permissions.canEditTags && (
                  <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">(Solo lectura)</span>
                )}
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
                      {permissions.canEditTags && (
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:text-purple-900 dark:hover:text-purple-100"
                        >
                          <span className="material-icons text-xs sm:text-sm">close</span>
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              )}

              {permissions.canEditTags && (
                <>
                  {/* Selector de tags existentes */}
                  {allTags.length > 0 && (
                    <div className="mb-3">
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Seleccionar de existentes:
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {allTags
                          .filter((tag) => !formData.tags.includes(tag))
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
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                </>
              )}

              {!permissions.canEditTags && formData.tags.length === 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                  No hay etiquetas asignadas
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notas adicionales
              </label>
              <textarea
                name="notas"
                value={formData.notas}
                onChange={handleChange}
                rows="2"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Notas opcionales..."
              />
            </div>

            {/* Button to add obligation to list */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleAddObligacion}
                className="px-3 sm:px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
              >
                <span className="material-icons text-sm">add</span>
                <span>Agregar a la lista</span>
              </button>
            </div>
            </div>
            
            {/* Configuración de Notificaciones */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900/30">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="material-icons text-blue-600 dark:text-blue-400">notifications_active</span>
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
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
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
                      {[30, 14, 7, 3, 1].map((days) => (
                        <button
                          key={days}
                          type="button"
                          onClick={() => handleIntervalToggle(days)}
                          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                            formData.notificacion_config.intervalos_dias.includes(days)
                              ? 'bg-blue-600 text-white'
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
                        className="flex-1 px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomInterval}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1 text-xs"
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
                        {formData.notificacion_config.intervalos_dias.map((days) => (
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
     

        {/* Footer - Fixed */}
        <div className="flex justify-end gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-3 sm:px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-3 sm:px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-1"
          >
            {loading ? (
              <>
                <span className="material-icons animate-spin text-sm">refresh</span>
                <span className="hidden sm:inline">Creando...</span>
              </>
            ) : (
              <>
                <span className="material-icons text-sm">check</span>
                <span>Crear {getTotalTasks() > 0 ? `(${getTotalTasks()})` : ''}</span>
              </>
            )}
          </button>
        </div>
      </form>

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
  );
};
