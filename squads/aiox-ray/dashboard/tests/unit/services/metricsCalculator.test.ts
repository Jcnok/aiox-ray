import { describe, it, expect } from 'vitest'
import { calculateMetrics } from '../../../src/services/metricsCalculator'
import { Event } from '../../../src/stores/eventStore'

describe('metricsCalculator', () => {
  it('should handle empty events', () => {
    const metrics = calculateMetrics([])
    expect(metrics.totalExecutions).toBe(0)
    expect(metrics.avgDuration).toBe(0)
    expect(metrics.errorRate).toBe(0)
    expect(Object.keys(metrics.agentCounts).length).toBe(0)
  })

  it('should calculate total executions', () => {
    const events: Event[] = [
      {
        event_id: '1',
        event_type: 'agent.started',
        agent_id: 'dev',
        execution_id: 'exec-1',
        timestamp: '2026-03-14T00:00:00Z',
      },
      {
        event_id: '2',
        event_type: 'agent.started',
        agent_id: 'qa',
        execution_id: 'exec-2',
        timestamp: '2026-03-14T00:00:01Z',
      },
      {
        event_id: '3',
        event_type: 'skill.executed',
        agent_id: 'dev',
        execution_id: 'exec-1',
        timestamp: '2026-03-14T00:00:02Z',
      },
    ]

    const metrics = calculateMetrics(events)
    expect(metrics.totalExecutions).toBe(2)
  })

  it('should calculate average duration', () => {
    const events: Event[] = [
      {
        event_id: '1',
        event_type: 'agent.finished',
        agent_id: 'dev',
        execution_id: 'exec-1',
        timestamp: '2026-03-14T00:00:00Z',
        duration_ms: 1000,
      },
      {
        event_id: '2',
        event_type: 'agent.finished',
        agent_id: 'dev',
        execution_id: 'exec-2',
        timestamp: '2026-03-14T00:00:01Z',
        duration_ms: 3000,
      },
    ]

    const metrics = calculateMetrics(events)
    expect(metrics.avgDuration).toBe(2000)
  })

  it('should calculate error rate', () => {
    const events: Event[] = [
      {
        event_id: '1',
        event_type: 'agent.started',
        agent_id: 'dev',
        execution_id: 'exec-1',
        timestamp: '2026-03-14T00:00:00Z',
      },
      {
        event_id: '2',
        event_type: 'agent.started',
        agent_id: 'dev',
        execution_id: 'exec-2',
        timestamp: '2026-03-14T00:00:01Z',
      },
      {
        event_id: '3',
        event_type: 'error.occurred',
        agent_id: 'dev',
        execution_id: 'exec-1',
        timestamp: '2026-03-14T00:00:02Z',
      },
    ]

    const metrics = calculateMetrics(events)
    expect(metrics.errorRate).toBe(50)
  })

  it('should calculate agent distribution', () => {
    const events: Event[] = [
      {
        event_id: '1',
        event_type: 'agent.started',
        agent_id: 'dev',
        execution_id: 'exec-1',
        timestamp: '2026-03-14T00:00:00Z',
      },
      {
        event_id: '2',
        event_type: 'agent.started',
        agent_id: 'dev',
        execution_id: 'exec-2',
        timestamp: '2026-03-14T00:00:01Z',
      },
      {
        event_id: '3',
        event_type: 'agent.started',
        agent_id: 'qa',
        execution_id: 'exec-3',
        timestamp: '2026-03-14T00:00:02Z',
      },
    ]

    const metrics = calculateMetrics(events)
    expect(metrics.agentCounts['dev']).toBe(2)
    expect(metrics.agentCounts['qa']).toBe(1)
  })

  it('should handle events without duration', () => {
    const events: Event[] = [
      {
        event_id: '1',
        event_type: 'agent.finished',
        agent_id: 'dev',
        execution_id: 'exec-1',
        timestamp: '2026-03-14T00:00:00Z',
        // No duration_ms
      },
    ]

    const metrics = calculateMetrics(events)
    expect(metrics.avgDuration).toBe(0)
  })
})
