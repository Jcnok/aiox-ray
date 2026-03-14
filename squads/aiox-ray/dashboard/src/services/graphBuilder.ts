/**
 * Graph builder service - transforms events into React Flow nodes and edges
 * for DAG visualization of agent calls and skill invocations.
 */

import type { Node, Edge } from '@xyflow/react'

export interface FlowNodeData {
  agent_id: string
  node_type: 'agent' | 'skill'
  total_calls: number
  avg_duration_ms: number
  error_count: number
  error_rate: number
  total_duration_ms: number
  status: 'success' | 'error' | 'mixed'
  label: string
  [key: string]: unknown
}

export interface FlowEdgeData {
  source_agent: string
  target_agent: string
  invocation_count: number
  avg_duration_ms: number
  [key: string]: unknown
}

export interface GraphData {
  nodes: Node<FlowNodeData>[]
  edges: Edge<FlowEdgeData>[]
  agents: string[]
}

interface RawEvent {
  event_id?: string
  event_type?: string
  agent_id?: string
  execution_id?: string
  timestamp?: string
  duration_ms?: number
  payload?: Record<string, unknown>
}

interface AgentStats {
  total_calls: number
  total_duration_ms: number
  error_count: number
  success_count: number
  durations: number[]
}

const EMPTY_GRAPH: GraphData = { nodes: [], edges: [], agents: [] }

/**
 * Determine node type from event_type
 */
function getNodeType(eventType?: string): 'agent' | 'skill' {
  if (eventType === 'skill.executed') return 'skill'
  return 'agent'
}

/**
 * Determine overall status from counts
 */
function determineStatus(errorCount: number, successCount: number): 'success' | 'error' | 'mixed' {
  if (errorCount === 0) return 'success'
  if (successCount === 0) return 'error'
  return 'mixed'
}

/**
 * Get status color CSS class
 */
export function getNodeColor(status: 'success' | 'error' | 'mixed'): string {
  switch (status) {
    case 'success': return 'bg-green-500'
    case 'error': return 'bg-red-500'
    case 'mixed': return 'bg-gray-500'
  }
}

/**
 * Calculate node positions using a simple grid layout
 * Avoids extra dagre dependency — positions nodes in rows
 */
function calculatePositions(nodeCount: number): { x: number; y: number }[] {
  const cols = Math.max(1, Math.ceil(Math.sqrt(nodeCount)))
  const spacingX = 250
  const spacingY = 150

  return Array.from({ length: nodeCount }, (_, i) => ({
    x: (i % cols) * spacingX + 50,
    y: Math.floor(i / cols) * spacingY + 50,
  }))
}

/**
 * Build graph data from raw events
 */
export function buildGraphData(events: RawEvent[]): GraphData {
  if (!events || events.length === 0) return EMPTY_GRAPH

  const agentStats = new Map<string, AgentStats>()
  const nodeTypes = new Map<string, 'agent' | 'skill'>()
  const edgePairs = new Map<string, { count: number; durations: number[] }>()

  // Aggregate stats per agent
  for (const event of events) {
    const agentId = event.agent_id
    if (!agentId) continue

    const stats = agentStats.get(agentId) || {
      total_calls: 0,
      total_duration_ms: 0,
      error_count: 0,
      success_count: 0,
      durations: [],
    }

    stats.total_calls++
    if (event.duration_ms != null) {
      stats.total_duration_ms += event.duration_ms
      stats.durations.push(event.duration_ms)
    }

    const eventStatus = event.payload?.status as string | undefined
    if (eventStatus === 'error' || event.event_type === 'error.occurred') {
      stats.error_count++
    } else {
      stats.success_count++
    }

    agentStats.set(agentId, stats)

    // Track node type
    if (!nodeTypes.has(agentId)) {
      nodeTypes.set(agentId, getNodeType(event.event_type))
    }

    // Build edges from parent_execution_id
    const parentExecId = event.payload?.parent_execution_id as string | undefined
    if (parentExecId) {
      // Find parent agent
      const parentEvent = events.find((e) => e.execution_id === parentExecId)
      if (parentEvent?.agent_id && parentEvent.agent_id !== agentId) {
        const edgeKey = `${parentEvent.agent_id}→${agentId}`
        const edgeStats = edgePairs.get(edgeKey) || { count: 0, durations: [] }
        edgeStats.count++
        if (event.duration_ms != null) {
          edgeStats.durations.push(event.duration_ms)
        }
        edgePairs.set(edgeKey, edgeStats)
      }
    }
  }

  if (agentStats.size === 0) return EMPTY_GRAPH

  // Sort agents for consistent ordering
  const agents = Array.from(agentStats.keys()).sort()
  const positions = calculatePositions(agents.length)

  // Build nodes
  const nodes: Node<FlowNodeData>[] = agents.map((agentId, idx) => {
    const stats = agentStats.get(agentId)!
    const avgDuration = stats.durations.length > 0
      ? Math.round(stats.total_duration_ms / stats.durations.length)
      : 0

    return {
      id: agentId,
      type: 'flowNode',
      position: positions[idx],
      data: {
        agent_id: agentId,
        node_type: nodeTypes.get(agentId) || 'agent',
        total_calls: stats.total_calls,
        avg_duration_ms: avgDuration,
        error_count: stats.error_count,
        error_rate: stats.total_calls > 0 ? stats.error_count / stats.total_calls : 0,
        total_duration_ms: stats.total_duration_ms,
        status: determineStatus(stats.error_count, stats.success_count),
        label: agentId,
      },
    }
  })

  // Build edges
  const edges: Edge<FlowEdgeData>[] = Array.from(edgePairs.entries()).map(
    ([key, stats]) => {
      const [source, target] = key.split('→')
      const avgDuration = stats.durations.length > 0
        ? Math.round(stats.durations.reduce((a, b) => a + b, 0) / stats.durations.length)
        : 0

      return {
        id: `edge-${source}-${target}`,
        source,
        target,
        type: 'flowEdge',
        data: {
          source_agent: source,
          target_agent: target,
          invocation_count: stats.count,
          avg_duration_ms: avgDuration,
        },
      }
    }
  )

  return { nodes, edges, agents }
}
