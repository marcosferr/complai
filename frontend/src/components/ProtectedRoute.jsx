import React from 'react'
import { Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useSelector(state => state.auth)

  if (!user) {
    return <Navigate to="/" replace />
  }

  // If no roles specified, allow all authenticated users
  if (!allowedRoles || allowedRoles.length === 0) {
    return children
  }

  // Check if user's role is in the allowed roles
  if (allowedRoles.includes(user.role)) {
    return children
  }

  // Redirect to tasks page if user doesn't have access
  return <Navigate to="/tareas" replace />
}

export default ProtectedRoute
