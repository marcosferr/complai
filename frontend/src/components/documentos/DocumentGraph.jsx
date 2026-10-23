import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ESTADO_ETAPA_MAP } from '@/lib/estadoEtapaConstants'
import { useDispatch } from 'react-redux'
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  Panel,
  Handle,
  Position,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { saveGraphLayout } from '@/services/documentService'
import { showNotification } from '@/store/slices/uiSlice'

// Custom node styles - now with click handlers
const nodeTypes = {
  document: ({ data }) => {
    // Determine colors based on addendum status
    let bgColor = 'bg-blue-500'
    let borderColor = 'border-blue-700'
    let handleColor = '#3b82f6'
    let badge = null
    
    if (data.es_adenda) {
      switch (data.estado_adenda) {
        case 'VIGENTE':
          bgColor = 'bg-green-600'
          borderColor = 'border-green-800'
          handleColor = '#16a34a'
          badge = <span className="text-xs bg-green-300 text-green-900 px-2 py-0.5 rounded-full font-semibold">Vigente</span>
          break
        case 'REEMPLAZADA':
          bgColor = 'bg-yellow-500'
          borderColor = 'border-yellow-700'
          handleColor = '#eab308'
          badge = <span className="text-xs bg-yellow-200 text-yellow-900 px-2 py-0.5 rounded-full font-semibold">Reemplazada</span>
          break
        case 'ANULADA':
          bgColor = 'bg-red-500'
          borderColor = 'border-red-700'
          handleColor = '#dc2626'
          badge = <span className="text-xs bg-red-200 text-red-900 px-2 py-0.5 rounded-full font-semibold">Anulada</span>
          break
      }
    }
    
    return (
      <div 
        className={`px-6 py-4 shadow-lg rounded-lg ${bgColor} text-white border-2 ${borderColor} cursor-pointer hover:shadow-xl transition-shadow`}
        onClick={data.onClick}
      >
        <Handle type="target" position={Position.Top} style={{ background: handleColor }} />
        <div className="flex items-center gap-2">
          <span className="material-icons text-2xl">{data.es_adenda ? 'post_add' : 'description'}</span>
          <div>
            <div className="font-bold text-lg">{data.label}</div>
            <div className="text-xs opacity-80">
              {data.es_adenda ? `Adenda ${data.numero_adenda || ''}` : data.tipo || 'Documento'}
            </div>
            {badge && <div className="mt-1">{badge}</div>}
          </div>
        </div>
        <Handle type="source" position={Position.Bottom} style={{ background: handleColor }} />
      </div>
    )
  },
  clausula: ({ data }) => (
    <div 
      className="px-4 py-3 shadow-md rounded-lg bg-white border-2 border-purple-400 min-w-[200px] cursor-pointer hover:shadow-lg transition-shadow"
      onClick={data.onClick}
    >
      <Handle type="target" position={Position.Top} style={{ background: '#9333ea' }} />
      <div className="flex items-center gap-2">
        <span className="material-icons text-purple-600">gavel</span>
        <div className="flex-1">
          <div className="font-semibold text-sm text-gray-900">{data.label}</div>
          <div className="text-xs text-gray-500 mt-1">
            {data.totalTareas || 0} tareas • {data.totalRelaciones || 0} relaciones
            {data.hasActiveAmendment && (
              <span className="ml-1 inline-block w-2 h-2 rounded-full bg-green-500" title="Tiene adenda aplicada"></span>
            )}
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: '#9333ea' }} />
      <Handle type="source" position={Position.Right} id="right" style={{ background: '#9333ea' }} />
      <Handle type="target" position={Position.Left} id="left" style={{ background: '#9333ea' }} />
    </div>
  ),
  adenda: ({ data }) => {
    const estadoColors = {
      'APLICADA': { bg: 'bg-green-100', border: 'border-green-500', text: 'text-green-800', handle: '#10b981', label: 'Aplicada' },
      'APLICADA_PARCIALMENTE': { bg: 'bg-yellow-100', border: 'border-yellow-500', text: 'text-yellow-800', handle: '#eab308', label: 'Parcial' },
      'PENDIENTE': { bg: 'bg-gray-100', border: 'border-gray-400', text: 'text-gray-600', handle: '#6b7280', label: 'Pendiente' },
      'RECHAZADA': { bg: 'bg-red-100', border: 'border-red-400', text: 'text-red-600', handle: '#dc2626', label: 'Rechazada' },
    }
    const colorScheme = estadoColors[data.estado] || estadoColors['PENDIENTE']

    return (
      <div className={`px-3 py-2 shadow-sm rounded-md border-2 min-w-[150px] ${colorScheme.bg} ${colorScheme.border} ${colorScheme.text} cursor-pointer hover:shadow-md transition-shadow`}>
        <Handle type="target" position={Position.Top} style={{ background: colorScheme.handle }} />
        <div className="flex items-start gap-2">
          <span className="material-icons text-sm mt-0.5">edit_note</span>
          <div className="flex-1">
            <div className="font-medium text-xs">{colorScheme.label}</div>
            <div className="text-xs opacity-80 mt-1 line-clamp-2">
              {data.motivo || 'Adenda'}
            </div>
          </div>
        </div>
        <Handle type="source" position={Position.Bottom} style={{ background: colorScheme.handle }} />
      </div>
    )
  },
  tarea: ({ data }) => {
    const colorToBorder = {
      yellow: 'bg-yellow-100 border-yellow-400 text-yellow-800',
      blue: 'bg-blue-100 border-blue-400 text-blue-800',
      green: 'bg-green-100 border-green-400 text-green-800',
      red: 'bg-red-100 border-red-400 text-red-800',
      orange: 'bg-orange-100 border-orange-400 text-orange-800',
      purple: 'bg-purple-100 border-purple-400 text-purple-800',
    }
    const estadoInfo = ESTADO_ETAPA_MAP[data.estado_etapa]
    const colorClass = estadoInfo ? (colorToBorder[estadoInfo.color] || 'bg-gray-100 border-gray-400 text-gray-800') : 'bg-gray-100 border-gray-400 text-gray-800'

    return (
      <div 
        className={`px-3 py-2 shadow-sm rounded-md border-2 min-w-[180px] ${colorClass} cursor-pointer hover:shadow-md transition-shadow`}
        onClick={data.onClick}
      >
        <Handle type="target" position={Position.Top} style={{ background: '#6b7280' }} />
        <div className="flex items-start gap-2">
          <span className="material-icons text-sm mt-0.5">assignment_turned_in</span>
          <div className="flex-1">
            <div className="font-medium text-xs">{data.label}</div>
            <div className="text-xs opacity-80 mt-1">
              {data.responsables?.length
                ? `${data.responsables.slice(0, 2).join(', ')}${
                    data.responsables.length > 2
                      ? ` +${data.responsables.length - 2}`
                      : ''
                  }`
                : 'Sin responsables'}
            </div>
            {data.area && (
              <div className="text-[10px] opacity-70 mt-1 flex items-center gap-1">
                <span className="material-icons text-[10px]">apartment</span>
                {data.area}
              </div>
            )}
          </div>
        </div>
        <Handle type="source" position={Position.Bottom} style={{ background: '#6b7280' }} />
      </div>
    )
  },
}

const DocumentGraph = ({ documento, clausulas = [], parentClausulas = [], auxiliaryClausulas = [], onClausulaClick, onTareaClick, onLayoutSaved }) => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [fitViewTrigger, setFitViewTrigger] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [reactFlowInstance, setReactFlowInstance] = useState(null)
  const [pendingViewport, setPendingViewport] = useState(null)
  const [isSavingLayout, setIsSavingLayout] = useState(false)

  // Build the graph structure
  useEffect(() => {
    if (!documento) return

    console.log('📊 Building graph for document:', documento.titulo)
    console.log('📋 Clausulas data:', clausulas)
    console.log('📋 Parent Clausulas data:', parentClausulas)
    console.log('📋 Auxiliary Clausulas data:', auxiliaryClausulas)

    const newNodes = []
    const newEdges = []
    let yPosition = 0
    const xSpacing = 300
    const ySpacing = 150

    const savedLayout = documento.posiciones_grafo || {}
    const savedNodePositions = savedLayout.nodes || {}
    const savedViewport = savedLayout.viewport

    // 0. Add Parent Document Node (if exists)
    if (documento.documento_padre_info) {
      newNodes.push({
        id: `doc-${documento.documento_padre_info.id}`,
        type: 'document',
        position: { x: 400, y: yPosition },
        data: {
          label: documento.documento_padre_info.titulo,
          tipo: documento.documento_padre_info.tipo,
          onClick: () => navigate(`/documentos/${documento.documento_padre_info.id}`),
        },
      })
      
      yPosition += ySpacing + 50
      
      // 0.5 Add Parent Document Clausulas (if exist)
      if (parentClausulas.length > 0) {
        const parentClausulasPerRow = Math.min(parentClausulas.length, 4)
        const parentTotalWidth = (parentClausulasPerRow - 1) * xSpacing
        const parentStartX = 400 - parentTotalWidth / 2
        
        parentClausulas.forEach((clausula, index) => {
          const row = Math.floor(index / parentClausulasPerRow)
          const col = index % parentClausulasPerRow
          const x = parentStartX + col * xSpacing
          const y = yPosition + row * ySpacing
          
          newNodes.push({
            id: `parent-clausula-${clausula.id}`,
            type: 'clausula',
            position: { x, y },
            data: {
              label: `${documento.documento_padre_info.titulo} - ${clausula.titulo}`,
              totalTareas: clausula.tareas?.length || 0,
              totalRelaciones: (clausula.relaciones_salientes?.length || 0) + 
                             (clausula.relaciones_entrantes?.length || 0),
              hasActiveAmendment: clausula.adendas?.some(e => e.estado === 'APLICADA' || e.estado === 'APLICADA_PARCIALMENTE') || false,
              onClick: () => {
                if (onClausulaClick) {
                  onClausulaClick(clausula)
                } else {
                  navigate(`/documentos/${documento.documento_padre_info.id}/view#clausula-${clausula.id}`)
                }
              },
            },
            style: {
              opacity: 0.8, // Slightly transparent to distinguish from current doc clauses
            },
          })
          
          // Edge from parent document to parent clause
          newEdges.push({
            id: `parent-doc-clausula-${clausula.id}`,
            source: `doc-${documento.documento_padre_info.id}`,
            target: `parent-clausula-${clausula.id}`,
            type: 'smoothstep',
            animated: false,
            style: { stroke: '#7c3aed', strokeWidth: 2, strokeDasharray: '3,3' },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: '#7c3aed',
              width: 15,
              height: 15,
            },
          })
        })
        
        // Update yPosition to account for parent clauses
        const parentClausulaRows = Math.ceil(parentClausulas.length / parentClausulasPerRow)
        yPosition += parentClausulaRows * ySpacing + 50
      }
      
      // Add edge from parent to current document
      newEdges.push({
        id: `doc-parent-${documento.documento_padre_info.id}-${documento.id}`,
        source: `doc-${documento.documento_padre_info.id}`,
        target: `doc-${documento.id}`,
        type: 'smoothstep',
        animated: false,
        style: { stroke: '#3b82f6', strokeWidth: 4, strokeDasharray: '5,5' },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#3b82f6',
          width: 25,
          height: 25,
        },
        label: 'referencia',
        labelStyle: { fill: '#3b82f6', fontWeight: 600 },
      })
    }

    // 1. Add Document Node (Root)
    newNodes.push({
      id: `doc-${documento.id}`,
      type: 'document',
      position: { x: 400, y: yPosition },
      data: {
        label: documento.titulo,
        tipo: documento.tipo,
        onClick: () => navigate(`/documentos/${documento.id}/view`),
      },
    })

    yPosition += ySpacing + 50
    
    // 1.5 Add Child Documents (if exist)
    if (documento.documentos_hijos_info && documento.documentos_hijos_info.length > 0) {
      const childY = yPosition
      const childrenCount = documento.documentos_hijos_info.length
      const childSpacing = 350
      const childrenStartX = 400 - ((childrenCount - 1) * childSpacing) / 2
      
      documento.documentos_hijos_info.forEach((hijo, index) => {
        const childX = childrenStartX + index * childSpacing
        
        newNodes.push({
          id: `doc-${hijo.id}`,
          type: 'document',
          position: { x: childX, y: childY },
          data: {
            label: hijo.titulo,
            tipo: hijo.tipo,
            es_adenda: hijo.es_adenda,
            estado_adenda: hijo.estado_adenda,
            numero_adenda: hijo.numero_adenda,
            onClick: () => navigate(`/documentos/${hijo.id}`),
          },
        })
        
        // Add edge from current document to child
        newEdges.push({
          id: `doc-child-${documento.id}-${hijo.id}`,
          source: `doc-${documento.id}`,
          target: `doc-${hijo.id}`,
          type: 'smoothstep',
          animated: false,
          style: { stroke: '#3b82f6', strokeWidth: 4, strokeDasharray: '5,5' },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#3b82f6',
            width: 25,
            height: 25,
          },
          label: 'referenciado por',
          labelStyle: { fill: '#3b82f6', fontWeight: 600 },
        })
      })
      
      yPosition += ySpacing + 50
    }

    // 1.6 Add Auxiliary Documents (if exist)
    if (auxiliaryClausulas && auxiliaryClausulas.length > 0) {
      const auxDocumentsCount = auxiliaryClausulas.length
      const auxSpacing = 400
      const auxStartX = 400 - ((auxDocumentsCount - 1) * auxSpacing) / 2
      let maxAuxY = yPosition
      
      auxiliaryClausulas.forEach((auxDocData, auxIndex) => {
        const auxX = auxStartX + auxIndex * auxSpacing
        const auxY = yPosition
        const auxDocId = auxDocData.documentoId
        const auxDocTitulo = auxDocData.documentoTitulo
        const auxClausulas = auxDocData.clausulas
        
        // Add auxiliary document node
        newNodes.push({
          id: `aux-doc-${auxDocId}`,
          type: 'document',
          position: { x: auxX, y: auxY },
          data: {
            label: auxDocTitulo,
            tipo: 'Auxiliar',
            onClick: () => navigate(`/documentos/${auxDocId}`),
          },
          style: {
            opacity: 0.9,
          },
        })
        
        // Add edge from main document to auxiliary document
        newEdges.push({
          id: `doc-aux-${documento.id}-${auxDocId}`,
          source: `doc-${documento.id}`,
          target: `aux-doc-${auxDocId}`,
          type: 'smoothstep',
          animated: false,
          style: { stroke: '#06b6d4', strokeWidth: 3, strokeDasharray: '8,4' },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#06b6d4',
            width: 20,
            height: 20,
          },
          label: 'auxiliar',
          labelStyle: { fill: '#06b6d4', fontWeight: 600, fontSize: 10 },
        })
        
        // Add clauses from auxiliary document
        if (auxClausulas && auxClausulas.length > 0) {
          const auxClausulasPerRow = Math.min(auxClausulas.length, 3)
          const auxClausulasTotalWidth = (auxClausulasPerRow - 1) * (xSpacing * 0.8)
          const auxClausulasStartX = auxX - auxClausulasTotalWidth / 2
          const auxClausulasY = auxY + ySpacing
          
          auxClausulas.forEach((auxClausula, auxClIndex) => {
            const row = Math.floor(auxClIndex / auxClausulasPerRow)
            const col = auxClIndex % auxClausulasPerRow
            const clausulaX = auxClausulasStartX + col * (xSpacing * 0.8)
            const clausulaY = auxClausulasY + row * (ySpacing * 0.9)
            
            newNodes.push({
              id: `aux-clausula-${auxDocId}-${auxClausula.id}`,
              type: 'clausula',
              position: { x: clausulaX, y: clausulaY },
              data: {
                label: `${auxDocTitulo.substring(0, 15)}... - ${auxClausula.titulo}`,
                totalTareas: auxClausula.tareas?.length || 0,
                totalRelaciones: (auxClausula.relaciones_salientes?.length || 0) + 
                               (auxClausula.relaciones_entrantes?.length || 0),
                hasActiveAmendment: auxClausula.adendas?.some(e => e.estado === 'APLICADA' || e.estado === 'APLICADA_PARCIALMENTE') || false,
                onClick: () => {
                  if (onClausulaClick) {
                    onClausulaClick(auxClausula)
                  } else {
                    navigate(`/documentos/${auxDocId}/view#clausula-${auxClausula.id}`)
                  }
                },
              },
              style: {
                opacity: 0.85,
              },
            })
            
            // Edge from auxiliary document to its clause
            newEdges.push({
              id: `aux-doc-clausula-${auxDocId}-${auxClausula.id}`,
              source: `aux-doc-${auxDocId}`,
              target: `aux-clausula-${auxDocId}-${auxClausula.id}`,
              type: 'smoothstep',
              animated: false,
              style: { stroke: '#06b6d4', strokeWidth: 2, strokeDasharray: '3,3' },
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: '#06b6d4',
                width: 15,
                height: 15,
              },
            })
            
            // Update max Y position
            maxAuxY = Math.max(maxAuxY, clausulaY + ySpacing)
          })
        } else {
          maxAuxY = Math.max(maxAuxY, auxY + ySpacing)
        }
      })
      
      yPosition = maxAuxY
    }

    yPosition += 50

    // 2. Add Clause Nodes
    if (clausulas.length > 0) {
      const clausulasPerRow = Math.min(clausulas.length, 4)
      const totalWidth = (clausulasPerRow - 1) * xSpacing
      const startX = 400 - totalWidth / 2

      clausulas.forEach((clausula, index) => {
        console.log(`📝 Processing clausula ${clausula.id}: ${clausula.titulo}`)
        console.log(`   Adendas:`, clausula.adendas)
        
        const row = Math.floor(index / clausulasPerRow)
        const col = index % clausulasPerRow
        const x = startX + col * xSpacing
        const y = yPosition + row * ySpacing

        const hasActiveAmendment = clausula.adendas?.some(e => e.estado === 'APLICADA' || e.estado === 'APLICADA_PARCIALMENTE') || false
        
        newNodes.push({
          id: `clausula-${clausula.id}`,
          type: 'clausula',
          position: { x, y },
          data: {
            label: clausula.titulo,
            totalTareas: clausula.tareas?.length || 0,
            totalRelaciones: (clausula.relaciones_salientes?.length || 0) + 
                           (clausula.relaciones_entrantes?.length || 0),
            hasActiveAmendment,
            onClick: () => {
              if (onClausulaClick) {
                onClausulaClick(clausula)
              } else {
                navigate(`/documentos/${documento.id}/view#clausula-${clausula.id}`)
              }
            },
          },
        })

        // Edge from document to clause
        newEdges.push({
          id: `doc-clausula-${clausula.id}`,
          source: `doc-${documento.id}`,
          target: `clausula-${clausula.id}`,
          type: 'smoothstep',
          animated: false,
          style: { stroke: '#9333ea', strokeWidth: 3 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#9333ea',
            width: 20,
            height: 20,
          },
        })
        
        console.log(`🔗 Created edge: doc-${documento.id} -> clausula-${clausula.id}`)

        // 3. Add Task Nodes for each clause
        if (clausula.tareas && clausula.tareas.length > 0) {
          const tasksY = y + ySpacing
          const tasksPerClause = clausula.tareas.length
          const taskSpacing = 200
          const tasksStartX = x - ((tasksPerClause - 1) * taskSpacing) / 2

          clausula.tareas.forEach((tarea, tareaIndex) => {
            const taskX = tasksStartX + tareaIndex * taskSpacing
            const taskY = tasksY

            newNodes.push({
              id: `tarea-${tarea.id}`,
              type: 'tarea',
              position: { x: taskX, y: taskY },
              data: {
                label: tarea.titulo,
                estado_etapa: tarea.estado_etapa,
                area: tarea.area_nombre,
                responsables: (tarea.responsables_detalle || []).map(
                  (responsable) => responsable.nombre || responsable.email
                ),
                onClick: () => {
                  if (onTareaClick) {
                    onTareaClick(tarea)
                  }
                },
              },
            })

            // Edge from clause to task
            newEdges.push({
              id: `clausula-tarea-${clausula.id}-${tarea.id}`,
              source: `clausula-${clausula.id}`,
              target: `tarea-${tarea.id}`,
              type: 'smoothstep',
              animated: ['EN_PROGRESO', 'EN_PROGRESO_ANALISTA', 'REVISION_GERENCIAL', 'REVISION_ANALISTA'].includes(tarea.estado_etapa),
              style: {
                stroke: ['VALIDADA', 'APROBADO_AUTORIDAD', 'VALIDADO_GERENTE'].includes(tarea.estado_etapa)
                  ? '#10b981'
                  : ['REQUIERE_ATENCION', 'OBSERVADO_GERENTE', 'OBSERVADO_ANALISTA', 'OBSERVADO_OFICIAL', 'OBSERVADO_AUTORIDAD', 'RECHAZADO_AUTORIDAD'].includes(tarea.estado_etapa)
                  ? '#ef4444'
                  : '#6b7280',
                strokeWidth: 3,
              },
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: ['VALIDADA', 'APROBADO_AUTORIDAD', 'VALIDADO_GERENTE'].includes(tarea.estado_etapa)
                  ? '#10b981'
                  : ['REQUIERE_ATENCION', 'OBSERVADO_GERENTE', 'OBSERVADO_ANALISTA', 'OBSERVADO_OFICIAL', 'OBSERVADO_AUTORIDAD', 'RECHAZADO_AUTORIDAD'].includes(tarea.estado_etapa)
                  ? '#ef4444'
                  : '#6b7280',
                width: 20,
                height: 20,
              },
            })
            
            console.log(`🔗 Created edge: clausula-${clausula.id} -> tarea-${tarea.id}`)
          })
        }
        
        // 3.5. Add Adenda Nodes for each clause
        if (clausula.adendas && clausula.adendas.length > 0) {
          console.log(`✨ Clausula ${clausula.id} tiene ${clausula.adendas.length} adendas`)
          
          const adendasY = y - ySpacing * 0.7 // Position above clause
          const adendasPerClause = clausula.adendas.length
          const adendaSpacing = 180
          const adendasStartX = x - ((adendasPerClause - 1) * adendaSpacing) / 2

          clausula.adendas.forEach((adenda, adendaIndex) => {
            const adendaX = adendasStartX + adendaIndex * adendaSpacing
            const adendaY = adendasY

            console.log(`  📌 Adenda ${adenda.id}: estado=${adenda.estado}, motivo="${adenda.motivo}", pos=(${adendaX}, ${adendaY})`)

            newNodes.push({
              id: `adenda-${adenda.id}`,
              type: 'adenda',
              position: { x: adendaX, y: adendaY },
              data: {
                motivo: adenda.motivo,
                estado: adenda.estado,
              },
            })

            // Edge from adenda to clause
            const isApplied = adenda.estado === 'APLICADA' || adenda.estado === 'APLICADA_PARCIALMENTE'
            newEdges.push({
              id: `adenda-clausula-${adenda.id}-${clausula.id}`,
              source: `adenda-${adenda.id}`,
              target: `clausula-${clausula.id}`,
              type: 'smoothstep',
              animated: isApplied,
              style: { 
                stroke: isApplied ? '#10b981' : '#6b7280',
                strokeWidth: isApplied ? 3 : 2
              },
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: isApplied ? '#10b981' : '#6b7280',
                width: 20,
                height: 20,
              },
            })
            
            console.log(`🔗 Created edge: adenda-${adenda.id} -> clausula-${clausula.id}`)
          })
        }
      })

      // 4. Add edges for clause relationships
      clausulas.forEach((clausula) => {
        if (clausula.relaciones_salientes && clausula.relaciones_salientes.length > 0) {
          clausula.relaciones_salientes.forEach((relacion) => {
            const tipoColors = {
              REFERENCIA: '#3b82f6',
              MODIFICACION: '#f59e0b',
              DEPENDENCIA: '#ef4444',
              COMPLEMENTO: '#10b981',
              EXCEPCION: '#8b5cf6',
            }

            // Check if target is a parent clause, auxiliary clause, or current document clause
            const isParentClause = parentClausulas?.some(pc => pc.id === relacion.clausula_relacionada)
            
            // Check if target is in any auxiliary document
            let isAuxiliaryClause = false
            let auxDocId = null
            if (auxiliaryClausulas && auxiliaryClausulas.length > 0) {
              for (const auxDocData of auxiliaryClausulas) {
                if (auxDocData.clausulas.some(ac => ac.id === relacion.clausula_relacionada)) {
                  isAuxiliaryClause = true
                  auxDocId = auxDocData.documentoId
                  break
                }
              }
            }
            
            const targetId = isParentClause 
              ? `parent-clausula-${relacion.clausula_relacionada}`
              : isAuxiliaryClause
                ? `aux-clausula-${auxDocId}-${relacion.clausula_relacionada}`
                : `clausula-${relacion.clausula_relacionada}`

            newEdges.push({
              id: `relacion-${relacion.id}`,
              source: `clausula-${clausula.id}`,
              target: targetId,
              type: 'smoothstep',
              animated: true,
              style: { 
                stroke: tipoColors[relacion.tipo_relacion] || '#6b7280',
                strokeWidth: 3,
                strokeDasharray: isParentClause || isAuxiliaryClause ? '8 4' : '5 5' // Different dash pattern for cross-document relationships
              },
              label: relacion.tipo_relacion,
              labelStyle: { 
                fill: tipoColors[relacion.tipo_relacion] || '#6b7280',
                fontWeight: 600,
                fontSize: 10
              },
              labelBgStyle: { fill: 'white', fillOpacity: 0.8 },
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: tipoColors[relacion.tipo_relacion] || '#6b7280',
                width: 20,
                height: 20,
              },
            })
            
            console.log(`🔗 Created relation edge: clausula-${clausula.id} -> clausula-${relacion.clausula_relacionada}`)
          })
        }
      })
    }

    console.log('✅ Created nodes:', newNodes.length)
    console.log('✅ Created edges:', newEdges.length)
    console.log('🔗 Edges:', newEdges)

    const nodesWithSavedPositions = newNodes.map((node) => {
      const savedPosition = savedNodePositions[node.id]
      if (savedPosition && typeof savedPosition.x === 'number' && typeof savedPosition.y === 'number') {
        return {
          ...node,
          position: { x: savedPosition.x, y: savedPosition.y },
        }
      }
      return node
    })

    setNodes(nodesWithSavedPositions)
    setEdges(newEdges)

    setPendingViewport(savedViewport || null)
    
    // Trigger fit view after a short delay to ensure layout is ready
    setTimeout(() => setFitViewTrigger(prev => prev + 1), 100)
  }, [documento, clausulas, parentClausulas, auxiliaryClausulas])

  useEffect(() => {
    if (reactFlowInstance && pendingViewport) {
      reactFlowInstance.setViewport(pendingViewport, { duration: 0 })
    }
  }, [reactFlowInstance, pendingViewport])

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  if (!documento) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <span className="material-icons text-6xl mb-4">account_tree</span>
          <p>Selecciona un documento para ver su grafo</p>
        </div>
      </div>
    )
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  const handleSaveLayout = async () => {
    if (!documento?.id || !nodes.length) return

    const layoutPayload = {
      nodes: nodes.reduce((acc, node) => {
        if (node?.id && node?.position) {
          acc[node.id] = {
            x: node.position.x,
            y: node.position.y,
          }
        }
        return acc
      }, {}),
    }

    if (reactFlowInstance) {
      layoutPayload.viewport = reactFlowInstance.getViewport()
    }

    setIsSavingLayout(true)
    try {
      const response = await saveGraphLayout(documento.id, layoutPayload)
      if (onLayoutSaved) {
        onLayoutSaved(response.posiciones_grafo || layoutPayload)
      }
      dispatch(showNotification({ message: 'Posición del grafo guardada', type: 'success' }))
    } catch (error) {
      const message = error.response?.data?.error || 'No se pudo guardar la posición del grafo'
      dispatch(showNotification({ message, type: 'error' }))
    } finally {
      setIsSavingLayout(false)
    }
  }

  return (
    <div 
      style={{ 
        width: '100%', 
        height: isFullscreen ? '100vh' : '600px',
        position: isFullscreen ? 'fixed' : 'relative',
        top: isFullscreen ? 0 : 'auto',
        left: isFullscreen ? 0 : 'auto',
        zIndex: isFullscreen ? 9999 : 'auto'
      }} 
      className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView={!pendingViewport}
        fitViewOptions={{ padding: 0.2, includeHiddenNodes: false }}
        key={fitViewTrigger}
        onInit={setReactFlowInstance}
        defaultViewport={pendingViewport || undefined}
      >
        <Controls />
        <MiniMap 
          nodeColor={(node) => {
            if (node.type === 'document') return '#3b82f6'
            if (node.type === 'clausula') return '#9333ea'
            return '#6b7280'
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
        />
        <Background variant="dots" gap={12} size={1} />
        
        <Panel position="top-left" className="flex gap-2">
          <button
            onClick={toggleFullscreen}
            className="bg-white dark:bg-gray-800 p-2 rounded-lg shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          >
            <span className="material-icons text-gray-700 dark:text-gray-300">
              {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
            </span>
          </button>
          <button
            onClick={handleSaveLayout}
            disabled={isSavingLayout}
            className="bg-primary text-white px-3 py-2 rounded-lg shadow-lg hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors text-sm flex items-center gap-1"
            title="Guardar la posición actual del grafo"
          >
            <span className="material-icons text-base">save</span>
            {isSavingLayout ? 'Guardando…' : 'Guardar posición'}
          </button>
        </Panel>
        
        <Panel position="top-right" className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg">
          <div className="text-sm space-y-2">
            <div className="font-bold text-gray-900 dark:text-white mb-3">Leyenda</div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span className="text-gray-700 dark:text-gray-300">Documento</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-cyan-500 rounded opacity-90"></div>
              <span className="text-gray-700 dark:text-gray-300">Doc. Auxiliar</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-white border-2 border-purple-400 rounded"></div>
              <span className="text-gray-700 dark:text-gray-300">Cláusula</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-100 border-2 border-yellow-400 rounded"></div>
              <span className="text-gray-700 dark:text-gray-300">Tarea</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 border-2 border-green-500 rounded"></div>
              <span className="text-gray-700 dark:text-gray-300">Enmienda Aplicada</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-100 border-2 border-gray-400 rounded"></div>
              <span className="text-gray-700 dark:text-gray-300">Enmienda Pendiente</span>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>
            <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-blue-500"></div>
                <span>Referencia</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-cyan-500"></div>
                <span>Auxiliar</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-orange-500"></div>
                <span>Modificación</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-red-500"></div>
                <span>Dependencia</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-green-500"></div>
                <span>Complemento</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-purple-500"></div>
                <span>Excepción</span>
              </div>
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  )
}

export default DocumentGraph
