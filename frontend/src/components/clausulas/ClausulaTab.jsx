import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  fetchClausulasByDocumento,
  createClausula,
  updateClausula,
  deleteClausula,
} from '@/store/slices/clausulasSlice'
import { createTarea, deleteTarea } from '@/store/slices/tareasSlice'
import clausulaService from '@/services/clausulaService'
import ClausulaModal from '@/components/clausulas/ClausulaModal'
import TareaModal from '@/components/clausulas/TareaModal'
import TaskDetailModal from '@/components/tareas/TaskDetailModal'
import RelacionModal from '@/components/clausulas/RelacionModal'
import ClausulaPreviewModal from '@/components/clausulas/ClausulaPreviewModal'
import ConfirmDialog from '@/components/ConfirmDialog'
import { useRolePermissions } from '@/hooks/useRolePermissions'
import { getClauseTerm } from '@/lib/utils'
import { htmlToPlainText, truncateRich } from '@/lib/richText'
import { ESTADO_ETAPA_MAP } from '@/lib/estadoEtapaConstants'

export default function ClausulaTab({ documento }) {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { clausulas, loading } = useSelector((state) => state.clausulas)
  const { permissions } = useRolePermissions()
  const [showClausulaModal, setShowClausulaModal] = useState(false)
  const [showTareaModal, setShowTareaModal] = useState(false)
  const [showTaskDetailModal, setShowTaskDetailModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showDeleteTareaDialog, setShowDeleteTareaDialog] = useState(false)
  const [showRelacionModal, setShowRelacionModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [previewClausulaId, setPreviewClausulaId] = useState(null)
  const [editingClausula, setEditingClausula] = useState(null)
  const [selectedClausula, setSelectedClausula] = useState(null)
  const [selectedTarea, setSelectedTarea] = useState(null)
  const [tareaToDelete, setTareaToDelete] = useState(null)
  
  // Parent document clauses state
  const [parentClausulas, setParentClausulas] = useState([])
  const [showParentClauses, setShowParentClauses] = useState(false)
  const [loadingParentClauses, setLoadingParentClauses] = useState(false)

  // Get the appropriate term based on document type
  const clauseTerm = getClauseTerm(documento?.tipo)

  useEffect(() => {
    if (documento?.id) {
      dispatch(fetchClausulasByDocumento(documento.id))
    }
  }, [dispatch, documento?.id])

  // Load parent document clauses
  useEffect(() => {
    const loadParentClausulas = async () => {
      if (documento?.documento_padre_info?.id) {
        try {
          setLoadingParentClauses(true)
          const response = await clausulaService.getClausulasByDocumento(documento.documento_padre_info.id)
          setParentClausulas(response.data || [])
        } catch (error) {
          console.error('Error loading parent clauses:', error)
          setParentClausulas([])
        } finally {
          setLoadingParentClauses(false)
        }
      }
    }
    
    loadParentClausulas()
  }, [documento?.documento_padre_info?.id])

  const handleAddClausula = () => {
    setEditingClausula(null)
    setShowClausulaModal(true)
  }

  const handleEditClausula = (clausula) => {
    setEditingClausula(clausula)
    setShowClausulaModal(true)
  }

  const handleDeleteClausula = (clausula) => {
    setSelectedClausula(clausula)
    setShowDeleteDialog(true)
  }

  const confirmDelete = async () => {
    if (selectedClausula) {
      await dispatch(deleteClausula(selectedClausula.id))
      setShowDeleteDialog(false)
      setSelectedClausula(null)
    }
  }

  const handleDeleteTarea = (tarea, event) => {
    event.stopPropagation() // Prevent opening task detail modal
    setTareaToDelete(tarea)
    setShowDeleteTareaDialog(true)
  }

  const confirmDeleteTarea = async () => {
    if (tareaToDelete) {
      await dispatch(deleteTarea(tareaToDelete.id))
      setShowDeleteTareaDialog(false)
      setTareaToDelete(null)
      // Refresh clausulas to update task count
      dispatch(fetchClausulasByDocumento(documento.id))
    }
  }

  const handleSaveClausula = async (data) => {
    if (editingClausula) {
      // Al editar, incluir el documento aunque ya exista
      await dispatch(updateClausula({ 
        id: editingClausula.id, 
        data: { ...data, documento: documento.id }
      }))
    } else {
      await dispatch(createClausula({ ...data, documento: documento.id }))
    }
    setShowClausulaModal(false)
    setEditingClausula(null)
  }

  const handleAddTarea = (clausula) => {
    setSelectedClausula(clausula)
    setShowTareaModal(true)
  }

  const handleAddRelacion = (clausula) => {
    setSelectedClausula(clausula)
    setShowRelacionModal(true)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Parent Document Clauses Section */}
      {documento?.documento_padre_info && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-700 rounded-lg p-4">
          <button
            onClick={() => setShowParentClauses(!showParentClauses)}
            className="w-full flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-2">
              <span className="material-icons text-blue-600 dark:text-blue-400">account_tree</span>
              <div>
                <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                  {clauseTerm.charAt(0).toUpperCase() + clauseTerm.slice(1)}s del Documento Padre
                </h3>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  {documento.documento_padre_info.titulo} ({parentClausulas.length} {clauseTerm}s)
                </p>
              </div>
            </div>
            <span className="material-icons text-blue-600 dark:text-blue-400">
              {showParentClauses ? 'expand_less' : 'expand_more'}
            </span>
          </button>
          
          {showParentClauses && (
            <div className="mt-4 space-y-3">
              {loadingParentClauses ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : parentClausulas.length === 0 ? (
                <p className="text-sm text-blue-700 dark:text-blue-300 text-center py-4">
                  El documento padre no tiene {clauseTerm}s
                </p>
              ) : (
                parentClausulas.map((clausula) => (
                  <div
                    key={clausula.id}
                    className="bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700 rounded-lg p-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {documento.documento_padre_info.titulo} - {clausula.titulo}
                        </h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                          {htmlToPlainText(clausula.contenido)}
                        </p>
                        {clausula.etiquetas && clausula.etiquetas.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {clausula.etiquetas.map((tag, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <span 
                        className="material-icons text-sm text-blue-600 dark:text-blue-400 ml-2"
                        title={`${clauseTerm.charAt(0).toUpperCase() + clauseTerm.slice(1)} del documento padre`}
                      >
                        north
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Botón Agregar Cláusula */}
      <div className="flex justify-end">
        <button
          onClick={handleAddClausula}
          data-tutorial="clausula-create-button"
          className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm font-medium"
        >
          <span className="material-icons text-base sm:text-lg">add</span>
          <span className="hidden sm:inline">Agregar {clauseTerm.charAt(0).toUpperCase() + clauseTerm.slice(1)}</span>
          <span className="sm:hidden">Agregar</span>
        </button>
      </div>

      {/* Lista de Cláusulas */}
      {clausulas.length === 0 ? (
        <div className="text-center py-8 sm:py-12 bg-gray-50 dark:bg-gray-800 rounded-lg px-4">
          <span className="material-icons text-5xl sm:text-6xl text-gray-300 mb-4">description</span>
          <p className="text-gray-500 text-sm sm:text-lg mb-4">No hay cláusulas agregadas a este documento</p>
          <button
            onClick={handleAddClausula}
            className="px-4 sm:px-6 py-2 text-sm sm:text-base bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Agregar primera {clauseTerm}
          </button>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {clausulas.map((clausula, index) => (
            <div
              key={clausula.id}
              data-tutorial={index === 0 ? "clausula-card" : undefined}
              className="bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg overflow-hidden"
            >
              {/* Header de la Cláusula */}
              <div className="p-3 sm:p-4 border-b border-border-light dark:border-border-dark">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-semibold text-text-light dark:text-text-dark break-words">
                      {clausula.titulo}
                    </h3>
                    {/* Resumen en texto plano: truncar el HTML por caracteres
                        cortaria a la mitad de una etiqueta. */}
                    <p className="text-xs sm:text-sm text-subtle-light dark:text-subtle-dark mt-1 break-words">
                      {truncateRich(clausula.contenido, 200)}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleAddRelacion(clausula)}
                      data-tutorial={index === 0 ? "clausula-relacion-button" : undefined}
                      className="p-1.5 sm:p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                      title={`Vincular ${clauseTerm.charAt(0).toUpperCase() + clauseTerm.slice(1)}`}
                    >
                      <span className="material-icons text-base sm:text-lg">link</span>
                    </button>
                    <button
                      onClick={() => handleEditClausula(clausula)}
                      className="p-1.5 sm:p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <span className="material-icons text-base sm:text-lg">edit</span>
                    </button>
                    {permissions.canDeleteClausulas && (
                      <button
                        onClick={() => handleDeleteClausula(clausula)}
                        className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <span className="material-icons text-base sm:text-lg">delete</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Objetos Regulados (campo interno: etiquetas) */}
                {clausula.etiquetas && clausula.etiquetas.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2 sm:mt-3">
                    {clausula.etiquetas.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Adendas (Addendums) */}
              {clausula.adendas && clausula.adendas.length > 0 && (
                <div className="px-4 py-3 bg-yellow-50 dark:bg-yellow-900/20 border-b border-border-light dark:border-border-dark">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                    Adendas:
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    {clausula.adendas.map((adenda, idx) => (
                      <li key={idx} className="text-sm text-yellow-700 dark:text-yellow-300">
                        {adenda.motivo} - <span className="font-semibold">{adenda.estado}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Cláusulas Relacionadas */}
              {clausula.relaciones_salientes && clausula.relaciones_salientes.length > 0 && (
                <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-border-light dark:border-border-dark">
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                    {clauseTerm.charAt(0).toUpperCase() + clauseTerm.slice(1)}s Relacionadas:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {clausula.relaciones_salientes.map((rel, idx) => {
                      // Check if related clause is from parent or auxiliary document
                      const relatedClausula = clausulas.find(c => c.id === rel.clausula_relacionada)
                      const isFromCurrentDoc = !!relatedClausula
                      
                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-700"
                        >
                          <span className="material-icons text-sm text-blue-600 dark:text-blue-400">link</span>
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {rel.tipo_relacion}: {rel.clausula_relacionada_titulo}
                          </span>
                          {!isFromCurrentDoc && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                              (otro documento)
                            </span>
                          )}
                          <button
                            onClick={() => {
                              setPreviewClausulaId(rel.clausula_relacionada)
                              setShowPreviewModal(true)
                            }}
                            className="ml-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                            title="Vista previa"
                          >
                            <span className="material-icons text-sm">visibility</span>
                          </button>
                          <button
                            onClick={() => {
                              // If it's from current document, scroll to it
                              if (isFromCurrentDoc) {
                                const element = document.getElementById(`clausula-${rel.clausula_relacionada}`)
                                element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                              } else {
                                // Navigate to the document containing this clause
                                // We'll need to fetch the clause details to know which document
                                clausulaService.previewClausula(rel.clausula_relacionada)
                                  .then(response => {
                                    navigate(`/documentos/${response.data.documento.id}/view#clausula-${rel.clausula_relacionada}`)
                                  })
                                  .catch(error => {
                                    console.error('Error navigating to clause:', error)
                                  })
                              }
                            }}
                            className="ml-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                            title="Ir a cláusula"
                          >
                            <span className="material-icons text-sm">arrow_forward</span>
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Obligaciones (Tareas) */}
              <div className="px-3 sm:px-4 py-3">
                <div className="flex items-center justify-between mb-2 sm:mb-3 gap-2">
                  <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                    Obligaciones:
                  </p>
                  {permissions.canCreateTareas && (
                    <button
                      onClick={() => handleAddTarea(clausula)}
                      data-tutorial={index === 0 ? "clausula-tarea-button" : undefined}
                      className="flex items-center gap-1 text-xs sm:text-sm text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap"
                    >
                      <span className="material-icons text-base sm:text-lg">add</span>
                      <span className="hidden sm:inline">Agregar Obligación</span>
                      <span className="sm:hidden">Obligación</span>
                    </button>
                  )}
                </div>

                {clausula.tareas && clausula.tareas.length > 0 ? (
                  <div className="space-y-2">
                    {clausula.tareas.map((tarea) => (
                      <div
                        key={tarea.id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2 sm:p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div
                          onClick={() => {
                            setSelectedTarea(tarea)
                            setShowTaskDetailModal(true)
                          }}
                          className="flex-1 min-w-0 cursor-pointer active:scale-[0.98]"
                        >
                          <p className="text-sm sm:text-base font-medium text-text-light dark:text-text-dark break-words">
                            {tarea.titulo}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1 text-xs sm:text-sm text-subtle-light dark:text-subtle-dark">
                            <span className="flex items-center gap-1">
                              <span className="material-icons text-sm">calendar_today</span>
                              {new Date(tarea.fecha_vencimiento).toLocaleDateString('es-ES')}
                            </span>
                            {tarea.area_nombre && (
                              <span className="flex items-center gap-1">
                                <span className="material-icons text-sm">apartment</span>
                                {tarea.area_nombre}
                              </span>
                            )}
                            {tarea.responsables_detalle?.length > 0 && (
                              <span className="flex items-center gap-2">
                                {tarea.responsables_detalle.slice(0, 3).map((responsable) => (
                                  <span
                                    key={responsable.id}
                                    className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
                                  >
                                    <span className="material-icons text-xs">person</span>
                                    {responsable.nombre || responsable.email}
                                  </span>
                                ))}
                                {tarea.responsables_detalle.length > 3 && (
                                  <span className="text-xs text-subtle-light dark:text-subtle-dark">
                                    +{tarea.responsables_detalle.length - 3}
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {(() => {
                            const { label, classes } =
                              ESTADO_ETAPA_MAP[tarea.estado_etapa] ||
                              { label: tarea.estado_etapa, classes: 'bg-gray-100 text-gray-700' }
                            return (
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${classes}`}>
                                {label}
                              </span>
                            )
                          })()}
                          {permissions.canDeleteTareas && (
                            <button
                              onClick={(e) => handleDeleteTarea(tarea, e)}
                              className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Eliminar Obligación"
                            >
                              <span className="material-icons text-base">delete</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No hay obligaciones para esta {clauseTerm}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showClausulaModal && (
        <ClausulaModal
          clausula={editingClausula}
          documento={documento}
          onSave={handleSaveClausula}
          onClose={() => {
            setShowClausulaModal(false)
            setEditingClausula(null)
          }}
        />
      )}

      {showTareaModal && selectedClausula && (
        <TareaModal
          clausula={selectedClausula}
          documento={documento}
          onClose={() => {
            setShowTareaModal(false)
            setSelectedClausula(null)
            // Refresh clausulas to update task count
            dispatch(fetchClausulasByDocumento(documento.id))
          }}
        />
      )}

      {showTaskDetailModal && selectedTarea && (
        <TaskDetailModal
          isOpen={showTaskDetailModal}
          onClose={() => {
            setShowTaskDetailModal(false)
            setSelectedTarea(null)
          }}
          tarea={selectedTarea}
          onUpdate={() => {
            // Refresh clausulas to update task data
            dispatch(fetchClausulasByDocumento(documento.id))
          }}
        />
      )}

      {showRelacionModal && selectedClausula && (
        <RelacionModal
          clausula={selectedClausula}
          clausulas={clausulas}
          documento={documento}
          onClose={() => {
            setShowRelacionModal(false)
            setSelectedClausula(null)
          }}
        />
      )}

      {showDeleteDialog && (
        <ConfirmDialog
          isOpen={showDeleteDialog}
          title={`Eliminar ${clauseTerm.charAt(0).toUpperCase() + clauseTerm.slice(1)}`}
          message={`¿Está seguro que desea eliminar la ${clauseTerm} "${selectedClausula?.titulo}"? Esta acción no se puede deshacer.`}
          confirmText="Eliminar"
          cancelText="Cancelar"
          onConfirm={confirmDelete}
          onClose={() => {
            setShowDeleteDialog(false)
            setSelectedClausula(null)
          }}
          variant="danger"
        />
      )}

      {showDeleteTareaDialog && (
        <ConfirmDialog
          isOpen={showDeleteTareaDialog}
          title="Eliminar Obligación"
          message={`¿Está seguro que desea eliminar la obligación "${tareaToDelete?.titulo}"? Esta acción no se puede deshacer.`}
          confirmText="Eliminar"
          cancelText="Cancelar"
          onConfirm={confirmDeleteTarea}
          onClose={() => {
            setShowDeleteTareaDialog(false)
            setTareaToDelete(null)
          }}
          variant="danger"
        />
      )}

      {/* Preview Modal for Related Clauses */}
      <ClausulaPreviewModal
        isOpen={showPreviewModal}
        onClose={() => {
          setShowPreviewModal(false)
          setPreviewClausulaId(null)
        }}
        clausulaId={previewClausulaId}
      />
    </div>
  )
}
