import React, { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import Login from './pages/auth/Login'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'
import Dashboard from './pages/dashboard/Dashboard'
import DocumentList from './pages/documentos/DocumentList'
import DocumentDetailView from './pages/documentos/DocumentDetailView'
import DocumentView from './pages/documentos/DocumentView'
import TaskList from './pages/tareas/TaskList'
import AuditList from './pages/auditorias/AuditList'
import Calendar from './pages/calendario/Calendar'
import NotificacionesPage from './pages/notificaciones/NotificacionesPage'
import UserList from './pages/users/UserList'
import Layout from './components/layout/Layout'
import Notification from './components/Notification'
import ProtectedRoute from './components/ProtectedRoute'
import { TutorialProvider } from './components/tutorial'
import { initializeAuth, stopTokenRefreshInterval } from './services/authService'

/**
 * Manda al login preservando adónde quería ir la persona.
 *
 * Acá el guard no es `ProtectedRoute` —ese sólo corre en el árbol autenticado—
 * sino este catch-all: quien entra por un enlace directo sin sesión cae en esta
 * ruta. El login lee `state.from` y, al autenticarse, vuelve a la pantalla pedida.
 */
function RedirigirALogin() {
  const location = useLocation()
  return <Navigate to="/login" state={{ from: location }} replace />
}

function App() {
  const { isAuthenticated } = useSelector(state => state.auth)

  // Initialize auth service on component mount
  useEffect(() => {
    if (isAuthenticated) {
      initializeAuth()
    }

    // Cleanup on unmount
    return () => {
      stopTokenRefreshInterval()
    }
  }, [isAuthenticated])

  if (!isAuthenticated) {
    return (
      <>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />
          <Route path="*" element={<RedirigirALogin />} />
        </Routes>
        <Notification />
      </>
    )
  }

  return (
    <>
      <TutorialProvider>
        <Layout>
          <Routes>
            {/* Dashboard como página principal para todos los roles */}
            <Route path="/" element={<Dashboard />} />
            <Route path="/login" element={<Navigate to="/" replace />} />
            
            {/* Tasks - accessible by all roles */}
            <Route path="/tareas" element={<TaskList />} />
            
            {/* Calendar and Notifications - accessible by all roles */}
            <Route path="/calendario" element={<Calendar />} />
            <Route path="/notificaciones" element={<NotificacionesPage />} />
            
            {/* Documents - Oficial, Analista y Gerente */}
            <Route 
              path="/documentos" 
              element={
                <ProtectedRoute allowedRoles={['OFICIAL_COMPLIANCE', 'ANALISTA_COMPLIANCE', 'GERENTE']}>
                  <DocumentList />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/documentos/:id" 
              element={
                <ProtectedRoute allowedRoles={['OFICIAL_COMPLIANCE', 'ANALISTA_COMPLIANCE', 'GERENTE']}>
                  <DocumentDetailView />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/documentos/:id/view" 
              element={
                <ProtectedRoute allowedRoles={['OFICIAL_COMPLIANCE', 'ANALISTA_COMPLIANCE', 'GERENTE']}>
                  <DocumentView />
                </ProtectedRoute>
              } 
            />
            
            {/* Audits - Oficial, Analista y Gerente */}
            <Route 
              path="/auditorias" 
              element={
                <ProtectedRoute allowedRoles={['OFICIAL_COMPLIANCE', 'ANALISTA_COMPLIANCE', 'GERENTE']}>
                  <AuditList />
                </ProtectedRoute>
              } 
            />
            
            {/* User Management - Oficial, Analista y Gerente */}
            <Route 
              path="/usuarios" 
              element={
                <ProtectedRoute allowedRoles={['OFICIAL_COMPLIANCE', 'ANALISTA_COMPLIANCE', 'GERENTE']}>
                  <UserList />
                </ProtectedRoute>
              } 
            />

            {/* Catch-all para rutas autenticadas */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </TutorialProvider>
      <Notification />
    </>
  )
}

export default App