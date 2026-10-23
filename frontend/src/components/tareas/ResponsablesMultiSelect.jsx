import React, { useEffect, useMemo, useRef, useState } from 'react'

const ResponsablesMultiSelect = ({
  users = [],
  value = [],
  onChange,
  placeholder = 'Seleccionar responsables',
  size = 'md',
  disabled = false,
}) => {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return users

    return users.filter((user) => {
      const fullName = `${user.first_name || ''} ${user.last_name || ''} ${user.email || ''}`.toLowerCase()
      return fullName.includes(term)
    })
  }, [search, users])

  const selectedUsers = useMemo(
    () => users.filter((user) => value.includes(user.id)),
    [users, value]
  )

  const toggleUser = (id) => {
    if (disabled) return
    const exists = value.includes(id)
    const next = exists ? value.filter((v) => v !== id) : [...value, id]
    onChange?.(next)
  }

  const clearAll = () => {
    if (disabled) return
    onChange?.([])
  }

  const sizeClasses = size === 'sm'
    ? 'min-h-[40px] text-sm'
    : 'min-h-[48px]'

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={`w-full ${sizeClasses} border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark rounded-lg px-3 py-2 flex items-center justify-between gap-2 text-left shadow-sm hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <div className="flex flex-wrap gap-1 items-center">
          {selectedUsers.length === 0 ? (
            <span className="text-subtle-light dark:text-subtle-dark text-sm">{placeholder}</span>
          ) : (
            <>
              {selectedUsers.slice(0, 3).map((user) => (
                <span
                  key={user.id}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium"
                >
                  <span className="material-icons text-[14px]">person</span>
                  <span className="max-w-[120px] truncate">{`${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email}</span>
                </span>
              ))}
              {selectedUsers.length > 3 && (
                <span className="text-xs text-subtle-light dark:text-subtle-dark">
                  +{selectedUsers.length - 3} más
                </span>
              )}
            </>
          )}
        </div>
        <span className="material-icons text-subtle-light dark:text-subtle-dark text-base">
          {open ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-border-light dark:border-border-dark rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark flex items-center gap-2">
            <span className="material-icons text-subtle-light dark:text-subtle-dark text-base">search</span>
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o correo"
              className="w-full bg-transparent text-sm text-text-light dark:text-text-dark placeholder:text-subtle-light dark:placeholder:text-subtle-dark focus:outline-none"
            />
            {selectedUsers.length > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="text-xs text-primary hover:text-primary/80"
              >
                Limpiar
              </button>
            )}
          </div>

          <div className="max-h-64 overflow-y-auto divide-y divide-border-light dark:divide-border-dark">
            {filteredUsers.length === 0 ? (
              <p className="px-3 py-4 text-sm text-subtle-light dark:text-subtle-dark">No hay resultados</p>
            ) : (
              filteredUsers.map((user) => {
                const isSelected = value.includes(user.id)
                const displayName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => toggleUser(user.id)}
                    className={`w-full px-3 py-2 text-left flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${isSelected ? 'bg-primary/10 text-primary' : 'text-text-light dark:text-text-dark'}`}
                  >
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs ${isSelected ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}>
                      {(displayName || user.email || '?').slice(0, 2).toUpperCase()}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{displayName}</p>
                      <p className="text-xs text-subtle-light dark:text-subtle-dark truncate">{user.email}</p>
                    </div>
                    <span className="material-icons text-base">{isSelected ? 'check_circle' : 'radio_button_unchecked'}</span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ResponsablesMultiSelect
