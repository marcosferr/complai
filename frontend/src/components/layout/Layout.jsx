import React, { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { Link, useLocation } from 'react-router-dom'
import { logout } from '@/store/slices/authSlice'
import { showNotification } from '@/store/slices/uiSlice'
import { startSidebarTutorial, setTutorialState } from '@/store/slices/tutorialSlice'
import api from '@/services/api'
import { stopTokenRefreshInterval } from '@/services/authService'
import tutorialService from '@/services/tutorialService'
import NotificationBell from '@/components/notificaciones/NotificationBell'
import { BRAND } from '@/config/brand'

const Layout = ({ children }) => {
  const dispatch = useDispatch()
  const location = useLocation()
  const { user } = useSelector(state => state.auth)
  const { tutorialCompleted, tutorialStep } = useSelector(state => state.tutorial)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Check if sidebar tutorial should auto-start
  useEffect(() => {
    // Auto-start sidebar tutorial for new users who haven't completed it
    if (user && !tutorialCompleted && !tutorialStep?.sidebar) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        dispatch(startSidebarTutorial())
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [user, tutorialCompleted, tutorialStep, dispatch])

  const handleStartTutorial = async () => {
    try {
      // Reset tutorial on backend
      await tutorialService.resetTutorial()
      dispatch(setTutorialState({ tutorial_completed: false, tutorial_step: {} }))
      dispatch(startSidebarTutorial())
    } catch (error) {
      console.error('Error resetting tutorial:', error)
      // Still start the tutorial even if backend fails
      dispatch(startSidebarTutorial())
    }
  }

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken')

      // Stop token refresh interval
      stopTokenRefreshInterval()

      // Try to blacklist the refresh token
      if (refreshToken) {
        try {
          await api.post('/auth/logout/', { refresh: refreshToken })
        } catch (error) {
          console.error('Error blacklisting token:', error)
        }
      }

      dispatch(logout())
      dispatch(showNotification({ message: 'Sesión cerrada correctamente', type: 'success' }))
    } catch (error) {
      dispatch(showNotification({ message: 'Error al cerrar sesión', type: 'error' }))
    }
  }

  // Helper to get tutorial data attribute for menu items
  const getTutorialAttribute = (path) => {
    const mapping = {
      '/': 'sidebar-dashboard',
      '/tareas': 'sidebar-tareas',
      '/documentos': 'sidebar-documentos',
      '/auditorias': 'sidebar-auditorias',
      '/calendario': 'sidebar-calendario',
      '/notificaciones': 'sidebar-notificaciones'
    }
    return mapping[path] || ''
  }

  // Filter menu items based on user role
  const getMenuItems = () => {
    const tareasTooltip = user?.role === 'ADMIN'
      ? 'visualiza y gestiona las obligaciones de la organización'
      : 'visualiza y gestiona las obligaciones del área'

    const allMenuItems = [
      { path: '/', label: 'Dashboard', icon: 'dashboard', tooltip: 'Panel principal con resumen de actividades y métricas clave', roles: ['ADMINISTRADOR_CONTRATO', 'ANALISTA_UOC', 'DIRECTOR', 'RESPONSABLE'] },
      { path: '/tareas', label: 'Obligaciones', icon: 'assignment_turned_in', tooltip: tareasTooltip, roles: ['ADMINISTRADOR_CONTRATO', 'ANALISTA_UOC', 'DIRECTOR', 'RESPONSABLE'] },
      { path: '/documentos', label: 'Documentos de Compliance', icon: 'gavel', tooltip: 'Administra documentos legales y contratos de la organización', roles: ['ADMINISTRADOR_CONTRATO', 'ANALISTA_UOC'] },
      { path: '/auditorias', label: 'Compliance', icon: 'fact_check', tooltip: 'Programa y gestiona auditorías de cumplimiento', roles: ['ADMINISTRADOR_CONTRATO', 'ANALISTA_UOC'] },
      { path: '/calendario', label: 'Calendario', icon: 'calendar_today', tooltip: 'Visualiza eventos y fechas importantes relacionadas con el cumplimiento', roles: ['ADMINISTRADOR_CONTRATO', 'ANALISTA_UOC', 'DIRECTOR', 'RESPONSABLE'] },
      { path: '/notificaciones', label: 'Notificaciones', icon: 'notifications', tooltip: 'Revisa alertas y notificaciones del sistema de cumplimiento', roles: ['ADMINISTRADOR_CONTRATO', 'ANALISTA_UOC', 'DIRECTOR', 'RESPONSABLE'] },
    ]

    // Filter by user role
    return allMenuItems.filter(item => item.roles.includes(user?.role))
  }

  const menuItems = getMenuItems()

  return (
    <div className="flex h-screen bg-background-light dark:bg-background-dark font-display">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-surface-light dark:bg-surface-dark border-b border-border-light dark:border-border-dark">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center">
            <img src={BRAND.logo} alt={BRAND.logoAlt} className="h-10 w-auto object-contain" />
            <span className="ml-2 font-semibold text-primary">{BRAND.nombreSistema}</span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-text-light dark:text-text-dark hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <span className="material-icons">{mobileMenuOpen ? 'close' : 'menu'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40 mt-[57px]"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 
        bg-surface-light dark:bg-surface-dark flex flex-col 
        border-r border-border-light dark:border-border-dark
        transform transition-transform duration-300 ease-in-out
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        lg:mt-0 mt-[57px]
      `}>
        <div
          data-tutorial="sidebar-logo"
          className="px-6 py-4 hidden lg:flex items-center justify-between gap-2"
        >
          <div className="flex items-center">
            <img src={BRAND.logo} alt={BRAND.logoAlt} className="h-14 w-auto object-contain" />
            <div className="ml-2 leading-tight">
              <p className="font-bold text-primary">{BRAND.nombreSistema}</p>
              <p className="text-[11px] text-subtle-light dark:text-subtle-dark">{BRAND.institucion}</p>
            </div>
          </div>
          <NotificationBell />
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileMenuOpen(false)}
              title={item.tooltip}
              data-tutorial={getTutorialAttribute(item.path)}
              className={`flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg ${location.pathname === item.path
                  ? 'bg-primary/10 text-primary'
                  : 'text-subtle-light dark:text-subtle-dark hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
            >
              <span className="material-icons">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Solo Administrador/a de Contrato y UOC (no Dirección) */}
        {(user?.role === 'ADMINISTRADOR_CONTRATO' || user?.role === 'ANALISTA_UOC') && (
          <div className="px-4 py-4 space-y-2 border-t border-border-light dark:border-border-dark">
            <Link
              to="/usuarios"
              onClick={() => setMobileMenuOpen(false)}
              title="Administra usuarios, roles y áreas de la organización"
              data-tutorial="sidebar-usuarios"
              className="flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg text-subtle-light dark:text-subtle-dark hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <span className="material-icons">group</span>
              Gestión de Usuarios
            </Link>
          </div>
        )}

        <div className="px-6 py-4 border-t border-border-light dark:border-border-dark">
          <div
            data-tutorial="sidebar-user-profile"
            className="flex items-center gap-3 mb-3"
          >
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="material-icons text-primary text-sm">person</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-light dark:text-text-dark truncate">
                {user?.first_name || user?.username || user?.email}
              </p>
              <p className="text-xs text-subtle-light dark:text-subtle-dark truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Cerrar la sesión actual y salir del sistema"
            data-tutorial="sidebar-logout"
            className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg text-subtle-light dark:text-subtle-dark hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <span className="material-icons text-sm">logout</span>
            Cerrar Sesión
          </button>
        </div>

        <div className="px-6 py-4 flex items-center justify-between">
          <p className="text-xs text-subtle-light dark:text-subtle-dark">© {new Date().getFullYear()} {BRAND.institucionCorta}</p>
          <button
            onClick={handleStartTutorial}
            title="Iniciar tutorial guiado"
            data-tutorial="tutorial-help-button"
            className="p-2 text-subtle-light dark:text-subtle-dark hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
          >
            <span className="material-icons text-lg">help_outline</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-background-light dark:bg-background-dark p-4 sm:p-6 lg:mt-0 mt-[57px]">
        {children}
      </main>
    </div>
  )
}

export default Layout