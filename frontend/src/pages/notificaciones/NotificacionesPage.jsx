import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { 
  fetchNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead 
} from '@/store/slices/notificacionesSlice'

const NotificacionesPage = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { list, loading, noLeidas, pagination } = useSelector(state => state.notificaciones)
  const [filter, setFilter] = useState('all') // 'all', 'unread', 'read'

  useEffect(() => {
    loadNotifications()
  }, [dispatch, filter])

  const loadNotifications = (params = {}) => {
    const filterParams = { ...params }
    if (filter === 'unread') {
      filterParams.leida = false
    } else if (filter === 'read') {
      filterParams.leida = true
    }
    dispatch(fetchNotifications(filterParams))
  }

  const handleNotificationClick = async (notification) => {
    if (!notification.leida) {
      await dispatch(markNotificationAsRead(notification.id))
    }
    
    // Open task detail via query param so TaskList can show the modal
    if (notification.tarea) {
      navigate(`/tareas?taskId=${notification.tarea}`)
    }
  }

  const handleMarkAllRead = async () => {
    await dispatch(markAllNotificationsAsRead())
    loadNotifications()
  }

  const getNotificationIcon = (tipo) => {
    switch (tipo) {
      case 'TAREA_ASIGNADA':
        return 'assignment'
      case 'TAREA_VENCIMIENTO':
        return 'schedule'
      case 'CAMBIO_ESTADO':
      case 'CAMBIO_ETAPA':
        return 'update'
      case 'COMENTARIO':
        return 'comment'
      default:
        return 'notifications'
    }
  }

  const getNotificationColor = (tipo) => {
    switch (tipo) {
      case 'TAREA_ASIGNADA':
        return 'bg-primary/10 text-primary'
      case 'TAREA_VENCIMIENTO':
        return 'bg-warning/10 text-warning'
      case 'CAMBIO_ESTADO':
      case 'CAMBIO_ETAPA':
        return 'bg-success/10 text-success'
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-subtle-light dark:text-subtle-dark'
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Ahora mismo'
    if (diffMins < 60) return `Hace ${diffMins} minuto${diffMins > 1 ? 's' : ''}`
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`
    if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`
    
    return date.toLocaleDateString('es-PY', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const filteredList = list

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-text-light dark:text-text-dark">
              Notificaciones
            </h1>
            {noLeidas > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
              >
                Marcar todas como leídas
              </button>
            )}
          </div>
          <p className="text-subtle-light dark:text-subtle-dark">
            {noLeidas > 0 
              ? `Tienes ${noLeidas} notificación${noLeidas > 1 ? 'es' : ''} sin leer`
              : 'No tienes notificaciones sin leer'
            }
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${filter === 'all'
                ? 'bg-primary text-white'
                : 'bg-surface-light dark:bg-surface-dark text-subtle-light dark:text-subtle-dark hover:bg-gray-100 dark:hover:bg-gray-700'
              }
            `}
          >
            Todas
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${filter === 'unread'
                ? 'bg-primary text-white'
                : 'bg-surface-light dark:bg-surface-dark text-subtle-light dark:text-subtle-dark hover:bg-gray-100 dark:hover:bg-gray-700'
              }
            `}
          >
            No leídas {noLeidas > 0 && `(${noLeidas})`}
          </button>
          <button
            onClick={() => setFilter('read')}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${filter === 'read'
                ? 'bg-primary text-white'
                : 'bg-surface-light dark:bg-surface-dark text-subtle-light dark:text-subtle-dark hover:bg-gray-100 dark:hover:bg-gray-700'
              }
            `}
          >
            Leídas
          </button>
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-surface-light dark:bg-surface-dark rounded-lg border border-border-light dark:border-border-dark">
              <span className="material-icons text-subtle-light dark:text-subtle-dark text-6xl mb-4">
                notifications_none
              </span>
              <p className="text-lg font-medium text-text-light dark:text-text-dark mb-1">
                No hay notificaciones
              </p>
              <p className="text-sm text-subtle-light dark:text-subtle-dark">
                {filter === 'unread' 
                  ? 'No tienes notificaciones sin leer'
                  : filter === 'read'
                  ? 'No tienes notificaciones leídas'
                  : 'Aún no has recibido ninguna notificación'
                }
              </p>
            </div>
          ) : (
            filteredList.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`
                  bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark
                  rounded-lg p-4 cursor-pointer transition-all hover:shadow-md
                  ${!notification.leida ? 'border-l-4 border-l-primary' : ''}
                `}
              >
                <div className="flex gap-4">
                  {/* Icon */}
                  <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${getNotificationColor(notification.tipo)}`}>
                    <span className="material-icons text-2xl">
                      {getNotificationIcon(notification.tipo)}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className={`text-base font-semibold ${!notification.leida ? 'text-text-light dark:text-text-dark' : 'text-subtle-light dark:text-subtle-dark'}`}>
                        {notification.titulo}
                      </h3>
                      {!notification.leida && (
                        <span className="flex-shrink-0 w-3 h-3 bg-primary rounded-full"></span>
                      )}
                    </div>
                    <p className="text-sm text-subtle-light dark:text-subtle-dark mb-2">
                      {notification.mensaje}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-subtle-light dark:text-subtle-dark">
                      <span className="flex items-center gap-1">
                        <span className="material-icons text-sm">schedule</span>
                        {formatDate(notification.fecha_creacion)}
                      </span>
                      {notification.tarea_titulo && (
                        <span className="flex items-center gap-1">
                          <span className="material-icons text-sm">assignment</span>
                          {notification.tarea_titulo}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default NotificacionesPage
