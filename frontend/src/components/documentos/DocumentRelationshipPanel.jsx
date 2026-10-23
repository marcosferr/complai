import React, { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import api from '@/services/api'
import { showNotification } from '@/store/slices/uiSlice'

const DocumentRelationshipPanel = ({ documento, onUpdate }) => {
  const dispatch = useDispatch()
  const [availableDocuments, setAvailableDocuments] = useState([])
  const [selectedParentId, setSelectedParentId] = useState('')
  const [selectedAuxiliaryId, setSelectedAuxiliaryId] = useState('')
  const [loading, setLoading] = useState(false)
  const [linking, setLinking] = useState(false)

  useEffect(() => {
    fetchAvailableDocuments()
  }, [documento])

  const fetchAvailableDocuments = async () => {
    try {
      setLoading(true)
      const response = await api.get('/documentos/')
      const docs = response.data.results || response.data
      // Filter out current document, archived documents, addendums, and any documents that would create circular reference
      const available = docs.filter(doc => 
        doc.id !== documento.id && 
        doc.documento_padre !== documento.id &&
        doc.estado !== 'ARCHIVADO' &&
        !doc.es_adenda
      )
      setAvailableDocuments(available)
    } catch (error) {
      console.error('Error fetching documents:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLinkParent = async () => {
    if (!selectedParentId) {
      dispatch(showNotification({ 
        message: 'Por favor seleccione un documento padre', 
        type: 'error' 
      }))
      return
    }

    try {
      setLinking(true)
      await api.post(`/documentos/${documento.id}/link-parent/`, {
        documento_padre_id: parseInt(selectedParentId)
      })
      
      dispatch(showNotification({ 
        message: 'Documento padre vinculado exitosamente', 
        type: 'success' 
      }))
      
      setSelectedParentId('')
      if (onUpdate) onUpdate()
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Error al vincular documento padre'
      dispatch(showNotification({ 
        message: errorMessage, 
        type: 'error' 
      }))
    } finally {
      setLinking(false)
    }
  }

  const handleUnlinkParent = async () => {
    try {
      setLinking(true)
      await api.delete(`/documentos/${documento.id}/unlink-parent/`)
      
      dispatch(showNotification({ 
        message: 'Documento padre desvinculado exitosamente', 
        type: 'success' 
      }))
      
      if (onUpdate) onUpdate()
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Error al desvincular documento padre'
      dispatch(showNotification({ 
        message: errorMessage, 
        type: 'error' 
      }))
    } finally {
      setLinking(false)
    }
  }

  const handleLinkAuxiliary = async () => {
    if (!selectedAuxiliaryId) {
      dispatch(showNotification({ 
        message: 'Por favor seleccione un documento auxiliar', 
        type: 'error' 
      }))
      return
    }

    try {
      setLinking(true)
      await api.post(`/documentos/${documento.id}/link-auxiliary/`, {
        documento_auxiliar_id: parseInt(selectedAuxiliaryId)
      })
      
      dispatch(showNotification({ 
        message: 'Documento auxiliar vinculado exitosamente', 
        type: 'success' 
      }))
      
      setSelectedAuxiliaryId('')
      if (onUpdate) onUpdate()
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Error al vincular documento auxiliar'
      dispatch(showNotification({ 
        message: errorMessage, 
        type: 'error' 
      }))
    } finally {
      setLinking(false)
    }
  }

  const handleUnlinkAuxiliary = async (auxiliaryId) => {
    try {
      setLinking(true)
      await api.delete(`/documentos/${documento.id}/unlink-auxiliary/${auxiliaryId}/`)
      
      dispatch(showNotification({ 
        message: 'Documento auxiliar desvinculado exitosamente', 
        type: 'success' 
      }))
      
      if (onUpdate) onUpdate()
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Error al desvincular documento auxiliar'
      dispatch(showNotification({ 
        message: errorMessage, 
        type: 'error' 
      }))
    } finally {
      setLinking(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Link Parent Document Section */}
      <div>
        <h4 className="text-lg font-semibold text-text-light dark:text-text-dark mb-3">
          Vincular Documento Padre
        </h4>
        <p className="text-sm text-subtle-light dark:text-subtle-dark mb-4">
          Establezca una jerarquía vinculando un documento padre (ej: vincular un Contrato a su Pliego de Bases y Condiciones)
        </p>
        
        <div className="bg-background-light dark:bg-background-dark p-4 rounded-lg border border-border-light dark:border-border-dark">
          <div className="flex items-center gap-2">
            <div className="relative flex-grow">
              <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-subtle-light dark:text-subtle-dark pointer-events-none">
                link
              </span>
              <select
                value={selectedParentId}
                onChange={(e) => setSelectedParentId(e.target.value)}
                disabled={loading || linking || documento.documento_padre}
                className="w-full pl-10 pr-10 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg focus:ring-primary focus:border-primary text-text-light dark:text-text-dark appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Seleccionar documento padre...</option>
                {availableDocuments.map(doc => (
                  <option key={doc.id} value={doc.id}>
                    {doc.titulo} ({doc.tipo})
                  </option>
                ))}
              </select>
              <span className="material-icons absolute right-3 top-1/2 -translate-y-1/2 text-subtle-light dark:text-subtle-dark pointer-events-none">
                arrow_drop_down
              </span>
            </div>
            <button
              onClick={handleLinkParent}
              disabled={!selectedParentId || linking || documento.documento_padre}
              className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {linking ? (
                <>
                  <span className="material-icons text-base animate-spin">refresh</span>
                  Vinculando...
                </>
              ) : (
                <>
                  <span className="material-icons text-base">add_link</span>
                  Vincular
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Current Parent Document */}
      {documento.documento_padre_info && (
        <div>
          <h4 className="text-lg font-semibold text-text-light dark:text-text-dark mb-3">
            Documento Padre Vinculado
          </h4>
          <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-md border border-border-light dark:border-border-dark">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <span className="material-icons text-primary text-2xl">description</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-light dark:text-text-dark truncate">
                    {documento.documento_padre_info.titulo}
                  </p>
                  <p className="text-xs text-subtle-light dark:text-subtle-dark">
                    {documento.documento_padre_info.tipo}
                  </p>
                </div>
              </div>
              <button
                onClick={handleUnlinkParent}
                disabled={linking}
                className="text-red-500 hover:text-red-700 dark:hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Desvincular documento padre"
              >
                <span className="material-icons">delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Child Documents */}
      {documento.documentos_hijos_info && documento.documentos_hijos_info.length > 0 && (
        <div>
          <h4 className="text-lg font-semibold text-text-light dark:text-text-dark mb-3">
            Documentos Vinculados (Hijos)
          </h4>
          <p className="text-sm text-subtle-light dark:text-subtle-dark mb-3">
            Los siguientes documentos referencian a este documento como padre
          </p>
          <div className="space-y-2">
            {documento.documentos_hijos_info.map(hijo => (
              <div 
                key={hijo.id}
                className="bg-surface-light dark:bg-surface-dark p-3 rounded-md border border-border-light dark:border-border-dark"
              >
                <div className="flex items-center gap-3">
                  <span className="material-icons text-subtle-light dark:text-subtle-dark">description</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-light dark:text-text-dark truncate">
                      {hijo.titulo}
                    </p>
                    <p className="text-xs text-subtle-light dark:text-subtle-dark">
                      {hijo.tipo}
                    </p>
                  </div>
                  <span className="material-icons text-subtle-light dark:text-subtle-dark">
                    arrow_downward
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Auxiliary Documents Section */}
      <div>
        <h4 className="text-lg font-semibold text-text-light dark:text-text-dark mb-3">
          Documentos Auxiliares
        </h4>
        <p className="text-sm text-subtle-light dark:text-subtle-dark mb-4">
          Vincule documentos auxiliares para referencias cruzadas entre cláusulas de diferentes documentos
        </p>
        
        <div className="bg-background-light dark:bg-background-dark p-4 rounded-lg border border-border-light dark:border-border-dark mb-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-grow">
              <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-subtle-light dark:text-subtle-dark pointer-events-none">
                auto_stories
              </span>
              <select
                value={selectedAuxiliaryId}
                onChange={(e) => setSelectedAuxiliaryId(e.target.value)}
                disabled={loading || linking}
                className="w-full pl-10 pr-10 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg focus:ring-primary focus:border-primary text-text-light dark:text-text-dark appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Seleccionar documento auxiliar...</option>
                {availableDocuments
                  .filter(doc => !documento.documentos_auxiliares_info?.some(aux => aux.id === doc.id))
                  .map(doc => (
                    <option key={doc.id} value={doc.id}>
                      {doc.titulo} ({doc.tipo})
                    </option>
                  ))}
              </select>
              <span className="material-icons absolute right-3 top-1/2 -translate-y-1/2 text-subtle-light dark:text-subtle-dark pointer-events-none">
                arrow_drop_down
              </span>
            </div>
            <button
              onClick={handleLinkAuxiliary}
              disabled={!selectedAuxiliaryId || linking}
              className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {linking ? (
                <>
                  <span className="material-icons text-base animate-spin">refresh</span>
                  Vinculando...
                </>
              ) : (
                <>
                  <span className="material-icons text-base">add_link</span>
                  Vincular
                </>
              )}
            </button>
          </div>
        </div>

        {/* Linked Auxiliary Documents */}
        {documento.documentos_auxiliares_info && documento.documentos_auxiliares_info.length > 0 && (
          <div className="space-y-2">
            {documento.documentos_auxiliares_info.map(auxiliar => (
              <div 
                key={auxiliar.id}
                className="bg-surface-light dark:bg-surface-dark p-3 rounded-md border border-border-light dark:border-border-dark"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <span className="material-icons text-blue-500 text-2xl">auto_stories</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-light dark:text-text-dark truncate">
                        {auxiliar.titulo}
                      </p>
                      <p className="text-xs text-subtle-light dark:text-subtle-dark">
                        {auxiliar.tipo}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleUnlinkAuxiliary(auxiliar.id)}
                    disabled={linking}
                    className="text-red-500 hover:text-red-700 dark:hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Desvincular documento auxiliar"
                  >
                    <span className="material-icons">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {(!documento.documentos_auxiliares_info || documento.documentos_auxiliares_info.length === 0) && (
          <div className="text-center py-6 border-2 border-dashed border-border-light dark:border-border-dark rounded-lg">
            <span className="material-icons text-4xl text-subtle-light dark:text-subtle-dark mb-2">
              auto_stories
            </span>
            <p className="text-sm text-subtle-light dark:text-subtle-dark">
              No hay documentos auxiliares vinculados
            </p>
          </div>
        )}
      </div>

      {/* No relationships message */}
      {!documento.documento_padre_info && (!documento.documentos_hijos_info || documento.documentos_hijos_info.length === 0) && (!documento.documentos_auxiliares_info || documento.documentos_auxiliares_info.length === 0) && (
        <div className="text-center py-8">
          <span className="material-icons text-5xl text-subtle-light dark:text-subtle-dark mb-3">
            account_tree
          </span>
          <p className="text-subtle-light dark:text-subtle-dark">
            Este documento no tiene relaciones jerárquicas ni auxiliares establecidas
          </p>
        </div>
      )}
    </div>
  )
}

export default DocumentRelationshipPanel
