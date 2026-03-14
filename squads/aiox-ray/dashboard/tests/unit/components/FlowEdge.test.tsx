import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { FlowEdge } from '../../../src/components/FlowEdge'

// Mock @xyflow/react edge utilities
vi.mock('@xyflow/react', () => ({
  BaseEdge: ({ id, path, style }: any) => (
    <line data-testid={`base-edge-${id}`} style={style} />
  ),
  EdgeLabelRenderer: ({ children }: any) => <div data-testid="edge-label-renderer">{children}</div>,
  getStraightPath: () => ['M0,0 L100,100', 50, 50],
}))

import { vi } from 'vitest'

const baseProps = {
  id: 'edge-dev-qa',
  source: 'dev',
  target: 'qa',
  sourceX: 0,
  sourceY: 0,
  targetX: 100,
  targetY: 100,
  sourcePosition: 'bottom' as any,
  targetPosition: 'top' as any,
  markerEnd: undefined,
  markerStart: undefined,
  interactionWidth: 20,
  sourceHandleId: null,
  targetHandleId: null,
  selected: false,
}

describe('FlowEdge', () => {
  it('should render base edge', () => {
    render(
      <FlowEdge
        {...baseProps}
        data={{
          source_agent: 'dev',
          target_agent: 'qa',
          invocation_count: 3,
          avg_duration_ms: 150,
        }}
      />
    )
    expect(screen.getByTestId('base-edge-edge-dev-qa')).toBeDefined()
  })

  it('should show invocation count label', () => {
    render(
      <FlowEdge
        {...baseProps}
        data={{
          source_agent: 'dev',
          target_agent: 'qa',
          invocation_count: 5,
          avg_duration_ms: 200,
        }}
      />
    )
    expect(screen.getByText('5x')).toBeDefined()
  })

  it('should not show label for zero invocations', () => {
    render(
      <FlowEdge
        {...baseProps}
        data={{
          source_agent: 'dev',
          target_agent: 'qa',
          invocation_count: 0,
          avg_duration_ms: 0,
        }}
      />
    )
    expect(screen.queryByTestId('edge-label-edge-dev-qa')).toBeNull()
  })

  it('should render with white stroke when selected', () => {
    render(
      <FlowEdge
        {...baseProps}
        selected={true}
        data={{
          source_agent: 'dev',
          target_agent: 'qa',
          invocation_count: 1,
          avg_duration_ms: 100,
        }}
      />
    )
    const edge = screen.getByTestId('base-edge-edge-dev-qa')
    expect(edge.style.stroke).toMatch(/#ffffff|rgb\(255,\s*255,\s*255\)/)
  })
})
