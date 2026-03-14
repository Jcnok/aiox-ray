import { describe, it, expect } from 'vitest'
import {
  calculateTimeline,
  type Execution,
  type TimelineData,
} from '../../../src/services/timelineCalculator'

describe('timelineCalculator', () => {
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString()
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()

  it('handles empty events array', () => {
    const result = calculateTimeline([])
    expect(result.buckets).toHaveLength(0)
    expect(result.agents).toHaveLength(0)
    expect(result.total_executions).toBe(0)
  })

  it('converts raw events to executions with calculated duration', () => {
    const events = [
      {
        execution_id: 'exec-1',
        agent_id: 'agent-a',
        start_time: twoHoursAgo,
        end_time: oneHourAgo,
        status: 'success',
        event_count: 5,
      },
    ]

    const result = calculateTimeline(events, '30min')
    expect(result.total_executions).toBe(1)
    expect(result.buckets).toHaveLength(1) // One event → one bucket by start_time
    expect(result.agents).toContain('agent-a')
  })

  it('groups executions into time buckets', () => {
    const now = new Date()
    const t1 = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString() // 2h ago
    const t2 = new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString() // 1h ago
    const t3 = now.toISOString()

    const events = [
      {
        execution_id: 'exec-1',
        agent_id: 'agent-a',
        start_time: t1,
        end_time: t1,
        status: 'success',
        event_count: 1,
      },
      {
        execution_id: 'exec-2',
        agent_id: 'agent-a',
        start_time: t2,
        end_time: t2,
        status: 'success',
        event_count: 1,
      },
      {
        execution_id: 'exec-3',
        agent_id: 'agent-a',
        start_time: t3,
        end_time: t3,
        status: 'success',
        event_count: 1,
      },
    ]

    const result = calculateTimeline(events, 'hour')
    expect(result.total_executions).toBe(3)
    expect(result.buckets.length).toBeGreaterThanOrEqual(1)
  })

  it('handles running executions without end_time', () => {
    const events = [
      {
        execution_id: 'exec-running',
        agent_id: 'agent-b',
        start_time: oneHourAgo,
        status: 'running',
        event_count: 3,
      },
    ]

    const result = calculateTimeline(events)
    const executions = result.buckets.flatMap((b) => b.executions)
    expect(executions[0].status).toBe('running')
    expect(executions[0].duration_ms).toBeUndefined()
  })

  it('handles error executions', () => {
    const events = [
      {
        execution_id: 'exec-error',
        agent_id: 'agent-c',
        start_time: oneHourAgo,
        end_time: now.toISOString(),
        status: 'error',
        error_message: 'Timeout',
        event_count: 2,
      },
    ]

    const result = calculateTimeline(events)
    const executions = result.buckets.flatMap((b) => b.executions)
    expect(executions[0].status).toBe('error')
    expect(executions[0].error_message).toBe('Timeout')
  })

  it('collects and sorts unique agents', () => {
    const events = [
      {
        execution_id: 'exec-1',
        agent_id: 'zulu-agent',
        start_time: oneHourAgo,
        event_count: 1,
      },
      {
        execution_id: 'exec-2',
        agent_id: 'alpha-agent',
        start_time: oneHourAgo,
        event_count: 1,
      },
      {
        execution_id: 'exec-3',
        agent_id: 'beta-agent',
        start_time: oneHourAgo,
        event_count: 1,
      },
    ]

    const result = calculateTimeline(events)
    expect(result.agents).toEqual(['alpha-agent', 'beta-agent', 'zulu-agent'])
  })

  it('calculates correct earliest and latest times', () => {
    const earliest = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString()
    const latest = new Date(now.getTime() + 60 * 60 * 1000).toISOString()

    const events = [
      {
        execution_id: 'exec-1',
        agent_id: 'agent-a',
        start_time: earliest,
        end_time: oneHourAgo,
        event_count: 1,
      },
      {
        execution_id: 'exec-2',
        agent_id: 'agent-a',
        start_time: oneHourAgo,
        end_time: latest,
        event_count: 1,
      },
    ]

    const result = calculateTimeline(events)
    expect(new Date(result.earliest_time).getTime()).toBeLessThanOrEqual(
      new Date(earliest).getTime()
    )
    expect(new Date(result.latest_time).getTime()).toBeGreaterThanOrEqual(
      new Date(latest).getTime()
    )
  })

  it('sorts executions within buckets by start_time', () => {
    // Use a fixed base in same 30-min window to guarantee same bucket
    const base = new Date('2026-03-14T10:05:00.000Z')
    const t1 = new Date(base.getTime()).toISOString()                  // 10:05
    const t2 = new Date(base.getTime() + 5 * 60 * 1000).toISOString() // 10:10
    const t3 = new Date(base.getTime() + 10 * 60 * 1000).toISOString() // 10:15

    const events = [
      { execution_id: 'exec-3', agent_id: 'agent-a', start_time: t3, event_count: 1 },
      { execution_id: 'exec-1', agent_id: 'agent-a', start_time: t1, event_count: 1 },
      { execution_id: 'exec-2', agent_id: 'agent-a', start_time: t2, event_count: 1 },
    ]

    const result = calculateTimeline(events, '30min')
    // All three should be in the same bucket (10:00-10:30)
    expect(result.buckets).toHaveLength(1)
    const bucket = result.buckets[0]
    expect(bucket.executions[0].execution_id).toBe('exec-1')
    expect(bucket.executions[1].execution_id).toBe('exec-2')
    expect(bucket.executions[2].execution_id).toBe('exec-3')
  })

  it('filters out events without timestamps', () => {
    const events = [
      { execution_id: 'exec-1', agent_id: 'agent-a', start_time: oneHourAgo, event_count: 1 },
      { execution_id: 'exec-2', agent_id: 'agent-a', event_count: 1 }, // Missing timestamp
    ]

    const result = calculateTimeline(events)
    expect(result.total_executions).toBe(1)
  })
})
