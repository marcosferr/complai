import api from './api'

const userService = {
  // Get all users with pagination and filters
  getUsers: (params = {}) => {
    return api.get('/auth/users/', { params })
  },

  // Get user by ID
  getUser: (id) => {
    return api.get(`/auth/users/${id}/`)
  },

  // Create new user
  createUser: (userData) => {
    return api.post('/auth/users/', userData)
  },

  // Update user
  updateUser: (id, userData) => {
    return api.patch(`/auth/users/${id}/`, userData)
  },

  // Delete user (soft delete - deactivate)
  deleteUser: (id) => {
    return api.delete(`/auth/users/${id}/`)
  },

  // Get simple users list for dropdowns
  getUsersList: () => {
    return api.get('/auth/users/list/')
  }
}

export default userService
