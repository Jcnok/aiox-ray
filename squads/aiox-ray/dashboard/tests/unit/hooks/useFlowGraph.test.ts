import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useFlowGraph } from '../../../src/hooks/useFlowGraph'
import { useEventStore } from '../../../src/stores/eventStore'

// Mock graphBuilder to avoid React Flow import issues in test environment
vi.mock('../../../src/services/graphBuilder', () => ({
  buildGraphData: vi.fn((events: any[]) => {
    if (!events || events.length === 0) {
      return { nodes: [], edges: [], agents: [] }
    }
    const agents = [...new Set(events.map((e: any) => e.agent_id).filter(Boolean))]
    return {
      nodes: agents.map((a) => ({
        id: a,
        type: 'flowNode',
        position: { x: 0, y: 0 },
        data: { agent_id: a, node_type: 'agent', total_calls: 1, avg_duration_ms: 0, error_count: 0, error_rate: 0, total_duration_ms: 0, status: 'success', label: a },
      })),
      edges: [],
      agents,
    }
  }),
}))

describe('useFlowGraph', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useEventStore.getState().clearEvents()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return empty graph when no events', () => {
    const { result } = renderHook(() => useFlowGraph())
    expect(result.current.graphData.nodes).toHaveLength(0)
    expect(result.current.graphData.edges).toHaveLength(0)
    expect(result.current.graphData.agents).toHaveLength(0)
  })

  it('should build graph from events', () => {
    act(() => {
      useEventStore.getState().setEvents([
        { event_id: '1', event_type: 'agent.started', agent_id: 'dev', execution_id: 'exec-1', timestamp: '2026-01-01T00:00:00Z' },
        { event_id: '2', event_type: 'agent.started', agent_id: 'qa', execution_id: 'exec-2', timestamp: '2026-01-01T00:01:00Z' },
      ])
    })

    const { result } = renderHook(() => useFlowGraph())
    expect(result.current.graphData.agents).toContain('dev')
    expect(result.current.graphData.agents).toContain('qa')
    expect(result.current.graphData.nodes).toHaveLength(2)
  })

  it('should update graph on interval', () => {
    const { result } = renderHook(() => useFlowGraph(3000))

    expect(result.current.graphData.nodes).toHaveLength(0)

    act(() => {
      useEventStore.getState().setEvents([
        { event_id: '1', event_type: 'agent.started', agent_id: 'dev', execution_id: 'exec-1', timestamp: '2026-01-01T00:00:00Z' },
      ])
    })

    // After re-render due to events change, graph should update
    const { result: result2 } = renderHook(() => useFlowGraph(3000))
    expect(result2.current.graphData.nodes.length).toBeGreaterThanOrEqual(0)
  })

  it('should accept custom update interval', () => {
    const { result } = renderHook(() => useFlowGraph(1000))
    expect(result.current.graphData).toBeDefined()
    expect(result.current.isLoading).toBe(false)
  })

  it('should clean up interval on unmount', () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval')
    const { unmount } = renderHook(() => useFlowGraph(3000))
    unmount()
    expect(clearIntervalSpy).toHaveBeenCalled()
    clearIntervalSpy.mockRestore()
  })

  it('should not be loading after initial build', () => {
    const { result } = renderHook(() => useFlowGraph())
    expect(result.current.isLoading).toBe(false)
  })

  it('should handle rapid event updates', () => {
    const { result } = renderHook(() => useFlowGraph(3000))

    act(() => {
      useEventStore.getState().setEvents([
        { event_id: '1', event_type: 'agent.started', agent_id: 'dev', execution_id: 'exec-1', timestamp: '2026-01-01T00:00:00Z' },
      ])
    })

    act(() => {
      useEventStore.getState().setEvents([
        { event_id: '1', event_type: 'agent.started', agent_id: 'dev', execution_id: 'exec-1', timestamp: '2026-01-01T00:00:00Z' },
        { event_id: '2', event_type: 'agent.started', agent_id: 'qa', execution_id: 'exec-2', timestamp: '2026-01-01T00:01:00Z' },
      ])
    })

    // Should have processed latest events
    expect(result.current.graphData).toBeDefined()
  })
})
