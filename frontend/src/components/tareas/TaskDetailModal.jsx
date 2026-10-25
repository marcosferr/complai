import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import api, { downloadProtectedFile, getProtectedMediaSrcUrl } from '@/services/api'
import tareaService from '@/services/tareaService'
import clausulaService from '@/services/clausulaService'
import { showNotification } from '@/store/slices/uiSlice'
import { useRolePermissions } from '@/hooks/useRolePermissions'
import { getEstadoEtapaLabel, getEstadoEtapaClasses } from '@/lib/estadoEtapaConstants'
import RichTextContent from '@/components/ui/RichTextContent'
import RichTextEditor from '@/components/ui/RichTextEditor'
import TaskEtapasControl from './TaskEtapasControl'
import TaskStateHistory from './TaskStateHistory'
import AvanzarEtapaButton from './AvanzarEtapaButton'
import ResponsablesMultiSelect from './ResponsablesMultiSelect'
import PresentacionesTab from './PresentacionesTab'
import ArchivarPresentacionModal from './ArchivarPresentacionModal'
import {
  AssessmentOptionGroup,
  getOptionMeta,
  IMPACTO_OPTIONS,
  PRIORIDAD_OPTIONS,
  PROBABILIDAD_OPTIONS,
} from './RiskAssessmentFields'

const TaskDetailModal = ({ isOpen, onClose, tarea, onUpdate }) => {
  const dispatch = useDispatch()
  const { permissions } = useRolePermissions()
  const currentUser = useSelector((state) => state.auth.user)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('actividad')
  const [tareaData, setTareaData] = useState(null)
  const [users, setUsers] = useState([])
  const [areas, setAreas] = useState([])
  const fileInputRef = useRef(null)

  // Checklist state
  const [nuevoItemChecklist, setNuevoItemChecklist] = useState('')
  const [showChecklistForm, setShowChecklistForm] = useState(false)

  // Comentarios state
  const [nuevoComentario, setNuevoComentario] = useState('')
  const [isCommentFocused, setIsCommentFocused] = useState(false)

  // Tags state
  const [newTag, setNewTag] = useState('')
  const [allTags, setAllTags] = useState([])
  const [showTagsDropdown, setShowTagsDropdown] = useState(false)

  // Archivos state
  const [archivosSubir, setArchivosSubir] = useState([])
  const [descripcionArchivo, setDescripcionArchivo] = useState('')
  const [descripcionGrupo, setDescripcionGrupo] = useState('')
  const [previsualizacionArchivo, setPrevisualizacionArchivo] = useState(null)
  const [showFileUpload, setShowFileUpload] = useState(false)

  // Clause content viewer state
  const [showClausulaContent, setShowClausulaContent] = useState(false)
  const [clausulaDetalle, setClausulaDetalle] = useState(null)
  const [loadingClausula, setLoadingClausula] = useState(false)

  // Description edit state
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [editedDescription, setEditedDescription] = useState('')

  // Corrección de título y fecha de vencimiento (deja registro en la línea de tiempo)
  const [isEditingTitulo, setIsEditingTitulo] = useState(false)
  const [editedTitulo, setEditedTitulo] = useState('')
  const [motivoTitulo, setMotivoTitulo] = useState('')
  const [isEditingFecha, setIsEditingFecha] = useState(false)
  const [editedFecha, setEditedFecha] = useState('')
  const [motivoFecha, setMotivoFecha] = useState('')
  const [guardandoEdicion, setGuardandoEdicion] = useState(false)

  // Presentaciones state
  const [showArchivarModal, setShowArchivarModal] = useState(false)

  // Determinar si mostrar tab de presentaciones
  const showPresentacionesTab = ['ANALISTA_COMPLIANCE', 'OFICIAL_COMPLIANCE'].includes(currentUser?.role)


  useEffect(() => {
    if (isOpen && tarea) {
      cargarDetallesTarea()
      cargarUsuarios()
    }
  }, [isOpen, tarea])

  const cargarDetallesTarea = async () => {
    try {
      setLoading(true)
      const response = await tareaService.getTarea(tarea.id)
      setTareaData(response.data)
    } catch (error) {
      dispatch(showNotification({
        message: 'Error al cargar detalles de la tarea',
        type: 'error'
      }))
    } finally {
      setLoading(false)
    }
  }

  const cargarUsuarios = async () => {
    try {
      const [usersResponse, areasResponse, tagsResponse] = await Promise.all([
        api.get('/auth/users/'),
        tareaService.getAreas(),
        tareaService.getTags(),
      ])
      setUsers(usersResponse.data.results || usersResponse.data)
      setAreas(areasResponse.data)
      setAllTags(tagsResponse.data)
    } catch (error) {
      console.error('Error al cargar usuarios, áreas y tags:', error)
    }
  }

  const loadClausulaDetalle = async () => {
    if (!tareaData?.clausula) return

    setLoadingClausula(true)
    try {
      const response = await clausulaService.getClausula(tareaData.clausula)
      setClausulaDetalle(response.data)
    } catch (error) {
      console.error('Error al cargar detalle de cláusula:', error)
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

  const actualizarResponsables = async (userIds) => {
    try {
      await tareaService.actualizarResponsables(tarea.id, userIds)
      dispatch(showNotification({
        message: 'Responsables actualizados exitosamente',
        type: 'success'
      }))
      cargarDetallesTarea()
      onUpdate && onUpdate()
    } catch (error) {
      dispatch(showNotification({
        message: 'Error al actualizar responsables',
        type: 'error'
      }))
    }
  }

  const actualizarArea = async (areaId) => {
    try {
      const response = await tareaService.actualizarArea(tarea.id, areaId || null)
      dispatch(showNotification({
        message: 'Área actualizada exitosamente',
        type: 'success'
      }))
      cargarDetallesTarea()
      onUpdate && onUpdate()
    } catch (error) {
      dispatch(showNotification({
        message: error.response?.data?.error || 'Error al actualizar área',
        type: 'error'
      }))
    }
  }

  const actualizarTags = async (newTags) => {
    try {
      const response = await tareaService.actualizarTagsTarea(tarea.id, newTags)
      dispatch(showNotification({
        message: 'Etiquetas actualizadas exitosamente',
        type: 'success'
      }))
      cargarDetallesTarea()
      onUpdate && onUpdate()
    } catch (error) {
      dispatch(showNotification({
        message: error.response?.data?.error || 'Error al actualizar etiquetas',
        type: 'error'
      }))
    }
  }

  const actualizarEvaluacion = async (changes) => {
    try {
      await tareaService.updateTarea(tarea.id, {
        prioridad: tareaData.prioridad,
        impacto: tareaData.impacto,
        probabilidad: tareaData.probabilidad,
        ...changes,
      })
      dispatch(showNotification({
        message: 'Evaluación actualizada exitosamente',
        type: 'success'
      }))
      cargarDetallesTarea()
      onUpdate && onUpdate()
    } catch (error) {
      dispatch(showNotification({
        message: 'Error al actualizar la evaluación',
        type: 'error'
      }))
    }
  }

  // Corrige título y/o fecha de vencimiento. El backend exige motivo si se mueve la
  // fecha y devuelve 400 con el detalle por campo; lo mostramos tal cual.
  const guardarEdicionObligacion = async (cambios, alTerminar) => {
    try {
      setGuardandoEdicion(true)
      await tareaService.editarObligacion(tarea.id, cambios)
      dispatch(showNotification({
        message: 'Obligación actualizada exitosamente',
        type: 'success'
      }))
      cargarDetallesTarea()
      onUpdate && onUpdate()
      alTerminar && alTerminar()
    } catch (error) {
      const detalle = error.response?.data
      const mensaje = detalle?.motivo || detalle?.titulo || detalle?.fecha_vencimiento
        || detalle?.error || detalle?.detail || 'Error al actualizar la obligación'
      dispatch(showNotification({ message: mensaje, type: 'error' }))
    } finally {
      setGuardandoEdicion(false)
    }
  }

  const abrirEdicionTitulo = () => {
    setEditedTitulo(tareaData?.titulo || '')
    setMotivoTitulo('')
    setIsEditingTitulo(true)
  }

  const abrirEdicionFecha = () => {
    setEditedFecha(tareaData?.fecha_vencimiento || '')
    setMotivoFecha('')
    setIsEditingFecha(true)
  }

  const handleAddTag = () => {
    if (newTag.trim() && !tareaData.tags.includes(newTag.trim())) {
      const updatedTags = [...(tareaData.tags || []), newTag.trim()]
      actualizarTags(updatedTags)
      setNewTag('')
    }
  }

  const handleRemoveTag = (tagToRemove) => {
    const updatedTags = tareaData.tags.filter(tag => tag !== tagToRemove)
    actualizarTags(updatedTags)
  }

  const handleSelectExistingTag = (tag) => {
    if (!tareaData.tags.includes(tag)) {
      const updatedTags = [...(tareaData.tags || []), tag]
      actualizarTags(updatedTags)
    }
  }

  // Checklist functions
  const agregarItemChecklist = async (e) => {
    e.preventDefault()
    if (!nuevoItemChecklist.trim()) return

    try {
      await tareaService.agregarChecklistItem(tarea.id, {
        titulo: nuevoItemChecklist,
        orden: tareaData?.checklist_items?.length || 0
      })
      setNuevoItemChecklist('')
      cargarDetallesTarea()
      dispatch(showNotification({
        message: 'Item agregado al checklist',
        type: 'success'
      }))
    } catch (error) {
      dispatch(showNotification({
        message: 'Error al agregar item',
        type: 'error'
      }))
    }
  }

  const toggleChecklistItem = async (itemId) => {
    try {
      await tareaService.marcarChecklistItem(tarea.id, itemId)
      cargarDetallesTarea()
    } catch (error) {
      dispatch(showNotification({
        message: 'Error al actualizar item',
        type: 'error'
      }))
    }
  }

  const eliminarChecklistItem = async (itemId) => {
    if (!confirm('¿Estás seguro de eliminar este item?')) return

    try {
      await tareaService.eliminarChecklistItem(tarea.id, itemId)
      cargarDetallesTarea()
      dispatch(showNotification({
        message: 'Item eliminado',
        type: 'success'
      }))
    } catch (error) {
      dispatch(showNotification({
        message: 'Error al eliminar item',
        type: 'error'
      }))
    }
  }

  // Comentarios functions
  const agregarComentario = async (e) => {
    e.preventDefault()
    if (!nuevoComentario.trim()) return

    try {
      await tareaService.agregarComentario(tarea.id, {
        texto: nuevoComentario
      })
      setNuevoComentario('')
      cargarDetallesTarea()
      dispatch(showNotification({
        message: 'Comentario agregado',
        type: 'success'
      }))
    } catch (error) {
      dispatch(showNotification({
        message: 'Error al agregar comentario',
        type: 'error'
      }))
    }
  }

  const eliminarComentario = async (comentarioId) => {
    if (!confirm('¿Estás seguro de eliminar este comentario?')) return

    try {
      await tareaService.eliminarComentario(tarea.id, comentarioId)
      cargarDetallesTarea()
      dispatch(showNotification({
        message: 'Comentario eliminado',
        type: 'success'
      }))
    } catch (error) {
      dispatch(showNotification({
        message: 'Error al eliminar comentario',
        type: 'error'
      }))
    }
  }

  // Archivos functions
  const handleArchivosChange = (e) => {
    const files = Array.from(e.target.files)
    setArchivosSubir(files)
  }

  const removerArchivo = (index) => {
    setArchivosSubir(prev => prev.filter((_, i) => i !== index))
  }

  const subirArchivo = async (e) => {
    e.preventDefault()
    if (archivosSubir.length === 0) return

    const formData = new FormData()

    // Add all files with the field name 'archivos'
    archivosSubir.forEach(archivo => {
      formData.append('archivos', archivo)
    })

    if (descripcionArchivo) {
      formData.append('descripcion', descripcionArchivo)
    }

    if (descripcionGrupo) {
      formData.append('descripcion_grupo', descripcionGrupo)
    }

    try {
      await tareaService.subirArchivo(tarea.id, formData)
      setArchivosSubir([])
      setDescripcionArchivo('')
      setDescripcionGrupo('')
      setShowFileUpload(false)
      cargarDetallesTarea()
      dispatch(showNotification({
        message: `${archivosSubir.length} archivo(s) subido(s) exitosamente`,
        type: 'success'
      }))
    } catch (error) {
      dispatch(showNotification({
        message: error.response?.data?.error || 'Error al subir archivos',
        type: 'error'
      }))
    }
  }

  const abrirPrevisualizacion = (archivo) => {
    setPrevisualizacionArchivo(archivo)
  }

  const cerrarPrevisualizacion = () => {
    setPrevisualizacionArchivo(null)
  }

  const getFileIcon = (archivo) => {
    if (archivo.es_video) return 'videocam'
    if (archivo.es_imagen) return 'image'

    const ext = archivo.nombre_original?.toLowerCase().split('.').pop()
    if (['pdf'].includes(ext)) return 'picture_as_pdf'
    if (['doc', 'docx'].includes(ext)) return 'description'
    if (['xls', 'xlsx'].includes(ext)) return 'table_chart'
    if (['zip', 'rar', '7z'].includes(ext)) return 'folder_zip'

    return 'insert_drive_file'
  }

  const eliminarArchivo = async (archivoId) => {
    if (!confirm('¿Estás seguro de eliminar este archivo?')) return

    try {
      await tareaService.eliminarArchivo(tarea.id, archivoId)
      cargarDetallesTarea()
      dispatch(showNotification({
        message: 'Archivo eliminado',
        type: 'success'
      }))
    } catch (error) {
      dispatch(showNotification({
        message: 'Error al eliminar archivo',
        type: 'error'
      }))
    }
  }

  const getPrioridadColor = (prioridad) => {
    const colores = {
      'BAJA': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
      'MEDIA': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      'ALTA': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      'CRITICA': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    }
    return colores[prioridad] || colores['MEDIA']
  }

  const prioridadMeta = getOptionMeta(PRIORIDAD_OPTIONS, tareaData?.prioridad)
  const impactoMeta = getOptionMeta(IMPACTO_OPTIONS, tareaData?.impacto)
  const probabilidadMeta = getOptionMeta(PROBABILIDAD_OPTIONS, tareaData?.probabilidad)

  const formatFecha = (fecha) => {
    if (!fecha) return 'N/A'
    // 'AAAA-MM-DD' sin hora se parsea como medianoche UTC y, al mostrarlo en
    // America/Asuncion (UTC-3), retrocede un día: elegís 15/10 y ves 14/10.
    // Las fechas sin hora se tratan como locales.
    const esSoloFecha = typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha)
    const valor = esSoloFecha ? new Date(`${fecha}T00:00:00`) : new Date(fecha)
    return valor.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const formatFechaHora = (fecha) => {
    if (!fecha) return 'N/A'
    return new Date(fecha).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatRelativeDate = (fecha) => {
    if (!fecha) return ''
    const now = new Date()
    const date = new Date(fecha)
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return 'hace un momento'
    if (diffMins < 60) return `hace ${diffMins} min`
    if (diffHours < 24) return `hace ${diffHours}h`
    if (diffDays < 7) return `hace ${diffDays}d`
    return formatFechaHora(fecha)
  }

  // Create unified activity timeline
  const unifiedTimeline = useMemo(() => {
    if (!tareaData) return []

    const items = []

    // Add comments
    tareaData.comentarios?.forEach(comentario => {
      items.push({
        type: 'comment',
        id: `comment-${comentario.id}`,
        data: comentario,
        date: new Date(comentario.fecha_creacion),
        user: comentario.usuario_nombre,
        userId: comentario.usuario
      })
    })

    // Add files
    tareaData.archivos_respaldo?.forEach(archivo => {
      items.push({
        type: 'file',
        id: `file-${archivo.id}`,
        data: archivo,
        date: new Date(archivo.fecha_subida),
        user: archivo.subido_por_nombre,
        userId: archivo.subido_por
      })
    })

    // Add checklist completions (for items that were completed)
    tareaData.checklist_items?.forEach(item => {
      if (item.completado && item.fecha_completacion) {
        items.push({
          type: 'checklist_completed',
          id: `checklist-complete-${item.id}`,
          data: item,
          date: new Date(item.fecha_completacion),
          user: item.completado_por_nombre || 'Usuario',
          userId: item.completado_por
        })
      }
    })

    // Correcciones de título y fecha de vencimiento (registro inmutable)
    tareaData.cambios_campos?.forEach(cambio => {
      items.push({
        type: 'cambio_campo',
        id: `cambio-${cambio.id}`,
        data: cambio,
        date: new Date(cambio.fecha_cambio),
        user: cambio.usuario_nombre,
        userId: cambio.usuario
      })
    })

    // Sort by date descending (newest first)
    return items.sort((a, b) => b.date - a.date)
  }, [tareaData])

  // Quick file upload handler
  const handleQuickFileUpload = async (files) => {
    if (files.length === 0) return

    const formData = new FormData()
    files.forEach(archivo => {
      formData.append('archivos', archivo)
    })

    try {
      await tareaService.subirArchivo(tarea.id, formData)
      // Limpiar el input para permitir subir el mismo archivo nuevamente
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      cargarDetallesTarea()
      dispatch(showNotification({
        message: `${files.length} archivo(s) subido(s)`,
        type: 'success'
      }))
    } catch (error) {
      dispatch(showNotification({
        message: error.response?.data?.error || 'Error al subir archivos',
        type: 'error'
      }))
      // Limpiar el input incluso si hay error
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Get user initials for avatar
  const getUserInitials = (name) => {
    if (!name) return '?'
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }

  // Get avatar color based on name
  const getAvatarColor = (name) => {
    if (!name) return 'bg-gray-400'
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500',
      'bg-indigo-500', 'bg-teal-500', 'bg-orange-500', 'bg-cyan-500'
    ]
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
  }

  // Get current user display name with fallback
  const getCurrentUserDisplayName = () => {
    return currentUser?.first_name || currentUser?.email || 'Usuario'
  }

  // Constants
  const DROPDOWN_BLUR_DELAY = 200

  if (!isOpen || !tareaData) return null

  // Activity Timeline Item Component
  const ActivityItem = ({ item }) => {
    if (item.type === 'comment') {
      return (
        <div className="flex gap-3">
          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium ${getAvatarColor(item.user)}`}>
            {getUserInitials(item.user)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm text-text-light dark:text-text-dark">{item.user}</span>
              <span className="text-xs text-subtle-light dark:text-subtle-dark">{formatRelativeDate(item.date)}</span>
            </div>
            <div className="bg-background-light dark:bg-background-dark rounded-lg p-3 border border-border-light dark:border-border-dark">
              <p className="text-sm text-text-light dark:text-text-dark whitespace-pre-wrap">{item.data.texto}</p>
            </div>
            <button
              onClick={() => eliminarComentario(item.data.id)}
              className="mt-1 text-xs text-subtle-light dark:text-subtle-dark hover:text-red-500 transition-colors"
            >
              Eliminar
            </button>
          </div>
        </div>
      )
    }

    if (item.type === 'file') {
      const archivo = item.data
      return (
        <div className="flex gap-3">
          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium ${getAvatarColor(item.user)}`}>
            {getUserInitials(item.user)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm text-text-light dark:text-text-dark">{item.user}</span>
              <span className="text-xs text-subtle-light dark:text-subtle-dark">adjuntó un archivo</span>
              <span className="text-xs text-subtle-light dark:text-subtle-dark">{formatRelativeDate(item.date)}</span>
            </div>
            <div
              className="bg-background-light dark:bg-background-dark rounded-lg p-3 border border-border-light dark:border-border-dark cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              onClick={() => abrirPrevisualizacion(archivo)}
            >
              {archivo.es_imagen ? (
                <div className="max-w-xs">
                  <img
                    src={getProtectedMediaSrcUrl(archivo.url)}
                    alt={archivo.nombre_original}
                    className="rounded-lg max-h-40 object-cover"
                  />
                  <p className="text-xs text-subtle-light dark:text-subtle-dark mt-2">{archivo.nombre_original}</p>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className={`material-icons text-2xl ${archivo.es_video ? 'text-purple-500' : 'text-primary'
                    }`}>
                    {getFileIcon(archivo)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-light dark:text-text-dark truncate">{archivo.nombre_original}</p>
                    <p className="text-xs text-subtle-light dark:text-subtle-dark">{(archivo.tamanio / 1024).toFixed(1)} KB</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); downloadProtectedFile(archivo.url, archivo.nombre_original) }}
                    className="p-2 text-primary hover:bg-primary/10 rounded transition-colors"
                  >
                    <span className="material-icons text-lg">download</span>
                  </button>
                </div>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2">
              <button
                onClick={() => eliminarArchivo(archivo.id)}
                className="text-xs text-subtle-light dark:text-subtle-dark hover:text-red-500 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )
    }

    if (item.type === 'checklist_completed') {
      return (
        <div className="flex gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <span className="material-icons text-green-600 dark:text-green-400 text-sm">check_circle</span>
          </div>
          <div className="flex-1">
            <p className="text-sm text-text-light dark:text-text-dark">
              <span className="font-medium">{item.user}</span>
              <span className="text-subtle-light dark:text-subtle-dark"> completó el ítem </span>
              <span className="font-medium">"{item.data.titulo}"</span>
            </p>
            <span className="text-xs text-subtle-light dark:text-subtle-dark">{formatRelativeDate(item.date)}</span>
          </div>
        </div>
      )
    }

    if (item.type === 'cambio_campo') {
      const esFecha = item.data.campo === 'fecha_vencimiento'
      // Las fechas se guardan en ISO; se muestran en formato local.
      const mostrarValor = (valor) => {
        if (!valor) return 'sin definir'
        return esFecha ? formatFecha(valor) : `"${valor}"`
      }

      return (
        <div className="flex gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <span className="material-icons text-amber-600 dark:text-amber-400 text-sm">
              {esFecha ? 'edit_calendar' : 'edit'}
            </span>
          </div>
          <div className="flex-1">
            <p className="text-sm text-text-light dark:text-text-dark">
              <span className="font-medium">{item.user || 'Usuario'}</span>
              <span className="text-subtle-light dark:text-subtle-dark"> cambió </span>
              <span className="font-medium">{item.data.campo_display}</span>
              <span className="text-subtle-light dark:text-subtle-dark"> de </span>
              <span className="font-medium">{mostrarValor(item.data.valor_anterior)}</span>
              <span className="text-subtle-light dark:text-subtle-dark"> a </span>
              <span className="font-medium">{mostrarValor(item.data.valor_nuevo)}</span>
            </p>
            {item.data.motivo && (
              <p className="text-sm text-subtle-light dark:text-subtle-dark mt-1">
                Motivo: {item.data.motivo}
              </p>
            )}
            <span className="text-xs text-subtle-light dark:text-subtle-dark">{formatRelativeDate(item.date)}</span>
          </div>
        </div>
      )
    }

    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      {/* Modal Content */}
      <div className="relative z-50 bg-surface-light dark:bg-surface-dark rounded-lg shadow-xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-border-light dark:border-border-dark flex-shrink-0">
          <div className="flex justify-between items-start mb-3 sm:mb-4 gap-2">
            <div className="flex-1 min-w-0">
              {isEditingTitulo ? (
                <div className="mb-3 space-y-2">
                  <input
                    type="text"
                    value={editedTitulo}
                    onChange={(e) => setEditedTitulo(e.target.value)}
                    maxLength={200}
                    autoFocus
                    className="w-full px-3 py-2 text-lg sm:text-2xl font-bold border border-border-light dark:border-border-dark rounded-lg bg-white dark:bg-gray-700 text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                  <input
                    type="text"
                    value={motivoTitulo}
                    onChange={(e) => setMotivoTitulo(e.target.value)}
                    placeholder="Motivo del cambio (opcional)"
                    className="w-full px-3 py-1.5 text-sm border border-border-light dark:border-border-dark rounded bg-white dark:bg-gray-700 text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => guardarEdicionObligacion(
                        { titulo: editedTitulo, motivo: motivoTitulo },
                        () => setIsEditingTitulo(false)
                      )}
                      disabled={guardandoEdicion || !editedTitulo.trim()}
                      className="px-3 py-1.5 bg-primary text-white rounded text-sm hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {guardandoEdicion ? 'Guardando…' : 'Guardar'}
                    </button>
                    <button
                      onClick={() => setIsEditingTitulo(false)}
                      className="px-3 py-1.5 text-subtle-light dark:text-subtle-dark hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-sm transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 mb-2">
                  <h2 className="text-lg sm:text-2xl font-bold text-text-light dark:text-text-dark break-words">
                    {tareaData.titulo}
                  </h2>
                  {permissions.canEditObligacion && (
                    <button
                      onClick={abrirEdicionTitulo}
                      title="Corregir el título de la obligación"
                      className="flex-shrink-0 mt-1 p-1 text-subtle-light dark:text-subtle-dark hover:text-primary transition-colors"
                    >
                      <span className="material-icons text-base">edit</span>
                    </button>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${getEstadoEtapaClasses(tareaData.estado_etapa)}`}>
                  {getEstadoEtapaLabel(tareaData.estado_etapa)}
                </span>
                <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${getPrioridadColor(tareaData.prioridad)}`}>
                  <span className="hidden sm:inline">Prioridad: </span>{tareaData.prioridad_display || prioridadMeta?.label || tareaData.prioridad}
                </span>
                {impactoMeta && (
                  <span
                    className="px-2 sm:px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200 cursor-help"
                    title={impactoMeta.description}
                  >
                    <span className="hidden sm:inline">Impacto: </span>{tareaData.impacto_display || impactoMeta.label}
                  </span>
                )}
                {probabilidadMeta && (
                  <span
                    className="px-2 sm:px-3 py-1 rounded-full text-xs font-medium bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-200 cursor-help"
                    title={probabilidadMeta.description}
                  >
                    <span className="hidden sm:inline">Probabilidad: </span>{tareaData.probabilidad_display || probabilidadMeta.label}
                  </span>
                )}
                {tareaData.en_cumplimiento ? (
                  <span className="px-2 sm:px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 flex items-center gap-1">
                    <span className="material-icons text-xs">check_circle</span>
                    <span className="hidden sm:inline">En Cumplimiento</span>
                  </span>
                ) : (
                  <span className="px-2 sm:px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 flex items-center gap-1">
                    <span className="material-icons text-xs">warning</span>
                    <span className="hidden sm:inline">Requiere Atención</span>
                  </span>
                )}
              </div>

              {/* Botón de avanzar etapa en header */}
              <div className="mt-3">
                <AvanzarEtapaButton
                  tarea={tareaData}
                  onUpdate={() => {
                    cargarDetallesTarea()
                    onUpdate && onUpdate()
                  }}
                  variant="secondary"
                />
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 text-subtle-light dark:text-subtle-dark hover:text-text-light dark:hover:text-text-dark transition-colors p-1 sm:p-2"
            >
              <span className="material-icons">close</span>
            </button>
          </div>
        </div>

        {/* Tabs - Simplified for Trello-style */}
        <div className="border-b border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark flex-shrink-0">
          <div className="flex gap-1 px-4 sm:px-6 overflow-x-auto overflow-y-hidden scrollbar-thin">
            {[
              { id: 'actividad', label: 'Actividad', icon: 'dynamic_feed', shortLabel: 'Actividad' },
              { id: 'detalles', label: 'Detalles', icon: 'info', shortLabel: 'Detalles' },
              { id: 'etapas', label: 'Etapas', icon: 'account_tree', shortLabel: 'Etapas' },
              { id: 'notificaciones', label: 'Notificaciones', icon: 'notifications', shortLabel: 'Notif.' },
              ...(showPresentacionesTab ? [{ id: 'presentaciones', label: 'Presentaciones', icon: 'folder_zip', shortLabel: 'Present.' }] : []),
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium transition-colors border-b-2 whitespace-nowrap flex items-center gap-1.5 ${activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-subtle-light dark:text-subtle-dark hover:text-text-light dark:hover:text-text-dark'
                  }`}
              >
                <span className="material-icons text-base">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.shortLabel}</span>
                {tab.id === 'actividad' && unifiedTimeline.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
                    {unifiedTimeline.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'actividad' && (
            <div className="flex flex-col lg:flex-row h-full">
              {/* Main Content Area */}
              <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
                {/* Description Section */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-icons text-subtle-light dark:text-subtle-dark">subject</span>
                    <h3 className="font-semibold text-text-light dark:text-text-dark">Descripción</h3>
                    {!isEditingDescription && (
                      <button
                        onClick={() => {
                          setIsEditingDescription(true)
                          setEditedDescription(tareaData.descripcion || '')
                        }}
                        className="text-xs text-primary hover:underline"
                      >
                        Editar
                      </button>
                    )}
                  </div>
                  {isEditingDescription ? (
                    <div className="space-y-2">
                      <RichTextEditor
                        value={editedDescription}
                        onChange={setEditedDescription}
                        placeholder="Agregar una descripción más detallada..."
                        minHeight="7rem"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            try {
                              await tareaService.updateTarea(tarea.id, { descripcion: editedDescription })
                              cargarDetallesTarea()
                              setIsEditingDescription(false)
                              dispatch(showNotification({ message: 'Descripción actualizada', type: 'success' }))
                            } catch (error) {
                              dispatch(showNotification({ message: 'Error al actualizar', type: 'error' }))
                            }
                          }}
                          className="px-3 py-1.5 bg-primary text-white rounded text-sm hover:bg-primary-hover transition-colors"
                        >
                          Guardar
                        </button>
                        <button
                          onClick={() => setIsEditingDescription(false)}
                          className="px-3 py-1.5 text-subtle-light dark:text-subtle-dark hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-sm transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="text-sm text-subtle-light dark:text-subtle-dark bg-background-light dark:bg-background-dark rounded-lg p-3 min-h-[60px] cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      onClick={() => {
                        setIsEditingDescription(true)
                        setEditedDescription(tareaData.descripcion || '')
                      }}
                    >
                      <RichTextContent
                        value={tareaData.descripcion}
                        emptyText="Agregar una descripción más detallada..."
                      />
                    </div>
                  )}
                </div>

                {/* Checklist Section (Inline) */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="material-icons text-subtle-light dark:text-subtle-dark">checklist</span>
                      <h3 className="font-semibold text-text-light dark:text-text-dark">Checklist</h3>
                      {tareaData.progreso_checklist && (
                        <span className="text-xs text-subtle-light dark:text-subtle-dark">
                          ({tareaData.progreso_checklist.completados}/{tareaData.progreso_checklist.total})
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setShowChecklistForm(!showChecklistForm)}
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <span className="material-icons text-sm">add</span>
                      Agregar
                    </button>
                  </div>

                  {/* Checklist Progress Bar */}
                  {tareaData.progreso_checklist && tareaData.progreso_checklist.total > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-subtle-light dark:text-subtle-dark w-8">
                          {tareaData.progreso_checklist.porcentaje}%
                        </span>
                        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${tareaData.progreso_checklist.porcentaje === 100
                              ? 'bg-green-500'
                              : 'bg-primary'
                              }`}
                            style={{ width: `${tareaData.progreso_checklist.porcentaje}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Checklist Items */}
                  <div className="space-y-1">
                    {tareaData.checklist_items?.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                      >
                        <button
                          onClick={() => toggleChecklistItem(item.id)}
                          className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${item.completado
                            ? 'bg-primary border-primary text-white'
                            : 'border-gray-300 dark:border-gray-600 hover:border-primary'
                            }`}
                        >
                          {item.completado && (
                            <span className="material-icons text-xs">check</span>
                          )}
                        </button>
                        <span className={`flex-1 text-sm ${item.completado
                          ? 'text-subtle-light dark:text-subtle-dark line-through'
                          : 'text-text-light dark:text-text-dark'
                          }`}>
                          {item.titulo}
                        </span>
                        <button
                          onClick={() => eliminarChecklistItem(item.id)}
                          className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600 transition-all p-1"
                        >
                          <span className="material-icons text-sm">close</span>
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add Checklist Item Form */}
                  {showChecklistForm && (
                    <form onSubmit={agregarItemChecklist} className="mt-2 flex gap-2">
                      <input
                        type="text"
                        value={nuevoItemChecklist}
                        onChange={(e) => setNuevoItemChecklist(e.target.value)}
                        placeholder="Agregar un ítem..."
                        className="flex-1 px-3 py-2 text-sm border border-border-light dark:border-border-dark rounded-lg bg-surface-light dark:bg-surface-dark text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary focus:border-transparent"
                        autoFocus
                      />
                      <button
                        type="submit"
                        className="px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
                      >
                        <span className="material-icons text-lg">add</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowChecklistForm(false)
                          setNuevoItemChecklist('')
                        }}
                        className="px-3 py-2 text-subtle-light hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      >
                        <span className="material-icons text-lg">close</span>
                      </button>
                    </form>
                  )}

                  {tareaData.checklist_items?.length === 0 && !showChecklistForm && (
                    <p className="text-sm text-subtle-light dark:text-subtle-dark text-center py-4">
                      No hay ítems en el checklist
                    </p>
                  )}
                </div>

                {/* Attachments Section (Quick view of recent files) */}
                {tareaData.archivos_respaldo?.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="material-icons text-subtle-light dark:text-subtle-dark">attach_file</span>
                      <h3 className="font-semibold text-text-light dark:text-text-dark">
                        Adjuntos ({tareaData.archivos_respaldo.length})
                      </h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {tareaData.archivos_respaldo.slice(0, 4).map((archivo) => (
                        <div
                          key={archivo.id}
                          className="flex items-center gap-2 px-3 py-2 bg-background-light dark:bg-background-dark rounded-lg border border-border-light dark:border-border-dark hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors max-w-[200px]"
                          onClick={() => abrirPrevisualizacion(archivo)}
                        >
                          <span className={`material-icons text-lg ${archivo.es_video ? 'text-purple-500' :
                            archivo.es_imagen ? 'text-blue-500' : 'text-primary'
                            }`}>
                            {getFileIcon(archivo)}
                          </span>
                          <span className="text-sm text-text-light dark:text-text-dark truncate">
                            {archivo.nombre_original}
                          </span>
                        </div>
                      ))}
                      {tareaData.archivos_respaldo.length > 4 && (
                        <div className="flex items-center px-3 py-2 text-sm text-primary">
                          +{tareaData.archivos_respaldo.length - 4} más
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Activity Feed */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="material-icons text-subtle-light dark:text-subtle-dark">history</span>
                    <h3 className="font-semibold text-text-light dark:text-text-dark">Actividad</h3>
                  </div>

                  {/* Comment Input - Trello style */}
                  <div className="flex gap-3 mb-6">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium ${getAvatarColor(getCurrentUserDisplayName())}`}>
                      {getUserInitials(getCurrentUserDisplayName())}
                    </div>
                    <div className="flex-1">
                      {isCommentFocused || nuevoComentario ? (
                        <div className="space-y-2">
                          <textarea
                            value={nuevoComentario}
                            onChange={(e) => setNuevoComentario(e.target.value)}
                            placeholder="Escribe un comentario..."
                            className="w-full p-3 text-sm border border-border-light dark:border-border-dark rounded-lg bg-surface-light dark:bg-surface-dark text-text-light dark:text-text-dark resize-none focus:ring-2 focus:ring-primary focus:border-transparent"
                            rows={3}
                            autoFocus
                          />
                          <div className="flex items-center gap-2">
                            <button
                              onClick={agregarComentario}
                              disabled={!nuevoComentario.trim()}
                              className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Guardar
                            </button>
                            <button
                              onClick={() => {
                                setIsCommentFocused(false)
                                setNuevoComentario('')
                              }}
                              className="px-4 py-2 text-subtle-light dark:text-subtle-dark hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-sm transition-colors"
                            >
                              Cancelar
                            </button>
                            <div className="flex-1" />
                            <input
                              type="file"
                              ref={fileInputRef}
                              onChange={(e) => {
                                if (e.target.files && e.target.files.length > 0) {
                                  handleQuickFileUpload(Array.from(e.target.files))
                                }
                              }}
                              className="hidden"
                              multiple
                              accept="*/*"
                            />
                            <button
                              onClick={() => fileInputRef.current?.click()}
                              className="p-2 text-subtle-light dark:text-subtle-dark hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                              title="Adjuntar archivo"
                            >
                              <span className="material-icons text-lg">attach_file</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => setIsCommentFocused(true)}
                          className="p-3 bg-background-light dark:bg-background-dark rounded-lg border border-border-light dark:border-border-dark cursor-text text-sm text-subtle-light dark:text-subtle-dark hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          Escribe un comentario...
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Activity Timeline */}
                  <div className="space-y-4">
                    {unifiedTimeline.length > 0 ? (
                      unifiedTimeline.map((item) => (
                        <ActivityItem key={item.id} item={item} />
                      ))
                    ) : (
                      <p className="text-center text-sm text-subtle-light dark:text-subtle-dark py-8">
                        No hay actividad aún. ¡Sé el primero en comentar!
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Sidebar - Task Details */}
              <div className="w-full lg:w-72 bg-background-light dark:bg-background-dark border-t lg:border-t-0 lg:border-l border-border-light dark:border-border-dark p-4 space-y-4 flex-shrink-0 overflow-y-auto">
                {/* Quick Actions */}
                <div>
                  <h4 className="text-xs font-semibold text-subtle-light dark:text-subtle-dark uppercase mb-2">Agregar</h4>
                  <div className="space-y-1">
                    <button
                      onClick={() => setShowFileUpload(true)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-text-light dark:text-text-dark hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      <span className="material-icons text-lg text-subtle-light">attach_file</span>
                      Adjunto
                    </button>
                    <button
                      onClick={() => setShowChecklistForm(true)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-text-light dark:text-text-dark hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      <span className="material-icons text-lg text-subtle-light">checklist</span>
                      Checklist
                    </button>
                    <button
                      onClick={() => setIsCommentFocused(true)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-text-light dark:text-text-dark hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      <span className="material-icons text-lg text-subtle-light">chat</span>
                      Comentario
                    </button>
                  </div>
                </div>

                {/* Responsables */}
                <div>
                  <h4 className="text-xs font-semibold text-subtle-light dark:text-subtle-dark uppercase mb-2">Responsables</h4>
                  <div className="space-y-1">
                    {tareaData.responsables_detalle?.length > 0 ? (
                      tareaData.responsables_detalle.map((responsable) => (
                        <div key={responsable.id} className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs ${getAvatarColor(responsable.nombre || responsable.email)}`}>
                            {getUserInitials(responsable.nombre || responsable.email)}
                          </div>
                          <span className="text-sm text-text-light dark:text-text-dark truncate">
                            {responsable.nombre || responsable.email}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-subtle-light dark:text-subtle-dark">Sin asignar</p>
                    )}
                    <div className="mt-2">
                      <ResponsablesMultiSelect
                        size="sm"
                        users={users}
                        value={tareaData.responsables || []}
                        onChange={(selected) => actualizarResponsables(selected)}
                        placeholder="Asignar responsables"
                      />
                    </div>
                  </div>
                </div>

                {/* Due Date */}
                <div>
                  <h4 className="text-xs font-semibold text-subtle-light dark:text-subtle-dark uppercase mb-2">Vencimiento</h4>
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${tareaData.dias_restantes < 0
                    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                    : tareaData.dias_restantes <= 7
                      ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                    }`}>
                    <span className="material-icons text-lg">schedule</span>
                    <div>
                      <p className="font-medium">{formatFecha(tareaData.fecha_vencimiento)}</p>
                      <p className="text-xs opacity-80">
                        {tareaData.dias_restantes < 0
                          ? `Vencid{a hace ${Math.abs(tareaData.dias_restantes)} días`
                          : (tareaData.dias_restantes === 0
                            ? 'Vence hoy'
                            : `Vence en ${tareaData.dias_restantes} días`
                          )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Área */}
                {permissions.canEditArea && (
                  <div>
                    <h4 className="text-xs font-semibold text-subtle-light dark:text-subtle-dark uppercase mb-2">Área</h4>
                    <select
                      value={tareaData.area || ''}
                      onChange={(e) => actualizarArea(e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-border-light dark:border-border-dark rounded bg-surface-light dark:bg-surface-dark text-text-light dark:text-text-dark"
                    >
                      <option value="">Sin área</option>
                      {areas.map((area) => (
                        <option key={area.id} value={area.id}>
                          {area.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Tags */}
                <div>
                  <h4 className="text-xs font-semibold text-subtle-light dark:text-subtle-dark uppercase mb-2">Etiquetas</h4>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {tareaData.tags?.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 rounded text-xs font-medium flex items-center gap-1"
                      >
                        {tag}
                        {permissions.canEditTags && (
                          <button onClick={() => handleRemoveTag(tag)} className="hover:text-purple-900">
                            <span className="material-icons text-xs">close</span>
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                  {permissions.canEditTags && (
                    <div className="relative">
                      <input
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleAddTag()
                          }
                        }}
                        onFocus={() => setShowTagsDropdown(true)}
                        onBlur={() => setTimeout(() => setShowTagsDropdown(false), DROPDOWN_BLUR_DELAY)}
                        placeholder="Agregar etiqueta..."
                        className="w-full px-2 py-1.5 text-sm border border-border-light dark:border-border-dark rounded bg-surface-light dark:bg-surface-dark text-text-light dark:text-text-dark"
                      />
                      {showTagsDropdown && allTags.filter(t => !tareaData.tags?.includes(t)).length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded shadow-lg max-h-32 overflow-y-auto">
                          {allTags
                            .filter(t => !tareaData.tags?.includes(t))
                            .map((tag) => (
                              <button
                                key={tag}
                                onClick={() => handleSelectExistingTag(tag)}
                                className="w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-800"
                              >
                                {tag}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Risk Levels */}
                {tareaData.niveles_riesgo_detalle?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-subtle-light dark:text-subtle-dark uppercase mb-2">Riesgos</h4>
                    <div className="flex flex-wrap gap-1">
                      {tareaData.niveles_riesgo_detalle.map((nivel) => (
                        <span
                          key={nivel.id}
                          className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 rounded text-xs font-medium"
                          title={nivel.descripcion || ''}
                        >
                          {nivel.nombre}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Related Clause */}
                {tareaData.clausula_titulo && (
                  <div>
                    <h4 className="text-xs font-semibold text-subtle-light dark:text-subtle-dark uppercase mb-2">Cláusula</h4>
                    <button
                      onClick={toggleClausulaContent}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                    >
                      <span className="material-icons text-lg">gavel</span>
                      <span className="flex-1 truncate">{tareaData.clausula_titulo}</span>
                      <span className="material-icons text-sm">{showClausulaContent ? 'expand_less' : 'expand_more'}</span>
                    </button>
                    {showClausulaContent && clausulaDetalle && (
                      <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs text-text-light dark:text-text-dark max-h-32 overflow-y-auto">
                        <RichTextContent value={clausulaDetalle.contenido} />
                      </div>
                    )}
                  </div>
                )}

                {/* Created By */}
                <div className="pt-4 border-t border-border-light dark:border-border-dark">
                  <p className="text-xs text-subtle-light dark:text-subtle-dark">
                    Creada por <span className="font-medium">{tareaData.creado_por_nombre}</span>
                  </p>
                  <p className="text-xs text-subtle-light dark:text-subtle-dark">
                    {formatFechaHora(tareaData.fecha_creacion)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'detalles' && (
            <div className="p-4 sm:p-6 space-y-6">
              {/* Descripción */}
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-text-light dark:text-text-dark mb-2">Descripción</h3>
                <RichTextContent
                  value={tareaData.descripcion}
                  emptyText="Sin descripción"
                  className="text-sm sm:text-base text-subtle-light dark:text-subtle-dark"
                />
              </div>

              <div className="rounded-xl border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="material-icons text-primary text-base">balance</span>
                  <h3 className="text-sm sm:text-base font-semibold text-text-light dark:text-text-dark">Evaluación y Riesgos</h3>
                </div>

                <AssessmentOptionGroup
                  label="Prioridad"
                  name="prioridad"
                  value={tareaData.prioridad}
                  options={PRIORIDAD_OPTIONS}
                  onChange={(name, value) => actualizarEvaluacion({ [name]: value })}
                  helperText="Urgencia con que debe atenderse la obligación contractual."
                />

                <AssessmentOptionGroup
                  label="Impacto en el negocio"
                  name="impacto"
                  value={tareaData.impacto}
                  options={IMPACTO_OPTIONS}
                  onChange={(name, value) => actualizarEvaluacion({ [name]: value })}
                  helperText="Severidad de las consecuencias si el riesgo se materializa."
                />

                <AssessmentOptionGroup
                  label="Probabilidad de ocurrencia"
                  name="probabilidad"
                  value={tareaData.probabilidad}
                  options={PROBABILIDAD_OPTIONS}
                  onChange={(name, value) => actualizarEvaluacion({ [name]: value })}
                  helperText="Qué tan probable es el evento según controles y antecedentes."
                />

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-subtle-light dark:text-subtle-dark mb-2">
                    Niveles de Riesgo
                  </label>

                  {tareaData.niveles_riesgo_detalle && tareaData.niveles_riesgo_detalle.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {tareaData.niveles_riesgo_detalle.map((nivel) => (
                        <span
                          key={nivel.id}
                          className="px-3 py-1.5 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 rounded-full text-xs sm:text-sm font-medium flex items-center gap-1.5 cursor-help"
                          title={nivel.descripcion || ''}
                        >
                          <span className="material-icons text-sm">warning</span>
                          {nivel.nombre}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-subtle-light dark:text-subtle-dark">
                      Sin niveles de riesgo asignados
                    </p>
                  )}
                </div>
              </div>

              {/* Información general */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-subtle-light dark:text-subtle-dark mb-1">
                    Etapa / Estado
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm sm:text-base text-text-light dark:text-text-dark">
                      {tareaData.etapa_display || tareaData.etapa_actual}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getEstadoEtapaClasses(tareaData.estado_etapa)}`}>
                      {getEstadoEtapaLabel(tareaData.estado_etapa)}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-subtle-light dark:text-subtle-dark mb-1">
                    Responsables
                  </label>
                  <ResponsablesMultiSelect
                    users={users}
                    value={tareaData.responsables || []}
                    onChange={(selected) => actualizarResponsables(selected)}
                    placeholder="Asignar responsables"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-subtle-light dark:text-subtle-dark mb-1">
                    Fecha de Vencimiento
                  </label>
                  {isEditingFecha ? (
                    <div className="space-y-2">
                      <input
                        type="date"
                        value={editedFecha}
                        onChange={(e) => setEditedFecha(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-border-light dark:border-border-dark rounded-lg bg-white dark:bg-gray-700 text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                      <textarea
                        value={motivoFecha}
                        onChange={(e) => setMotivoFecha(e.target.value)}
                        rows={2}
                        placeholder="Motivo del cambio de fecha (obligatorio)"
                        className="w-full px-3 py-2 text-sm border border-border-light dark:border-border-dark rounded-lg bg-white dark:bg-gray-700 text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                      <div className="flex gap-2">
                        {/* Guardar deshabilitado sin motivo: el 400 del backend es la red,
                            no la primera experiencia del usuario. */}
                        <button
                          onClick={() => guardarEdicionObligacion(
                            { fecha_vencimiento: editedFecha, motivo: motivoFecha },
                            () => setIsEditingFecha(false)
                          )}
                          disabled={guardandoEdicion || !editedFecha || !motivoFecha.trim()}
                          className="px-3 py-1.5 bg-primary text-white rounded text-sm hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {guardandoEdicion ? 'Guardando…' : 'Guardar'}
                        </button>
                        <button
                          onClick={() => setIsEditingFecha(false)}
                          className="px-3 py-1.5 text-subtle-light dark:text-subtle-dark hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-sm transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="text-sm sm:text-base text-text-light dark:text-text-dark">
                        {formatFecha(tareaData.fecha_vencimiento)}
                      </p>
                      {permissions.canEditObligacion && (
                        <button
                          onClick={abrirEdicionFecha}
                          title="Corregir la fecha de vencimiento"
                          className="p-1 text-subtle-light dark:text-subtle-dark hover:text-primary transition-colors"
                        >
                          <span className="material-icons text-base">edit_calendar</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-subtle-light dark:text-subtle-dark mb-1">
                    Días Restantes
                  </label>
                  <p className={`text-sm sm:text-base font-semibold ${tareaData.dias_restantes < 0
                    ? 'text-red-600 dark:text-red-400'
                    : tareaData.dias_restantes <= 7
                      ? 'text-orange-600 dark:text-orange-400'
                      : 'text-green-600 dark:text-green-400'
                    }`}>
                    {tareaData.dias_restantes !== null ? `${tareaData.dias_restantes} días` : 'N/A'}
                  </p>
                </div>

                {tareaData.clausula_titulo && (
                  <div className="sm:col-span-2">
                    <label className="block text-xs sm:text-sm font-medium text-subtle-light dark:text-subtle-dark mb-1">
                      Cláusula Relacionada
                    </label>
                    <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                      <p className="text-sm sm:text-base text-blue-800 dark:text-blue-200">
                        {tareaData.clausula_titulo}
                      </p>
                      <button
                        type="button"
                        onClick={toggleClausulaContent}
                        className="p-1.5 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-800 rounded transition-colors flex-shrink-0"
                        title="Ver contenido de la cláusula"
                      >
                        👁️
                      </button>
                    </div>
                  </div>
                )}

                {/* Área asignada - Editable según permisos */}
                <div className="sm:col-span-2">
                  <label className="block text-xs sm:text-sm font-medium text-subtle-light dark:text-subtle-dark mb-1">
                    Área asignada {!permissions.areaRequiredInTasks && '(opcional)'}
                    {!permissions.canEditArea && (
                      <span className="ml-2 text-xs">(Solo lectura)</span>
                    )}
                  </label>
                  {permissions.canEditArea ? (
                    <select
                      value={tareaData.area || ''}
                      onChange={(e) => actualizarArea(e.target.value)}
                      className="w-full px-3 py-2 text-sm sm:text-base border border-border-light dark:border-border-dark rounded-lg bg-surface-light dark:bg-surface-dark text-text-light dark:text-text-dark"
                    >
                      <option value="">
                        {permissions.areaRequiredInTasks ? 'Selecciona un área' : 'Sin área asignada'}
                      </option>
                      {areas.map((area) => (
                        <option key={area.id} value={area.id}>
                          {area.nombre}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-sm sm:text-base text-text-light dark:text-text-dark">
                      {tareaData.area_nombre || 'Sin área asignada'}
                    </p>
                  )}
                </div>

                {/* Objetos Regulados (campo interno: tags/etiquetas) */}
                <div className="sm:col-span-2">
                  <label className="block text-xs sm:text-sm font-medium text-subtle-light dark:text-subtle-dark mb-2">
                    Objetos Regulados
                    {!permissions.canEditTags && (
                      <span className="ml-2 text-xs">(Solo lectura)</span>
                    )}
                  </label>

                  {/* Tags actuales */}
                  {tareaData.tags && tareaData.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {tareaData.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-3 py-1.5 bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 rounded-full text-xs sm:text-sm font-medium flex items-center gap-1.5"
                        >
                          <span className="material-icons text-sm">label</span>
                          {tag}
                          {permissions.canEditTags && (
                            <button
                              onClick={() => handleRemoveTag(tag)}
                              className="hover:text-purple-900 dark:hover:text-purple-100 ml-1"
                              title="Eliminar etiqueta"
                            >
                              <span className="material-icons text-sm">close</span>
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-subtle-light dark:text-subtle-dark mb-3">
                      Sin objetos regulados
                    </p>
                  )}

                  {/* Agregar etiquetas - Solo si tiene permisos */}
                  {permissions.canEditTags && (
                    <div className="space-y-2">
                      {/* Tags existentes */}
                      {allTags.length > 0 && (
                        <div>
                          <label className="block text-xs text-subtle-light dark:text-subtle-dark mb-1">
                            Seleccionar de existentes:
                          </label>
                          <div className="flex flex-wrap gap-2 mb-2">
                            {allTags
                              .filter((tag) => !tareaData.tags?.includes(tag))
                              .map((tag, index) => (
                                <button
                                  key={index}
                                  type="button"
                                  onClick={() => handleSelectExistingTag(tag)}
                                  className="px-2 py-1 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded text-xs hover:bg-purple-100 hover:text-purple-800 dark:hover:bg-purple-900/30 dark:hover:text-purple-300 transition-colors"
                                >
                                  + {tag}
                                </button>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Nueva etiqueta */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              handleAddTag()
                            }
                          }}
                          placeholder="Nueva etiqueta..."
                          className="flex-1 px-3 py-2 text-sm border border-border-light dark:border-border-dark rounded-lg bg-surface-light dark:bg-surface-dark text-text-light dark:text-text-dark"
                        />
                        <button
                          type="button"
                          onClick={handleAddTag}
                          className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-1"
                        >
                          <span className="material-icons text-sm">add</span>
                          <span className="hidden sm:inline text-sm">Agregar</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Clause Content Viewer */}
              {showClausulaContent && tareaData.clausula_titulo && (
                <div className="border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden">
                  {loadingClausula ? (
                    <div className="p-4 text-center text-subtle-light dark:text-subtle-dark">
                      <span className="material-icons animate-spin">refresh</span>
                      <p className="text-sm mt-2">Cargando detalle...</p>
                    </div>
                  ) : clausulaDetalle ? (
                    <div className="max-h-96 overflow-y-auto">
                      {/* Clause Content */}
                      <div className="p-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                        <h4 className="text-sm font-semibold text-text-light dark:text-text-dark mb-2">
                          Contenido de la Cláusula
                        </h4>
                        <RichTextContent
                          value={clausulaDetalle.contenido}
                          className="text-sm text-text-light dark:text-text-dark"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 text-center text-subtle-light dark:text-subtle-dark">
                      <p className="text-sm">No se pudo cargar el detalle de la cláusula</p>
                    </div>
                  )}
                </div>
              )}

              {/* Progreso del Checklist */}
              {tareaData.progreso_checklist && (
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-text-light dark:text-text-dark mb-2">
                    Progreso del Checklist
                  </h3>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 sm:h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${tareaData.progreso_checklist.porcentaje}%` }}
                      />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-text-light dark:text-text-dark whitespace-nowrap">
                      {tareaData.progreso_checklist.porcentaje}%
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-subtle-light dark:text-subtle-dark mt-1">
                    {tareaData.progreso_checklist.completados} de {tareaData.progreso_checklist.total} completados
                  </p>
                </div>
              )}

              {/* Información adicional */}
              <div className="border-t border-border-light dark:border-border-dark pt-4 space-y-2">
                <div className="flex flex-wrap gap-2 items-center text-sm">
                  <span className="text-subtle-light dark:text-subtle-dark">Responsables asignados:</span>
                  {tareaData.responsables_detalle?.length ? (
                    tareaData.responsables_detalle.map((responsable) => (
                      <span
                        key={responsable.id}
                        className="px-2 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 text-xs font-medium"
                      >
                        {responsable.nombre || responsable.email}
                      </span>
                    ))
                  ) : (
                    <span className="text-text-light dark:text-text-dark">Sin responsables asignados</span>
                  )}
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-subtle-light dark:text-subtle-dark">Creado por:</span>
                  <span className="text-text-light dark:text-text-dark">{tareaData.creado_por_nombre}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-subtle-light dark:text-subtle-dark">Fecha de creación:</span>
                  <span className="text-text-light dark:text-text-dark">{formatFechaHora(tareaData.fecha_creacion)}</span>
                </div>
                {tareaData.fecha_completacion && (
                  <div className="flex justify-between text-sm">
                    <span className="text-subtle-light dark:text-subtle-dark">Completada el:</span>
                    <span className="text-text-light dark:text-text-dark">{formatFechaHora(tareaData.fecha_completacion)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'notificaciones' && (
            <div className="p-4 sm:p-6 space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-icons text-blue-600 dark:text-blue-400">notifications_active</span>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                    Notificaciones Programadas
                  </h3>
                </div>

                {tareaData.notificacion_config ? (
                  <>
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-3 h-3 rounded-full ${tareaData.notificacion_config.habilitada
                          ? 'bg-green-500'
                          : 'bg-gray-400'
                          }`}></div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Estado: {tareaData.notificacion_config.habilitada ? 'Habilitadas' : 'Deshabilitadas'}
                        </span>
                      </div>
                    </div>

                    {tareaData.notificacion_config.habilitada && (
                      <>
                        {/* Intervalos configurados */}
                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Intervalos configurados:
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {tareaData.notificacion_config.intervalos_dias &&
                              tareaData.notificacion_config.intervalos_dias.length > 0 ? (
                              tareaData.notificacion_config.intervalos_dias.map(dias => (
                                <span
                                  key={dias}
                                  className="px-3 py-1.5 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded text-sm font-medium flex items-center gap-1"
                                >
                                  <span className="material-icons text-sm">schedule</span>
                                  {dias} día{dias !== 1 ? 's' : ''} antes
                                </span>
                              ))
                            ) : (
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                No hay intervalos configurados
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Próximas notificaciones */}
                        {tareaData.notificacion_config.proximas_notificaciones &&
                          tareaData.notificacion_config.proximas_notificaciones.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Calendario de notificaciones:
                              </h4>
                              <div className="space-y-2">
                                {tareaData.notificacion_config.proximas_notificaciones.map((notif, index) => {
                                  const fechaEnvio = new Date(notif.fecha_envio)
                                  const hoy = new Date()
                                  hoy.setHours(0, 0, 0, 0)
                                  const esFutura = fechaEnvio >= hoy

                                  return (
                                    <div
                                      key={index}
                                      className={`flex items-center justify-between p-3 rounded border ${notif.enviada
                                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                                        : esFutura
                                          ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                                          : 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700'
                                        }`}
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className={`material-icons text-sm ${notif.enviada
                                          ? 'text-green-600 dark:text-green-400'
                                          : esFutura
                                            ? 'text-blue-600 dark:text-blue-400'
                                            : 'text-gray-400'
                                          }`}>
                                          {notif.enviada ? 'check_circle' : esFutura ? 'schedule' : 'cancel'}
                                        </span>
                                        <div>
                                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                                            {notif.intervalo_dias} día{notif.intervalo_dias !== 1 ? 's' : ''} antes
                                          </p>
                                          <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {fechaEnvio.toLocaleDateString('es-ES', {
                                              year: 'numeric',
                                              month: 'long',
                                              day: 'numeric'
                                            })}
                                          </p>
                                        </div>
                                      </div>
                                      <div>
                                        {notif.enviada ? (
                                          <span className="text-xs px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded">
                                            Enviada
                                          </span>
                                        ) : esFutura ? (
                                          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded">
                                            Pendiente
                                          </span>
                                        ) : (
                                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300 rounded">
                                            Pasada
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}

                        {/* Notificaciones enviadas */}
                        {tareaData.notificacion_config.notificaciones_enviadas &&
                          Object.keys(tareaData.notificacion_config.notificaciones_enviadas).length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Historial de envíos:
                              </h4>
                              <div className="space-y-1">
                                {Object.entries(tareaData.notificacion_config.notificaciones_enviadas).map(([dias, fecha]) => (
                                  <div key={dias} className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                    <span className="material-icons text-xs text-green-600 dark:text-green-400">done</span>
                                    <span>
                                      {dias} día{dias !== '1' ? 's' : ''} antes - Enviada el {
                                        new Date(fecha).toLocaleDateString('es-ES', {
                                          year: 'numeric',
                                          month: 'short',
                                          day: 'numeric'
                                        })
                                      }
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                      </>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <span className="material-icons text-4xl text-gray-400 dark:text-gray-600 mb-2">
                      notifications_off
                    </span>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      No hay notificaciones configuradas para esta tarea
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      Las notificaciones se configuran al crear la tarea
                    </p>
                  </div>
                )}
              </div>

              {/* Info adicional */}
              <div className="bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <span className="material-icons text-sm text-blue-600 dark:text-blue-400 mt-0.5">info</span>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    <p className="mb-1">
                      Las notificaciones se envían automáticamente a las 9:00 AM según los intervalos configurados.
                    </p>
                    <p>
                      Reciben las notificaciones los responsables técnicos, la Dirección de la dependencia, la UOC y el/la Administrador/a de Contrato.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'etapas' && (
            <div className="p-4 sm:p-6 space-y-4">
              <TaskEtapasControl
                tarea={tareaData}
                onUpdate={() => {
                  cargarDetallesTarea()
                  onUpdate && onUpdate()
                }}
              />

              <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg">
                <TaskStateHistory tareaId={tareaData?.id || tarea?.id} />
              </div>
            </div>
          )}

          {activeTab === 'presentaciones' && showPresentacionesTab && (
            <div className="h-full bg-background-light dark:bg-background-dark">
              <PresentacionesTab
                tareaId={tareaData?.id || tarea?.id}
                onArchivarClick={() => setShowArchivarModal(true)}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark flex-shrink-0">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm sm:text-base border border-border-light dark:border-border-dark text-text-light dark:text-text-dark rounded-lg hover:bg-surface-light dark:hover:bg-surface-dark transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>

      {/* Modal de carga de archivos */}
      {showFileUpload && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4" onClick={() => setShowFileUpload(false)}>
          <div className="bg-surface-light dark:bg-surface-dark rounded-lg shadow-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="p-4 border-b border-border-light dark:border-border-dark flex justify-between items-center">
              <h3 className="text-lg font-semibold text-text-light dark:text-text-dark">
                Adjuntar archivos
              </h3>
              <button
                onClick={() => setShowFileUpload(false)}
                className="text-subtle-light dark:text-subtle-dark hover:text-text-light dark:hover:text-text-dark transition-colors p-2"
              >
                <span className="material-icons">close</span>
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                  Seleccionar archivos
                </label>
                <input
                  type="file"
                  onChange={handleArchivosChange}
                  className="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark"
                  multiple
                  accept="*/*"
                />
                {archivosSubir.length > 0 && (
                  <div className="mt-2 text-sm text-subtle-light dark:text-subtle-dark">
                    {archivosSubir.length} archivo(s) seleccionado(s)
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                  Descripción (opcional)
                </label>
                <input
                  type="text"
                  value={descripcionArchivo}
                  onChange={(e) => setDescripcionArchivo(e.target.value)}
                  className="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark"
                  placeholder="Descripción del archivo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                  Grupo (opcional)
                </label>
                <input
                  type="text"
                  value={descripcionGrupo}
                  onChange={(e) => setDescripcionGrupo(e.target.value)}
                  className="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark"
                  placeholder="Categoría o grupo"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border-light dark:border-border-dark flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowFileUpload(false)
                  setArchivosSubir([])
                  setDescripcionArchivo('')
                  setDescripcionGrupo('')
                }}
                className="px-4 py-2 text-sm border border-border-light dark:border-border-dark text-text-light dark:text-text-dark rounded-lg hover:bg-surface-light dark:hover:bg-surface-dark transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={subirArchivo}
                disabled={archivosSubir.length === 0 || loading}
                className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Subiendo...' : 'Subir archivos'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de previsualización de archivos */}
      {previsualizacionArchivo && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4" onClick={cerrarPrevisualizacion}>
          <div className="bg-surface-light dark:bg-surface-dark rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="p-4 border-b border-border-light dark:border-border-dark flex justify-between items-center">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-text-light dark:text-text-dark truncate">
                  {previsualizacionArchivo.nombre_original}
                </h3>
                <p className="text-sm text-subtle-light dark:text-subtle-dark">
                  {(previsualizacionArchivo.tamanio / 1024).toFixed(2)} KB
                </p>
              </div>
              <button
                onClick={cerrarPrevisualizacion}
                className="text-subtle-light dark:text-subtle-dark hover:text-text-light dark:hover:text-text-dark transition-colors p-2"
              >
                <span className="material-icons">close</span>
              </button>
            </div>

            {/* Content */}
            <div className="p-4 max-h-[calc(90vh-8rem)] overflow-auto">
              {previsualizacionArchivo.es_video ? (
                <video
                  controls
                  className="w-full max-h-[70vh] rounded"
                  src={getProtectedMediaSrcUrl(previsualizacionArchivo.url)}
                >
                  Tu navegador no soporta la reproducción de videos.
                </video>
              ) : previsualizacionArchivo.es_imagen ? (
                <img
                  src={getProtectedMediaSrcUrl(previsualizacionArchivo.url)}
                  alt={previsualizacionArchivo.nombre_original}
                  className="w-full max-h-[70vh] object-contain rounded"
                />
              ) : (
                <div className="text-center py-12">
                  <span className="material-icons text-6xl text-subtle-light dark:text-subtle-dark mb-4">
                    {getFileIcon(previsualizacionArchivo)}
                  </span>
                  <p className="text-text-light dark:text-text-dark mb-2">
                    Vista previa no disponible para este tipo de archivo
                  </p>
                  <p className="text-sm text-subtle-light dark:text-subtle-dark mb-4">
                    {previsualizacionArchivo.tipo_mime || 'Tipo de archivo desconocido'}
                  </p>
                  <button
                    onClick={() => downloadProtectedFile(previsualizacionArchivo.url, previsualizacionArchivo.nombre_original)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                  >
                    <span className="material-icons">download</span>
                    Descargar archivo
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border-light dark:border-border-dark flex justify-between items-center">
              <div className="text-sm text-subtle-light dark:text-subtle-dark">
                {previsualizacionArchivo.descripcion && (
                  <p className="mb-1">
                    <strong>Descripción:</strong> {previsualizacionArchivo.descripcion}
                  </p>
                )}
                {previsualizacionArchivo.descripcion_grupo && (
                  <p>
                    <strong>Grupo:</strong> {previsualizacionArchivo.descripcion_grupo}
                  </p>
                )}
              </div>
              <button
                onClick={() => downloadProtectedFile(previsualizacionArchivo.url, previsualizacionArchivo.nombre_original)}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-2"
              >
                <span className="material-icons text-lg">download</span>
                Descargar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Archivar Presentación */}
      <ArchivarPresentacionModal
        isOpen={showArchivarModal}
        onClose={() => setShowArchivarModal(false)}
        tareaId={tareaData?.id || tarea?.id}
        onSuccess={() => {
          cargarDetallesTarea()
          dispatch(showNotification({
            message: 'Presentación archivada correctamente',
            type: 'success'
          }))
        }}
      />
    </div>
  )
}

export default TaskDetailModal
