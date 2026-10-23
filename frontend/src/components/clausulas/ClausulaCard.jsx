import { useState } from 'react'
import { useRolePermissions } from '../../hooks/useRolePermissions'
import { getClauseTerm } from '../../lib/utils'
import RichTextContent from '../ui/RichTextContent'

export default function ClausulaCard({ clausula, onEdit, onDelete, onAddRelacion, onAddTarea }) {
  const [expanded, setExpanded] = useState(false)
  const { permissions } = useRolePermissions()

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-gray-500">
                #{clausula.numero_orden}
              </span>
              <h3 className="text-lg font-semibold text-gray-900">
                {clausula.titulo}
              </h3>
            </div>
            {/* Objetos Regulados (campo interno: etiquetas) */}
            {clausula.etiquetas && clausula.etiquetas.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {clausula.etiquetas.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title={expanded ? 'Contraer' : 'Expandir'}
            >
              <span className="material-icons">
                {expanded ? 'expand_less' : 'expand_more'}
              </span>
            </button>
            <button
              onClick={() => onEdit(clausula)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Editar"
            >
              <span className="material-icons">edit</span>
            </button>
            {permissions.canDeleteClausulas && (
              <button
                onClick={() => onDelete(clausula)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Eliminar"
              >
                <span className="material-icons">delete</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {expanded && (
        <div className="p-4 space-y-4">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Contenido</h4>
            <RichTextContent value={clausula.contenido} className="text-gray-600" />
          </div>

          {/* Stats */}
          <div className="flex gap-4 py-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="material-icons text-lg">task_alt</span>
              <span>{clausula.total_tareas || 0} tarea(s)</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="material-icons text-lg">link</span>
              <span>{clausula.total_relaciones || 0} relación(es)</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t">
            {permissions.canCreateTareas && (
              <button
                onClick={() => onAddTarea(clausula)}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <span className="material-icons text-sm">add_task</span>
                Agregar Obligación
              </button>
            )}
            <button
              onClick={() => onAddRelacion(clausula)}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <span className="material-icons text-sm">link</span>
              Relacionar Cláusula
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
