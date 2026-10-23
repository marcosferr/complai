import React, { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { showNotification } from '@/store/slices/uiSlice'
import { confirmPasswordReset } from '@/services/authService'
import PasswordStrengthIndicator from '@/components/PasswordStrengthIndicator'
import { validatePassword } from '@/utils/passwordValidation'
import { BRAND } from '@/config/brand'

const ResetPassword = () => {
  const { uid, token } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [formData, setFormData] = useState({
    password: '',
    passwordConfirm: ''
  })
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validate password strength
    const { isValid, errors } = validatePassword(formData.password)
    if (!isValid) {
      dispatch(showNotification({ message: errors[0], type: 'error' }))
      return
    }

    if (formData.password !== formData.passwordConfirm) {
      dispatch(showNotification({ message: 'Las contraseñas no coinciden', type: 'error' }))
      return
    }

    setLoading(true)

    try {
      await confirmPasswordReset(uid, token, formData.password, formData.passwordConfirm)
      dispatch(showNotification({ message: 'Contraseña restablecida exitosamente', type: 'success' }))
      navigate('/login')
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Error al restablecer contraseña'
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
          <h2 className="text-xl font-semibold text-text-light dark:text-text-dark mt-4">Nueva Contraseña</h2>
          <p className="text-subtle-light dark:text-subtle-dark mt-2">
            Ingresa tu nueva contraseña.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              className="text-sm font-medium text-text-light dark:text-text-dark"
              htmlFor="password"
            >
              Nueva Contraseña
            </label>
            <div className="mt-2">
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full px-3 py-2 bg-background-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-text-light dark:text-text-dark"
                required
                minLength={8}
              />
              <PasswordStrengthIndicator password={formData.password} />
            </div>
          </div>

          <div>
            <label
              className="text-sm font-medium text-text-light dark:text-text-dark"
              htmlFor="passwordConfirm"
            >
              Confirmar Contraseña
            </label>
            <div className="mt-2">
              <input
                type="password"
                id="passwordConfirm"
                name="passwordConfirm"
                value={formData.passwordConfirm}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full px-3 py-2 bg-background-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-text-light dark:text-text-dark"
                required
                minLength={8}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Restableciendo...' : 'Restablecer Contraseña'}
            </button>
          </div>
        </form>

        <div className="text-center">
          <Link to="/login" className="font-medium text-primary hover:text-primary/80">
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    </div>
  )
}

export default ResetPassword
