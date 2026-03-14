import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// Mock @xyflow/react to avoid zustand provider requirement
vi.mock('@xyflow/react', () => ({
  Handle: ({ type, position }: any) => (
    <div data-testid={`handle-${type}`} data-position={position} />
  ),
  Position: { Top: 'top', Bottom: 'bottom', Left: 'left', Right: 'right' },
}))

import { FlowNode } from '../../../src/components/FlowNode'

const baseNodeProps = {
  id: 'dev',
  type: 'flowNode' as const,
  selected: false,
  isConnectable: true,
  zIndex: 0,
  dragging: false,
  positionAbsoluteX: 0,
  positionAbsoluteY: 0,
  sourcePosition: undefined,
  targetPosition: undefined,
}

describe('FlowNode', () => {
  it('should render agent node with correct label', () => {
    render(
      <FlowNode
        {...baseNodeProps}
        data={{
          agent_id: 'dev',
          node_type: 'agent',
          total_calls: 10,
          avg_duration_ms: 500,
          error_count: 0,
          error_rate: 0,
          total_duration_ms: 5000,
          status: 'success',
          label: 'dev',
        }}
      />
    )
    expect(screen.getByText('dev')).toBeDefined()
    expect(screen.getByText('10 calls')).toBeDefined()
  })

  it('should render agent icon for agent nodes', () => {
    render(
      <FlowNode
        {...baseNodeProps}
        data={{
          agent_id: 'dev',
          node_type: 'agent',
          total_calls: 5,
          avg_duration_ms: 200,
          error_count: 0,
          error_rate: 0,
          total_duration_ms: 1000,
          status: 'success',
          label: 'dev',
        }}
      />
    )
    expect(screen.getByText('🤖')).toBeDefined()
  })

  it('should render skill icon for skill nodes', () => {
    render(
      <FlowNode
        {...baseNodeProps}
        data={{
          agent_id: 'commit',
          node_type: 'skill',
          total_calls: 3,
          avg_duration_ms: 100,
          error_count: 0,
          error_rate: 0,
          total_duration_ms: 300,
          status: 'success',
          label: 'commit',
        }}
      />
    )
    expect(screen.getByText('⚡')).toBeDefined()
  })

  it('should apply green color for success status', () => {
    render(
      <FlowNode
        {...baseNodeProps}
        data={{
          agent_id: 'dev',
          node_type: 'agent',
          total_calls: 1,
          avg_duration_ms: 100,
          error_count: 0,
          error_rate: 0,
          total_duration_ms: 100,
          status: 'success',
          label: 'dev',
        }}
      />
    )
    const node = screen.getByTestId('flow-node-dev')
    expect(node.className).toContain('bg-green-500')
  })

  it('should apply red color for error status', () => {
    render(
      <FlowNode
        {...baseNodeProps}
        data={{
          agent_id: 'qa',
          node_type: 'agent',
          total_calls: 1,
          avg_duration_ms: 50,
          error_count: 1,
          error_rate: 1,
          total_duration_ms: 50,
          status: 'error',
          label: 'qa',
        }}
      />
    )
    const node = screen.getByTestId('flow-node-qa')
    expect(node.className).toContain('bg-red-500')
  })

  it('should show selected state with ring', () => {
    render(
      <FlowNode
        {...baseNodeProps}
        selected={true}
        data={{
          agent_id: 'dev',
          node_type: 'agent',
          total_calls: 1,
          avg_duration_ms: 100,
          error_count: 0,
          error_rate: 0,
          total_duration_ms: 100,
          status: 'success',
          label: 'dev',
        }}
      />
    )
    const node = screen.getByTestId('flow-node-dev')
    expect(node.className).toContain('ring-2')
  })

  it('should apply blue border for skill nodes', () => {
    render(
      <FlowNode
        {...baseNodeProps}
        data={{
          agent_id: 'commit',
          node_type: 'skill',
          total_calls: 1,
          avg_duration_ms: 10,
          error_count: 0,
          error_rate: 0,
          total_duration_ms: 10,
          status: 'success',
          label: 'commit',
        }}
      />
    )
    const node = screen.getByTestId('flow-node-commit')
    expect(node.className).toContain('border-blue-400')
  })
})
