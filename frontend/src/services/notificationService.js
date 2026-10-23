import api from './api'

const NOTIFICATIONS_BASE = '/notificaciones'

/**
 * Service for managing notifications
 */
const notificationService = {
  /**
   * Get all notifications for the current user
   * @param {object} params - Query parameters (page, etc.)
   * @returns {Promise} Promise with notifications list
   */
  getNotifications: (params = {}) => {
    return api.get(`${NOTIFICATIONS_BASE}/`, { params })
  },

  /**
   * Get count of unread notifications
   * @returns {Promise} Promise with unread count
   */
  getUnreadCount: () => {
    return api.get(`${NOTIFICATIONS_BASE}/no_leidas/`)
  },

  /**
   * Mark a notification as read
   * @param {number} id - Notification ID
   * @returns {Promise} Promise with updated notification
   */
  markAsRead: (id) => {
    return api.post(`${NOTIFICATIONS_BASE}/${id}/marcar_leida/`)
  },

  /**
   * Mark all notifications as read
   * @returns {Promise} Promise with result
   */
  markAllAsRead: () => {
    return api.post(`${NOTIFICATIONS_BASE}/marcar_todas_leidas/`)
  },
}

export default notificationService
