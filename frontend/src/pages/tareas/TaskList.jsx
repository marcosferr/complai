import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useDispatch } from 'react-redux'
import { useSearchParams } from 'react-router-dom'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import api from '@/services/api'
import tareaService from '@/services/tareaService'
import { showNotification } from '@/store/slices/uiSlice'
import { htmlToPlainText } from '@/lib/richText'
import TaskDetailModal from '@/components/tareas/TaskDetailModal'
import TaskCreateModal from '@/components/tareas/TaskCreateModal'
import {
  getOptionMeta,
  IMPACTO_OPTIONS,
  PRIORIDAD_OPTIONS,
  PROBABILIDAD_OPTIONS,
} from '@/components/tareas/RiskAssessmentFields'
import { useRolePermissions } from '@/hooks/useRolePermissions'
import { getEstadoEtapaLabel } from '@/lib/estadoEtapaConstants'
import {
  puedeSoltarEn,
  destinosPermitidos,
  aplicarMovimiento,
  reemplazarTarea,
  mensajeDeError,
} from '@/lib/transicionesTablero'

const getPrioridadColor = (prioridad) => {
  const colores = {
    'BAJA': 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300',
    'MEDIA': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    'ALTA': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    'CRITICA': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  }
  return colores[prioridad] || colores['MEDIA']
}

const formatFecha = (fecha) => {
  if (!fecha) return 'N/A'
  return new Date(fecha).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

const getEtapaColor = (etapa) => {
  const colors = {
    INICIO: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    REVISION_GERENCIAL: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    CONTROL_ANALISTA: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    CONTROL_OFICIAL: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  }
  return colors[etapa] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
}

const OBSERVACION_TABLERO = 'Cambio de estado desde el tablero'

const INSTRUCCIONES_ARRASTRE =
  'Para mover la obligación a otra columna, presioná la barra espaciadora, ' +
  'usá las flechas para elegir la columna y volvé a presionar la barra espaciadora para soltarla. ' +
  'Escape cancela. Enter abre el detalle.'

// Fuera del componente a propósito: si se define adentro, cada render crea un tipo de
// componente nuevo, React desmonta la tarjeta y el arrastre en curso se corta.
const TaskCard = ({ task, index, onOpen, dragDisabled }) => {
  const prioridadMeta = getOptionMeta(PRIORIDAD_OPTIONS, task.prioridad)
  const impactoMeta = getOptionMeta(IMPACTO_OPTIONS, task.impacto)
  const probabilidadMeta = getOptionMeta(PROBABILIDAD_OPTIONS, task.probabilidad)

  return (
    <Draggable draggableId={`tarea-${task.id}`} index={index} isDragDisabled={dragDisabled}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onOpen(task)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              onOpen(task)
            }
          }}
          aria-label={task.titulo}
          className={`bg-surface-light dark:bg-surface-dark p-3 sm:p-4 rounded-lg border border-border-light dark:border-border-dark shadow-sm hover:shadow-md transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            snapshot.isDragging
              ? 'shadow-lg ring-2 ring-primary cursor-grabbing'
              : dragDisabled
                ? 'cursor-pointer active:scale-[0.98]'
                : 'cursor-grab'
          }`}
        >
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm sm:text-base font-semibold text-text-light dark:text-text-dark flex-1 pr-2">
              {task.titulo}
            </p>
            <span
              className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap cursor-help ${getPrioridadColor(task.prioridad)}`}
              title={prioridadMeta?.description || 'Prioridad de la obligación'}
            >
              {task.prioridad_display || prioridadMeta?.label || task.prioridad}
            </span>
          </div>

          {/* Etapa y Estado */}
          {task.etapa_actual && (
            <div className="flex flex-wrap gap-2 mb-2">
              <span className={`px-2 py-1 rounded text-xs font-medium ${getEtapaColor(task.etapa_actual)}`}>
                {task.etapa_display || task.etapa_actual}
              </span>
              {task.estado_etapa && (
                <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300">
                  {getEstadoEtapaLabel(task.estado_etapa)}
                </span>
              )}
            </div>
          )}

          {/* Vista previa de 2 lineas: va en texto plano a proposito. Renderizar
              listas o subtitulos dentro de un line-clamp rompe la altura de la tarjeta. */}
          <p className="text-xs sm:text-sm text-subtle-light dark:text-subtle-dark mb-3 line-clamp-2">
            {htmlToPlainText(task.descripcion)}
          </p>

          {(impactoMeta || probabilidadMeta) && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {impactoMeta && (
                <span
                  className="px-2 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200 text-[11px] font-medium cursor-help"
                  title={impactoMeta.description}
                >
                  Impacto: {task.impacto_display || impactoMeta.label}
                </span>
              )}
              {probabilidadMeta && (
                <span
                  className="px-2 py-1 rounded-full bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-200 text-[11px] font-medium cursor-help"
                  title={probabilidadMeta.description}
                >
                  Probabilidad: {task.probabilidad_display || probabilidadMeta.label}
                </span>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-3">
            <span className="text-xs sm:text-sm text-subtle-light dark:text-subtle-dark flex items-center gap-1">
              <span className="material-icons text-sm sm:text-base">calendar_today</span>
              {formatFecha(task.fecha_vencimiento)}
            </span>
            {task.dias_restantes !== null && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                task.dias_restantes < 0 
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                  : task.dias_restantes <= 7 
                  ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' 
                  : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              }`}>
                {task.dias_restantes < 0 
                  ? `Vencida hace ${Math.abs(task.dias_restantes)} días` 
                  : (task.dias_restantes === 0 
                    ? 'Vence hoy' 
                    : `Vence en ${task.dias_restantes} días`
                  )}
              </span>
            )}
          </div>
          {task.area_nombre && (
            <div className="flex items-center gap-2 mb-2 text-xs text-subtle-light dark:text-subtle-dark">
              <span className="material-icons text-xs sm:text-sm">apartment</span>
              <span>{task.area_nombre}</span>
            </div>
          )}

          {task.niveles_riesgo_detalle?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {task.niveles_riesgo_detalle.map((nivel) => (
                <span
                  key={nivel.id}
                  className="px-2 py-0.5 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 rounded text-[10px] uppercase font-bold flex items-center gap-1 cursor-help border border-red-200 dark:border-red-800"
                  title={nivel.descripcion || 'Nivel de riesgo'}
                >
                  <span className="material-icons text-[12px]">warning</span>
                  {nivel.nombre}
                </span>
              ))}
            </div>
          )}

          {task.responsables_detalle?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3">
              {task.responsables_detalle.map((responsable) => (
                <span
                  key={responsable.id}
                  className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full text-xs font-medium flex items-center gap-1"
                >
                  <span className="material-icons text-xs">person</span>
                  <span className="hidden sm:inline">{responsable.nombre || responsable.email}</span>
                  <span className="sm:hidden">{(responsable.nombre || responsable.email).split(' ')[0]}</span>
                </span>
              ))}
            </div>
          )}

          {task.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {task.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 rounded text-xs font-medium flex items-center gap-1"
                >
                  <span className="material-icons text-xs">label</span>
                  {tag}
                </span>
              ))}
            </div>
          )}

          {task.progreso_checklist && task.progreso_checklist.total > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-subtle-light dark:text-subtle-dark">
                <span>Checklist</span>
                <span>{task.progreso_checklist.completados}/{task.progreso_checklist.total}</span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${task.progreso_checklist.porcentaje}%` }}
                />
              </div>
            </div>
          )}

          {(task.comentarios?.length > 0 || task.archivos_respaldo?.length > 0) && (
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border-light dark:border-border-dark">
              {task.comentarios?.length > 0 && (
                <span className="text-xs text-subtle-light dark:text-subtle-dark flex items-center gap-1">
                  <span className="material-icons text-sm">comment</span>
                  {task.comentarios.length}
                </span>
              )}
              {task.archivos_respaldo?.length > 0 && (
                <span className="text-xs text-subtle-light dark:text-subtle-dark flex items-center gap-1">
                  <span className="material-icons text-sm">attach_file</span>
                  {task.archivos_respaldo.length}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </Draggable>
  )
}

const TaskColumn = ({ columnKey, title, icon, iconColor, tasks, arrastre, onOpen, isTaskDragDisabled }) => {
  // arrastre: null (nadie arrastra), 'origen', 'permitido' o 'bloqueado'
  const bloqueada = arrastre === 'bloqueado'

  return (
    <Droppable droppableId={columnKey} isDropDisabled={bloqueada}>
      {(provided, snapshot) => (
        <div
          className={`flex-shrink-0 w-80 sm:w-96 bg-background-light dark:bg-background-dark rounded-lg border flex flex-col max-h-[calc(100vh-24rem)] transition-opacity ${
            bloqueada
              ? 'opacity-40 border-border-light dark:border-border-dark'
              : arrastre === 'permitido'
                ? 'border-primary border-dashed'
                : 'border-border-light dark:border-border-dark'
          }`}
          title={bloqueada ? 'No podés mover esta obligación a esta columna' : undefined}
          aria-disabled={bloqueada || undefined}
        >
          <div className="flex items-center justify-between p-3 sm:p-4 border-b border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark flex-shrink-0 rounded-t-lg">
            <h3 className="text-base sm:text-lg font-semibold text-text-light dark:text-text-dark flex items-center gap-2">
              <span className={`material-icons text-xl sm:text-2xl ${iconColor}`}>{icon}</span>
              <span className="line-clamp-1">{title} ({tasks.length})</span>
            </h3>
            {bloqueada && (
              <span className="material-icons text-base text-subtle-light dark:text-subtle-dark" aria-hidden="true">
                block
              </span>
            )}
          </div>
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`p-3 sm:p-4 space-y-3 overflow-y-auto flex-1 rounded-b-lg transition-colors min-h-[6rem] ${
              snapshot.isDraggingOver ? 'bg-primary/5' : 'bg-background-light dark:bg-background-dark'
            }`}
          >
            {tasks.length === 0 && !snapshot.isDraggingOver ? (
              <p className="text-center text-subtle-light dark:text-subtle-dark py-8 text-xs sm:text-sm">
                No hay tareas en esta categoría
              </p>
            ) : (
              tasks.map((task, index) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  index={index}
                  onOpen={onOpen}
                  dragDisabled={isTaskDragDisabled(task)}
                />
              ))
            )}
            {provided.placeholder}
          </div>
        </div>
      )}
    </Droppable>
  )
}

const TaskList = () => {
  const dispatch = useDispatch()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, permissions, etapasDisponibles, getEstadosPermitidos } = useRolePermissions()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTask, setSelectedTask] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [filterEtapa, setFilterEtapa] = useState('all')
  const [filterEstadoEtapa, setFilterEstadoEtapa] = useState('all')
  const [filterPrioridad, setFilterPrioridad] = useState('all')
  const [filterArea, setFilterArea] = useState('all')
  const [filterResponsable, setFilterResponsable] = useState('all')
  const [filterTag, setFilterTag] = useState('all')
  const [areas, setAreas] = useState([])
  const [responsables, setResponsables] = useState([])
  const [tags, setTags] = useState([])

  // Arrastrar y soltar: la tarea en vuelo (para apagar columnas) y las que esperan
  // respuesta del servidor (no se vuelven a arrastrar hasta que conteste).
  const [tareaArrastrada, setTareaArrastrada] = useState(null)
  const [pendientes, setPendientes] = useState(() => new Set())
  // El click que sigue a soltar no tiene que abrir el detalle.
  const arrastrandoRef = useRef(false)

  useEffect(() => {
    fetchTasks()
    fetchAreas()
    fetchResponsables()
    fetchTags()
  }, [])

  // Handle deep linking to specific task
  useEffect(() => {
    const taskId = searchParams.get('taskId')
    if (taskId) {
      fetchTaskById(taskId)
    }
  }, [searchParams])

  const fetchTaskById = async (id) => {
    try {
      const response = await tareaService.getTarea(id)
      setSelectedTask(response.data)
      setShowModal(true)
      
      // Clean URL without reloading
      const newParams = new URLSearchParams(searchParams)
      newParams.delete('taskId')
      setSearchParams(newParams, { replace: true })
    } catch (error) {
      console.error('Error fetching task:', error)
      dispatch(showNotification({ 
        message: 'No se pudo cargar la tarea solicitada', 
        type: 'error' 
      }))
    }
  }

  const fetchTasks = async () => {
    try {
      setLoading(true)
      const response = await tareaService.getTareas()
      setTasks(response.data.results || response.data)
    } catch (error) {
      dispatch(showNotification({ 
        message: 'Error al cargar tareas', 
        type: 'error' 
      }))
    } finally {
      setLoading(false)
    }
  }

  const fetchAreas = async () => {
    try {
      const response = await tareaService.getAreas()
      setAreas(response.data)
    } catch (error) {
      console.error('Error al cargar áreas:', error)
    }
  }

  const fetchResponsables = async () => {
    try {
      const response = await api.get('/auth/users/')
      setResponsables(response.data.results || response.data)
    } catch (error) {
      console.error('Error al cargar responsables:', error)
    }
  }

  const fetchTags = async () => {
    try {
      const response = await tareaService.getTags()
      setTags(response.data)
    } catch (error) {
      console.error('Error al cargar tags:', error)
    }
  }

  // Se calcula en el mismo render (no en un efecto): al soltar una tarjeta la columna
  // nueva tiene que aparecer en ese mismo cuadro, o la tarjeta vuelve un instante a la vieja.
  const { estadoColumns, filteredTasks } = useMemo(() => {
    let filtered = [...tasks]

    // Filtrar por búsqueda
    if (searchTerm) {
      // Se busca sobre el texto visible: con HTML crudo, buscar "li" o "strong"
      // devolvería cualquier obligación que tenga una lista o una negrita.
      filtered = filtered.filter(t =>
        t.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        htmlToPlainText(t.descripcion).toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filtrar por etapa
    if (filterEtapa !== 'all') {
      filtered = filtered.filter(t => t.etapa_actual === filterEtapa)
    }

    // Filtrar por estado de etapa
    if (filterEstadoEtapa !== 'all') {
      filtered = filtered.filter(t => t.estado_etapa === filterEstadoEtapa)
    }

    // Filtrar por prioridad
    if (filterPrioridad !== 'all') {
      filtered = filtered.filter(t => t.prioridad === filterPrioridad)
    }

    // Filtrar por área
    if (filterArea !== 'all') {
      filtered = filtered.filter(t => String(t.area) === filterArea)
    }

    // Filtrar por responsable
    if (filterResponsable !== 'all') {
      filtered = filtered.filter(t => t.responsables?.includes(Number(filterResponsable)))
    }

    // Filtrar por tag
    if (filterTag !== 'all') {
      filtered = filtered.filter(t => t.tags?.includes(filterTag))
    }

    // Usar el hook para obtener estados permitidos
    const columnsToShow = getEstadosPermitidos(filterEtapa)

    // Organizar tareas por estado_etapa
    const organized = {}
    columnsToShow.forEach(col => {
      organized[col.key] = filtered.filter(t => t.estado_etapa === col.key)
    })

    return { estadoColumns: columnsToShow, filteredTasks: organized }
  }, [tasks, searchTerm, filterEtapa, filterEstadoEtapa, filterPrioridad, filterArea, filterResponsable, filterTag, getEstadosPermitidos])

  const handleTaskClick = useCallback((task) => {
    if (arrastrandoRef.current) return
    setSelectedTask(task)
    setShowModal(true)
  }, [])

  const columnKeys = estadoColumns.map((col) => col.key)

  const isTaskDragDisabled = (task) =>
    pendientes.has(task.id) || destinosPermitidos(task, user, columnKeys).length === 0

  const tareaPorDraggableId = (draggableId) =>
    tasks.find((t) => `tarea-${t.id}` === draggableId)

  const estadoArrastreColumna = (columnKey) => {
    if (!tareaArrastrada) return null
    if (columnKey === tareaArrastrada.estado_etapa) return 'origen'
    return puedeSoltarEn(tareaArrastrada, columnKey, user) ? 'permitido' : 'bloqueado'
  }

  // Antes de medir las columnas: así las no permitidas ya están deshabilitadas.
  const handleBeforeCapture = ({ draggableId }) => {
    arrastrandoRef.current = true
    setTareaArrastrada(tareaPorDraggableId(draggableId) || null)
  }

  const handleDragStart = (start, provided) => {
    const tarea = tareaPorDraggableId(start.draggableId)
    const cantidad = tarea ? destinosPermitidos(tarea, user, columnKeys).length : 0
    provided.announce(
      `Moviendo «${tarea?.titulo || 'obligación'}». ${cantidad} columnas disponibles.`
    )
  }

  const handleDragUpdate = (update, provided) => {
    if (!update.destination) {
      provided.announce('Fuera de las columnas.')
      return
    }
    provided.announce(`Sobre «${getEstadoEtapaLabel(update.destination.droppableId)}».`)
  }

  const handleDragEnd = (result, provided) => {
    setTareaArrastrada(null)
    // El click sintético llega apenas se suelta: se libera en el próximo ciclo.
    setTimeout(() => { arrastrandoRef.current = false }, 0)

    const { destination, source, draggableId } = result
    if (!destination || destination.droppableId === source.droppableId) {
      provided.announce('Movimiento cancelado.')
      return
    }

    const tarea = tareaPorDraggableId(draggableId)
    const estadoDestino = destination.droppableId
    if (!puedeSoltarEn(tarea, estadoDestino, user)) {
      provided.announce('Esa columna no está disponible para esta obligación.')
      return
    }

    provided.announce(`«${tarea.titulo}» pasa a «${getEstadoEtapaLabel(estadoDestino)}».`)
    moverTarea(tarea, estadoDestino)
  }

  const moverTarea = async (tarea, estadoDestino) => {
    setTasks((prev) => aplicarMovimiento(prev, tarea.id, estadoDestino))
    setPendientes((prev) => new Set(prev).add(tarea.id))

    try {
      // Quién hizo el cambio lo registra el servidor con la sesión: no se manda.
      const response = await tareaService.cambiarEstadoEtapa(tarea.id, {
        estado_etapa: estadoDestino,
        observaciones: OBSERVACION_TABLERO,
      })
      const actualizada = response.data?.tarea
      if (actualizada) {
        setTasks((prev) => reemplazarTarea(prev, actualizada))
      }
      dispatch(showNotification({
        message: `«${tarea.titulo}» pasó a ${getEstadoEtapaLabel(estadoDestino)}`,
        type: 'success',
      }))
    } catch (error) {
      setTasks((prev) => reemplazarTarea(prev, tarea))
      dispatch(showNotification({ message: mensajeDeError(error), type: 'error' }))
    } finally {
      setPendientes((prev) => {
        const siguiente = new Set(prev)
        siguiente.delete(tarea.id)
        return siguiente
      })
    }
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setSelectedTask(null)
  }

  const handleTaskUpdate = () => {
    fetchTasks()
  }

  return (
    <div className="flex flex-col min-h-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6 flex-shrink-0">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-text-light dark:text-text-dark">
            Obligaciones
          </h2>
          <p className="text-sm sm:text-base text-subtle-light dark:text-subtle-dark">
            Visualiza y gestiona todas las obligaciones de la organización.
          </p>
        </div>
        {permissions.canCreateTareas && (
          <button 
            onClick={() => setShowCreateModal(true)}
            title="Crear una nueva obligación"
            className="bg-primary text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium hover:bg-primary/90 transition-colors whitespace-nowrap"
          >
            <span className="material-icons text-base">add</span>
            <span className="hidden sm:inline">Nueva Obligación</span>
            <span className="sm:hidden">Nueva</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6 flex-shrink-0">
        <div className="relative flex-1 min-w-[200px]">
          <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-subtle-light dark:text-subtle-dark text-base sm:text-xl">
            search
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar tareas..."
            className="w-full pl-10 pr-4 py-2 text-sm sm:text-base bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg focus:ring-primary focus:border-primary text-text-light dark:text-text-dark"
          />
        </div>
        
        <div className="grid grid-cols-2 sm:flex gap-2 sm:gap-3">
          {/* Filtro de Etapas - Solo si el rol lo permite */}
          {permissions.canViewEtapasFilter && etapasDisponibles.length > 0 && (
            <select
              value={filterEtapa}
              onChange={(e) => setFilterEtapa(e.target.value)}
              className="px-3 py-2 text-sm bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:ring-primary focus:border-primary"
            >
              <option value="all">Todas las Etapas</option>
              {etapasDisponibles.map((etapa) => (
                <option key={etapa.value} value={etapa.value}>
                  {etapa.label}
                </option>
              ))}
            </select>
          )}

          {/* Filtro de Prioridad */}
          {permissions.canViewPrioridadFilter && (
            <select
              value={filterPrioridad}
              onChange={(e) => setFilterPrioridad(e.target.value)}
              className="px-3 py-2 text-sm bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:ring-primary focus:border-primary"
            >
              <option value="all">Prioridades</option>
              <option value="BAJA">Baja</option>
              <option value="MEDIA">Media</option>
              <option value="ALTA">Alta</option>
              <option value="CRITICA">Crítica</option>
            </select>
          )}

          {/* Filtro de Área - Solo si el rol lo permite */}
          {permissions.canViewAreaFilter && (
            <select
              value={filterArea}
              onChange={(e) => setFilterArea(e.target.value)}
              className="px-3 py-2 text-sm bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:ring-primary focus:border-primary"
            >
              <option value="all">Áreas</option>
              {areas.map((area) => (
                <option key={area.id} value={String(area.id)}>
                  {area.nombre}
                </option>
              ))}
            </select>
          )}

          {/* Filtro de Responsable - Solo si el rol lo permite */}
          {permissions.canViewResponsableFilter && (
            <select
              value={filterResponsable}
              onChange={(e) => setFilterResponsable(e.target.value)}
              className="px-3 py-2 text-sm bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:ring-primary focus:border-primary"
            >
              <option value="all">Responsables</option>
              {responsables.map((user) => (
                <option key={user.id} value={String(user.id)}>
                  {user.first_name} {user.last_name || ''}
                </option>
              ))}
            </select>
          )}

          {/* Filtro de Tags */}
          {permissions.canViewTagFilter && (
            <select
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              className="px-3 py-2 text-sm bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:ring-primary focus:border-primary"
            >
              {/* Objetos Regulados (campo interno: etiquetas) */}
              <option value="all">Objetos Regulados</option>
              {tags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => {
              setSearchTerm('')
              setFilterEtapa('all')
              setFilterEstadoEtapa('all')
              setFilterPrioridad('all')
              setFilterArea('all')
              setFilterResponsable('all')
              setFilterTag('all')
            }}
            className="px-3 py-2 text-subtle-light dark:text-subtle-dark hover:text-text-light dark:hover:text-text-dark transition-colors bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg"
            title="Limpiar filtros"
          >
            <span className="material-icons text-base sm:text-xl">clear</span>
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="mb-6 flex-shrink-0 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-3 sm:gap-4 min-w-max pb-2">
          {estadoColumns.map((col) => {
            const count = filteredTasks[col.key]?.length || 0
            const colorClasses = {
              green: {
                bg: 'bg-green-50 dark:bg-green-900/20',
                border: 'border-green-200 dark:border-green-800',
                text: 'text-green-700 dark:text-green-300',
                textBold: 'text-green-800 dark:text-green-200',
                icon: 'text-green-600 dark:text-green-400'
              },
              blue: {
                bg: 'bg-blue-50 dark:bg-blue-900/20',
                border: 'border-blue-200 dark:border-blue-800',
                text: 'text-blue-700 dark:text-blue-300',
                textBold: 'text-blue-800 dark:text-blue-200',
                icon: 'text-blue-600 dark:text-blue-400'
              },
              yellow: {
                bg: 'bg-yellow-50 dark:bg-yellow-900/20',
                border: 'border-yellow-200 dark:border-yellow-800',
                text: 'text-yellow-700 dark:text-yellow-300',
                textBold: 'text-yellow-800 dark:text-yellow-200',
                icon: 'text-yellow-600 dark:text-yellow-400'
              },
              red: {
                bg: 'bg-red-50 dark:bg-red-900/20',
                border: 'border-red-200 dark:border-red-800',
                text: 'text-red-700 dark:text-red-300',
                textBold: 'text-red-800 dark:text-red-200',
                icon: 'text-red-600 dark:text-red-400'
              },
              orange: {
                bg: 'bg-orange-50 dark:bg-orange-900/20',
                border: 'border-orange-200 dark:border-orange-800',
                text: 'text-orange-700 dark:text-orange-300',
                textBold: 'text-orange-800 dark:text-orange-200',
                icon: 'text-orange-600 dark:text-orange-400'
              },
              purple: {
                bg: 'bg-purple-50 dark:bg-purple-900/20',
                border: 'border-purple-200 dark:border-purple-800',
                text: 'text-purple-700 dark:text-purple-300',
                textBold: 'text-purple-800 dark:text-purple-200',
                icon: 'text-purple-600 dark:text-purple-400'
              }
            }
            const colors = colorClasses[col.color] || colorClasses.blue
            
            return (
              <div key={col.key} className={`${colors.bg} p-3 sm:p-4 rounded-lg border ${colors.border} min-w-[200px] flex-shrink-0`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1 pr-2">
                    <p className={`text-xs sm:text-sm ${colors.text} font-medium line-clamp-2`}>{col.label}</p>
                    <p className={`text-xl sm:text-2xl font-bold ${colors.textBold} mt-1`}>{count}</p>
                  </div>
                  <span className={`material-icons text-2xl sm:text-3xl ${colors.icon} flex-shrink-0`}>{col.icon}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Task Columns */}
      {loading ? (
        <div className="flex items-center justify-center h-64 flex-shrink-0">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-sm sm:text-base text-subtle-light dark:text-subtle-dark">Cargando tareas...</p>
          </div>
        </div>
      ) : (
        <DragDropContext
          onBeforeCapture={handleBeforeCapture}
          onDragStart={handleDragStart}
          onDragUpdate={handleDragUpdate}
          onDragEnd={handleDragEnd}
          dragHandleUsageInstructions={INSTRUCCIONES_ARRASTRE}
        >
        {/* Mientras se arrastra, el tablero no se desplaza de costado: la librería no
            sigue el desplazamiento de un contenedor que envuelve a otro y soltaría
            en la columna equivocada. */}
        <div className={`flex-1 overflow-y-hidden -mx-4 px-4 sm:mx-0 sm:px-0 ${tareaArrastrada ? 'overflow-x-hidden' : 'overflow-x-auto'}`}>
          <div className="flex gap-3 sm:gap-4 pb-4 min-w-max">
          {estadoColumns.map((col) => {
            const colorClasses = {
              green: 'text-green-600 dark:text-green-400',
              blue: 'text-blue-600 dark:text-blue-400',
              yellow: 'text-yellow-600 dark:text-yellow-400',
              red: 'text-red-600 dark:text-red-400',
              orange: 'text-orange-600 dark:text-orange-400',
              purple: 'text-purple-600 dark:text-purple-400'
            }
            const iconColor = colorClasses[col.color] || colorClasses.blue
            const tasks = filteredTasks[col.key] || []
            
            return (
              <TaskColumn
                key={col.key}
                columnKey={col.key}
                title={col.label}
                icon={col.icon}
                iconColor={iconColor}
                tasks={tasks}
                arrastre={estadoArrastreColumna(col.key)}
                onOpen={handleTaskClick}
                isTaskDragDisabled={isTaskDragDisabled}
              />
            )
          })}
          </div>
        </div>
        </DragDropContext>
      )}

      {/* Task Detail Modal */}
      {showModal && selectedTask && (
        <TaskDetailModal
          isOpen={showModal}
          onClose={handleCloseModal}
          tarea={selectedTask}
          onUpdate={handleTaskUpdate}
        />
      )}

      {/* Task Create Modal */}
      <TaskCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleTaskUpdate}
      />
    </div>
  )
}

export default TaskList