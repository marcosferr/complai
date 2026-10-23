import React, { useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { hideNotification } from '@/store/slices/uiSlice'

const Notification = () => {
  const dispatch = useDispatch()
  const { notifications } = useSelector(state => state.ui)

  useEffect(() => {
    if (notifications.length > 0) {
      const timer = setTimeout(() => {
        dispatch(hideNotification())
      }, 5000)

      return () => clearTimeout(timer)
    }
  }, [notifications, dispatch])

  if (notifications.length === 0) return null

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return 'check_circle'
      case 'error':
        return 'error'
      case 'warning':
        return 'warning'
      case 'info':
        return 'info'
      default:
        return 'info'
    }
  }

  const getColors = (type) => {
    switch (type) {
      case 'success':
        return 'bg-success/10 border-success text-success'
      case 'error':
        return 'bg-danger/10 border-danger text-danger'
      case 'warning':
        return 'bg-warning/10 border-warning text-warning'
      case 'info':
        return 'bg-primary/10 border-primary text-primary'
      default:
        return 'bg-primary/10 border-primary text-primary'
    }
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map((notification, index) => (
        <div
          key={index}
          className={`flex items-center gap-3 p-4 rounded-lg border-l-4 shadow-lg bg-surface-light dark:bg-surface-dark ${getColors(notification.type)} animate-slide-in`}
        >
          <span className="material-icons">{getIcon(notification.type)}</span>
          <p className="text-text-light dark:text-text-dark font-medium flex-1">
            {notification.message}
          </p>
          <button
            onClick={() => dispatch(hideNotification())}
            className="text-subtle-light dark:text-subtle-dark hover:text-text-light dark:hover:text-text-dark"
          >
            <span className="material-icons text-sm">close</span>
          </button>
        </div>
      ))}
    </div>
  )
}

export default Notification
