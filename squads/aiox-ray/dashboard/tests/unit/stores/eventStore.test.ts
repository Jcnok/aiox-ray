import { describe, it, expect, beforeEach } from 'vitest'
import { useEventStore } from '../../../src/stores/eventStore'

describe('eventStore', () => {
  beforeEach(() => {
    useEventStore.setState({ events: [] })
  })

  it('should initialize with empty events', () => {
    const { events } = useEventStore.getState()
    expect(events).toEqual([])
  })

  it('should add single event', () => {
    const { addEvent } = useEventStore.getState()
    const event = {
      event_id: '1',
      event_type: 'agent.started',
      agent_id: 'dev',
      execution_id: 'exec-1',
      timestamp: '2026-03-14T00:00:00Z',
    }

    addEvent(event)
    const { events } = useEventStore.getState()

    expect(events).toHaveLength(1)
    expect(events[0]).toEqual(event)
  })

  it('should add multiple events in order', () => {
    const { addEvent } = useEventStore.getState()
    const events = [
      {
        event_id: '1',
        event_type: 'agent.started',
        agent_id: 'dev',
        execution_id: 'exec-1',
        timestamp: '2026-03-14T00:00:00Z',
      },
      {
        event_id: '2',
        event_type: 'agent.finished',
        agent_id: 'dev',
        execution_id: 'exec-1',
        timestamp: '2026-03-14T00:00:01Z',
      },
    ]

    events.forEach((e) => addEvent(e))
    const state = useEventStore.getState()

    expect(state.events).toHaveLength(2)
    expect(state.events[0].event_id).toBe('1')
    expect(state.events[1].event_id).toBe('2')
  })

  it('should set events (replace all)', () => {
    const { addEvent, setEvents } = useEventStore.getState()

    // Add initial event
    addEvent({
      event_id: '1',
      event_type: 'agent.started',
      agent_id: 'dev',
      execution_id: 'exec-1',
      timestamp: '2026-03-14T00:00:00Z',
    })

    // Replace with new events
    const newEvents = [
      {
        event_id: '10',
        event_type: 'agent.started',
        agent_id: 'qa',
        execution_id: 'exec-2',
        timestamp: '2026-03-14T00:01:00Z',
      },
    ]

    setEvents(newEvents)
    const state = useEventStore.getState()

    expect(state.events).toHaveLength(1)
    expect(state.events[0].event_id).toBe('10')
  })

  it('should clear all events', () => {
    const { addEvent, clearEvents } = useEventStore.getState()

    // Add events
    addEvent({
      event_id: '1',
      event_type: 'agent.started',
      agent_id: 'dev',
      execution_id: 'exec-1',
      timestamp: '2026-03-14T00:00:00Z',
    })

    // Clear
    clearEvents()
    const state = useEventStore.getState()

    expect(state.events).toEqual([])
  })

  it('should filter events by execution_id', () => {
    const { addEvent, getEventsByExecutionId } = useEventStore.getState()

    const events = [
      {
        event_id: '1',
        event_type: 'agent.started',
        agent_id: 'dev',
        execution_id: 'exec-1',
        timestamp: '2026-03-14T00:00:00Z',
      },
      {
        event_id: '2',
        event_type: 'skill.executed',
        agent_id: 'dev',
        execution_id: 'exec-1',
        timestamp: '2026-03-14T00:00:01Z',
      },
      {
        event_id: '3',
        event_type: 'agent.started',
        agent_id: 'qa',
        execution_id: 'exec-2',
        timestamp: '2026-03-14T00:00:02Z',
      },
    ]

    events.forEach((e) => addEvent(e))

    const filtered = getEventsByExecutionId('exec-1')

    expect(filtered).toHaveLength(2)
    expect(filtered[0].event_id).toBe('1')
    expect(filtered[1].event_id).toBe('2')
  })
})
