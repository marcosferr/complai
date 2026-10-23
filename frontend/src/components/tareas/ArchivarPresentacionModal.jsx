import React, { useState } from 'react'
import { useDispatch } from 'react-redux'
import { showNotification } from '@/store/slices/uiSlice'
import tareaService from '@/services/tareaService'

const ArchivarPresentacionModal = ({ isOpen, onClose, tareaId, onSuccess }) => {
    const dispatch = useDispatch()
    const [nombre, setNombre] = useState('')
    const [descripcion, setDescripcion] = useState('')
    const [etapaDestino, setEtapaDestino] = useState('INICIO')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!nombre.trim()) {
            dispatch(showNotification({
                message: 'El nombre de la presentación es requerido',
                type: 'warning'
            }))
            return
        }

        try {
            setLoading(true)
            await tareaService.archivarPresentacion(tareaId, {
                nombre: nombre.trim(),
                descripcion: descripcion.trim(),
                etapa_destino: etapaDestino
            })

            dispatch(showNotification({
                message: 'Presentación archivada exitosamente',
                type: 'success'
            }))

            setNombre('')
            setDescripcion('')
            onSuccess && onSuccess()
            onClose()
        } catch (error) {
            dispatch(showNotification({
                message: error.response?.data?.error || 'Error al archivar la presentación',
                type: 'error'
            }))
        } finally {
            setLoading(false)
        }
    }

    const handleClose = () => {
        if (!loading) {
            setNombre('')
            setDescripcion('')
            onClose()
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 z-40"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="relative z-50 bg-surface-light dark:bg-surface-dark rounded-lg shadow-xl max-w-md w-full">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border-light dark:border-border-dark">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="material-icons text-primary">archive</span>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-text-light dark:text-text-dark">
                                Archivar Presentación
                            </h3>
                            <p className="text-xs text-subtle-light dark:text-subtle-dark">
                                Crear un snapshot de las actividades actuales
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        disabled={loading}
                        className="text-subtle-light dark:text-subtle-dark hover:text-text-light dark:hover:text-text-dark transition-colors disabled:opacity-50"
                    >
                        <span className="material-icons">close</span>
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="p-4">
                    {/* Info box */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
                        <div className="flex items-start gap-2">
                            <span className="material-icons text-blue-500 text-base mt-0.5">info</span>
                            <p className="text-xs text-blue-700 dark:text-blue-300">
                                Esta presentación incluirá todos los archivos, comentarios y cambios de etapa
                                realizados desde la última presentación archivada.
                            </p>
                        </div>
                    </div>

                    {/* Nombre */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                            Nombre de la presentación <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            placeholder="Ej: Presentación Enero 2026"
                            className="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-surface-light dark:bg-surface-dark text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary focus:border-transparent"
                            disabled={loading}
                            autoFocus
                        />
                    </div>

                    {/* Etapa Destino */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                            Etapa posterior al archivado
                        </label>
                        <select
                            value={etapaDestino}
                            onChange={(e) => setEtapaDestino(e.target.value)}
                            className="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-surface-light dark:bg-surface-dark text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary focus:border-transparent"
                            disabled={loading}
                        >
                            <option value="INICIO">Inicio (Pendiente)</option>
                            <option value="REVISION_GERENCIAL">Revisión Gerencial</option>
                            <option value="CONTROL_ANALISTA">Control de Analista</option>
                            <option value="CONTROL_OFICIAL">Control Oficial</option>
                        </select>
                        <p className="text-xs text-subtle-light dark:text-subtle-dark mt-1">
                            La tarea se moverá a esta etapa después de archivar.
                        </p>
                    </div>

                    {/* Descripción */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                            Descripción <span className="text-subtle-light dark:text-subtle-dark">(opcional)</span>
                        </label>
                        <textarea
                            value={descripcion}
                            onChange={(e) => setDescripcion(e.target.value)}
                            placeholder="Descripción breve de esta presentación..."
                            rows={3}
                            className="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-surface-light dark:bg-surface-dark text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                            disabled={loading}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 justify-end">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={loading}
                            className="px-4 py-2 border border-border-light dark:border-border-dark rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !nombre.trim()}
                            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Archivando...
                                </>
                            ) : (
                                <>
                                    <span className="material-icons text-sm">archive</span>
                                    Archivar
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default ArchivarPresentacionModal
