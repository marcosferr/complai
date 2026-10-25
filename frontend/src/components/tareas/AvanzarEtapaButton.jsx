import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { avanzarEtapaTarea } from '@/store/slices/tareasSlice'
import { showNotification } from '@/store/slices/uiSlice'
import { ETAPA_LABELS } from '@/lib/estadoEtapaConstants'

const AvanzarEtapaButton = ({ tarea, onUpdate, className = '', variant = 'primary' }) => {
  const dispatch = useDispatch()
  const { user } = useSelector((state) => state.auth)

  const puedeAvanzar = () => {
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

    const tienePermisoEtapa = rolesPermisosPorEtapa[etapaActual]?.includes(role)
    const estadoPermiteAvanzar = estadosPermitidos[etapaActual]?.includes(estadoActual)

    return tienePermisoEtapa && estadoPermiteAvanzar
  }

  const getSiguienteEtapa = () => {
    const etapas = {
      'INICIO': { nombre: ETAPA_LABELS.REVISION_DIRECCION, codigo: 'REVISION_DIRECCION' },
      'REVISION_DIRECCION': { nombre: ETAPA_LABELS.CONTROL_UOC, codigo: 'CONTROL_UOC' },
      'CONTROL_UOC': { nombre: ETAPA_LABELS.CONTROL_ADMINISTRADOR, codigo: 'CONTROL_ADMINISTRADOR' },
      'CONTROL_ADMINISTRADOR': null,
    }
    return etapas[tarea?.etapa_actual]
  }

  const handleAvanzar = async () => {
    const siguienteEtapa = getSiguienteEtapa()
    
    if (!siguienteEtapa) return

    if (!confirm(`¿Estás seguro de avanzar esta tarea a ${siguienteEtapa.nombre}?`)) return

    try {
      await dispatch(avanzarEtapaTarea({ 
        tareaId: tarea.id, 
        observaciones: '' 
      })).unwrap()

      dispatch(showNotification({
        message: `Tarea avanzada a ${siguienteEtapa.nombre}`,
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

  if (!puedeAvanzar()) return null

  const siguienteEtapa = getSiguienteEtapa()
  if (!siguienteEtapa) return null

  const baseClasses = "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium"
  
  const variantClasses = {
    primary: "bg-success text-white hover:brightness-90",
    secondary: "bg-white text-success border-2 border-success hover:bg-success/10",
    small: "bg-success text-white hover:brightness-90 px-3 py-1.5 text-sm",
  }

  return (
    <button
      onClick={handleAvanzar}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      title={`Enviar a ${siguienteEtapa.nombre}`}
    >
      <span className="material-icons text-sm">arrow_forward</span>
      <span>Enviar a {siguienteEtapa.nombre}</span>
    </button>
  )
}

export default AvanzarEtapaButton
