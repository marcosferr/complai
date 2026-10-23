import React from 'react'

const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', variant = 'danger' }) => {
  if (!isOpen) return null

  const variantStyles = {
    danger: 'bg-danger hover:bg-danger/90',
    primary: 'bg-primary hover:bg-primary/90',
    warning: 'bg-warning hover:bg-warning/90'
  }

  const variantIcons = {
    danger: 'error',
    primary: 'info',
    warning: 'warning'
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-light dark:bg-surface-dark rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center gap-3 p-6 border-b border-border-light dark:border-border-dark">
          <span className={`material-icons text-3xl ${variant === 'danger' ? 'text-danger' : variant === 'warning' ? 'text-warning' : 'text-primary'}`}>
            {variantIcons[variant]}
          </span>
          <h2 className="text-xl font-bold text-text-light dark:text-text-dark">
            {title}
          </h2>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-text-light dark:text-text-dark">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 p-6 border-t border-border-light dark:border-border-dark">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:bg-background-light dark:hover:bg-background-dark rounded-lg transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-6 py-2 text-white rounded-lg transition-colors ${variantStyles[variant]}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
