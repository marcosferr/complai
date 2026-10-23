import { useState, useEffect } from 'react'
import clausulaService from '../../services/clausulaService'
import { getDocumentDetail } from '../../services/documentService'
import { useRolePermissions } from '../../hooks/useRolePermissions'
import { getClauseTerm } from '../../lib/utils'
import { htmlToPlainText, truncateRich } from '../../lib/richText'
import RichTextContent from '../ui/RichTextContent'
import RichTextEditor from '../ui/RichTextEditor'

const ESTADO_LABELS = {
  'PENDIENTE': { label: 'Pendiente', color: 'gray' },
  'APLICADA': { label: 'Aplicada', color: 'green' },
  'APLICADA_PARCIALMENTE': { label: 'Aplicada Parcialmente', color: 'yellow' },
  'RECHAZADA': { label: 'Rechazada', color: 'red' },
}

export default function ClausulaModal({ clausula, documento, onSave, onClose }) {
  const { permissions } = useRolePermissions()

  // Get the appropriate term based on document type
  const clauseTerm = getClauseTerm(documento?.tipo)
  const [formData, setFormData] = useState({
    titulo: '',
    contenido: '',
    numero_orden: 1,
    etiquetas: [],
  })
  const [newTag, setNewTag] = useState('')
  const [adendas, setAdendas] = useState([])
  const [showAdendaForm, setShowAdendaForm] = useState(false)
  const [adendaForm, setAdendaForm] = useState({
    contenido_nuevo: '',
    motivo: '',
    archivo: null,
  })
  const [loadingAdendas, setLoadingAdendas] = useState(false)
  const [archivosDisponibles, setArchivosDisponibles] = useState([])
  const [expandedAdendas, setExpandedAdendas] = useState({})

  useEffect(() => {
    if (clausula) {
      setFormData({
        titulo: clausula.titulo || '',
        contenido: clausula.contenido || '',
        numero_orden: clausula.numero_orden || 1,
        etiquetas: clausula.etiquetas || [],
      })
      // Load adendas
      loadAdendas()
      loadArchivos()
    }
  }, [clausula])

  const loadAdendas = async () => {
    if (!clausula?.id) return
    
    try {
      setLoadingAdendas(true)
      const response = await clausulaService.getAdendas({ clausula: clausula.id })
      setAdendas(response.data?.results || response.data || [])
    } catch (error) {
      console.error('Error loading adendas:', error)
    } finally {
      setLoadingAdendas(false)
    }
  }

  const loadArchivos = async () => {
    if (!clausula?.documento) return
    
    try {
      const response = await getDocumentDetail(clausula.documento)
      setArchivosDisponibles(response?.historial_archivos || [])
    } catch (error) {
      console.error('Error loading archivos:', error)
    }
  }

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

  const handleCreateAdenda = async (e) => {
    e.preventDefault()
    
    if (!adendaForm.contenido_nuevo.trim() || !adendaForm.motivo.trim()) {
      alert('Por favor completa todos los campos de la adenda')
      return
    }

    try {
      await clausulaService.createAdenda({
        clausula: clausula.id,
        // contenido_anterior will be calculated automatically by backend with current clause content
        contenido_nuevo: adendaForm.contenido_nuevo,
        motivo: adendaForm.motivo,
        archivo: adendaForm.archivo || null,
      })
      
      // Reset form and reload adendas
      setAdendaForm({ contenido_nuevo: '', motivo: '', archivo: null })
      setShowAdendaForm(false)
      await loadAdendas()
      
      alert('Adenda creada exitosamente')
    } catch (error) {
      console.error('Error creating adenda:', error)
      alert('Error al crear la adenda')
    }
  }

  const handleApplyAdenda = async (adendaId) => {
    if (!confirm(`¿Estás seguro de aplicar esta adenda? Esto actualizará el contenido de la ${clauseTerm}.`)) {
      return
    }

    try {
      const response = await clausulaService.aplicarAdenda(adendaId)
      
      // Update the form data with the new clause content from the response
      const updatedClausula = response.data.clausula
      setFormData(prev => ({
        ...prev,
        titulo: updatedClausula.titulo,
        contenido: updatedClausula.contenido,
        numero_orden: updatedClausula.numero_orden,
        etiquetas: updatedClausula.etiquetas || []
      }))
      
      await loadAdendas()
      alert('Adenda aplicada exitosamente. El contenido se ha actualizado en la base de datos.')
      
      // Close modal to force parent to reload with fresh data
      onClose()
    } catch (error) {
      console.error('Error applying adenda:', error)
      alert('Error al aplicar la adenda')
    }
  }

  const handleDeleteAdenda = async (adendaId) => {
    if (!confirm('¿Estás seguro de eliminar esta adenda?')) {
      return
    }

    try {
      await clausulaService.deleteAdenda(adendaId)
      await loadAdendas()
      alert('Adenda eliminada exitosamente')
    } catch (error) {
      console.error('Error deleting adenda:', error)
      alert('Error al eliminar la adenda')
    }
  }

  const handleChangeEstadoAdenda = async (adendaId, nuevoEstado) => {
    try {
      await clausulaService.updateAdenda(adendaId, { estado: nuevoEstado })
      await loadAdendas()
      alert(`Estado actualizado a ${ESTADO_LABELS[nuevoEstado].label}`)
    } catch (error) {
      console.error('Error updating estado:', error)
      alert('Error al actualizar el estado')
    }
  }

  const toggleAdendaExpansion = (adendaId) => {
    setExpandedAdendas(prev => ({
      ...prev,
      [adendaId]: !prev[adendaId]
    }))
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity z-40"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative z-50 w-full max-w-2xl bg-white dark:bg-surface-dark rounded-lg shadow-xl">
          <form onSubmit={handleSubmit}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-border-dark">
              <h3 className="text-xl font-bold text-gray-900 dark:text-text-dark">
                {clausula ? `Editar ${clauseTerm.charAt(0).toUpperCase() + clauseTerm.slice(1)}` : `Nueva ${clauseTerm.charAt(0).toUpperCase() + clauseTerm.slice(1)}`}
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
                    placeholder={`Ej: ${clauseTerm.charAt(0).toUpperCase() + clauseTerm.slice(1)} de Confidencialidad`}
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
                <RichTextEditor
                  value={formData.contenido}
                  onChange={(html) => setFormData((prev) => ({ ...prev, contenido: html }))}
                  placeholder={`Contenido completo de la ${clauseTerm}...`}
                  minHeight="12rem"
                />
              </div>

              {/* Adendas Section - Only show for existing clauses */}
              {clausula && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <span className="material-icons text-lg">edit_document</span>
                      Adendas
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowAdendaForm(!showAdendaForm)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <span className="material-icons text-sm">
                        {showAdendaForm ? 'close' : 'add'}
                      </span>
                      {showAdendaForm ? 'Cancelar' : 'Nueva Adenda'}
                    </button>
                  </div>

                  {/* Adenda Creation Form */}
                  {showAdendaForm && (
                    <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Crear Nueva Adenda
                      </h5>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Nuevo Contenido *
                          </label>
                          {/* Al aplicarse, esto pasa a ser el contenido de la
                              cláusula, así que se edita con el mismo editor. */}
                          <RichTextEditor
                            value={adendaForm.contenido_nuevo}
                            onChange={(html) => setAdendaForm({ ...adendaForm, contenido_nuevo: html })}
                            placeholder="Escribe el nuevo contenido propuesto..."
                            minHeight="7rem"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Motivo *
                          </label>
                          <textarea
                            value={adendaForm.motivo}
                            onChange={(e) => setAdendaForm({ ...adendaForm, motivo: e.target.value })}
                            rows="2"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-border-dark bg-white dark:bg-background-dark text-gray-900 dark:text-text-dark text-sm rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            placeholder="Explica el motivo de esta adenda..."
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Archivo Relacionado (Opcional)
                          </label>
                          <select
                            value={adendaForm.archivo || ''}
                            onChange={(e) => setAdendaForm({ ...adendaForm, archivo: e.target.value ? parseInt(e.target.value) : null })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-border-dark bg-white dark:bg-background-dark text-gray-900 dark:text-text-dark text-sm rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          >
                            <option value="">Sin archivo asociado</option>
                            {archivosDisponibles.map((archivo) => (
                              <option key={archivo.id} value={archivo.id}>
                                Versión {archivo.version_numero} - {archivo.filename || 'Archivo'} ({new Date(archivo.fecha_subida).toLocaleDateString()})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setShowAdendaForm(false)
                              setAdendaForm({ contenido_nuevo: '', motivo: '', archivo: null })
                            }}
                            className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={handleCreateAdenda}
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                          >
                            <span className="material-icons text-sm">check</span>
                            Crear Adenda
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Adendas List */}
                  {loadingAdendas ? (
                    <div className="flex items-center justify-center py-6">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    </div>
                  ) : adendas.length > 0 ? (
                    <div className="space-y-3">
                      {adendas.map((adenda) => {
                        const estadoInfo = ESTADO_LABELS[adenda.estado] || ESTADO_LABELS['PENDIENTE']
                        const bgColor = estadoInfo.color === 'green' ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700' :
                                       estadoInfo.color === 'yellow' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700' :
                                       estadoInfo.color === 'red' ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700' :
                                       'bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700'

                        const isExpanded = expandedAdendas[adenda.id]
                        
                        return (
                          <div
                            key={adenda.id}
                            className={`p-3 rounded-lg border ${bgColor}`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  {/* Estado Dropdown */}
                                  <select
                                    value={adenda.estado}
                                    onChange={(e) => handleChangeEstadoAdenda(adenda.id, e.target.value)}
                                    className={`text-xs font-medium px-2 py-1 rounded-full border
                                      ${estadoInfo.color === 'green' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-400' :
                                        estadoInfo.color === 'yellow' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border-yellow-400' :
                                        estadoInfo.color === 'red' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border-red-400' :
                                        'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-400'}`}
                                  >
                                    {Object.entries(ESTADO_LABELS).map(([key, value]) => (
                                      <option key={key} value={key}>{value.label}</option>
                                    ))}
                                  </select>
                                  
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {new Date(adenda.fecha_creacion).toLocaleDateString('es-ES', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>

                                  {/* Archivo relacionado */}
                                  {adenda.archivo_nombre && (
                                    <span className="inline-flex items-center px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-medium rounded-full">
                                      <span className="material-icons text-xs mr-1">attach_file</span>
                                      {adenda.archivo_nombre}
                                    </span>
                                  )}
                                </div>
                                
                                {/* Motivo */}
                                <div className="mb-2">
                                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    <span className="material-icons text-xs mr-1 align-middle">info</span>
                                    Motivo: {adenda.motivo}
                                  </p>
                                </div>

                                {/* Contenido Anterior */}
                                {adenda.contenido_anterior && (
                                  <div className="mb-2 p-2 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded">
                                    <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1 flex items-center gap-1">
                                      <span className="material-icons text-xs">remove_circle</span>
                                      Contenido Anterior
                                    </p>
                                    {isExpanded ? (
                                      <RichTextContent
                                        value={adenda.contenido_anterior}
                                        className="text-xs text-gray-700 dark:text-gray-300"
                                      />
                                    ) : (
                                      /* Se trunca sobre el texto visible: cortar el
                                         HTML por caracteres partiría una etiqueta. */
                                      <p className="text-xs text-gray-700 dark:text-gray-300">
                                        {truncateRich(adenda.contenido_anterior, 100)}
                                      </p>
                                    )}
                                  </div>
                                )}

                                {/* Contenido Nuevo */}
                                <div className="mb-2 p-2 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded">
                                  <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1 flex items-center gap-1">
                                    <span className="material-icons text-xs">add_circle</span>
                                    Contenido Propuesto
                                  </p>
                                  {isExpanded ? (
                                    <RichTextContent
                                      value={adenda.contenido_nuevo}
                                      className="text-xs text-gray-700 dark:text-gray-300"
                                    />
                                  ) : (
                                    <p className="text-xs text-gray-700 dark:text-gray-300">
                                      {truncateRich(adenda.contenido_nuevo, 100)}
                                    </p>
                                  )}
                                </div>

                                {/* Botón para expandir/colapsar */}
                                {/* Se mide el texto visible, no el HTML: si no, las
                                    etiquetas inflarían el largo y el botón aparecería
                                    en adendas que entran completas. */}
                                {(htmlToPlainText(adenda.contenido_nuevo).length > 100 ||
                                  htmlToPlainText(adenda.contenido_anterior).length > 100) && (
                                  <button
                                    type="button"
                                    onClick={() => toggleAdendaExpansion(adenda.id)}
                                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium flex items-center gap-1 mt-2"
                                  >
                                    <span className="material-icons text-xs">
                                      {isExpanded ? 'expand_less' : 'expand_more'}
                                    </span>
                                    {isExpanded ? 'Ver menos' : 'Ver más'}
                                  </button>
                                )}
                              </div>
                              
                              {/* Action buttons */}
                              <div className="flex flex-col gap-1 ml-2">
                                {adenda.estado !== 'APLICADA' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleApplyAdenda(adenda.id)}
                                      className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 rounded transition-colors"
                                      title="Aplicar adenda"
                                    >
                                      <span className="material-icons text-sm">check</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteAdenda(adenda.id)}
                                      className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                                      title="Eliminar adenda"
                                    >
                                      <span className="material-icons text-sm">delete</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-6 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <span className="material-icons text-gray-400 dark:text-gray-600 text-3xl mb-2">
                        description
                      </span>
                      <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                        No hay adendas registradas para esta {clauseTerm}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Objetos Regulados
                  {!permissions.canEditTags && (
                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">(Solo lectura)</span>
                  )}
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  {permissions.canEditTags 
                    ? 'Presiona Enter o haz clic en "Agregar" para añadir un objeto regulado'
                    : 'No tienes permisos para editar los objetos regulados'
                  }
                </p>
                {permissions.canEditTags && (
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
                )}
                {/* Campo interno: etiquetas */}
                {formData.etiquetas.length > 0 ? (
                  <div className="flex flex-wrap gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    {formData.etiquetas.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium"
                      >
                        {tag}
                        {permissions.canEditTags && (
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="hover:text-blue-900 dark:hover:text-blue-100 ml-1"
                            title="Eliminar objeto regulado"
                          >
                            <span className="material-icons text-sm">close</span>
                          </button>
                        )}
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
                {clausula ? 'Guardar Cambios' : `Crear ${clauseTerm.charAt(0).toUpperCase() + clauseTerm.slice(1)}`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
