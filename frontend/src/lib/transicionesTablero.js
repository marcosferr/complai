/**
 * Reglas para mover una obligación de columna en el tablero (arrastrar y soltar).
 *
 * Espejo de `backend/apps/tareas/transiciones.py`, que es la autoridad: el endpoint
 * `PATCH /tareas/{id}/estado-etapa/` vuelve a validar todo. Acá solo se decide qué
 * columnas se ofrecen mientras se arrastra, para no invitar a un movimiento que el
 * servidor va a rechazar.
 *
 * La lista de estados posibles no se duplica: sale de `tarea.estados_disponibles`, que
 * el backend arma para el usuario que pregunta. Lo que se repite acá es lo que esa lista
 * no cubre (estar asignado, ser del área), con los mismos criterios del endpoint.
 */
import { TODOS_ESTADOS_ETAPAS } from './estadoEtapaConstants'

// Roles (además del Oficial) que pueden cambiar el estado en cada etapa.
export const ROLES_POR_ETAPA = {
  INICIO: ['RESPONSABLE', 'GERENTE'],
  REVISION_GERENCIAL: ['GERENTE', 'ANALISTA_COMPLIANCE'],
  CONTROL_ANALISTA: ['ANALISTA_COMPLIANCE'],
  CONTROL_OFICIAL: [],
}

export const ETAPA_DE_ESTADO = Object.fromEntries(
  Object.entries(TODOS_ESTADOS_ETAPAS).flatMap(([etapa, estados]) =>
    estados.map((estado) => [estado.key, etapa])
  )
)

const codigosDisponibles = (tarea) =>
  (tarea?.estados_disponibles || []).map((estado) =>
    Array.isArray(estado) ? estado[0] : estado
  )

/**
 * ¿Puede `user` soltar `tarea` en la columna del estado `estadoDestino`?
 */
export const puedeSoltarEn = (tarea, estadoDestino, user) => {
  if (!tarea || !user || !estadoDestino) return false
  if (estadoDestino === tarea.estado_etapa) return false
  if (!codigosDisponibles(tarea).includes(estadoDestino)) return false

  if (user.role === 'OFICIAL_COMPLIANCE') return true

  if (!(ROLES_POR_ETAPA[tarea.etapa_actual] || []).includes(user.role)) return false

  if (user.role === 'RESPONSABLE') {
    return (tarea.responsables || []).map(Number).includes(Number(user.id))
  }
  if (user.role === 'GERENTE') {
    return tarea.area != null && Number(tarea.area) === Number(user.area)
  }
  return true
}

/**
 * Columnas (de las visibles) donde el usuario puede soltar la tarea.
 * Vacío = la tarjeta no se puede arrastrar.
 */
export const destinosPermitidos = (tarea, user, columnas) =>
  (columnas || []).filter((estado) => puedeSoltarEn(tarea, estado, user))

/**
 * Movimiento optimista: la tarea pasa al estado (y a la etapa de ese estado) antes de
 * que el servidor conteste. Devuelve una lista nueva; no toca la original.
 */
export const aplicarMovimiento = (tareas, tareaId, estadoDestino) =>
  tareas.map((tarea) =>
    tarea.id === tareaId
      ? {
          ...tarea,
          estado_etapa: estadoDestino,
          etapa_actual: ETAPA_DE_ESTADO[estadoDestino] || tarea.etapa_actual,
        }
      : tarea
  )

/**
 * Deshace el movimiento de una sola tarea (la que falló), sin pisar lo que haya
 * cambiado en las demás mientras tanto.
 */
export const reemplazarTarea = (tareas, tareaNueva) =>
  tareas.map((tarea) => (tarea.id === tareaNueva.id ? tareaNueva : tarea))

/**
 * Mensaje para mostrar cuando el servidor rechaza el cambio.
 */
export const mensajeDeError = (error) => {
  const data = error?.response?.data
  if (typeof data?.error === 'string' && data.error) return data.error
  if (typeof data?.detail === 'string' && data.detail) return data.detail
  if (!error?.response) {
    return 'No se pudo guardar el cambio de estado. Revisá tu conexión e intentá de nuevo.'
  }
  return 'No se pudo cambiar el estado de la obligación.'
}
