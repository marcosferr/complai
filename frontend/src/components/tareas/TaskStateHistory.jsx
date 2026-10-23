import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchHistorialEstados } from '@/store/slices/tareasSlice'

const TaskStateHistory = ({ tareaId }) => {
  const dispatch = useDispatch()
  const { historialEstados, loading } = useSelector((state) => state.tareas)

  useEffect(() => {
    if (tareaId) {
      dispatch(fetchHistorialEstados(tareaId))
    }
  }, [tareaId, dispatch])

  const getEtapaColor = (etapa) => {
    const colors = {
      INICIO: 'blue',
      REVISION_GERENCIAL: 'green',
      CONTROL_ANALISTA: 'yellow',
      CONTROL_OFICIAL: 'red',
    }
    return colors[etapa] || 'gray'
  }

  const getTransitionIcon = (item) => {
    // Detectar tipo de transición por cambios de etapa
    if (item.etapa_anterior && item.etapa_nueva && item.etapa_anterior !== item.etapa_nueva) {
      // Avance de etapa
      if (item.etapa_anterior < item.etapa_nueva) {
        return <span className="material-icons text-green-500">arrow_forward</span>
      }
      // Devolución
      return <span className="material-icons text-orange-500">arrow_back</span>
    }
    
    // Estados finales
    if (item.estado_nuevo && (item.estado_nuevo.includes('APROBADO') || item.estado_nuevo.includes('VALIDADA'))) {
      return <span className="material-icons text-green-500">check_circle</span>
    }
    
    if (item.estado_nuevo && item.estado_nuevo.includes('OBSERVADO')) {
      return <span className="material-icons text-orange-500">warning</span>
    }
    
    // Cambio de estado normal
    return <span className="material-icons text-blue-500">schedule</span>
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('es-PY', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!historialEstados || historialEstados.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <span className="material-icons text-4xl mb-2 opacity-50">schedule</span>
        <p>No hay historial de cambios aún</p>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-5 space-y-5">
      <h3 className="text-lg font-semibold text-gray-800 mb-3">
        Historial de Estados
      </h3>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>

        {/* Timeline items */}
        <div className="space-y-5">
          {historialEstados.map((item, index) => (
            <div key={item.id} className="relative flex items-start pl-14">
              {/* Icon */}
              <div className="absolute left-0 flex items-center justify-center w-12 h-12 bg-white rounded-full border-2 border-gray-200">
                {getTransitionIcon(item)}
              </div>

              {/* Content card */}
              <div className="flex-1 bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    {/* Etapas y estados */}
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {item.etapa_anterior && (
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-${getEtapaColor(item.etapa_anterior)}-100 text-${getEtapaColor(item.etapa_anterior)}-800`}>
                          {item.etapa_display_anterior || item.etapa_anterior}
                        </span>
                      )}
                      
                      {item.etapa_anterior !== item.etapa_nueva && (
                        <span className="material-icons text-gray-400">arrow_forward</span>
                      )}
                      
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-${getEtapaColor(item.etapa_nueva)}-100 text-${getEtapaColor(item.etapa_nueva)}-800`}>
                        {item.etapa_display_nueva || item.etapa_nueva}
                      </span>
                    </div>

                    {/* Estado cambio */}
                    {item.estado_anterior !== item.estado_nuevo && (
                      <div className="text-sm text-gray-600 mb-1">
                        <span className="text-gray-400">{item.estado_anterior}</span>
                        <span className="material-icons inline mx-2 text-gray-400 text-sm align-middle">arrow_forward</span>
                        <span className="font-medium text-gray-700">{item.estado_nuevo}</span>
                      </div>
                    )}
                  </div>

                  {/* Fecha */}
                  <div className="text-xs text-gray-500 ml-4 flex items-center whitespace-nowrap">
                    <span className="material-icons mr-1 text-sm">schedule</span>
                    {formatDate(item.fecha_cambio)}
                  </div>
                </div>

                {/* Usuario */}
                <div className="flex items-center text-sm text-gray-600 mb-2">
                  <span className="material-icons mr-2">person</span>
                  <span className="font-medium">{item.usuario_nombre}</span>
                  <span className="mx-2 text-gray-400">•</span>
                  <span className="text-xs px-2 py-0.5 bg-gray-100 rounded">
                    {item.rol_usuario_display || item.rol_usuario}
                  </span>
                </div>

                {/* Observaciones */}
                {item.observaciones && (
                  <div className="mt-3 p-3 bg-gray-50 rounded border-l-4 border-blue-400">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {item.observaciones}
                    </p>
                  </div>
                )}

                {/* Documento adjunto */}
                {item.documento_url && (
                  <div className="mt-3">
                    <a
                      href={item.documento_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      <span className="material-icons mr-2 text-base">description</span>
                      Ver documento adjunto
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer info */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          Total de {historialEstados.length} cambio{historialEstados.length !== 1 ? 's' : ''} registrado{historialEstados.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  )
}

export default TaskStateHistory
