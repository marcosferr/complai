import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchDashboardStats } from '../../store/slices/dashboardSlice'
import { ETAPA_LABELS, getRoleLabel, getEstadoEtapaLabel } from '@/lib/estadoEtapaConstants'

const Dashboard = () => {
  const dispatch = useDispatch()
  const { stats, loading } = useSelector(state => state.dashboard)
  const { user } = useSelector(state => state.auth)

  useEffect(() => {
    dispatch(fetchDashboardStats())
  }, [dispatch])

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-subtle-light dark:text-subtle-dark">Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  // Renderizar métricas según el rol
  const renderMetricas = () => {
    switch (user?.role) {
      case 'RESPONSABLE':
        return (
          <>
            <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg border border-border-light dark:border-border-dark shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-subtle-light dark:text-subtle-dark mb-1">Tareas Totales</p>
                  <p className="text-3xl font-bold text-text-light dark:text-text-dark">{stats.tareas.total}</p>
                </div>
                <span className="material-icons text-primary text-4xl">assignment</span>
              </div>
            </div>

            <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg border border-border-light dark:border-border-dark shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-subtle-light dark:text-subtle-dark mb-1">En Progreso</p>
                  <p className="text-3xl font-bold text-warning">{stats.tareas.en_progreso}</p>
                </div>
                <span className="material-icons text-warning text-4xl">sync</span>
              </div>
            </div>

            <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg border border-border-light dark:border-border-dark shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-subtle-light dark:text-subtle-dark mb-1">Pendientes</p>
                  <p className="text-3xl font-bold text-text-light dark:text-text-dark">{stats.tareas.pendientes}</p>
                </div>
                <span className="material-icons text-subtle-light dark:text-subtle-dark text-4xl">pending</span>
              </div>
            </div>

            <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg border border-border-light dark:border-border-dark shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-subtle-light dark:text-subtle-dark mb-1">Requieren Atención</p>
                  <p className="text-3xl font-bold text-danger">{stats.tareas.requiere_atencion}</p>
                </div>
                <span className="material-icons text-danger text-4xl">warning</span>
              </div>
            </div>

            {stats.tareas_vencidas > 0 && (
              <div className="bg-danger bg-opacity-10 p-6 rounded-lg border border-danger shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-danger mb-1 font-medium">Tareas Vencidas</p>
                    <p className="text-3xl font-bold text-danger">{stats.tareas_vencidas}</p>
                  </div>
                  <span className="material-icons text-danger text-4xl">error</span>
                </div>
              </div>
            )}

            <div className="bg-warning bg-opacity-10 p-6 rounded-lg border border-warning shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-warning mb-1 font-medium">Próximas a Vencer (7 días)</p>
                  <p className="text-3xl font-bold text-warning">{stats.tareas_proximas}</p>
                </div>
                <span className="material-icons text-warning text-4xl">schedule</span>
              </div>
            </div>
          </>
        )

      case 'GERENTE':
        return (
          <>
            <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg border border-border-light dark:border-border-dark shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-subtle-light dark:text-subtle-dark mb-1">Tareas del Área</p>
                  <p className="text-3xl font-bold text-text-light dark:text-text-dark">{stats.tareas.total}</p>
                </div>
                <span className="material-icons text-primary text-4xl">assignment</span>
              </div>
            </div>

            <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg border border-border-light dark:border-border-dark shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-subtle-light dark:text-subtle-dark mb-1">En Inicio</p>
                  <p className="text-3xl font-bold text-warning">{stats.tareas.en_inicio}</p>
                </div>
                <span className="material-icons text-warning text-4xl">start</span>
              </div>
            </div>

            <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg border border-border-light dark:border-border-dark shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-subtle-light dark:text-subtle-dark mb-1">En Revisión de la Dirección</p>
                  <p className="text-3xl font-bold text-audit">{stats.tareas.en_revision}</p>
                </div>
                <span className="material-icons text-audit text-4xl">fact_check</span>
              </div>
            </div>

            <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg border border-border-light dark:border-border-dark shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-subtle-light dark:text-subtle-dark mb-1">Requieren Validación</p>
                  <p className="text-3xl font-bold text-danger">{stats.tareas.requieren_validacion}</p>
                </div>
                <span className="material-icons text-danger text-4xl">verified</span>
              </div>
            </div>

            <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg border border-border-light dark:border-border-dark shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-subtle-light dark:text-subtle-dark mb-1">Documentos del Área</p>
                  <p className="text-3xl font-bold text-text-light dark:text-text-dark">{stats.documentos.total_area}</p>
                </div>
                <span className="material-icons text-primary text-4xl">description</span>
              </div>
            </div>

            <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg border border-border-light dark:border-border-dark shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-subtle-light dark:text-subtle-dark mb-1">Usuarios en Área</p>
                  <p className="text-3xl font-bold text-text-light dark:text-text-dark">{stats.usuarios_area}</p>
                </div>
                <span className="material-icons text-primary text-4xl">people</span>
              </div>
            </div>
          </>
        )

      case 'ANALISTA_COMPLIANCE':
        return (
          <>
            <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg border border-border-light dark:border-border-dark shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-subtle-light dark:text-subtle-dark mb-1">Tareas Totales</p>
                  <p className="text-3xl font-bold text-text-light dark:text-text-dark">{stats.tareas.total}</p>
                </div>
                <span className="material-icons text-primary text-4xl">assignment</span>
              </div>
            </div>

            <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg border border-border-light dark:border-border-dark shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-subtle-light dark:text-subtle-dark mb-1">Para Revisión</p>
                  <p className="text-3xl font-bold text-warning">{stats.tareas.para_revision}</p>
                </div>
                <span className="material-icons text-warning text-4xl">rate_review</span>
              </div>
            </div>

            <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg border border-border-light dark:border-border-dark shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-subtle-light dark:text-subtle-dark mb-1">En Control de la UOC</p>
                  <p className="text-3xl font-bold text-audit">{stats.tareas.en_control}</p>
                </div>
                <span className="material-icons text-audit text-4xl">analytics</span>
              </div>
            </div>

            <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg border border-border-light dark:border-border-dark shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-subtle-light dark:text-subtle-dark mb-1">Validadas</p>
                  <p className="text-3xl font-bold text-success">{stats.tareas.validadas}</p>
                </div>
                <span className="material-icons text-success text-4xl">check_circle</span>
              </div>
            </div>

            <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg border border-border-light dark:border-border-dark shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-subtle-light dark:text-subtle-dark mb-1">Documentos Legales</p>
                  <p className="text-3xl font-bold text-text-light dark:text-text-dark">{stats.documentos.total}</p>
                </div>
                <span className="material-icons text-primary text-4xl">gavel</span>
              </div>
            </div>

            <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg border border-border-light dark:border-border-dark shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-subtle-light dark:text-subtle-dark mb-1">Compliance en Progreso</p>
                  <p className="text-3xl font-bold text-audit">{stats.auditorias.en_progreso}</p>
                </div>
                <span className="material-icons text-audit text-4xl">fact_check</span>
              </div>
            </div>
          </>
        )

      case 'OFICIAL_COMPLIANCE':
        return (
          <>
            <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg border border-border-light dark:border-border-dark shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-subtle-light dark:text-subtle-dark mb-1">Tareas Totales</p>
                  <p className="text-3xl font-bold text-text-light dark:text-text-dark">{stats.tareas.total}</p>
                </div>
                <span className="material-icons text-primary text-4xl">assignment</span>
              </div>
            </div>

            <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg border border-border-light dark:border-border-dark shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-subtle-light dark:text-subtle-dark mb-1">Documentos Legales</p>
                  <p className="text-3xl font-bold text-text-light dark:text-text-dark">{stats.documentos.total}</p>
                </div>
                <span className="material-icons text-primary text-4xl">gavel</span>
              </div>
            </div>

            <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg border border-border-light dark:border-border-dark shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-subtle-light dark:text-subtle-dark mb-1">Cláusulas</p>
                  <p className="text-3xl font-bold text-text-light dark:text-text-dark">{stats.clausulas.total}</p>
                </div>
                <span className="material-icons text-primary text-4xl">article</span>
              </div>
            </div>

            <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg border border-border-light dark:border-border-dark shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-subtle-light dark:text-subtle-dark mb-1">Compliance</p>
                  <p className="text-3xl font-bold text-audit">{stats.auditorias.total}</p>
                </div>
                <span className="material-icons text-audit text-4xl">fact_check</span>
              </div>
            </div>

            <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg border border-border-light dark:border-border-dark shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-subtle-light dark:text-subtle-dark mb-1">Áreas</p>
                  <p className="text-3xl font-bold text-text-light dark:text-text-dark">{stats.areas}</p>
                </div>
                <span className="material-icons text-primary text-4xl">corporate_fare</span>
              </div>
            </div>

            <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg border border-border-light dark:border-border-dark shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-subtle-light dark:text-subtle-dark mb-1">Usuarios Activos</p>
                  <p className="text-3xl font-bold text-text-light dark:text-text-dark">{stats.usuarios}</p>
                </div>
                <span className="material-icons text-primary text-4xl">people</span>
              </div>
            </div>

            <div className="bg-success bg-opacity-10 p-6 rounded-lg border border-success shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-success mb-1 font-medium">Remitidas al Rectorado</p>
                  <p className="text-3xl font-bold text-success">{stats.tareas.remitidas_autoridad}</p>
                </div>
                <span className="material-icons text-success text-4xl">send</span>
              </div>
            </div>

            <div className="bg-success bg-opacity-10 p-6 rounded-lg border border-success shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-success mb-1 font-medium">Aprobadas por el Rectorado</p>
                  <p className="text-3xl font-bold text-success">{stats.tareas.aprobadas_autoridad}</p>
                </div>
                <span className="material-icons text-success text-4xl">verified</span>
              </div>
            </div>
          </>
        )

      default:
        return null
    }
  }

  // Obtener título del rol en español
  const getRoleTitulo = () => {
    const roles = {
    }
    return getRoleLabel(user?.role)
  }

  // Obtener el tiempo del día para saludo
  const getSaludo = () => {
    const hora = new Date().getHours()
    if (hora < 12) return 'Buenos días'
    if (hora < 19) return 'Buenas tardes'
    return 'Buenas noches'
  }

  return (
    <div className="space-y-6">
      {/* Header con saludo personalizado */}
      <div className="bg-gradient-to-r from-primary to-audit p-6 rounded-lg shadow-lg text-white">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">
          {getSaludo()}, {stats.nombre_completo}
        </h1>
        <p className="text-sm md:text-base opacity-90">
          {getRoleTitulo()} {stats.area && `- ${stats.area}`}
        </p>
      </div>

      {/* Sección: Qué es la plataforma */}
      <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg border border-border-light dark:border-border-dark shadow-sm">
        <div className="flex items-start space-x-4">
          <span className="material-icons text-primary text-4xl flex-shrink-0">info</span>
          <div>
            <h2 className="text-xl font-bold text-text-light dark:text-text-dark mb-3">
              Sistema de Gestión de Compliance
            </h2>
            <p className="text-text-light dark:text-text-dark mb-3 leading-relaxed">
              Plataforma para la gestión integral de cumplimiento normativo y contractual. 
              Permite gestionar documentos legales, administrar cláusulas, crear y asignar obligaciones, 
              realizar auditorías y mantener un control completo del ciclo de vida del compliance.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              <div className="flex items-center space-x-2 text-sm text-subtle-light dark:text-subtle-dark">
                <span className="material-icons text-primary text-lg">check_circle</span>
                <span>Gestión de documentos legales</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-subtle-light dark:text-subtle-dark">
                <span className="material-icons text-primary text-lg">check_circle</span>
                <span>Gestión de tareas por etapas</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-subtle-light dark:text-subtle-dark">
                <span className="material-icons text-primary text-lg">check_circle</span>
                <span>Control de auditorías</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-subtle-light dark:text-subtle-dark">
                <span className="material-icons text-primary text-lg">check_circle</span>
                <span>Control de acceso por roles</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Métricas principales */}
      <div>
        <h2 className="text-xl font-bold text-text-light dark:text-text-dark mb-4">
          Resumen de Actividades
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {renderMetricas()}
        </div>
      </div>

      {/* Dos columnas: Actividad Reciente y Próximos Vencimientos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Actividad Reciente */}
        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg border border-border-light dark:border-border-dark shadow-sm">
          <h2 className="text-lg font-semibold text-text-light dark:text-text-dark mb-4 flex items-center">
            <span className="material-icons text-primary mr-2">history</span>
            Actividad Reciente
          </h2>
          {stats.actividad_reciente && stats.actividad_reciente.length > 0 ? (
            <div className="space-y-3">
              {stats.actividad_reciente.map((item, index) => (
                <div 
                  key={index}
                  className="flex items-start p-3 bg-background-light dark:bg-background-dark rounded-lg hover:shadow transition-shadow"
                >
                  <span className="material-icons text-primary mr-3 mt-1">assignment</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-light dark:text-text-dark truncate">
                      {item.titulo}
                    </p>
                    <p className="text-xs text-subtle-light dark:text-subtle-dark mt-1">
                      {item.etapa} - {getEstadoEtapaLabel(item.estado_etapa)}
                    </p>
                    <p className="text-xs text-subtle-light dark:text-subtle-dark mt-1">
                      {new Date(item.fecha).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-subtle-light dark:text-subtle-dark text-center py-8">
              No hay actividad reciente
            </p>
          )}
        </div>

        {/* Próximos Vencimientos */}
        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg border border-border-light dark:border-border-dark shadow-sm">
          <h2 className="text-lg font-semibold text-text-light dark:text-text-dark mb-4 flex items-center">
            <span className="material-icons text-warning mr-2">schedule</span>
            Próximos Vencimientos
          </h2>
          {stats.proximos_vencimientos && stats.proximos_vencimientos.length > 0 ? (
            <div className="space-y-3">
              {stats.proximos_vencimientos.map((item, index) => {
                const urgencia = item.dias_restantes <= 3 ? 'danger' : item.dias_restantes <= 7 ? 'warning' : 'primary'
                return (
                  <div 
                    key={index}
                    className={`flex items-center justify-between p-3 bg-background-light dark:bg-background-dark rounded-lg border-l-4 border-${urgencia}`}
                  >
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="text-sm font-medium text-text-light dark:text-text-dark truncate">
                        {item.titulo}
                      </p>
                      {item.area && (
                        <p className="text-xs text-subtle-light dark:text-subtle-dark mt-1">
                          {item.area}
                        </p>
                      )}
                      <p className={`text-xs text-${urgencia} mt-1 font-medium`}>
                        {item.dias_restantes === 0 ? 'Hoy' : 
                         item.dias_restantes === 1 ? 'Mañana' : 
                         `En ${item.dias_restantes} días`}
                      </p>
                    </div>
                    <span className={`material-icons text-${urgencia}`}>
                      {urgencia === 'danger' ? 'error' : urgencia === 'warning' ? 'warning' : 'info'}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-subtle-light dark:text-subtle-dark text-center py-8">
              No hay tareas próximas a vencer
            </p>
          )}
        </div>
      </div>

      {/* Detalles por etapa (solo para roles con múltiples etapas) */}
      {user?.role === 'OFICIAL_COMPLIANCE' && (
        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg border border-border-light dark:border-border-dark shadow-sm">
          <h2 className="text-lg font-semibold text-text-light dark:text-text-dark mb-4 flex items-center">
            <span className="material-icons text-audit mr-2">trending_up</span>
            Distribución por Etapa
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-background-light dark:bg-background-dark rounded-lg">
              <p className="text-2xl font-bold text-warning">{stats.tareas.en_inicio}</p>
              <p className="text-xs text-subtle-light dark:text-subtle-dark mt-1">Inicio</p>
            </div>
            <div className="text-center p-4 bg-background-light dark:bg-background-dark rounded-lg">
              <p className="text-2xl font-bold text-audit">{stats.tareas.en_revision_gerencial}</p>
              <p className="text-xs text-subtle-light dark:text-subtle-dark mt-1">{ETAPA_LABELS.REVISION_GERENCIAL}</p>
            </div>
            <div className="text-center p-4 bg-background-light dark:bg-background-dark rounded-lg">
              <p className="text-2xl font-bold text-primary">{stats.tareas.en_control_analista}</p>
              <p className="text-xs text-subtle-light dark:text-subtle-dark mt-1">{ETAPA_LABELS.CONTROL_ANALISTA}</p>
            </div>
            <div className="text-center p-4 bg-background-light dark:bg-background-dark rounded-lg">
              <p className="text-2xl font-bold text-success">{stats.tareas.en_control_oficial}</p>
              <p className="text-xs text-subtle-light dark:text-subtle-dark mt-1">{ETAPA_LABELS.CONTROL_OFICIAL}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard