/**
 * Constantes compartidas del flujo de aprobación.
 * Fuente de verdad para labels de roles, etapas y estados, adaptados a una universidad pública:
 *
 *   Responsable Técnico → Dirección de la dependencia → UOC → Administrador/a de Contrato → Rectorado
 *
 * Los códigos internos (GERENTE, REVISION_GERENCIAL, ...) se mantienen por compatibilidad con la
 * base de datos y los permisos; lo que ve la persona usuaria sale de estas etiquetas.
 */

export const ROLE_LABELS = {
  RESPONSABLE: 'Responsable Técnico',
  GERENTE: 'Director/a de Dependencia',
  ANALISTA_COMPLIANCE: 'Analista de Contratos (UOC)',
  OFICIAL_COMPLIANCE: 'Administrador/a de Contrato',
}

export const ROLE_DESCRIPTIONS = {
  RESPONSABLE: 'Ejecuta y documenta las obligaciones de su dependencia (ej.: fiscal de obras, técnico de la unidad requirente)',
  GERENTE: 'Decano/a o Director/a: da el visto bueno a lo presentado por su dependencia',
  ANALISTA_COMPLIANCE: 'Unidad Operativa de Contrataciones: controla el cumplimiento técnico y documental',
  OFICIAL_COMPLIANCE: 'Designado/a por resolución: emite el dictamen y remite al Rectorado (Ley 7021/2022)',
}

export const ROLES_ORDENADOS = ['RESPONSABLE', 'GERENTE', 'ANALISTA_COMPLIANCE', 'OFICIAL_COMPLIANCE']

export const ETAPA_LABELS = {
  INICIO: 'Inicio',
  REVISION_GERENCIAL: 'Revisión de la Dirección',
  CONTROL_ANALISTA: 'Control de la UOC',
  CONTROL_OFICIAL: 'Control del Administrador',
}

export const ETAPAS_ORDENADAS = ['INICIO', 'REVISION_GERENCIAL', 'CONTROL_ANALISTA', 'CONTROL_OFICIAL']

/** Instancia final de aprobación (máxima autoridad de la universidad). */
export const AUTORIDAD = 'Rectorado'

export const getRoleLabel = (key) => ROLE_LABELS[key] || key || ''
export const getEtapaLabel = (key) => ETAPA_LABELS[key] || key || ''

// Estados organizados por etapa
export const TODOS_ESTADOS_ETAPAS = {
  'INICIO': [
    { key: 'PENDIENTE', label: 'Pendiente', icon: 'pending', color: 'yellow' },
    { key: 'EN_PROGRESO', label: 'En Progreso', icon: 'schedule', color: 'blue' },
    { key: 'REQUIERE_ATENCION', label: 'Requiere Atención', icon: 'error', color: 'red' },
    { key: 'OBSERVADO_GERENTE', label: 'Observado por la Dirección', icon: 'visibility', color: 'orange' }
  ],
  'REVISION_GERENCIAL': [
    { key: 'REVISION_GERENCIAL', label: 'En Revisión de la Dirección', icon: 'rate_review', color: 'blue' },
    { key: 'VALIDADO_GERENTE', label: 'Validado por la Dirección', icon: 'check_circle', color: 'green' },
    { key: 'OBSERVADO_ANALISTA', label: 'Observado por la UOC', icon: 'visibility', color: 'orange' }
  ],
  'CONTROL_ANALISTA': [
    { key: 'REVISION_ANALISTA', label: 'En Revisión de la UOC', icon: 'analytics', color: 'blue' },
    { key: 'EN_PROGRESO_ANALISTA', label: 'En Progreso (UOC)', icon: 'schedule', color: 'blue' },
    { key: 'PENDIENTE_VALIDACION_OFICIAL', label: 'Pendiente Validación del Administrador', icon: 'send', color: 'purple' },
    { key: 'OBSERVADO_OFICIAL', label: 'Observado por el Administrador', icon: 'visibility', color: 'orange' }
  ],
  'CONTROL_OFICIAL': [
    { key: 'PENDIENTE_VALIDACION', label: 'Pendiente Validación', icon: 'pending_actions', color: 'purple' },
    { key: 'VALIDADA', label: 'Validada', icon: 'check_circle', color: 'green' },
    { key: 'REMITIDO_AUTORIDAD', label: 'Remitido al Rectorado', icon: 'send', color: 'blue' },
    { key: 'OBSERVADO_AUTORIDAD', label: 'Observado por el Rectorado', icon: 'visibility', color: 'orange' },
    { key: 'APROBADO_AUTORIDAD', label: 'Aprobado por el Rectorado', icon: 'verified', color: 'green' },
    { key: 'RECHAZADO_AUTORIDAD', label: 'Rechazado por el Rectorado', icon: 'cancel', color: 'red' }
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
