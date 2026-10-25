import React, { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  cambiarEstadoEtapaTarea,
  avanzarEtapaTarea,
  devolverTareaConObservaciones,
  registrarRemisionRectoradoTarea,
  cambiarEtapaDirecto,
} from '@/store/slices/tareasSlice'
import { showNotification } from '@/store/slices/uiSlice'
import AvanzarEtapaButton from './AvanzarEtapaButton'
import { ETAPA_LABELS, ETAPAS_ORDENADAS, TODOS_ESTADOS_ETAPAS, getEstadoEtapaLabel } from '@/lib/estadoEtapaConstants'

const TaskEtapasControl = ({ tarea, onUpdate }) => {
  const dispatch = useDispatch()
  const { user } = useSelector((state) => state.auth)
  
  const [showEstadoModal, setShowEstadoModal] = useState(false)
  const [showDevolverModal, setShowDevolverModal] = useState(false)
  const [showRectoradoModal, setShowRectoradoModal] = useState(false)
  const [showCambiarEtapaModal, setShowCambiarEtapaModal] = useState(false)
  
  const [estadoSeleccionado, setEstadoSeleccionado] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [documentoAdjunto, setDocumentoAdjunto] = useState(null)
  
  // Datos cambio directo de etapa
  const [etapaDestino, setEtapaDestino] = useState('')
  const [estadoDestino, setEstadoDestino] = useState('')
  
  // Datos del Rectorado
  const [fechaRemisionRectorado, setFechaRemisionRectorado] = useState('')
  const [numeroExpedienteRectorado, setNumeroExpedienteRectorado] = useState('')
  const [documentoRectorado, setDocumentoRectorado] = useState(null)

  const getEtapaColor = (etapa) => {
    const colors = {
      INICIO: 'blue',
      REVISION_DIRECCION: 'green',
      CONTROL_UOC: 'yellow',
      CONTROL_ADMINISTRADOR: 'red',
    }
    return colors[etapa] || 'gray'
  }

  const handleCambiarEstado = async (e) => {
    e.preventDefault()
    
    try {
      const data = {
        estado_etapa: estadoSeleccionado,
        observaciones: observaciones || undefined,
        documento_adjunto: documentoAdjunto || undefined,
      }

      await dispatch(cambiarEstadoEtapaTarea({ 
        tareaId: tarea.id, 
        data 
      })).unwrap()

      dispatch(showNotification({
        message: 'Estado actualizado exitosamente',
        type: 'success',
      }))

      setShowEstadoModal(false)
      resetForm()
      onUpdate && onUpdate()
    } catch (error) {
      dispatch(showNotification({
        message: error.message || 'Error al cambiar estado',
        type: 'error',
      }))
    }
  }

  const handleAvanzarEtapa = async () => {
    if (!confirm('¿Estás seguro de avanzar esta tarea a la siguiente etapa?')) return

    try {
      await dispatch(avanzarEtapaTarea({ 
        tareaId: tarea.id, 
        observaciones: '' 
      })).unwrap()

      dispatch(showNotification({
        message: 'Tarea avanzada a la siguiente etapa',
        type: 'success',
      }))

      onUpdate && onUpdate()
    } catch (error) {
      dispatch(showNotification({
        message: error.message || 'Error al avanzar etapa',
        type: 'error',
      }))
    }
  }

  const handleDevolver = async (e) => {
    e.preventDefault()
    
    if (!observaciones.trim()) {
      dispatch(showNotification({
        message: 'Las observaciones son requeridas para devolver',
        type: 'warning',
      }))
      return
    }

    try {
      const data = {
        observaciones,
        documento_adjunto: documentoAdjunto || undefined,
      }

      await dispatch(devolverTareaConObservaciones({ 
        tareaId: tarea.id, 
        data 
      })).unwrap()

      dispatch(showNotification({
        message: 'Tarea devuelta con observaciones',
        type: 'success',
      }))

      setShowDevolverModal(false)
      resetForm()
      onUpdate && onUpdate()
    } catch (error) {
      dispatch(showNotification({
        message: error.message || 'Error al devolver tarea',
        type: 'error',
      }))
    }
  }

  const handleRegistrarRectorado = async (e) => {
    e.preventDefault()
    
    if (!fechaRemisionRectorado) {
      dispatch(showNotification({
        message: 'La fecha de remisión es requerida',
        type: 'warning',
      }))
      return
    }

    try {
      const data = {
        fecha_remision_rectorado: fechaRemisionRectorado,
        numero_expediente_rectorado: numeroExpedienteRectorado || undefined,
        documento_rectorado: documentoRectorado || undefined,
      }

      await dispatch(registrarRemisionRectoradoTarea({ 
        tareaId: tarea.id, 
        data 
      })).unwrap()

      dispatch(showNotification({
        message: 'Remisión al Rectorado registrada exitosamente',
        type: 'success',
      }))

      setShowRectoradoModal(false)
      resetForm()
      onUpdate && onUpdate()
    } catch (error) {
      dispatch(showNotification({
        message: error.message || 'Error al registrar remisión al Rectorado',
        type: 'error',
      }))
    }
  }

  const resetForm = () => {
    setEstadoSeleccionado('')
    setObservaciones('')
    setDocumentoAdjunto(null)
    setFechaRemisionRectorado('')
    setNumeroExpedienteRectorado('')
    setDocumentoRectorado(null)
    setEtapaDestino('')
    setEstadoDestino('')
  }

  const handleCambiarEtapaDirecto = async (e) => {
    e.preventDefault()
    
    if (!etapaDestino || !estadoDestino) {
      dispatch(showNotification({
        message: 'Debe seleccionar etapa y estado de destino',
        type: 'warning',
      }))
      return
    }

    try {
      const data = {
        etapa_destino: etapaDestino,
        estado_destino: estadoDestino,
        observaciones: observaciones || undefined,
      }

      await dispatch(cambiarEtapaDirecto({ 
        tareaId: tarea.id, 
        data 
      })).unwrap()

      dispatch(showNotification({
        message: 'Etapa cambiada exitosamente',
        type: 'success',
      }))

      setShowCambiarEtapaModal(false)
      resetForm()
      onUpdate && onUpdate()
    } catch (error) {
      dispatch(showNotification({
        message: error.message || 'Error al cambiar etapa',
        type: 'error',
      }))
    }
  }

  const puedeAvanzarEtapa = () => {
    const role = user?.role
    const etapaActual = tarea?.etapa_actual
    const estadoActual = tarea?.estado_etapa
    
    // Definir estados que permiten avanzar por etapa
    const estadosPermitidos = {
      'INICIO': ['EN_PROGRESO', 'REQUIERE_ATENCION', 'PENDIENTE'],
      'REVISION_DIRECCION': ['VALIDADO_DIRECCION'],
      'CONTROL_UOC': ['PENDIENTE_VALIDACION_ADMIN', 'EN_PROGRESO_UOC'],
      'CONTROL_ADMINISTRADOR': [], // No hay siguiente etapa
    }
    
    // Verificar si el rol tiene permiso PARA ESA ETAPA ESPECÍFICA
    const rolesPermisosPorEtapa = {
      'INICIO': ['RESPONSABLE', 'DIRECTOR', 'ADMINISTRADOR_CONTRATO'],
      'REVISION_DIRECCION': ['DIRECTOR', 'ANALISTA_UOC', 'ADMINISTRADOR_CONTRATO'],
      'CONTROL_UOC': ['ANALISTA_UOC', 'ADMINISTRADOR_CONTRATO'],
      'CONTROL_ADMINISTRADOR': [],
    }
    
    // El usuario debe tener permiso para la etapa actual Y el estado debe permitir avanzar
    const tienePermisoEtapa = rolesPermisosPorEtapa[etapaActual]?.includes(role)
    const estadoPermiteAvanzar = estadosPermitidos[etapaActual]?.includes(estadoActual)
    
    return tienePermisoEtapa && estadoPermiteAvanzar
  }

  const puedeCambiarEstado = () => {
    const role = user?.role
    const etapaActual = tarea?.etapa_actual
    
    // Definir qué roles pueden cambiar estados en cada etapa
    const rolesPermisosPorEtapa = {
      'INICIO': ['RESPONSABLE', 'DIRECTOR', 'ADMINISTRADOR_CONTRATO'],
      'REVISION_DIRECCION': ['DIRECTOR', 'ANALISTA_UOC', 'ADMINISTRADOR_CONTRATO'],
      'CONTROL_UOC': ['ANALISTA_UOC', 'ADMINISTRADOR_CONTRATO'],
      'CONTROL_ADMINISTRADOR': ['ADMINISTRADOR_CONTRATO'],
    }
    
    return rolesPermisosPorEtapa[etapaActual]?.includes(role) || false
  }

  const getSiguienteEtapa = () => {
    const etapas = {
      'INICIO': ETAPA_LABELS.REVISION_DIRECCION,
      'REVISION_DIRECCION': ETAPA_LABELS.CONTROL_UOC,
      'CONTROL_UOC': ETAPA_LABELS.CONTROL_ADMINISTRADOR,
      'CONTROL_ADMINISTRADOR': null,
    }
    return etapas[tarea?.etapa_actual]
  }

  const puedeCambiarEtapaDirecto = () => {
    return user?.role === 'ADMINISTRADOR_CONTRATO'
  }

  const puedeDevolver = () => {
    const role = user?.role
    return ['DIRECTOR', 'ANALISTA_UOC', 'ADMINISTRADOR_CONTRATO'].includes(role)
  }

  const puedeRegistrarRectorado = () => {
    return user?.role === 'ADMINISTRADOR_CONTRATO' && tarea.etapa_actual === 'CONTROL_ADMINISTRADOR'
  }

  if (!tarea) return null

  return (
    <div className="space-y-4">
      {/* Etapa actual */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Etapa Actual
            </label>
            <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-${getEtapaColor(tarea.etapa_actual)}-100 text-${getEtapaColor(tarea.etapa_actual)}-800`}>
              {tarea.etapa_display || tarea.etapa_actual}
            </span>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Estado
            </label>
            <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-800">
              {tarea.estado_etapa_display || getEstadoEtapaLabel(tarea.estado_etapa)}
            </span>
          </div>
        </div>

        {/* Estados disponibles */}
        {tarea.estados_disponibles && tarea.estados_disponibles.length > 0 && puedeCambiarEstado() && (
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Cambiar estado
            </label>
            <select
              value={estadoSeleccionado}
              onChange={(e) => setEstadoSeleccionado(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Seleccionar estado...</option>
              {tarea.estados_disponibles.map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
            
            {estadoSeleccionado && (
              <button
                onClick={() => setShowEstadoModal(true)}
                className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <span className="material-icons text-sm">check_circle</span>
                Actualizar Estado
              </button>
            )}
          </div>
        )}

        {/* Acciones */}
        <div className="flex flex-wrap gap-2">
          {puedeCambiarEtapaDirecto() && (
            <button
              onClick={() => setShowCambiarEtapaModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <span className="material-icons text-sm">swap_horiz</span>
              Cambiar Etapa
            </button>
          )}
          
          {/* Botón de avanzar etapa reutilizable */}
          <AvanzarEtapaButton tarea={tarea} onUpdate={onUpdate} variant="primary" />

          {puedeDevolver() && tarea.etapa_actual !== 'INICIO' && (
            <button
              onClick={() => setShowDevolverModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              <span className="material-icons text-sm">arrow_back</span>
              Devolver con Observaciones
            </button>
          )}

          {puedeRegistrarRectorado() && (
            <button
              onClick={() => setShowRectoradoModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <span className="material-icons text-sm">send</span>
              Registrar Remisión al Rectorado
            </button>
          )}
        </div>
      </div>

      {/* Información del Rectorado (si existe) */}
      {tarea.fecha_remision_rectorado && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
            <span className="material-icons text-base">send</span>
            Información del Rectorado
          </h4>
          <div className="space-y-1 text-sm text-blue-800">
            <p><strong>Fecha de remisión:</strong> {new Date(tarea.fecha_remision_rectorado).toLocaleDateString('es-PY')}</p>
            {tarea.numero_expediente_rectorado && (
              <p><strong>Número de expediente:</strong> {tarea.numero_expediente_rectorado}</p>
            )}
            {tarea.documento_rectorado_url && (
              <a
                href={tarea.documento_rectorado_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-blue-600 hover:text-blue-800 hover:underline"
              >
                Ver documento del Rectorado
              </a>
            )}
          </div>
        </div>
      )}

      {/* Modal: Cambiar Estado */}
      {showEstadoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Cambiar Estado</h3>
            <form onSubmit={handleCambiarEstado}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observaciones (opcional)
                </label>
                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Agregar observaciones sobre el cambio..."
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Documento adjunto (opcional)
                </label>
                <input
                  type="file"
                  onChange={(e) => setDocumentoAdjunto(e.target.files[0])}
                  className="w-full"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowEstadoModal(false)
                    resetForm()
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Devolver */}
      {showDevolverModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-orange-600">
              <span className="material-icons">warning</span>
              Devolver con Observaciones
            </h3>
            <form onSubmit={handleDevolver}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observaciones <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  rows={4}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  placeholder="Describe las correcciones necesarias..."
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Documento adjunto (opcional)
                </label>
                <input
                  type="file"
                  onChange={(e) => setDocumentoAdjunto(e.target.files[0])}
                  className="w-full"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowDevolverModal(false)
                    resetForm()
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                >
                  Devolver
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Registrar remisión al Rectorado */}
      {showRectoradoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-red-600">
              <span className="material-icons">send</span>
              Registrar Remisión al Rectorado
            </h3>
            <form onSubmit={handleRegistrarRectorado}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de remisión <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={fechaRemisionRectorado}
                  onChange={(e) => setFechaRemisionRectorado(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número de expediente (opcional)
                </label>
                <input
                  type="text"
                  value={numeroExpedienteRectorado}
                  onChange={(e) => setNumeroExpedienteRectorado(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  placeholder="EXP-2025-001"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Documento del Rectorado (opcional)
                </label>
                <input
                  type="file"
                  onChange={(e) => setDocumentoRectorado(e.target.files[0])}
                  className="w-full"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowRectoradoModal(false)
                    resetForm()
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Registrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cambiar Etapa Directo (Administrador/a de Contrato) */}
      {showCambiarEtapaModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Cambiar Etapa
              </h3>
              <button
                onClick={() => {
                  setShowCambiarEtapaModal(false)
                  resetForm()
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="material-icons">close</span>
              </button>
            </div>

            <form onSubmit={handleCambiarEtapaDirecto}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Etapa de Destino *
                </label>
                <select
                  value={etapaDestino}
                  onChange={(e) => {
                    setEtapaDestino(e.target.value)
                    setEstadoDestino('') // Reset estado cuando cambia etapa
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                >
                  <option value="">Seleccionar etapa...</option>
                  {ETAPAS_ORDENADAS.map(e => (
                    <option key={e} value={e}>{ETAPA_LABELS[e]}</option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estado de Destino *
                </label>
                <select
                  value={estadoDestino}
                  onChange={(e) => setEstadoDestino(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                  disabled={!etapaDestino}
                >
                  <option value="">Seleccionar estado...</option>
                  {(TODOS_ESTADOS_ETAPAS[etapaDestino] || []).map(e => (
                    <option key={e.key} value={e.key}>{e.label}</option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observaciones (opcional)
                </label>
                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  rows="3"
                  placeholder="Motivo del cambio de etapa..."
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowCambiarEtapaModal(false)
                    resetForm()
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Cambiar Etapa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default TaskEtapasControl
