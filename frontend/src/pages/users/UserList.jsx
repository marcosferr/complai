import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchUsers, deleteUser, clearError } from '@/store/slices/usersSlice'
import { showNotification } from '@/store/slices/uiSlice'
import UserModal from '@/components/users/UserModal'
import ConfirmDialog from '@/components/ConfirmDialog'
import { ROLE_LABELS } from '@/lib/estadoEtapaConstants'

const UserList = () => {
  const dispatch = useDispatch()
  const { users, loading, error, pagination } = useSelector(state => state.users)
  const [showModal, setShowModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [userToDelete, setUserToDelete] = useState(null)
  
  // Filters
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    is_active: ''
  })

  useEffect(() => {
    loadUsers()
  }, [])

  useEffect(() => {
    if (error) {
      dispatch(showNotification({ 
        message: typeof error === 'string' ? error : 'Error al cargar usuarios', 
        type: 'error' 
      }))
      dispatch(clearError())
    }
  }, [error])

  const loadUsers = () => {
    const params = {}
    if (filters.search) params.search = filters.search
    if (filters.role) params.role = filters.role
    if (filters.is_active !== '') params.is_active = filters.is_active
    
    dispatch(fetchUsers(params))
  }

  const handleSearch = (e) => {
    e.preventDefault()
    loadUsers()
  }

  // Reload users when filters change
  useEffect(() => {
    loadUsers()
  }, [filters.role, filters.is_active])

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({ ...prev, [name]: value }))
  }

  const handleCreateUser = () => {
    setSelectedUser(null)
    setShowModal(true)
  }

  const handleEditUser = (user) => {
    setSelectedUser(user)
    setShowModal(true)
  }

  const handleDeleteClick = (user) => {
    setUserToDelete(user)
    setShowDeleteDialog(true)
  }

  const handleDeleteConfirm = async () => {
    try {
      await dispatch(deleteUser(userToDelete.id)).unwrap()
      dispatch(showNotification({ 
        message: 'Usuario desactivado exitosamente', 
        type: 'success' 
      }))
      setShowDeleteDialog(false)
      setUserToDelete(null)
      loadUsers() // Reload to reflect changes
    } catch (error) {
      dispatch(showNotification({ 
        message: 'Error al desactivar usuario', 
        type: 'error' 
      }))
    }
  }

  const getRoleBadge = (role) => {
    const colors = {
      'OFICIAL_COMPLIANCE': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      'ANALISTA_COMPLIANCE': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      'GERENTE': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      'RESPONSABLE': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
    }
    
    const labels = ROLE_LABELS
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[role] || colors['RESPONSABLE']}`}>
        {labels[role] || role}
      </span>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Gestión de Usuarios
          </h1>
          <button
            onClick={handleCreateUser}
            title="Crear un nuevo usuario en el sistema"
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Nuevo Usuario
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <input
                type="text"
                placeholder="Buscar por nombre o email..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            
            <div>
              <select
                value={filters.role}
                onChange={(e) => handleFilterChange('role', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">Todos los roles</option>
                <option value="OFICIAL_COMPLIANCE">{ROLE_LABELS.OFICIAL_COMPLIANCE}</option>
                <option value="ANALISTA_COMPLIANCE">{ROLE_LABELS.ANALISTA_COMPLIANCE}</option>
                <option value="GERENTE">{ROLE_LABELS.GERENTE}</option>
                <option value="RESPONSABLE">Responsable</option>
              </select>
            </div>
            
            <div>
              <select
                value={filters.is_active}
                onChange={(e) => handleFilterChange('is_active', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">Todos los estados</option>
                <option value="true">Activos</option>
                <option value="false">Inactivos</option>
              </select>
            </div>
            
            <div className="md:col-span-4 flex gap-2">
              <button
                type="submit"
                title="Buscar usuarios con los filtros aplicados"
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover"
              >
                Buscar
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilters({ search: '', role: '', is_active: '' })
                  dispatch(fetchUsers())
                }}
                title="Limpiar todos los filtros de búsqueda"
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Limpiar
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando usuarios...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            No se encontraron usuarios
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Dependencia
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-primary rounded-full flex items-center justify-center text-white font-semibold">
                          {user.first_name?.[0]}{user.last_name?.[0]}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {user.first_name} {user.last_name}
                          </div>
                          {user.is_tenant_admin && (
                            <div className="text-xs text-primary dark:text-primary-light">
                              Admin de Organización
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">{user.email}</div>
                      {user.phone && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">{user.phone}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getRoleBadge(user.role)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {user.area_nombre || user.department || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.is_active ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                          Activo
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                          Inactivo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEditUser(user)}
                        title="Editar la información del usuario"
                        className="text-primary hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-4"
                      >
                        Editar
                      </button>
                      {user.is_active ? (
                        <button
                          onClick={() => handleDeleteClick(user)}
                          title="Desactivar el acceso del usuario al sistema"
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          Desactivar
                        </button>
                      ) : (
                        <button
                          onClick={() => handleEditUser(user)}
                          title="Reactivar el acceso del usuario al sistema"
                          className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                        >
                          Activar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination info */}
        {pagination.count > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Mostrando <span className="font-medium">{users.length}</span> de{' '}
              <span className="font-medium">{pagination.count}</span> usuarios
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
      <UserModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        user={selectedUser}
        onSuccess={() => loadUsers()}
      />

      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteConfirm}
        title="Desactivar Usuario"
        message={`¿Estás seguro de que deseas desactivar al usuario ${userToDelete?.first_name} ${userToDelete?.last_name}? El usuario no podrá acceder al sistema.`}
        confirmText="Desactivar"
        confirmColor="red"
      />
    </div>
  )
}

export default UserList
