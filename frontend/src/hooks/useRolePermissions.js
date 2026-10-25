import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { TODOS_ESTADOS_ETAPAS } from '@/lib/estadoEtapaConstants'
import { ETAPA_LABELS } from '@/lib/estadoEtapaConstants'

/**
 * Hook personalizado para manejar permisos y filtros basados en el rol del usuario
 * 
 * Roles y sus accesos:
 * - RESPONSABLE: Solo ve tareas asignadas, sin filtros de etapas, áreas ni responsables
 * - GERENTE: Ve tareas de su área, solo etapas INICIO y REVISION_GERENCIAL, sin filtro de área
 * - ANALISTA_COMPLIANCE: Ve tareas en INICIO, REVISION_GERENCIAL y CONTROL_ANALISTA, acceso a todos los filtros
 * - OFICIAL_COMPLIANCE: Acceso total
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
      
      case 'GERENTE':
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
      
      case 'ANALISTA_COMPLIANCE':
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
      
      case 'OFICIAL_COMPLIANCE':
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
      
      case 'GERENTE':
        // Solo INICIO y REVISION_GERENCIAL
        return [
          { value: 'INICIO', label: 'Inicio' },
          { value: 'REVISION_GERENCIAL', label: ETAPA_LABELS.REVISION_GERENCIAL }
        ]
      
      case 'ANALISTA_COMPLIANCE':
        // Hasta CONTROL_ANALISTA (no ve CONTROL_OFICIAL)
        return [
          { value: 'INICIO', label: 'Inicio' },
          { value: 'REVISION_GERENCIAL', label: ETAPA_LABELS.REVISION_GERENCIAL },
          { value: 'CONTROL_ANALISTA', label: ETAPA_LABELS.CONTROL_ANALISTA }
        ]
      
      case 'OFICIAL_COMPLIANCE':
        // Todas las etapas
        return [
          { value: 'INICIO', label: 'Inicio' },
          { value: 'REVISION_GERENCIAL', label: ETAPA_LABELS.REVISION_GERENCIAL },
          { value: 'CONTROL_ANALISTA', label: ETAPA_LABELS.CONTROL_ANALISTA },
          { value: 'CONTROL_OFICIAL', label: ETAPA_LABELS.CONTROL_OFICIAL }
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
          
          case 'GERENTE':
            // INICIO + REVISION_GERENCIAL (sin duplicar OBSERVADO_ANALISTA)
            estadosAMostrar = [
              ...TODOS_ESTADOS_ETAPAS.INICIO,
              ...TODOS_ESTADOS_ETAPAS.REVISION_GERENCIAL
            ]
            break
          
          case 'ANALISTA_COMPLIANCE':
            // INICIO + REVISION_GERENCIAL + CONTROL_ANALISTA (sin duplicar OBSERVADO_ANALISTA)
            estadosAMostrar = [
              ...TODOS_ESTADOS_ETAPAS.INICIO,
              ...TODOS_ESTADOS_ETAPAS.REVISION_GERENCIAL,
              ...TODOS_ESTADOS_ETAPAS.CONTROL_ANALISTA
            ]
            break
          
          case 'OFICIAL_COMPLIANCE':
            // Todas las etapas
            estadosAMostrar = [
              ...TODOS_ESTADOS_ETAPAS.INICIO,
              ...TODOS_ESTADOS_ETAPAS.REVISION_GERENCIAL,
              ...TODOS_ESTADOS_ETAPAS.CONTROL_ANALISTA,
              ...TODOS_ESTADOS_ETAPAS.CONTROL_OFICIAL
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
