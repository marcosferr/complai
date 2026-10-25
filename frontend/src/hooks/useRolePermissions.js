import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { TODOS_ESTADOS_ETAPAS } from '@/lib/estadoEtapaConstants'
import { ETAPA_LABELS } from '@/lib/estadoEtapaConstants'

/**
 * Hook personalizado para manejar permisos y filtros basados en el rol del usuario
 * 
 * Roles y sus accesos:
 * - RESPONSABLE: Solo ve tareas asignadas, sin filtros de etapas, áreas ni responsables
 * - DIRECTOR: Ve tareas de su área, solo etapas INICIO y REVISION_DIRECCION, sin filtro de área
 * - ANALISTA_UOC: Ve tareas en INICIO, REVISION_DIRECCION y CONTROL_UOC, acceso a todos los filtros
 * - ADMINISTRADOR_CONTRATO: Acceso total
 */
export const useRolePermissions = () => {
  const { user } = useSelector((state) => state.auth)
  const userRole = user?.role

  // Permisos para mostrar/ocultar filtros
  const permissions = useMemo(() => {
    switch (userRole) {
      case 'RESPONSABLE':
        return {
          canViewEtapasFilter: false,
          canViewAreaFilter: false,
          canViewResponsableFilter: false,
          canViewPrioridadFilter: true,
          canViewTagFilter: true,
          canViewAllMenus: false,
          canAccessDocumentos: false,
          canAccessAuditorias: false,
          // Nuevos permisos de edición
          canEditTags: false,
          canEditArea: false,
          canDeleteClausulas: false,
          canDeleteTareas: false,
          canCreateTareas: false, // Solo la UOC y el/la Administrador/a crean obligaciones
          canEditObligacion: false, // No puede corregir título ni fecha de vencimiento
          areaRequiredInTasks: true, // El área es requerida
        }
      
      case 'DIRECTOR':
        return {
          canViewEtapasFilter: true,
          canViewAreaFilter: false, // Solo pertenece a un área
          canViewResponsableFilter: true,
          canViewPrioridadFilter: true,
          canViewTagFilter: true,
          canViewAllMenus: false,
          canAccessDocumentos: true,
          canAccessAuditorias: false, // NO puede acceder a Compliance
          // Nuevos permisos de edición
          canEditTags: false,
          canEditArea: false,
          canDeleteClausulas: false,
          canDeleteTareas: false,
          canCreateTareas: false, // Solo la UOC y el/la Administrador/a crean obligaciones
          canEditObligacion: false, // No puede corregir título ni fecha de vencimiento
          areaRequiredInTasks: true, // El área es requerida
        }
      
      case 'ANALISTA_UOC':
        return {
          canViewEtapasFilter: true,
          canViewAreaFilter: true,
          canViewResponsableFilter: true,
          canViewPrioridadFilter: true,
          canViewTagFilter: true,
          canViewAllMenus: true,
          canAccessDocumentos: true,
          canAccessAuditorias: true,
          // Nuevos permisos de edición
          canEditTags: true,
          canEditArea: true,
          canDeleteClausulas: true,
          canDeleteTareas: true,
          canCreateTareas: true, // Puede crear obligaciones
          canEditObligacion: true, // Puede corregir título y fecha de vencimiento
          areaRequiredInTasks: false, // El área es opcional
        }
      
      case 'ADMINISTRADOR_CONTRATO':
        return {
          canViewEtapasFilter: true,
          canViewAreaFilter: true,
          canViewResponsableFilter: true,
          canViewPrioridadFilter: true,
          canViewTagFilter: true,
          canViewAllMenus: true,
          canAccessDocumentos: true,
          canAccessAuditorias: true,
          // Nuevos permisos de edición
          canEditTags: true,
          canEditArea: true,
          canDeleteClausulas: true,
          canDeleteTareas: true,
          canCreateTareas: true, // Puede crear obligaciones
          canEditObligacion: true, // Puede corregir título y fecha de vencimiento
          areaRequiredInTasks: false, // El área es opcional
        }
      
      default:
        return {
          canViewEtapasFilter: false,
          canViewAreaFilter: false,
          canViewResponsableFilter: false,
          canViewPrioridadFilter: false,
          canViewTagFilter: false,
          canViewAllMenus: false,
          canAccessDocumentos: false,
          canAccessAuditorias: false,
          // Nuevos permisos de edición
          canEditTags: false,
          canEditArea: false,
          canDeleteClausulas: false,
          canDeleteTareas: false,
          canCreateTareas: false,
          canEditObligacion: false,
          areaRequiredInTasks: true,
        }
    }
  }, [userRole])

  // Etapas disponibles según el rol
  const etapasDisponibles = useMemo(() => {
    switch (userRole) {
      case 'RESPONSABLE':
        // No ve filtro de etapas, solo trabaja en INICIO
        return []
      
      case 'DIRECTOR':
        // Solo INICIO y REVISION_DIRECCION
        return [
          { value: 'INICIO', label: 'Inicio' },
          { value: 'REVISION_DIRECCION', label: ETAPA_LABELS.REVISION_DIRECCION }
        ]
      
      case 'ANALISTA_UOC':
        // Hasta CONTROL_UOC (no ve CONTROL_ADMINISTRADOR)
        return [
          { value: 'INICIO', label: 'Inicio' },
          { value: 'REVISION_DIRECCION', label: ETAPA_LABELS.REVISION_DIRECCION },
          { value: 'CONTROL_UOC', label: ETAPA_LABELS.CONTROL_UOC }
        ]
      
      case 'ADMINISTRADOR_CONTRATO':
        // Todas las etapas
        return [
          { value: 'INICIO', label: 'Inicio' },
          { value: 'REVISION_DIRECCION', label: ETAPA_LABELS.REVISION_DIRECCION },
          { value: 'CONTROL_UOC', label: ETAPA_LABELS.CONTROL_UOC },
          { value: 'CONTROL_ADMINISTRADOR', label: ETAPA_LABELS.CONTROL_ADMINISTRADOR }
        ]
      
      default:
        return []
    }
  }, [userRole])

  // Obtener estados permitidos para mostrar (evita duplicación y filtra según rol)
  const getEstadosPermitidos = useMemo(() => {
    return (filterEtapa) => {
      let estadosAMostrar = []

      // Si hay filtro de etapa específico
      if (filterEtapa !== 'all') {
        // Verificar si el rol puede ver esa etapa
        const puedeVerEtapa = etapasDisponibles.some(e => e.value === filterEtapa)
        if (puedeVerEtapa) {
          estadosAMostrar = TODOS_ESTADOS_ETAPAS[filterEtapa] || []
        }
      } else {
        // Sin filtro: mostrar todas las etapas permitidas
        switch (userRole) {
          case 'RESPONSABLE':
            // Solo INICIO
            estadosAMostrar = [...TODOS_ESTADOS_ETAPAS.INICIO]
            break
          
          case 'DIRECTOR':
            // INICIO + REVISION_DIRECCION (sin duplicar OBSERVADO_UOC)
            estadosAMostrar = [
              ...TODOS_ESTADOS_ETAPAS.INICIO,
              ...TODOS_ESTADOS_ETAPAS.REVISION_DIRECCION
            ]
            break
          
          case 'ANALISTA_UOC':
            // INICIO + REVISION_DIRECCION + CONTROL_UOC (sin duplicar OBSERVADO_UOC)
            estadosAMostrar = [
              ...TODOS_ESTADOS_ETAPAS.INICIO,
              ...TODOS_ESTADOS_ETAPAS.REVISION_DIRECCION,
              ...TODOS_ESTADOS_ETAPAS.CONTROL_UOC
            ]
            break
          
          case 'ADMINISTRADOR_CONTRATO':
            // Todas las etapas
            estadosAMostrar = [
              ...TODOS_ESTADOS_ETAPAS.INICIO,
              ...TODOS_ESTADOS_ETAPAS.REVISION_DIRECCION,
              ...TODOS_ESTADOS_ETAPAS.CONTROL_UOC,
              ...TODOS_ESTADOS_ETAPAS.CONTROL_ADMINISTRADOR
            ]
            break
          
          default:
            estadosAMostrar = []
        }
      }

      // Eliminar duplicados basándose en el key
      const estadosUnicos = []
      const keysVistos = new Set()
      
      estadosAMostrar.forEach(estado => {
        if (!keysVistos.has(estado.key)) {
          keysVistos.add(estado.key)
          estadosUnicos.push(estado)
        }
      })

      return estadosUnicos
    }
  }, [userRole, etapasDisponibles])

  return {
    userRole,
    user,
    permissions,
    etapasDisponibles,
    getEstadosPermitidos,
  }
}

export default useRolePermissions
