import React, { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import tareaService from '@/services/tareaService'
import { downloadProtectedFile } from '@/services/api'

const PresentacionesTab = ({ tareaId, onArchivarClick }) => {
    const { user } = useSelector((state) => state.auth)
    const [presentaciones, setPresentaciones] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [expandedId, setExpandedId] = useState(null)

    // Solo ANALISTA y OFICIAL pueden ver esta pestaña
    const puedeVer = user?.role === 'ANALISTA_COMPLIANCE' || user?.role === 'OFICIAL_COMPLIANCE'
    const puedeArchivar = user?.role === 'OFICIAL_COMPLIANCE'

    useEffect(() => {
        if (tareaId && puedeVer) {
            cargarPresentaciones()
        }
    }, [tareaId, puedeVer])

    const cargarPresentaciones = async () => {
        try {
            setLoading(true)
            setError(null)
            const response = await tareaService.getPresentaciones(tareaId)
            setPresentaciones(response.data)
        } catch (err) {
            setError('Error al cargar las presentaciones')
            console.error('Error cargando presentaciones:', err)
        } finally {
            setLoading(false)
        }
    }

    const toggleExpand = (id) => {
        setExpandedId(expandedId === id ? null : id)
    }

    const formatFecha = (fecha) => {
        if (!fecha) return 'N/A'
        return new Date(fecha).toLocaleString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const formatRelativeDate = (fecha) => {
        if (!fecha) return ''
        const now = new Date()
        const date = new Date(fecha)
        const diffMs = now - date
        const diffMins = Math.floor(diffMs / (1000 * 60))
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

        if (diffMins < 1) return 'hace un momento'
        if (diffMins < 60) return `hace ${diffMins} min`
        if (diffHours < 24) return `hace ${diffHours}h`
        if (diffDays < 7) return `hace ${diffDays}d`
        return formatFecha(fecha)
    }

    if (!puedeVer) {
        return (
            <div className="p-6 text-center text-subtle-light dark:text-subtle-dark">
                <span className="material-icons text-4xl mb-2 opacity-50">lock</span>
                <p>No tienes permisos para ver las presentaciones</p>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-6 text-center text-red-500">
                <span className="material-icons text-4xl mb-2">error</span>
                <p>{error}</p>
                <button
                    onClick={cargarPresentaciones}
                    className="mt-3 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
                >
                    Reintentar
                </button>
            </div>
        )
    }

    return (
        <div className="p-4 sm:p-6">
            {/* Header con botón de archivar */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-semibold text-text-light dark:text-text-dark">
                        Presentaciones Archivadas
                    </h3>
                    <p className="text-sm text-subtle-light dark:text-subtle-dark">
                        {presentaciones.length} presentación{presentaciones.length !== 1 ? 'es' : ''} archivada{presentaciones.length !== 1 ? 's' : ''}
                    </p>
                </div>
                {puedeArchivar && (
                    <button
                        onClick={onArchivarClick}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
                    >
                        <span className="material-icons text-sm">archive</span>
                        Archivar Presentación
                    </button>
                )}
            </div>

            {/* Lista de presentaciones */}
            {presentaciones.length === 0 ? (
                <div className="text-center py-12 text-subtle-light dark:text-subtle-dark">
                    <span className="material-icons text-5xl mb-3 opacity-50">folder_open</span>
                    <p className="text-lg">No hay presentaciones archivadas</p>
                    <p className="text-sm mt-1">Las presentaciones capturan un snapshot de las actividades realizadas</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {presentaciones.map((presentacion) => (
                        <div
                            key={presentacion.id}
                            className="border border-border-light dark:border-border-dark rounded-lg overflow-hidden bg-surface-light dark:bg-surface-dark"
                        >
                            {/* Header de presentación */}
                            <button
                                onClick={() => toggleExpand(presentacion.id)}
                                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                        <span className="material-icons text-primary">folder_zip</span>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-text-light dark:text-text-dark">
                                            {presentacion.nombre}
                                        </h4>
                                        <p className="text-xs text-subtle-light dark:text-subtle-dark">
                                            {presentacion.creado_por_nombre} • {formatRelativeDate(presentacion.fecha_creacion)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary">
                                        {presentacion.total_actividades} actividades
                                    </span>
                                    <span className={`material-icons transition-transform ${expandedId === presentacion.id ? 'rotate-180' : ''}`}>
                                        expand_more
                                    </span>
                                </div>
                            </button>

                            {/* Contenido expandido */}
                            {expandedId === presentacion.id && (
                                <div className="border-t border-border-light dark:border-border-dark p-4 bg-background-light dark:bg-background-dark">
                                    {presentacion.descripcion && (
                                        <p className="text-sm text-subtle-light dark:text-subtle-dark mb-4 italic">
                                            {presentacion.descripcion}
                                        </p>
                                    )}

                                    {/* Timeline de actividades */}
                                    <div className="space-y-4">
                                        {/* Historial de estados */}
                                        {presentacion.historial_estados?.length > 0 && (
                                            <div>
                                                <h5 className="text-sm font-medium text-text-light dark:text-text-dark mb-2 flex items-center gap-2">
                                                    <span className="material-icons text-orange-500 text-base">swap_horiz</span>
                                                    Cambios de Etapa ({presentacion.historial_estados.length})
                                                </h5>
                                                <div className="space-y-2 ml-6">
                                                    {presentacion.historial_estados.map((historial) => (
                                                        <div key={historial.id} className="flex items-start gap-2 text-sm">
                                                            <span className="material-icons text-xs text-subtle-light dark:text-subtle-dark mt-1">circle</span>
                                                            <div>
                                                                <span className="text-text-light dark:text-text-dark">
                                                                    {historial.estado_anterior} → {historial.estado_nuevo}
                                                                </span>
                                                                <span className="text-subtle-light dark:text-subtle-dark"> por {historial.usuario_nombre}</span>
                                                                {historial.observaciones && (
                                                                    <p className="text-xs text-subtle-light dark:text-subtle-dark mt-1 italic">
                                                                        "{historial.observaciones}"
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Archivos */}
                                        {presentacion.archivos?.length > 0 && (
                                            <div>
                                                <h5 className="text-sm font-medium text-text-light dark:text-text-dark mb-2 flex items-center gap-2">
                                                    <span className="material-icons text-blue-500 text-base">attach_file</span>
                                                    Archivos ({presentacion.archivos.length})
                                                </h5>
                                                <div className="space-y-2 ml-6">
                                                    {presentacion.archivos.map((archivo) => (
                                                        <div key={archivo.id} className="flex items-center gap-2 text-sm">
                                                            <span className="material-icons text-xs text-subtle-light dark:text-subtle-dark">insert_drive_file</span>
                                                            <button
                                                                onClick={() => downloadProtectedFile(archivo.url, archivo.nombre_original)}
                                                                className="text-primary hover:underline"
                                                            >
                                                                {archivo.nombre_original}
                                                            </button>
                                                            <span className="text-subtle-light dark:text-subtle-dark">
                                                                por {archivo.subido_por_nombre}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Comentarios */}
                                        {presentacion.comentarios?.length > 0 && (
                                            <div>
                                                <h5 className="text-sm font-medium text-text-light dark:text-text-dark mb-2 flex items-center gap-2">
                                                    <span className="material-icons text-green-500 text-base">chat</span>
                                                    Comentarios ({presentacion.comentarios.length})
                                                </h5>
                                                <div className="space-y-2 ml-6">
                                                    {presentacion.comentarios.map((comentario) => (
                                                        <div key={comentario.id} className="text-sm">
                                                            <span className="font-medium text-text-light dark:text-text-dark">
                                                                {comentario.usuario_nombre}:
                                                            </span>
                                                            <span className="text-subtle-light dark:text-subtle-dark ml-1">
                                                                "{comentario.texto}"
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Sin actividades */}
                                        {presentacion.total_actividades === 0 && (
                                            <p className="text-sm text-subtle-light dark:text-subtle-dark text-center py-4">
                                                Esta presentación no contiene actividades
                                            </p>
                                        )}
                                    </div>

                                    {/* Fecha de creación */}
                                    <div className="mt-4 pt-3 border-t border-border-light dark:border-border-dark text-xs text-subtle-light dark:text-subtle-dark">
                                        Archivada el {formatFecha(presentacion.fecha_creacion)}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default PresentacionesTab
