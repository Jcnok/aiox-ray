import { describe, it, expect } from 'vitest'
import {
  buildExecutionDetail,
  formatDuration,
  getStatusColor,
  getStatusTextColor,
} from '../../../src/services/executionDetailBuilder'
import type { Event } from '../../../src/stores/eventStore'

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    event_id: 'evt-1',
    event_type: 'agent.started',
    agent_id: 'orchestrator',
    execution_id: 'exec-1',
    timestamp: '2026-03-14T10:00:00Z',
    ...overrides,
  }
}

describe('buildExecutionDetail', () => {
  it('returns empty detail for no events', () => {
    const detail = buildExecutionDetail([])
    expect(detail.execution_id).toBe('')
    expect(detail.agent_id).toBe('')
    expect(detail.status).toBe('running')
    expect(detail.raw_events).toEqual([])
  })

  it('extracts metadata from started/finished events', () => {
    const events: Event[] = [
      makeEvent({ event_type: 'agent.started', timestamp: '2026-03-14T10:00:00Z' }),
      makeEvent({
        event_id: 'evt-2',
        event_type: 'agent.finished',
        timestamp: '2026-03-14T10:00:05Z',
        duration_ms: 5000,
        payload: { status: 'success' },
      }),
    ]
    const detail = buildExecutionDetail(events)
    expect(detail.execution_id).toBe('exec-1')
    expect(detail.agent_id).toBe('orchestrator')
    expect(detail.status).toBe('success')
    expect(detail.started_at).toBe('2026-03-14T10:00:00Z')
    expect(detail.finished_at).toBe('2026-03-14T10:00:05Z')
    expect(detail.duration_ms).toBe(5000)
  })

  it('extracts input from started event payload', () => {
    const events: Event[] = [
      makeEvent({
        event_type: 'agent.started',
        payload: { input: { prompt: 'hello', model: 'gpt-4' } },
      }),
    ]
    const detail = buildExecutionDetail(events)
    expect(detail.input).toEqual({ prompt: 'hello', model: 'gpt-4' })
  })

  it('extracts output from finished event payload', () => {
    const events: Event[] = [
      makeEvent({ event_type: 'agent.started' }),
      makeEvent({
        event_id: 'evt-2',
        event_type: 'agent.finished',
        payload: { status: 'success', output: { result: 'done' } },
      }),
    ]
    const detail = buildExecutionDetail(events)
    expect(detail.output).toEqual({ result: 'done' })
  })

  it('extracts error from error.occurred event', () => {
    const events: Event[] = [
      makeEvent({ event_type: 'agent.started' }),
      makeEvent({
        event_id: 'evt-2',
        event_type: 'error.occurred',
        timestamp: '2026-03-14T10:00:03Z',
        payload: { message: 'Something failed', stack: 'Error: ...\n  at foo.ts:1' },
      }),
    ]
    const detail = buildExecutionDetail(events)
    expect(detail.status).toBe('error')
    expect(detail.error).toEqual({
      message: 'Something failed',
      stack: 'Error: ...\n  at foo.ts:1',
      timestamp: '2026-03-14T10:00:03Z',
    })
  })

  it('handles error.occurred with fallback message', () => {
    const events: Event[] = [
      makeEvent({
        event_type: 'error.occurred',
        payload: { error: 'timeout' },
      }),
    ]
    const detail = buildExecutionDetail(events)
    expect(detail.error?.message).toBe('timeout')
  })

  it('handles error.occurred with unknown error', () => {
    const events: Event[] = [
      makeEvent({
        event_type: 'error.occurred',
        payload: {},
      }),
    ]
    const detail = buildExecutionDetail(events)
    expect(detail.error?.message).toBe('Unknown error')
  })

  it('extracts CoT milestones sorted by order_index', () => {
    const events: Event[] = [
      makeEvent({
        event_type: 'agent.finished',
        payload: {
          status: 'success',
          cot_milestones: [
            { milestone: 'Step 2', timestamp: '2026-03-14T10:00:02Z', order_index: 2 },
            { milestone: 'Step 1', timestamp: '2026-03-14T10:00:01Z', order_index: 1 },
            { milestone: 'Step 3', timestamp: '2026-03-14T10:00:03Z', order_index: 3 },
          ],
        },
      }),
    ]
    const detail = buildExecutionDetail(events)
    expect(detail.cot_milestones).toHaveLength(3)
    expect(detail.cot_milestones![0].milestone).toBe('Step 1')
    expect(detail.cot_milestones![1].milestone).toBe('Step 2')
    expect(detail.cot_milestones![2].milestone).toBe('Step 3')
  })

  it('extracts ADE steps from payload', () => {
    const events: Event[] = [
      makeEvent({
        event_type: 'agent.finished',
        payload: {
          status: 'success',
          ade_steps: [
            { step_name: 'Analyze', status: 'completed', duration_ms: 100 },
            { step_name: 'Execute', status: 'completed', duration_ms: 200 },
          ],
        },
      }),
    ]
    const detail = buildExecutionDetail(events)
    expect(detail.ade_steps).toHaveLength(2)
    expect(detail.ade_steps![0].step_name).toBe('Analyze')
  })

  it('uses first event timestamp when no agent.started event', () => {
    const events: Event[] = [
      makeEvent({
        event_type: 'skill.executed',
        timestamp: '2026-03-14T10:00:05Z',
      }),
    ]
    const detail = buildExecutionDetail(events)
    expect(detail.started_at).toBe('2026-03-14T10:00:05Z')
  })

  it('handles single event with minimal data', () => {
    const events: Event[] = [makeEvent()]
    const detail = buildExecutionDetail(events)
    expect(detail.execution_id).toBe('exec-1')
    expect(detail.agent_id).toBe('orchestrator')
    expect(detail.status).toBe('running')
    expect(detail.raw_events).toHaveLength(1)
  })

  it('preserves error status even if finished event says success', () => {
    const events: Event[] = [
      makeEvent({ event_type: 'agent.started' }),
      makeEvent({
        event_id: 'evt-2',
        event_type: 'error.occurred',
        payload: { message: 'fail' },
      }),
      makeEvent({
        event_id: 'evt-3',
        event_type: 'agent.finished',
        payload: { status: 'success' },
      }),
    ]
    const detail = buildExecutionDetail(events)
    // error.occurred sets status to 'error', finished with 'success' should not override
    // because our logic checks status !== 'error' before applying success
    expect(detail.status).toBe('error')
  })

  it('includes all raw events', () => {
    const events: Event[] = [
      makeEvent({ event_id: 'evt-1' }),
      makeEvent({ event_id: 'evt-2', event_type: 'agent.finished' }),
      makeEvent({ event_id: 'evt-3', event_type: 'skill.executed' }),
    ]
    const detail = buildExecutionDetail(events)
    expect(detail.raw_events).toHaveLength(3)
  })

  it('handles missing payload gracefully', () => {
    const events: Event[] = [
      makeEvent({ event_type: 'agent.started', payload: undefined }),
      makeEvent({ event_id: 'evt-2', event_type: 'agent.finished', payload: undefined }),
    ]
    const detail = buildExecutionDetail(events)
    expect(detail.input).toBeUndefined()
    expect(detail.output).toBeUndefined()
    expect(detail.status).toBe('running')
  })
})

describe('formatDuration', () => {
  it('formats milliseconds', () => {
    expect(formatDuration(500)).toBe('500ms')
  })

  it('formats seconds', () => {
    expect(formatDuration(2500)).toBe('2.5s')
  })

  it('formats minutes', () => {
    expect(formatDuration(90000)).toBe('1.5m')
  })

  it('formats zero', () => {
    expect(formatDuration(0)).toBe('0ms')
  })
})

describe('getStatusColor', () => {
  it('returns green for success', () => {
    expect(getStatusColor('success')).toBe('bg-green-500')
  })

  it('returns red for error', () => {
    expect(getStatusColor('error')).toBe('bg-red-500')
  })

  it('returns gray for running', () => {
    expect(getStatusColor('running')).toBe('bg-gray-500')
  })
})

describe('getStatusTextColor', () => {
  it('returns green text for success', () => {
    expect(getStatusTextColor('success')).toBe('text-green-400')
  })

  it('returns red text for error', () => {
    expect(getStatusTextColor('error')).toBe('text-red-400')
  })

  it('returns gray text for running', () => {
    expect(getStatusTextColor('running')).toBe('text-gray-400')
  })
})
