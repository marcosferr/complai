/**
 * Tutorial step configurations for different roles
 * All content is in Spanish as per project requirements
 */

// Role constants for consistency
export const ROLES = {
  OFICIAL_COMPLIANCE: 'OFICIAL_COMPLIANCE',
  ANALISTA_COMPLIANCE: 'ANALISTA_COMPLIANCE',
  GERENTE: 'GERENTE',
  RESPONSABLE: 'RESPONSABLE'
}

// Common steps available to all roles
const commonSidebarSteps = [
  {
    target: '[data-tutorial="sidebar-logo"]',
    content: '¡Bienvenido a UNI Contratos! Este es el sistema de la Universidad Nacional de Itapúa para administrar contratos y dar seguimiento a obligaciones, plazos y entregables. Te guiaremos por las principales funciones.',
    disableBeacon: true,
    placement: 'right',
    title: '🎉 Bienvenido'
  },
  {
    target: '[data-tutorial="sidebar-dashboard"]',
    content: 'Este es tu panel principal. Aquí encontrarás un resumen de todas las actividades, métricas clave y el estado general del cumplimiento.',
    placement: 'right',
    title: '📊 Panel principal'
  },
  {
    target: '[data-tutorial="sidebar-tareas"]',
    content: 'En Obligaciones puedes ver y gestionar todas las tareas de cumplimiento asignadas. Aquí puedes dar seguimiento a las actividades pendientes.',
    placement: 'right',
    title: '✅ Obligaciones'
  },
  {
    target: '[data-tutorial="sidebar-calendario"]',
    content: 'El Calendario te muestra todas las fechas importantes, vencimientos y eventos relacionados con el cumplimiento regulatorio.',
    placement: 'right',
    title: '📅 Calendario'
  },
  {
    target: '[data-tutorial="sidebar-notificaciones"]',
    content: 'Aquí recibirás alertas y notificaciones sobre vencimientos próximos, nuevas tareas asignadas y actualizaciones importantes.',
    placement: 'right',
    title: '🔔 Notificaciones'
  }
]

// Steps only for OFICIAL_COMPLIANCE and ANALISTA_COMPLIANCE
const complianceOfficerSteps = [
  {
    target: '[data-tutorial="sidebar-documentos"]',
    content: 'En Documentos de Compliance puedes administrar todos los documentos legales, contratos, políticas y normativas de la organización. Aquí subes y gestionas los documentos.',
    placement: 'right',
    title: '📄 Documentos de Compliance'
  },
  {
    target: '[data-tutorial="sidebar-auditorias"]',
    content: 'La sección de Compliance te permite programar y gestionar auditorías de cumplimiento, crear planes de acción y hacer seguimiento.',
    placement: 'right',
    title: '🔍 Compliance'
  },
  {
    target: '[data-tutorial="sidebar-usuarios"]',
    content: 'En Gestión de Usuarios puedes administrar los usuarios del sistema, asignar roles y configurar las áreas de responsabilidad.',
    placement: 'right',
    title: '👥 Gestión de Usuarios'
  }
]

// User profile section
const userProfileSteps = [
  {
    target: '[data-tutorial="sidebar-user-profile"]',
    content: 'Este es tu perfil de usuario. Puedes ver tu información y desde aquí cerrar sesión cuando lo necesites.',
    placement: 'right',
    title: '👤 Tu Perfil'
  },
  {
    target: '[data-tutorial="sidebar-logout"]',
    content: 'Usa este botón para cerrar tu sesión de forma segura cuando termines de trabajar.',
    placement: 'right',
    title: '🚪 Cerrar Sesión'
  }
]

// Tutorial help button
const tutorialHelpStep = [
  {
    target: '[data-tutorial="tutorial-help-button"]',
    content: '¡Listo! Si necesitas ver este tutorial nuevamente, puedes hacer clic en este botón de ayuda en cualquier momento.',
    placement: 'left',
    title: '❓ Ayuda'
  }
]

/**
 * Get sidebar tutorial steps based on user role
 * @param {string} role - User role (OFICIAL_COMPLIANCE, ANALISTA_COMPLIANCE, GERENTE, RESPONSABLE)
 * @returns {Array} Array of tutorial steps
 */
export const getSidebarSteps = (role) => {
  let steps = [...commonSidebarSteps]
  
  // Add compliance officer specific steps
  if (role === ROLES.OFICIAL_COMPLIANCE || role === ROLES.ANALISTA_COMPLIANCE) {
    // Insert compliance officer steps after the tareas step (index 2)
    steps.splice(3, 0, ...complianceOfficerSteps)
  }
  
  // Add user profile and tutorial help steps at the end
  steps = [...steps, ...userProfileSteps, ...tutorialHelpStep]
  
  return steps
}

// Document tutorial steps - for the Documentos Legales page
export const documentosTutorialSteps = [
  {
    target: '[data-tutorial="documentos-header"]',
    content: '¡Bienvenido a la sección de Documentos de Compliance! Aquí puedes gestionar todos los documentos legales de tu organización.',
    disableBeacon: true,
    placement: 'bottom',
    title: '📄 Documentos de Compliance'
  },
  {
    target: '[data-tutorial="documentos-upload-button"]',
    content: 'Usa este botón para subir nuevos documentos. Puedes subir contratos, políticas, normativas y otros documentos legales en formato PDF.',
    placement: 'left',
    title: '📤 Subir Documento'
  },
  {
    target: '[data-tutorial="documentos-search"]',
    content: 'Utiliza la barra de búsqueda para encontrar documentos por título, tipo o cualquier texto.',
    placement: 'bottom',
    title: '🔍 Buscar Documentos'
  },
  {
    target: '[data-tutorial="documentos-list"]',
    content: 'Esta es la lista de todos tus documentos. Haz clic en cualquier documento para ver sus detalles y cláusulas.',
    placement: 'right',
    title: '📋 Lista de Documentos'
  },
  {
    target: '[data-tutorial="documento-detail"]',
    content: 'Cuando seleccionas un documento, aquí se muestran todos sus detalles: título, estado, tipo y etiquetas.',
    placement: 'left',
    title: '📝 Detalles del Documento'
  },
  {
    target: '[data-tutorial="documento-tabs"]',
    content: 'Usa estas pestañas para navegar entre: Cláusulas (las secciones del documento), Grafo (visualización de relaciones), Transcripción, Relaciones y Detalles.',
    placement: 'bottom',
    title: '🗂️ Pestañas del Documento'
  },
  {
    target: '[data-tutorial="documento-view-button"]',
    content: 'Este botón te lleva a la vista completa del documento donde puedes ver todas las cláusulas y procesarlas con IA.',
    placement: 'bottom',
    title: '👁️ Vista Documento'
  },
  {
    target: '[data-tutorial="documento-pin-button"]',
    content: 'Puedes fijar documentos importantes para que aparezcan siempre al inicio de la lista.',
    placement: 'bottom',
    title: '📌 Fijar Documento'
  }
]

// Clause management tutorial steps
export const clausulasTutorialSteps = [
  {
    target: '[data-tutorial="clausulas-tab"]',
    content: 'Las cláusulas son las secciones o artículos de tus documentos. Aquí puedes ver todas las cláusulas extraídas.',
    disableBeacon: true,
    placement: 'bottom',
    title: '📋 Cláusulas'
  },
  {
    target: '[data-tutorial="clausula-create-button"]',
    content: 'Usa este botón para crear una nueva cláusula manualmente. También puedes crear cláusulas a partir de la extracción con IA.',
    placement: 'left',
    title: '➕ Crear Cláusula'
  },
  {
    target: '[data-tutorial="clausula-card"]',
    content: 'Cada tarjeta representa una cláusula. Puedes ver su título, categoría, importancia y si genera obligaciones.',
    placement: 'right',
    title: '📄 Tarjeta de Cláusula'
  },
  {
    target: '[data-tutorial="clausula-tarea-button"]',
    content: 'Este botón te permite crear una Obligación (tarea de cumplimiento) a partir de la cláusula.',
    placement: 'left',
    title: '✅ Crear Obligación'
  },
  {
    target: '[data-tutorial="clausula-relacion-button"]',
    content: 'Aquí puedes vincular esta cláusula con otras cláusulas del mismo documento o de otros documentos relacionados.',
    placement: 'left',
    title: '🔗 Vincular Cláusulas'
  }
]

// Document view tutorial (detailed document view)
export const documentViewTutorialSteps = [
  {
    target: '[data-tutorial="docview-header"]',
    content: 'Esta es la vista detallada del documento. Aquí puedes ver toda la información, procesar con IA y gestionar cláusulas.',
    disableBeacon: true,
    placement: 'bottom',
    title: '📄 Vista de Documento'
  },
  {
    target: '[data-tutorial="docview-reprocess"]',
    content: 'El botón Reprocesar envía el documento a la IA para extraer cláusulas automáticamente.',
    placement: 'left',
    title: '🤖 Procesar con IA'
  },
  {
    target: '[data-tutorial="docview-status"]',
    content: 'Aquí puedes ver el estado del procesamiento IA: Pendiente, Procesando, Completado o Error.',
    placement: 'bottom',
    title: '📊 Estado de Procesamiento'
  },
  {
    target: '[data-tutorial="docview-clausulas-tab"]',
    content: 'En esta pestaña verás todas las cláusulas extraídas por la IA. Puedes seleccionarlas para crearlas en el sistema.',
    placement: 'bottom',
    title: '📋 Cláusulas Extraídas'
  },
  {
    target: '[data-tutorial="docview-accept-selected"]',
    content: 'Selecciona las cláusulas que quieras crear y usa este botón para agregarlas al sistema.',
    placement: 'left',
    title: '✅ Crear Cláusulas Seleccionadas'
  },
  {
    target: '[data-tutorial="docview-accept-all"]',
    content: 'O usa este botón para crear todas las cláusulas extraídas de una vez.',
    placement: 'left',
    title: '✅ Crear Todas'
  },
  {
    target: '[data-tutorial="docview-addendums"]',
    content: 'Las Adendas te permiten agregar modificaciones a cláusulas existentes sin cambiar el documento original.',
    placement: 'bottom',
    title: '📝 Adendas'
  }
]

export default {
  getSidebarSteps,
  documentosTutorialSteps,
  clausulasTutorialSteps,
  documentViewTutorialSteps
}
