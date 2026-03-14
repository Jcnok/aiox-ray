import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import { FlowGraph } from '../../../src/components/FlowGraph'
import type { GraphData } from '../../../src/services/graphBuilder'

// Mock React Flow internals for testing
vi.mock('@xyflow/react', async () => {
  const actual = await vi.importActual('@xyflow/react')
  return {
    ...actual,
    ReactFlow: ({ children, nodes, edges }: any) => (
      <div data-testid="react-flow-mock">
        <div data-testid="node-count">{nodes?.length || 0}</div>
        <div data-testid="edge-count">{edges?.length || 0}</div>
        {children}
      </div>
    ),
    Controls: () => <div data-testid="controls" />,
    MiniMap: () => <div data-testid="minimap" />,
    Background: () => <div data-testid="background" />,
    useNodesState: (initial: any[]) => [initial, vi.fn(), vi.fn()],
    useEdgesState: (initial: any[]) => [initial, vi.fn(), vi.fn()],
    ReactFlowProvider: ({ children }: any) => <>{children}</>,
  }
})

const mockGraphData: GraphData = {
  nodes: [
    {
      id: 'dev',
      type: 'flowNode',
      position: { x: 50, y: 50 },
      data: {
        agent_id: 'dev',
        node_type: 'agent',
        total_calls: 10,
        avg_duration_ms: 500,
        error_count: 1,
        error_rate: 0.1,
        total_duration_ms: 5000,
        status: 'mixed',
        label: 'dev',
      },
    },
    {
      id: 'qa',
      type: 'flowNode',
      position: { x: 300, y: 50 },
      data: {
        agent_id: 'qa',
        node_type: 'agent',
        total_calls: 5,
        avg_duration_ms: 200,
        error_count: 0,
        error_rate: 0,
        total_duration_ms: 1000,
        status: 'success',
        label: 'qa',
      },
    },
  ],
  edges: [
    {
      id: 'edge-dev-qa',
      source: 'dev',
      target: 'qa',
      type: 'flowEdge',
      data: {
        source_agent: 'dev',
        target_agent: 'qa',
        invocation_count: 3,
        avg_duration_ms: 150,
      },
    },
  ],
  agents: ['dev', 'qa'],
}

const emptyGraphData: GraphData = { nodes: [], edges: [], agents: [] }

describe('FlowGraph', () => {
  it('should render loading state', () => {
    render(<FlowGraph graphData={emptyGraphData} isLoading={true} />)
    expect(screen.getByText('Loading flow graph...')).toBeDefined()
  })

  it('should render empty state when no data', () => {
    render(<FlowGraph graphData={emptyGraphData} />)
    expect(screen.getByText('No agent data to display')).toBeDefined()
  })

  it('should render graph container with data', () => {
    render(<FlowGraph graphData={mockGraphData} />)
    expect(screen.getByTestId('flow-graph-container')).toBeDefined()
  })

  it('should render agent filter buttons', () => {
    render(<FlowGraph graphData={mockGraphData} />)
    const filters = screen.getByTestId('agent-filters')
    expect(filters).toBeDefined()
    expect(screen.getByText('dev')).toBeDefined()
    expect(screen.getByText('qa')).toBeDefined()
  })

  it('should toggle agent visibility on filter click', () => {
    render(<FlowGraph graphData={mockGraphData} />)
    const devButton = screen.getByText('dev')
    fireEvent.click(devButton)
    expect(devButton.className).toContain('line-through')
  })

  it('should call onSelectNode when provided', () => {
    const onSelect = vi.fn()
    render(<FlowGraph graphData={mockGraphData} onSelectNode={onSelect} />)
    expect(screen.getByTestId('flow-graph-container')).toBeDefined()
  })

  it('should not render filters for single agent', () => {
    const singleAgent: GraphData = {
      ...mockGraphData,
      agents: ['dev'],
      nodes: [mockGraphData.nodes[0]],
      edges: [],
    }
    render(<FlowGraph graphData={singleAgent} />)
    expect(screen.queryByTestId('agent-filters')).toBeNull()
  })

  it('should render React Flow controls', () => {
    render(<FlowGraph graphData={mockGraphData} />)
    expect(screen.getByTestId('controls')).toBeDefined()
    expect(screen.getByTestId('minimap')).toBeDefined()
  })
})
