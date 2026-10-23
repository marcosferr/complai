import React, { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { createUser, updateUser } from '@/store/slices/usersSlice'
import { showNotification } from '@/store/slices/uiSlice'
import areaService from '@/services/areaService'
import AreaModal from './AreaModal'
import PasswordStrengthIndicator from '@/components/PasswordStrengthIndicator'
import { validatePassword } from '@/utils/passwordValidation'

const UserModal = ({ isOpen, onClose, user, onSuccess }) => {
  const dispatch = useDispatch()
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [areas, setAreas] = useState([])
  const [loadingAreas, setLoadingAreas] = useState(false)
  const [showAreaModal, setShowAreaModal] = useState(false)
  
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    password_confirm: '',
    role: 'RESPONSABLE',
    phone: '',
    area: '',
    is_tenant_admin: false,
    is_active: true
  })

  // Load areas when modal opens
  useEffect(() => {
    if (isOpen) {
      loadAreas()
    }
  }, [isOpen])

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        password: '',
        password_confirm: '',
        role: user.role || 'RESPONSABLE',
        phone: user.phone || '',
        area: user.area || '',
        is_tenant_admin: user.is_tenant_admin || false,
        is_active: user.is_active !== undefined ? user.is_active : true
      })
    } else {
      setFormData({
        email: '',
        first_name: '',
        last_name: '',
        password: '',
        password_confirm: '',
        role: 'RESPONSABLE',
        phone: '',
        area: '',
        is_tenant_admin: false,
        is_active: true
      })
    }
    setErrors({})
  }, [user, isOpen])

  const loadAreas = async () => {
    setLoadingAreas(true)
    try {
      const response = await areaService.getAreas()
      setAreas(response.data)
    } catch (error) {
      dispatch(showNotification({ 
        message: 'Error al cargar areas/gerencias', 
        type: 'error' 
      }))
    } finally {
      setLoadingAreas(false)
    }
  }

  const handleAreaCreated = (newArea) => {
    setAreas(prev => [...prev, newArea])
    setFormData(prev => ({ ...prev, area: newArea.id }))
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }))
    }
  }

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.email.trim()) {
      newErrors.email = 'El email es requerido'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email inválido'
    }
    
    if (!formData.first_name.trim()) {
      newErrors.first_name = 'El nombre es requerido'
    }
    
    if (!formData.last_name.trim()) {
      newErrors.last_name = 'El apellido es requerido'
    }
    
    // Área es requerida solo para RESPONSABLE y GERENTE
    if (['RESPONSABLE', 'GERENTE'].includes(formData.role) && !formData.area) {
      newErrors.area = 'El area/gerencia es requerido para este rol'
    }
    
    if (!user) {
      // Creating new user - password is required and must be strong
      if (!formData.password) {
        newErrors.password = 'La contraseña es requerida'
      } else {
        const { isValid, errors } = validatePassword(formData.password)
        if (!isValid) {
          newErrors.password = errors[0] // Show first error
        }
      }
      
      if (formData.password !== formData.password_confirm) {
        newErrors.password_confirm = 'Las contraseñas no coinciden'
      }
    } else {
      // Updating user - password is optional but must be strong if provided
      if (formData.password) {
        const { isValid, errors } = validatePassword(formData.password)
        if (!isValid) {
          newErrors.password = errors[0] // Show first error
        }
      }
      
      if (formData.password && formData.password !== formData.password_confirm) {
        newErrors.password_confirm = 'Las contraseñas no coinciden'
      }
    }
    
    return newErrors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const validationErrors = validateForm()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setLoading(true)
    try {
      const submitData = { ...formData }
      
      // Remove password fields if empty when updating
      if (user && !submitData.password) {
        delete submitData.password
        delete submitData.password_confirm
      }
      
      if (user) {
        await dispatch(updateUser({ id: user.id, userData: submitData })).unwrap()
        dispatch(showNotification({ 
          message: 'Usuario actualizado exitosamente', 
          type: 'success' 
        }))
      } else {
        await dispatch(createUser(submitData)).unwrap()
        dispatch(showNotification({ 
          message: 'Usuario creado exitosamente', 
          type: 'success' 
        }))
      }
      
      onSuccess && onSuccess()
      onClose()
    } catch (error) {
      if (typeof error === 'object') {
        setErrors(error)
      } else {
        dispatch(showNotification({ 
          message: error || 'Error al guardar usuario', 
          type: 'error' 
        }))
      }
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {user ? 'Editar Usuario' : 'Nuevo Usuario'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email}</p>
              )}
            </div>

            {/* First Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nombre *
              </label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                  errors.first_name ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.first_name && (
                <p className="text-red-500 text-sm mt-1">{errors.first_name}</p>
              )}
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Apellido *
              </label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                  errors.last_name ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.last_name && (
                <p className="text-red-500 text-sm mt-1">{errors.last_name}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Contraseña {!user && '*'}
                {user && <span className="text-gray-500 text-xs ml-1">(dejar en blanco para no cambiar)</span>}
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                  errors.password ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              <PasswordStrengthIndicator password={formData.password} />
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password}</p>
              )}
            </div>

            {/* Password Confirm */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Confirmar Contraseña {!user && '*'}
              </label>
              <input
                type="password"
                name="password_confirm"
                value={formData.password_confirm}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                  errors.password_confirm ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.password_confirm && (
                <p className="text-red-500 text-sm mt-1">{errors.password_confirm}</p>
              )}
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Rol *
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="RESPONSABLE">Responsable</option>
                <option value="GERENTE">Gerente</option>
                <option value="ANALISTA_COMPLIANCE">Analista de Compliance</option>
                <option value="OFICIAL_COMPLIANCE">Oficial de Compliance</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {formData.role === 'RESPONSABLE' && 'Ejecuta tareas asignadas en la Etapa de Inicio'}
                {formData.role === 'GERENTE' && 'Revisa y aprueba tareas de su área'}
                {formData.role === 'ANALISTA_COMPLIANCE' && 'Valida cumplimiento técnico y documental'}
                {formData.role === 'OFICIAL_COMPLIANCE' && 'Control total del proceso y remisión a la Autoridad'}
              </p>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Teléfono
              </label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            {/* Area/Department */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Area/Gerencia {formData.role !== 'OFICIAL_COMPLIANCE' && '*'}
              </label>
              <div className="flex gap-2">
                <select
                  name="area"
                  value={formData.area}
                  onChange={handleChange}
                  className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                    errors.area ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={loadingAreas}
                >
                  <option value="">Seleccionar area/gerencia...</option>
                  {areas.map(area => (
                    <option key={area.id} value={area.id}>
                      {area.nombre}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowAreaModal(true)}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg border border-gray-300 dark:border-gray-600"
                  title="Agregar nueva area/gerencia"
                >
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </button>
              </div>
              {errors.area && (
                <p className="text-red-500 text-sm mt-1">{errors.area}</p>
              )}
              {!['OFICIAL_COMPLIANCE', 'ANALISTA_COMPLIANCE'].includes(formData.role) && (
                <p className="text-gray-500 text-xs mt-1">
                  El area/gerencia es requerido para Responsables y Gerentes
                </p>
              )}
              {formData.role === 'OFICIAL_COMPLIANCE' && (
                <p className="text-blue-500 text-xs mt-1">
                  Opcional: El Oficial de Compliance puede ver todas las áreas
                </p>
              )}
              {formData.role === 'ANALISTA_COMPLIANCE' && (
                <p className="text-blue-500 text-xs mt-1">
                  Opcional: El Analista de Compliance puede ver todas las áreas
                </p>
              )}
            </div>

            {/* Is Tenant Admin */}
            <div className="flex items-center">
              <input
                type="checkbox"
                name="is_tenant_admin"
                checked={formData.is_tenant_admin}
                onChange={handleChange}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Administrador de Organización
              </label>
            </div>

            {/* Is Active (only show when editing) */}
            {user && (
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Usuario Activo
                </label>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? 'Guardando...' : user ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Area Modal */}
      <AreaModal
        isOpen={showAreaModal}
        onClose={() => setShowAreaModal(false)}
        onSuccess={handleAreaCreated}
      />
    </div>
  )
}

export default UserModal
