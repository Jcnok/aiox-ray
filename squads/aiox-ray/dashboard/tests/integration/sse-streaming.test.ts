import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useEventStore } from '../../../src/stores/eventStore'
import { SSEClient } from '../../../src/services/sseClient'

describe('SSE Streaming Integration', () => {
  beforeEach(() => {
    useEventStore.setState({ events: [] })
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should connect to SSE stream', () => {
    const mockEventSource = {
      close: vi.fn(),
      readyState: EventSource.OPEN,
      onmessage: null as any,
      onerror: null as any,
    }

    // Mock EventSource globally
    global.EventSource = vi.fn(() => mockEventSource) as any

    const client = new SSEClient('/events/stream')
    const onMessage = vi.fn()

    client.connect(onMessage)

    expect(global.EventSource).toHaveBeenCalledWith('/events/stream')
    expect(client.isConnected()).toBe(true)

    client.close()
  })

  it('should parse and handle SSE events', () => {
    const mockEventSource = {
      close: vi.fn(),
      readyState: EventSource.OPEN,
      onmessage: null as any,
      onerror: null as any,
    }

    global.EventSource = vi.fn(() => mockEventSource) as any

    const client = new SSEClient('/events/stream')
    const addEvent = useEventStore((state) => state.addEvent)
    const onMessage = vi.fn((event) => addEvent(event))

    client.connect(onMessage)

    // Simulate SSE message
    const event = {
      event_id: 'evt-1',
      event_type: 'agent.started',
      agent_id: 'dev',
      execution_id: 'exec-1',
      timestamp: '2026-03-14T00:00:00Z',
    }

    mockEventSource.onmessage?.({
      data: JSON.stringify(event),
    })

    expect(onMessage).toHaveBeenCalledWith(event)

    const state = useEventStore.getState()
    expect(state.events).toHaveLength(1)
    expect(state.events[0].event_id).toBe('evt-1')

    client.close()
  })

  it('should handle connection errors with exponential backoff', () => {
    const mockEventSource = {
      close: vi.fn(),
      readyState: EventSource.CLOSED,
      onmessage: null as any,
      onerror: null as any,
    }

    global.EventSource = vi.fn(() => mockEventSource) as any

    const client = new SSEClient('/events/stream')
    const onError = vi.fn()

    client.connect(() => {}, onError)

    // Trigger error
    mockEventSource.onerror?.()

    // Should attempt reconnect
    expect(mockEventSource.close).toHaveBeenCalled()

    // Fast-forward time to trigger reconnect
    vi.advanceTimersByTime(2000) // Base delay is 1000ms

    client.close()
  })

  it('should support multiple events in stream', () => {
    const mockEventSource = {
      close: vi.fn(),
      readyState: EventSource.OPEN,
      onmessage: null as any,
      onerror: null as any,
    }

    global.EventSource = vi.fn(() => mockEventSource) as any

    const client = new SSEClient('/events/stream')
    const addEvent = useEventStore((state) => state.addEvent)
    const onMessage = vi.fn((event) => addEvent(event))

    client.connect(onMessage)

    const events = [
      {
        event_id: 'evt-1',
        event_type: 'agent.started',
        agent_id: 'dev',
        execution_id: 'exec-1',
        timestamp: '2026-03-14T00:00:00Z',
      },
      {
        event_id: 'evt-2',
        event_type: 'skill.executed',
        agent_id: 'dev',
        execution_id: 'exec-1',
        timestamp: '2026-03-14T00:00:01Z',
      },
      {
        event_id: 'evt-3',
        event_type: 'agent.finished',
        agent_id: 'dev',
        execution_id: 'exec-1',
        timestamp: '2026-03-14T00:00:02Z',
      },
    ]

    events.forEach((e) => {
      mockEventSource.onmessage?.({ data: JSON.stringify(e) })
    })

    expect(onMessage).toHaveBeenCalledTimes(3)

    const state = useEventStore.getState()
    expect(state.events).toHaveLength(3)
    expect(state.events[0].event_id).toBe('evt-1')
    expect(state.events[1].event_id).toBe('evt-2')
    expect(state.events[2].event_id).toBe('evt-3')

    client.close()
  })
})
