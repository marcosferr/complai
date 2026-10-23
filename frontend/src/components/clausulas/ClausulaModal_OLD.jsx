import { useState, useEffect } from 'react'

export default function ClausulaModal({ clausula, onSave, onClose }) {
  const [formData, setFormData] = useState({
    titulo: '',
    contenido: '',
    numero_orden: 1,
    etiquetas: [],
  })
  const [newTag, setNewTag] = useState('')

  useEffect(() => {
    if (clausula) {
      setFormData({
        titulo: clausula.titulo || '',
        contenido: clausula.contenido || '',
        numero_orden: clausula.numero_orden || 1,
        etiquetas: clausula.etiquetas || [],
      })
    }
  }, [clausula])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleAddTag = () => {
    if (newTag.trim() && !formData.etiquetas.includes(newTag.trim())) {
      setFormData((prev) => ({
        ...prev,
        etiquetas: [...prev.etiquetas, newTag.trim()],
      }))
      setNewTag('')
    }
  }

  const handleRemoveTag = (tag) => {
    setFormData((prev) => ({
      ...prev,
      etiquetas: prev.etiquetas.filter((t) => t !== tag),
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative z-50 w-full max-w-2xl bg-white dark:bg-surface-dark rounded-lg shadow-xl">
          <form onSubmit={handleSubmit}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-border-dark">
              <h3 className="text-xl font-bold text-gray-900 dark:text-text-dark">
                {clausula ? 'Editar Cláusula' : 'Nueva Cláusula'}
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <span className="material-icons">close</span>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Título *
                  </label>
                  <input
                    type="text"
                    name="titulo"
                    value={formData.titulo}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-border-dark bg-white dark:bg-background-dark text-gray-900 dark:text-text-dark rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ej: Cláusula de Confidencialidad"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Orden *
                  </label>
                  <input
                    type="number"
                    name="numero_orden"
                    value={formData.numero_orden}
                    onChange={handleChange}
                    required
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-border-dark bg-white dark:bg-background-dark text-gray-900 dark:text-text-dark rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Contenido *
                </label>
                <textarea
                  name="contenido"
                  value={formData.contenido}
                  onChange={handleChange}
                  required
                  rows="8"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-border-dark bg-white dark:bg-background-dark text-gray-900 dark:text-text-dark rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Contenido completo de la cláusula..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Objetos Regulados
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Presiona Enter o haz clic en "Agregar" para añadir un objeto regulado
                </p>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddTag()
                      }
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-border-dark bg-white dark:bg-background-dark text-gray-900 dark:text-text-dark rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ej: Obligaciones, Financiero, Riesgo Alto..."
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <span className="material-icons text-sm">add</span>
                    Agregar
                  </button>
                </div>
                {/* Campo interno: etiquetas */}
                {formData.etiquetas.length > 0 ? (
                  <div className="flex flex-wrap gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    {formData.etiquetas.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:text-blue-900 dark:hover:text-blue-100 ml-1"
                          title="Eliminar objeto regulado"
                        >
                          <span className="material-icons text-sm">close</span>
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                      No hay objetos regulados agregados
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-border-dark bg-gray-50 dark:bg-gray-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <span className="material-icons text-sm">save</span>
                {clausula ? 'Guardar Cambios' : 'Crear Cláusula'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
