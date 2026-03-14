import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTimeline } from '../../../src/hooks/useTimeline'
import { useEventStore } from '../../../src/stores/eventStore'

describe('useTimeline', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useEventStore.getState().clearEvents()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns empty timeline when no events', () => {
    const { result } = renderHook(() => useTimeline())
    expect(result.current.timelineData.total_executions).toBe(0)
    expect(result.current.agents).toHaveLength(0)
    expect(result.current.executions).toHaveLength(0)
  })

  it('calculates timeline from events', () => {
    const now = new Date()
    useEventStore.getState().setEvents([
      {
        event_id: 'evt-1',
        event_type: 'agent.started',
        agent_id: 'agent-a',
        execution_id: 'exec-1',
        timestamp: now.toISOString(),
        duration_ms: 1000,
      },
    ])

    const { result } = renderHook(() => useTimeline())
    expect(result.current.timelineData.total_executions).toBe(1)
    expect(result.current.agents).toContain('agent-a')
  })

  it('uses default 2-second update interval', () => {
    const { result } = renderHook(() => useTimeline())

    const now = new Date()
    act(() => {
      useEventStore.getState().setEvents([
        {
          event_id: 'evt-1',
          event_type: 'agent.started',
          agent_id: 'agent-x',
          execution_id: 'exec-1',
          timestamp: now.toISOString(),
        },
      ])
    })

    // Advance past the 2-second interval
    act(() => {
      vi.advanceTimersByTime(2100)
    })

    expect(result.current.timelineData.total_executions).toBe(1)
  })

  it('accepts custom bucket size', () => {
    const now = new Date()
    useEventStore.getState().setEvents([
      {
        event_id: 'evt-1',
        event_type: 'agent.started',
        agent_id: 'agent-a',
        execution_id: 'exec-1',
        timestamp: now.toISOString(),
      },
    ])

    const { result } = renderHook(() => useTimeline('hour'))
    expect(result.current.timelineData.total_executions).toBe(1)
  })

  it('cleans up interval on unmount', () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval')
    const { unmount } = renderHook(() => useTimeline())
    unmount()
    expect(clearIntervalSpy).toHaveBeenCalled()
    clearIntervalSpy.mockRestore()
  })

  it('handles rapid event updates without errors', () => {
    const { result } = renderHook(() => useTimeline('30min', 1000))
    const now = new Date()

    // Add many events rapidly
    for (let i = 0; i < 100; i++) {
      act(() => {
        useEventStore.getState().addEvent({
          event_id: `evt-${i}`,
          event_type: 'agent.started',
          agent_id: `agent-${i % 5}`,
          execution_id: `exec-${i}`,
          timestamp: new Date(now.getTime() + i * 1000).toISOString(),
        })
      })
    }

    act(() => {
      vi.advanceTimersByTime(1100)
    })

    expect(result.current.timelineData.total_executions).toBe(100)
    expect(result.current.agents.length).toBe(5)
  })
})
