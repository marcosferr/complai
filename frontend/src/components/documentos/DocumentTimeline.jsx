import React, { useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactFlow, { 
  Controls, 
  Background, 
  useNodesState, 
  useEdgesState,
  MarkerType,
  Position
} from 'reactflow'
import 'reactflow/dist/style.css'

// Custom node component for documents
const DocumentNode = ({ data }) => {
  const getStatusColor = (estadoAdenda, esAdenda) => {
    if (!esAdenda) return 'border-green-500 bg-green-50'
    switch (estadoAdenda) {
      case 'VIGENTE':
        return 'border-green-500 bg-green-50'
      case 'REEMPLAZADA':
        return 'border-yellow-500 bg-yellow-50'
      case 'ANULADA':
        return 'border-red-500 bg-red-50'
      default:
        return 'border-gray-300 bg-gray-50'
    }
  }

  const getStatusBadge = (estadoAdenda) => {
    switch (estadoAdenda) {
      case 'VIGENTE':
        return <span className="px-2 py-1 bg-green-500 text-white text-xs rounded-full font-semibold">Vigente</span>
      case 'REEMPLAZADA':
        return <span className="px-2 py-1 bg-yellow-500 text-white text-xs rounded-full font-semibold">Reemplazada</span>
      case 'ANULADA':
        return <span className="px-2 py-1 bg-red-500 text-white text-xs rounded-full font-semibold">Anulada</span>
      default:
        return null
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Fecha no disponible'
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div 
      onClick={data.onClick}
      className={`p-4 rounded-lg border-2 shadow-lg cursor-pointer hover:shadow-xl transition-shadow min-w-[220px] ${
        getStatusColor(data.estado_adenda, data.es_adenda)
      }`}
    >
      <div className="flex flex-col items-center text-center">
        <span className={`material-icons text-4xl mb-2 ${
          data.es_adenda ? 'text-blue-600' : 'text-green-600'
        }`}>
          {data.es_adenda ? 'post_add' : data.documento_padre_info ? 'gavel' : 'description'}
        </span>
        <h3 className="font-semibold text-gray-900 text-sm mb-1">
          {data.titulo}
        </h3>
        <p className="text-xs text-gray-600 mb-1">
          {data.es_adenda ? `Adenda ${data.numero_adenda || ''}` : data.tipo}
        </p>
        <p className="text-xs text-gray-500 mb-2">
          {formatDate(data.fecha_creacion)}
        </p>
        {data.es_adenda && data.estado_adenda && (
          <div className="mt-1">
            {getStatusBadge(data.estado_adenda)}
          </div>
        )}
        {data.isCurrent && (
          <div className="mt-2 px-2 py-1 bg-blue-600 text-white text-xs rounded-full font-semibold">
            Current
          </div>
        )}
      </div>
    </div>
  )
}

const nodeTypes = {
  documentNode: DocumentNode,
}

const DocumentTimeline = ({ document, childDocuments = [] }) => {
  const navigate = useNavigate()

  // Sort all documents (parent, current, addendums) chronologically
  const sortedDocuments = useMemo(() => {
    const docs = []
    
    // Add parent if exists
    if (document.documento_padre_info) {
      docs.push({
        ...document.documento_padre_info,
        fecha_creacion: document.documento_padre_info.fecha_creacion,
        isParent: true
      })
    }
    
    // Add current document
    docs.push({
      ...document,
      isCurrent: true
    })
    
    // Add addendums
    const addendums = childDocuments.filter(doc => doc.es_adenda)
    docs.push(...addendums)
    
    // Sort by creation date
    return docs.sort((a, b) => new Date(a.fecha_creacion) - new Date(b.fecha_creacion))
  }, [document, childDocuments])

  // Build nodes and edges for ReactFlow
  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes = []
    const edges = []
    let xPosition = 0
    const yCenter = 200
    const horizontalSpacing = 350

    // Create nodes for all documents in chronological order
    sortedDocuments.forEach((doc, index) => {
      const nodeId = `doc-${doc.id}`
      
      nodes.push({
        id: nodeId,
        type: 'documentNode',
        position: { x: xPosition, y: yCenter },
        data: {
          ...doc,
          onClick: () => navigate(`/documentos/${doc.id}/view`),
          isCurrent: doc.isCurrent || false
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      })

      // Add edge to next document (showing evolution)
      if (index < sortedDocuments.length - 1) {
        const nextDoc = sortedDocuments[index + 1]
        const nextNodeId = `doc-${nextDoc.id}`
        
        // Determine edge style based on relationship
        let edgeLabel = 'Evoluciona a'
        let edgeColor = '#3b82f6'
        let isAnimated = false
        
        if (nextDoc.es_adenda) {
          edgeLabel = `Adenda ${nextDoc.numero_adenda || ''}`
          isAnimated = nextDoc.estado_adenda === 'VIGENTE'
          edgeColor = nextDoc.estado_adenda === 'VIGENTE' ? '#10b981' : 
                     nextDoc.estado_adenda === 'REEMPLAZADA' ? '#f59e0b' : 
                     '#ef4444'
        }
        
        edges.push({
          id: `edge-${nodeId}-${nextNodeId}`,
          source: nodeId,
          target: nextNodeId,
          type: 'smoothstep',
          animated: isAnimated,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: edgeColor,
          },
          label: edgeLabel,
          labelStyle: { fill: edgeColor, fontWeight: 700, fontSize: 13 },
          labelBgStyle: { fill: '#ffffff', fillOpacity: 0.9 },
          labelBgPadding: [8, 4],
          labelBgBorderRadius: 4,
          style: { 
            stroke: edgeColor,
            strokeWidth: 3 
          },
        })
      }

      xPosition += horizontalSpacing
    })

    return { initialNodes: nodes, initialEdges: edges }
  }, [sortedDocuments, navigate])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  return (
    <div className="w-full h-[600px] bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 relative">
      {/* Header */}
      <div className="absolute top-4 left-4 z-10 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">
          Evolución del Contrato
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {sortedDocuments.length} documento{sortedDocuments.length !== 1 ? 's' : ''} en la línea de tiempo
        </p>
      </div>
      
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.3}
        maxZoom={1.5}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#aaa" gap={16} />
        <Controls />
      </ReactFlow>
      
      {/* Footer Legend */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 px-6 py-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-6 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-gray-700 dark:text-gray-300">Adenda Vigente</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-gray-700 dark:text-gray-300">Adenda Reemplazada</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-gray-700 dark:text-gray-300">Adenda Anulada</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-blue-700"></div>
            <span className="text-gray-700 dark:text-gray-300">Documento Actual</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DocumentTimeline
