import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { loginStart, loginSuccess, loginFailure } from '@/store/slices/authSlice'
import { showNotification } from '@/store/slices/uiSlice'
import api from '@/services/api'
import { startTokenRefreshInterval } from '@/services/authService'
import { retornoDesdeState } from '@/lib/retornoLogin'
import { BRAND } from '@/config/brand'

const Login = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  /** Adónde quería ir la persona antes de que la mandaran acá. */
  const destino = retornoDesdeState(useLocation().state)
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  })

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    dispatch(loginStart())

    try {
      const response = await api.post('/auth/login/', formData)
      dispatch(loginSuccess(response.data))
      dispatch(showNotification({ message: 'Inicio de sesión exitoso', type: 'success' }))

      // Start automatic token refresh after successful login
      startTokenRefreshInterval()

      // Vuelve a lo que se había pedido; si no había nada, al dashboard.
      navigate(destino ?? '/', { replace: true })
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Error al iniciar sesión'
      dispatch(loginFailure(errorMessage))
      dispatch(showNotification({ message: errorMessage, type: 'error' }))
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background-light dark:bg-background-dark">
      <div className="w-full max-w-md p-8 space-y-8 bg-surface-light dark:bg-surface-dark rounded-2xl shadow-lg">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <img src={BRAND.logo} alt={BRAND.logoAlt} className="h-28 w-auto object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-primary">{BRAND.nombreSistema}</h1>
          <p className="mt-1 text-sm font-medium text-brand-secondary">{BRAND.descripcion}</p>
          <p className="mt-4 text-subtle-light dark:text-subtle-dark">Inicia sesión para acceder a tu cuenta</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              className="text-sm font-medium text-text-light dark:text-text-dark"
              htmlFor="username"
            >
              Nombre de Usuario o Correo Electrónico
            </label>
            <div className="mt-2">
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="tu.usuario o tu@email.com"
                className="w-full px-3 py-2 bg-background-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-text-light dark:text-text-dark"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label
                className="text-sm font-medium text-text-light dark:text-text-dark"
                htmlFor="password"
              >
                Contraseña
              </label>
              <div className="text-sm">
                <Link to="/forgot-password" className="font-medium text-primary hover:text-primary/80">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            </div>
            <div className="mt-2">
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full px-3 py-2 bg-background-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-text-light dark:text-text-dark"
                required
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
            >
              Iniciar Sesión
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Login