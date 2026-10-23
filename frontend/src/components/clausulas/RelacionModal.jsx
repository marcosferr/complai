import { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import clausulaService from '@/services/clausulaService'
import { fetchClausulasByDocumento } from '@/store/slices/clausulasSlice'
import { getClauseTerm } from '@/lib/utils'

const TIPOS_RELACION = [
  { value: 'REFERENCIA', label: 'Referencia' },
  { value: 'MODIFICACION', label: 'Modificación' },
  { value: 'DEPENDENCIA', label: 'Dependencia' },
  { value: 'COMPLEMENTO', label: 'Complemento' },
  { value: 'EXCEPCION', label: 'Excepción' },
]

export default function RelacionModal({ clausula, clausulas, documento, onClose }) {
  const dispatch = useDispatch()

  // Get the appropriate term based on document type
  const clauseTerm = getClauseTerm(documento?.tipo)
  const [formData, setFormData] = useState({
    clausula_relacionada: '',
    tipo_relacion: 'REFERENCIA',
    descripcion: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [parentClausulas, setParentClausulas] = useState([])
  const [auxiliaryClausulas, setAuxiliaryClausulas] = useState([])
  const [loadingParent, setLoadingParent] = useState(false)
  const [loadingAuxiliary, setLoadingAuxiliary] = useState(false)

  const disponibles = clausulas.filter((c) => c.id !== clausula.id)

  // Load parent document clauses
  useEffect(() => {
    const loadParentClausulas = async () => {
      if (documento?.documento_padre_info?.id) {
        try {
          setLoadingParent(true)
          const response = await clausulaService.getClausulasByDocumento(documento.documento_padre_info.id)
          setParentClausulas(response.data || [])
        } catch (error) {
          console.error('Error loading parent clauses:', error)
          setParentClausulas([])
        } finally {
          setLoadingParent(false)
        }
      }
    }
    
    loadParentClausulas()
  }, [documento?.documento_padre_info?.id])

  // Load auxiliary documents clauses
  useEffect(() => {
    const loadAuxiliaryClausulas = async () => {
      if (documento?.documentos_auxiliares_info && documento.documentos_auxiliares_info.length > 0) {
        try {
          setLoadingAuxiliary(true)
          const auxiliaryPromises = documento.documentos_auxiliares_info.map(async (auxDoc) => {
            try {
              const response = await clausulaService.getClausulasByDocumento(auxDoc.id)
              return {
                documentoId: auxDoc.id,
                documentoTitulo: auxDoc.titulo,
                clausulas: response.data || []
              }
            } catch (error) {
              console.error(`Error loading clauses for auxiliary doc ${auxDoc.id}:`, error)
              return {
                documentoId: auxDoc.id,
                documentoTitulo: auxDoc.titulo,
                clausulas: []
              }
            }
          })
          const results = await Promise.all(auxiliaryPromises)
          setAuxiliaryClausulas(results.filter(r => r.clausulas.length > 0))
        } catch (error) {
          console.error('Error loading auxiliary clauses:', error)
          setAuxiliaryClausulas([])
        } finally {
          setLoadingAuxiliary(false)
        }
      }
    }
    
    loadAuxiliaryClausulas()
  }, [documento?.documentos_auxiliares_info])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await clausulaService.createRelacion({
        clausula_principal: clausula.id,
        clausula_relacionada: parseInt(formData.clausula_relacionada),
        tipo_relacion: formData.tipo_relacion,
        descripcion: formData.descripcion,
      })

      // Refresh clausulas
      dispatch(fetchClausulasByDocumento(clausula.documento))
      onClose()
    } catch (err) {
      setError(err.response?.data?.message || 'Error al crear la relación')
    } finally {
      setLoading(false)
    }
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
        <div className="relative z-50 w-full max-w-lg bg-white rounded-lg shadow-xl">
          <form onSubmit={handleSubmit}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-xl font-bold text-gray-900">
                Relacionar {clauseTerm.charAt(0).toUpperCase() + clauseTerm.slice(1)}
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <span className="material-icons">close</span>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>{clauseTerm.charAt(0).toUpperCase() + clauseTerm.slice(1)} principal:</strong> {clausula.titulo}
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {clauseTerm.charAt(0).toUpperCase() + clauseTerm.slice(1)} relacionada *
                </label>
                <select
                  name="clausula_relacionada"
                  value={formData.clausula_relacionada}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={loadingParent || loadingAuxiliary}
                >
                  <option value="">Seleccione una {clauseTerm}</option>
                  
                  {/* Current document clauses */}
                  {disponibles.length > 0 && (
                    <optgroup label={`📄 ${clauseTerm.charAt(0).toUpperCase() + clauseTerm.slice(1)}s del Documento Actual`}>
                      {disponibles.map((c) => (
                        <option key={c.id} value={c.id}>
                          #{c.numero_orden} - {c.titulo}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  
                  {/* Parent document clauses */}
                  {parentClausulas.length > 0 && documento?.documento_padre_info && (
                    <optgroup label={`📋 Documento Padre: ${documento.documento_padre_info.titulo}`}>
                      {parentClausulas.map((c) => (
                        <option key={`parent-${c.id}`} value={c.id}>
                          #{c.numero_orden} - {c.titulo}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  
                  {/* Auxiliary documents clauses */}
                  {auxiliaryClausulas.map((auxDoc) => (
                    <optgroup key={`aux-${auxDoc.documentoId}`} label={`🔗 Auxiliar: ${auxDoc.documentoTitulo}`}>
                      {auxDoc.clausulas.map((c) => (
                        <option key={`aux-${auxDoc.documentoId}-${c.id}`} value={c.id}>
                          #{c.numero_orden} - {c.titulo}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                  
                  {(loadingParent || loadingAuxiliary) && (
                    <option disabled>Cargando {clauseTerm}s de otros documentos...</option>
                  )}
                </select>
                {(documento?.documento_padre_info || (documento?.documentos_auxiliares_info && documento.documentos_auxiliares_info.length > 0)) && (
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Puede referenciar {clauseTerm}s de documentos relacionados
                    {documento?.documento_padre_info && ` (Padre: ${documento.documento_padre_info.titulo})`}
                    {documento?.documentos_auxiliares_info && documento.documentos_auxiliares_info.length > 0 && 
                      ` (${documento.documentos_auxiliares_info.length} documento(s) auxiliar(es))`}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de relación *
                </label>
                <select
                  name="tipo_relacion"
                  value={formData.tipo_relacion}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {TIPOS_RELACION.map((tipo) => (
                    <option key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción (opcional)
                </label>
                <textarea
                  name="descripcion"
                  value={formData.descripcion}
                  onChange={handleChange}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Descripción de la relación..."
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Creando...' : 'Crear Relación'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
