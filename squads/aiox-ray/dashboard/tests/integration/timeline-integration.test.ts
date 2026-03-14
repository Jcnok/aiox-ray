import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTimeline } from '../../src/hooks/useTimeline'
import { useEventStore } from '../../src/stores/eventStore'

describe('Timeline Integration', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useEventStore.getState().clearEvents()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('timeline updates when events are added to eventStore', () => {
    const { result } = renderHook(() => useTimeline('30min', 1000))

    expect(result.current.timelineData.total_executions).toBe(0)

    const now = new Date()
    act(() => {
      useEventStore.getState().addEvent({
        event_id: 'evt-1',
        event_type: 'agent.started',
        agent_id: 'dev-agent',
        execution_id: 'exec-1',
        timestamp: now.toISOString(),
        duration_ms: 500,
      })
    })

    act(() => {
      vi.advanceTimersByTime(1100)
    })

    expect(result.current.timelineData.total_executions).toBe(1)
    expect(result.current.agents).toContain('dev-agent')
  })

  it('real-time update cycle works with 2-second interval', () => {
    const { result } = renderHook(() => useTimeline('30min', 2000))

    const now = new Date()

    // Add first event
    act(() => {
      useEventStore.getState().addEvent({
        event_id: 'evt-1',
        event_type: 'agent.started',
        agent_id: 'agent-a',
        execution_id: 'exec-1',
        timestamp: now.toISOString(),
      })
    })

    act(() => {
      vi.advanceTimersByTime(2100)
    })

    expect(result.current.timelineData.total_executions).toBe(1)

    // Add second event
    act(() => {
      useEventStore.getState().addEvent({
        event_id: 'evt-2',
        event_type: 'agent.started',
        agent_id: 'agent-b',
        execution_id: 'exec-2',
        timestamp: new Date(now.getTime() + 5000).toISOString(),
      })
    })

    act(() => {
      vi.advanceTimersByTime(2100)
    })

    expect(result.current.timelineData.total_executions).toBe(2)
    expect(result.current.agents).toContain('agent-a')
    expect(result.current.agents).toContain('agent-b')
  })

  it('shares eventStore with metrics (no data duplication)', () => {
    const now = new Date()

    act(() => {
      useEventStore.getState().addEvent({
        event_id: 'evt-1',
        event_type: 'agent.started',
        agent_id: 'shared-agent',
        execution_id: 'exec-1',
        timestamp: now.toISOString(),
      })
    })

    // Both hooks read from the same store
    const storeEvents = useEventStore.getState().events
    expect(storeEvents).toHaveLength(1)

    const { result } = renderHook(() => useTimeline())
    expect(result.current.timelineData.total_executions).toBe(1)
  })

  it('handles large event volume (<5000 events)', () => {
    const now = new Date()
    const events = Array.from({ length: 1000 }, (_, i) => ({
      event_id: `evt-${i}`,
      event_type: 'agent.started',
      agent_id: `agent-${i % 10}`,
      execution_id: `exec-${i}`,
      timestamp: new Date(now.getTime() + i * 100).toISOString(),
      duration_ms: 50 + Math.random() * 1000,
    }))

    act(() => {
      useEventStore.getState().setEvents(events)
    })

    const { result } = renderHook(() => useTimeline())
    expect(result.current.timelineData.total_executions).toBe(1000)
    expect(result.current.agents).toHaveLength(10)
  })
})
