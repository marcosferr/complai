import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  fetchClausulasByDocumento,
  createClausula,
  updateClausula,
  deleteClausula,
} from '@/store/slices/clausulasSlice'
import ClausulaModal from '@/components/clausulas/ClausulaModal'
import ClausulaCard from '@/components/clausulas/ClausulaCard'
import RelacionModal from '@/components/clausulas/RelacionModal'
import TareaModal from '@/components/clausulas/TareaModal'
import ConfirmDialog from '@/components/ConfirmDialog'

export default function ClausulaManager({ documentoId, onClose }) {
  const dispatch = useDispatch()
  const { clausulas, loading } = useSelector((state) => state.clausulas)
  const [showModal, setShowModal] = useState(false)
  const [showRelacionModal, setShowRelacionModal] = useState(false)
  const [showTareaModal, setShowTareaModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [editingClausula, setEditingClausula] = useState(null)
  const [selectedClausula, setSelectedClausula] = useState(null)

  useEffect(() => {
    if (documentoId) {
      dispatch(fetchClausulasByDocumento(documentoId))
    }
  }, [dispatch, documentoId])

  const handleAddClausula = () => {
    setEditingClausula(null)
    setShowModal(true)
  }

  const handleEditClausula = (clausula) => {
    setEditingClausula(clausula)
    setShowModal(true)
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

  const handleSaveClausula = async (data) => {
    if (editingClausula) {
      await dispatch(updateClausula({ id: editingClausula.id, data }))
    } else {
      await dispatch(createClausula({ ...data, documento: documentoId }))
    }
    setShowModal(false)
    setEditingClausula(null)
  }

  const handleAddRelacion = (clausula) => {
    setSelectedClausula(clausula)
    setShowRelacionModal(true)
  }

  const handleAddTarea = (clausula) => {
    setSelectedClausula(clausula)
    setShowTareaModal(true)
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
        <div className="relative z-50 w-full max-w-6xl max-h-[90vh] overflow-hidden bg-white rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="text-2xl font-bold text-gray-900">
              Gestión de Cláusulas
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handleAddClausula}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
              >
                + Agregar Cláusula
              </button>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <span className="material-icons">close</span>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : clausulas.length === 0 ? (
              <div className="text-center py-12">
                <span className="material-icons text-6xl text-gray-300 mb-4">
                  description
                </span>
                <p className="text-gray-500 text-lg">
                  No hay cláusulas agregadas a este documento
                </p>
                <button
                  onClick={handleAddClausula}
                  className="mt-4 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
                >
                  Agregar primera cláusula
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {clausulas.map((clausula) => (
                  <ClausulaCard
                    key={clausula.id}
                    clausula={clausula}
                    onEdit={handleEditClausula}
                    onDelete={handleDeleteClausula}
                    onAddRelacion={handleAddRelacion}
                    onAddTarea={handleAddTarea}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showModal && (
        <ClausulaModal
          clausula={editingClausula}
          onSave={handleSaveClausula}
          onClose={() => {
            setShowModal(false)
            setEditingClausula(null)
          }}
        />
      )}

      {showRelacionModal && selectedClausula && (
        <RelacionModal
          clausula={selectedClausula}
          clausulas={clausulas}
          onClose={() => {
            setShowRelacionModal(false)
            setSelectedClausula(null)
          }}
        />
      )}

      {showTareaModal && selectedClausula && (
        <TareaModal
          clausula={selectedClausula}
          onClose={() => {
            setShowTareaModal(false)
            setSelectedClausula(null)
          }}
        />
      )}

      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="Eliminar Cláusula"
        message={`¿Está seguro que desea eliminar la cláusula "${selectedClausula?.titulo}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={confirmDelete}
        onClose={() => {
          setShowDeleteDialog(false)
          setSelectedClausula(null)
        }}
        variant="danger"
      />
    </div>
  )
}
