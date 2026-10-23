import React, { useEffect, useState, useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead
} from '@/store/slices/notificacionesSlice'
import { useNavigate } from 'react-router-dom'

const NotificationBell = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { noLeidas } = useSelector(state => state.notificaciones)
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Fetch unread count on mount and periodically
  useEffect(() => {
    dispatch(fetchUnreadCount())

    // Poll for new notifications every 30 seconds
    const interval = setInterval(() => {
      dispatch(fetchUnreadCount())
    }, 30000)

    return () => clearInterval(interval)
  }, [dispatch])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleBellClick = () => {
    if (!isOpen) {
      dispatch(fetchNotifications({ page_size: 5 }))
    }
    setIsOpen(!isOpen)
  }

  const handleViewAll = () => {
    setIsOpen(false)
    navigate('/notificaciones')
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleBellClick}
        className="relative p-2 text-subtle-light dark:text-subtle-dark hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        aria-label="Notificaciones"
      >
        <span className="material-icons">notifications</span>
        {noLeidas > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-bold text-white bg-danger rounded-full">
            {noLeidas > 99 ? '99+' : noLeidas}
          </span>
        )}
      </button>

      {isOpen && <NotificationDropdown onClose={() => setIsOpen(false)} onViewAll={handleViewAll} />}
    </div>
  )
}

const NotificationDropdown = ({ onClose, onViewAll }) => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { list, loading, noLeidas } = useSelector(state => state.notificaciones)

  const handleNotificationClick = async (notification) => {
    if (!notification.leida) {
      await dispatch(markNotificationAsRead(notification.id))
    }

    onClose()

    // Open task detail via query param so TaskList can show the modal
    if (notification.tarea) {
      navigate(`/tareas?taskId=${notification.tarea}`)
    }
  }

  const handleMarkAllRead = async () => {
    await dispatch(markAllNotificationsAsRead())
    dispatch(fetchNotifications({ page_size: 5 }))
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
        return 'text-primary'
      case 'TAREA_VENCIMIENTO':
        return 'text-warning'
      case 'CAMBIO_ESTADO':
      case 'CAMBIO_ETAPA':
        return 'text-success'
      default:
        return 'text-subtle-light dark:text-subtle-dark'
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
    if (diffMins < 60) return `Hace ${diffMins} min`
    if (diffHours < 24) return `Hace ${diffHours}h`
    if (diffDays < 7) return `Hace ${diffDays}d`

    return date.toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit' })
  }

  return (
    <div className="fixed lg:absolute top-14 lg:top-full left-0 right-0 lg:left-0 lg:right-auto mt-2 mx-4 lg:mx-0 w-auto lg:w-96 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg shadow-xl z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-light dark:border-border-dark">
        <h3 className="text-sm font-semibold text-text-light dark:text-text-dark">
          Notificaciones {noLeidas > 0 && `(${noLeidas})`}
        </h3>
        {noLeidas > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-xs text-primary hover:text-primary/80 font-medium whitespace-nowrap"
          >
            Marcar todas como leídas
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <span className="material-icons text-subtle-light dark:text-subtle-dark text-5xl mb-2">
              notifications_none
            </span>
            <p className="text-sm text-subtle-light dark:text-subtle-dark">
              No tienes notificaciones
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border-light dark:divide-border-dark">
            {list.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`
                  px-4 py-3 cursor-pointer transition-colors
                  ${!notification.leida
                    ? 'bg-primary/5 hover:bg-primary/10'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                  }
                `}
              >
                <div className="flex gap-3">
                  <div className={`flex-shrink-0 ${getNotificationColor(notification.tipo)}`}>
                    <span className="material-icons text-xl">
                      {getNotificationIcon(notification.tipo)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-medium ${!notification.leida ? 'text-text-light dark:text-text-dark' : 'text-subtle-light dark:text-subtle-dark'}`}>
                        {notification.titulo}
                      </p>
                      {!notification.leida && (
                        <span className="flex-shrink-0 w-2 h-2 bg-primary rounded-full mt-1"></span>
                      )}
                    </div>
                    <p className="text-xs text-subtle-light dark:text-subtle-dark mt-1 line-clamp-2">
                      {notification.mensaje}
                    </p>
                    <p className="text-xs text-subtle-light dark:text-subtle-dark mt-1">
                      {formatDate(notification.fecha_creacion)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {list.length > 0 && (
        <div className="border-t border-border-light dark:border-border-dark">
          <button
            onClick={onViewAll}
            className="w-full px-4 py-3 text-sm text-center text-primary hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
          >
            Ver todas las notificaciones
          </button>
        </div>
      )}
    </div>
  )
}

export default NotificationBell
