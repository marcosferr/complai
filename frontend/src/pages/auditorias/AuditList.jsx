import React, { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { showNotification } from '@/store/slices/uiSlice'
import auditService from '@/services/auditService'
import AuditModal from '@/components/auditorias/AuditModal'
import AuditDetailModal from '@/components/auditorias/AuditDetailModal'
import ConfirmDialog from '@/components/ConfirmDialog'

const AuditList = () => {
  const dispatch = useDispatch()
  const [audits, setAudits] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedAudit, setSelectedAudit] = useState(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [auditToDelete, setAuditToDelete] = useState(null)
  const [filterEstado, setFilterEstado] = useState('ALL')

  useEffect(() => {
    fetchAudits()
  }, [])

  const fetchAudits = async () => {
    try {
      setLoading(true)
      const data = await auditService.getAudits()
      setAudits(data.results || data)
    } catch (error) {
      dispatch(showNotification({
        message: 'Error al cargar auditorías',
        type: 'error'
      }))
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSuccess = (newAudit) => {
    setAudits(prev => [newAudit, ...prev])
    setCreateModalOpen(false)
    dispatch(showNotification({
      message: 'Auditoría creada exitosamente',
      type: 'success'
    }))
  }

  const handleUpdateSuccess = (updatedAudit) => {
    setAudits(prev =>
      prev.map(audit => audit.id === updatedAudit.id ? updatedAudit : audit)
    )
    setDetailModalOpen(false)
    dispatch(showNotification({
      message: 'Auditoría actualizada exitosamente',
      type: 'success'
    }))
  }

  const handleDeleteClick = (audit) => {
    setAuditToDelete(audit)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!auditToDelete) return

    try {
      await auditService.deleteAudit(auditToDelete.id)
      setAudits(prev => prev.filter(audit => audit.id !== auditToDelete.id))
      setDeleteDialogOpen(false)
      setAuditToDelete(null)
      dispatch(showNotification({
        message: 'Auditoría eliminada exitosamente',
        type: 'success'
      }))
    } catch (error) {
      dispatch(showNotification({
        message: 'Error al eliminar auditoría',
        type: 'error'
      }))
    }
  }

  const handleViewDetails = (audit) => {
    setSelectedAudit(audit)
    setDetailModalOpen(true)
  }

  const getEstadoBadge = (estado) => {
    const config = {
      'PROGRAMADA': 'bg-audit/10 text-audit',
      'EN_PROGRESO': 'bg-warning/10 text-warning',
      'COMPLETADA': 'bg-success/10 text-success',
      'CANCELADA': 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
    }
    return config[estado] || config['PROGRAMADA']
  }

  const getEstadoLabel = (estado) => {
    const labels = {
      'PROGRAMADA': 'Programada',
      'EN_PROGRESO': 'En Progreso',
      'COMPLETADA': 'Completada',
      'CANCELADA': 'Cancelada',
    }
    return labels[estado] || estado
  }

  const filteredAudits = filterEstado === 'ALL'
    ? audits
    : audits.filter(audit => audit.estado === filterEstado)

  return (
    <>
      <AuditModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      {selectedAudit && (
        <AuditDetailModal
          isOpen={detailModalOpen}
          onClose={() => {
            setDetailModalOpen(false)
            setSelectedAudit(null)
          }}
          audit={selectedAudit}
          onUpdate={handleUpdateSuccess}
        />
      )}

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false)
          setAuditToDelete(null)
        }}
        onConfirm={handleDeleteConfirm}
        title="Eliminar Auditoría"
        message={`¿Está seguro que desea eliminar la auditoría "${auditToDelete?.titulo}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
      />

      <div>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">Compliance</h1>
            <p className="text-subtle-light dark:text-subtle-dark">Gestiona y realiza seguimiento de auditorías de cumplimiento</p>
          </div>
          <button
            onClick={() => setCreateModalOpen(true)}
            title="Crear una nueva auditoría de cumplimiento"
            className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <span className="material-icons text-base">add</span>
            Nueva Auditoría
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 border-b border-border-light dark:border-border-dark">
          {['ALL', 'PROGRAMADA', 'EN_PROGRESO', 'COMPLETADA'].map(estado => (
            <button
              key={estado}
              onClick={() => setFilterEstado(estado)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                filterEstado === estado
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-subtle-light dark:text-subtle-dark hover:text-text-light dark:hover:text-text-dark'
              }`}
            >
              {estado === 'ALL' ? 'Todas' : getEstadoLabel(estado)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-subtle-light dark:text-subtle-dark">Cargando auditorías...</p>
          </div>
        ) : filteredAudits.length === 0 ? (
          <div className="text-center py-12 bg-surface-light dark:bg-surface-dark rounded-lg border border-border-light dark:border-border-dark">
            <span className="material-icons text-6xl text-subtle-light dark:text-subtle-dark mb-4">assignment</span>
            <p className="text-subtle-light dark:text-subtle-dark">
              {filterEstado === 'ALL' ? 'No hay auditorías registradas' : `No hay auditorías ${getEstadoLabel(filterEstado).toLowerCase()}`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAudits.map(audit => (
              <div
                key={audit.id}
                className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg border border-border-light dark:border-border-dark hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleViewDetails(audit)}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1 min-w-0 pr-2">
                    <h3 className="text-lg font-semibold text-text-light dark:text-text-dark truncate">
                      {audit.titulo}
                    </h3>
                    {audit.descripcion && (
                      <p className="text-sm text-subtle-light dark:text-subtle-dark mt-1 line-clamp-2">
                        {audit.descripcion}
                      </p>
                    )}
                  </div>
                  <span className={`text-xs font-medium px-3 py-1 rounded-full whitespace-nowrap ${getEstadoBadge(audit.estado)}`}>
                    {getEstadoLabel(audit.estado)}
                  </span>
                </div>

                <div className="space-y-2 text-sm text-subtle-light dark:text-subtle-dark">
                  <div className="flex items-center gap-2">
                    <span className="material-icons text-base">calendar_today</span>
                    <span>
                      {new Date(audit.fecha_programada).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>

                  {audit.responsable_nombre && (
                    <div className="flex items-center gap-2">
                      <span className="material-icons text-base">person</span>
                      <span className="truncate">{audit.responsable_nombre}</span>
                    </div>
                  )}

                  {audit.cantidad_documentos > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="material-icons text-base">description</span>
                      <span>{audit.cantidad_documentos} documento{audit.cantidad_documentos !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-border-light dark:border-border-dark flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleViewDetails(audit)
                    }}
                    title="Ver detalles completos de la auditoría"
                    className="flex-1 text-primary hover:bg-primary/10 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Ver Detalles
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteClick(audit)
                    }}
                    title="Eliminar esta auditoría"
                    className="text-danger hover:bg-danger/10 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

export default AuditList