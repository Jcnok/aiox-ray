import React, { useCallback, useMemo, useState } from 'react'
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  useNodesState,
  useEdgesState,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { FlowNode } from './FlowNode'
import { FlowEdge } from './FlowEdge'
import { FlowLegend } from './FlowLegend'
import { NodeDetail } from './NodeDetail'
import type { GraphData, FlowNodeData } from '../services/graphBuilder'

interface FlowGraphProps {
  graphData: GraphData
  onSelectNode?: (nodeId: string) => void
  isLoading?: boolean
}

const nodeTypes = { flowNode: FlowNode as any }
const edgeTypes = { flowEdge: FlowEdge as any }

/**
 * Main flow graph container component
 * Renders interactive DAG of agent calls with pan/zoom/drag
 */
export function FlowGraph({ graphData, onSelectNode, isLoading }: FlowGraphProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(graphData.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(graphData.edges)
  const [hoveredNode, setHoveredNode] = useState<{ data: FlowNodeData; position: { x: number; y: number } } | null>(null)
  const [hiddenAgents, setHiddenAgents] = useState<Set<string>>(new Set())

  // Update nodes/edges when graphData changes
  React.useEffect(() => {
    setNodes(graphData.nodes)
    setEdges(graphData.edges)
  }, [graphData, setNodes, setEdges])

  // Filter nodes by hidden agents
  const visibleNodes = useMemo(
    () => nodes.filter((n) => !hiddenAgents.has(n.id)),
    [nodes, hiddenAgents]
  )

  const visibleEdges = useMemo(
    () => edges.filter((e) => !hiddenAgents.has(e.source) && !hiddenAgents.has(e.target)),
    [edges, hiddenAgents]
  )

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: { id: string }) => {
      onSelectNode?.(node.id)
    },
    [onSelectNode]
  )

  const onNodeMouseEnter = useCallback(
    (event: React.MouseEvent, node: { data: FlowNodeData }) => {
      setHoveredNode({
        data: node.data,
        position: { x: event.clientX, y: event.clientY },
      })
    },
    []
  )

  const onNodeMouseLeave = useCallback(() => {
    setHoveredNode(null)
  }, [])

  const toggleAgent = (agentId: string) => {
    setHiddenAgents((prev) => {
      const next = new Set(prev)
      if (next.has(agentId)) {
        next.delete(agentId)
      } else {
        next.add(agentId)
      }
      return next
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px] text-gray-500">
        Loading flow graph...
      </div>
    )
  }

  if (graphData.nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] text-gray-500">
        No agent data to display
      </div>
    )
  }

  return (
    <div className="relative" data-testid="flow-graph-container">
      {/* Agent filter toggles */}
      {graphData.agents.length > 1 && (
        <div className="flex gap-2 mb-2 flex-wrap" data-testid="agent-filters">
          {graphData.agents.map((agentId) => (
            <button
              key={agentId}
              onClick={() => toggleAgent(agentId)}
              className={`px-2 py-1 text-xs rounded font-mono transition-colors ${
                hiddenAgents.has(agentId)
                  ? 'bg-gray-700 text-gray-500 line-through'
                  : 'bg-gray-600 text-gray-200 hover:bg-gray-500'
              }`}
            >
              {agentId}
            </button>
          ))}
        </div>
      )}

      {/* React Flow Graph */}
      <div className="h-[400px] bg-gray-900 rounded-lg border border-gray-700">
        <ReactFlow
          nodes={visibleNodes}
          edges={visibleEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onNodeMouseEnter={onNodeMouseEnter}
          onNodeMouseLeave={onNodeMouseLeave}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          minZoom={0.3}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Controls className="!bg-gray-800 !border-gray-700" />
          <MiniMap
            className="!bg-gray-800 !border-gray-700"
            nodeColor="#4b5563"
            maskColor="rgba(0,0,0,0.5)"
          />
          <Background color="#374151" gap={20} />
          {/* SVG arrowhead marker */}
          <svg>
            <defs>
              <marker
                id="arrowhead"
                viewBox="0 0 10 10"
                refX="10"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#6b7280" />
              </marker>
            </defs>
          </svg>
        </ReactFlow>

        <FlowLegend />
      </div>

      {/* Node detail tooltip */}
      {hoveredNode && (
        <NodeDetail data={hoveredNode.data} position={hoveredNode.position} />
      )}
    </div>
  )
}
