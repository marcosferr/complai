/**
 * Constantes compartidas para el sistema de estados por etapa de tareas.
 * Fuente de verdad para labels, colores e iconos de los 16 estado_etapa values.
 */

// Estados organizados por etapa
export const TODOS_ESTADOS_ETAPAS = {
  'INICIO': [
    { key: 'PENDIENTE', label: 'Pendiente', icon: 'pending', color: 'yellow' },
    { key: 'EN_PROGRESO', label: 'En Progreso', icon: 'schedule', color: 'blue' },
    { key: 'REQUIERE_ATENCION', label: 'Requiere Atención', icon: 'error', color: 'red' },
    { key: 'OBSERVADO_GERENTE', label: 'Observado Gerente', icon: 'visibility', color: 'orange' }
  ],
  'REVISION_GERENCIAL': [
    { key: 'REVISION_GERENCIAL', label: 'Revisión Gerencial', icon: 'rate_review', color: 'blue' },
    { key: 'VALIDADO_GERENTE', label: 'Validado por Gerente', icon: 'check_circle', color: 'green' },
    { key: 'OBSERVADO_ANALISTA', label: 'Observado Analista', icon: 'visibility', color: 'orange' }
  ],
  'CONTROL_ANALISTA': [
    { key: 'REVISION_ANALISTA', label: 'En Revisión del Analista', icon: 'analytics', color: 'blue' },
    { key: 'EN_PROGRESO_ANALISTA', label: 'En Progreso Analista', icon: 'schedule', color: 'blue' },
    { key: 'PENDIENTE_VALIDACION_OFICIAL', label: 'Pendiente Validación Oficial', icon: 'send', color: 'purple' },
    { key: 'OBSERVADO_OFICIAL', label: 'Observado Oficial', icon: 'visibility', color: 'orange' }
  ],
  'CONTROL_OFICIAL': [
    { key: 'PENDIENTE_VALIDACION', label: 'Pendiente Validación', icon: 'pending_actions', color: 'purple' },
    { key: 'VALIDADA', label: 'Validada', icon: 'check_circle', color: 'green' },
    { key: 'REMITIDO_AUTORIDAD', label: 'Remitido a la Autoridad', icon: 'send', color: 'blue' },
    { key: 'OBSERVADO_AUTORIDAD', label: 'Observado por la Autoridad', icon: 'visibility', color: 'orange' },
    { key: 'APROBADO_AUTORIDAD', label: 'Aprobado por la Autoridad', icon: 'verified', color: 'green' },
    { key: 'RECHAZADO_AUTORIDAD', label: 'Rechazado por la Autoridad', icon: 'cancel', color: 'red' }
  ]
}

// Mapa de color semántico a clases Tailwind
const COLOR_CLASSES = {
  yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
}

// Mapa plano: key → { label, color, icon, classes }
const _flatMap = {}
for (const estados of Object.values(TODOS_ESTADOS_ETAPAS)) {
  for (const estado of estados) {
    _flatMap[estado.key] = {
      label: estado.label,
      color: estado.color,
      icon: estado.icon,
      classes: COLOR_CLASSES[estado.color] || COLOR_CLASSES.yellow,
    }
  }
}
export const ESTADO_ETAPA_MAP = _flatMap

/**
 * Obtener el label legible de un estado_etapa.
 * @param {string} key - Valor de estado_etapa (ej: 'PENDIENTE', 'VALIDADA')
 * @returns {string}
 */
export const getEstadoEtapaLabel = (key) => {
  return ESTADO_ETAPA_MAP[key]?.label || key || ''
}

/**
 * Obtener las clases Tailwind para un badge de estado_etapa.
 * @param {string} key - Valor de estado_etapa
 * @returns {string}
 */
export const getEstadoEtapaClasses = (key) => {
  return ESTADO_ETAPA_MAP[key]?.classes || COLOR_CLASSES.yellow
}
