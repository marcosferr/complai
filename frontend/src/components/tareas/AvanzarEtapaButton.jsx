import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { avanzarEtapaTarea } from '@/store/slices/tareasSlice'
import { showNotification } from '@/store/slices/uiSlice'

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
      'REVISION_GERENCIAL': ['VALIDADO_GERENTE'],
      'CONTROL_ANALISTA': ['PENDIENTE_VALIDACION_OFICIAL', 'EN_PROGRESO_ANALISTA'],
      'CONTROL_OFICIAL': [], // No hay siguiente etapa
    }

    // Verificar si el rol tiene permiso PARA ESA ETAPA ESPECÍFICA
    const rolesPermisosPorEtapa = {
      'INICIO': ['RESPONSABLE', 'GERENTE', 'OFICIAL_COMPLIANCE'],
      'REVISION_GERENCIAL': ['GERENTE', 'ANALISTA_COMPLIANCE', 'OFICIAL_COMPLIANCE'],
      'CONTROL_ANALISTA': ['ANALISTA_COMPLIANCE', 'OFICIAL_COMPLIANCE'],
      'CONTROL_OFICIAL': [],
    }

    const tienePermisoEtapa = rolesPermisosPorEtapa[etapaActual]?.includes(role)
    const estadoPermiteAvanzar = estadosPermitidos[etapaActual]?.includes(estadoActual)

    return tienePermisoEtapa && estadoPermiteAvanzar
  }

  const getSiguienteEtapa = () => {
    const etapas = {
      'INICIO': { nombre: 'Revisión Gerencial', codigo: 'REVISION_GERENCIAL' },
      'REVISION_GERENCIAL': { nombre: 'Control del Analista', codigo: 'CONTROL_ANALISTA' },
      'CONTROL_ANALISTA': { nombre: 'Control Oficial', codigo: 'CONTROL_OFICIAL' },
      'CONTROL_OFICIAL': null,
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
