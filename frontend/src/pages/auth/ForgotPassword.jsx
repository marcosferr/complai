import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { showNotification } from '@/store/slices/uiSlice'
import { requestPasswordReset } from '@/services/authService'
import { BRAND } from '@/config/brand'

const ForgotPassword = () => {
  const dispatch = useDispatch()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      await requestPasswordReset(email)
      setSubmitted(true)
      dispatch(showNotification({ message: 'Si el correo existe, se ha enviado un enlace de recuperación.', type: 'success' }))
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Error al solicitar recuperación'
      dispatch(showNotification({ message: errorMessage, type: 'error' }))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background-light dark:bg-background-dark">
      <div className="w-full max-w-md p-8 space-y-8 bg-surface-light dark:bg-surface-dark rounded-2xl shadow-lg">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <img src={BRAND.logo} alt={BRAND.logoAlt} className="h-20 w-auto object-contain" />
          </div>
          <h2 className="text-xl font-semibold text-text-light dark:text-text-dark mt-4">Recuperar Contraseña</h2>
          <p className="text-subtle-light dark:text-subtle-dark mt-2">
            Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
          </p>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                className="text-sm font-medium text-text-light dark:text-text-dark"
                htmlFor="email"
              >
                Correo Electrónico
              </label>
              <div className="mt-2">
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="w-full px-3 py-2 bg-background-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-text-light dark:text-text-dark"
                  required
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Enviando...' : 'Enviar enlace'}
              </button>
            </div>
          </form>
        ) : (
          <div className="text-center space-y-4">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-md">
              Correo enviado. Revisa tu bandeja de entrada.
            </div>
          </div>
        )}

        <div className="text-center">
          <Link to="/login" className="font-medium text-primary hover:text-primary/80">
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword
