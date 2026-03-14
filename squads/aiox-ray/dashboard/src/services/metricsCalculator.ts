import { Event } from '../stores/eventStore'

export interface Metrics {
  totalExecutions: number
  avgDuration: number
  errorRate: number
  agentCounts: Record<string, number>
}

/**
 * Calculate metrics from a list of events
 */
export function calculateMetrics(events: Event[]): Metrics {
  if (!events || events.length === 0) {
    return {
      totalExecutions: 0,
      avgDuration: 0,
      errorRate: 0,
      agentCounts: {},
    }
  }

  // Total Executions: Count agent.started events
  const startedEvents = events.filter((e) => e.event_type === 'agent.started')
  const totalExecutions = startedEvents.length

  // Avg Duration: Average duration_ms from agent.finished events
  const finishedEvents = events.filter((e) => e.event_type === 'agent.finished' && e.duration_ms)
  const avgDuration =
    finishedEvents.length > 0
      ? finishedEvents.reduce((sum, e) => sum + (e.duration_ms || 0), 0) / finishedEvents.length
      : 0

  // Error Rate: Count error.occurred / total executions × 100
  const errorEvents = events.filter((e) => e.event_type === 'error.occurred')
  const errorRate = totalExecutions > 0 ? (errorEvents.length / totalExecutions) * 100 : 0

  // Agent Distribution: Group by agent_id
  const agentCounts: Record<string, number> = {}
  startedEvents.forEach((e) => {
    if (e.agent_id) {
      agentCounts[e.agent_id] = (agentCounts[e.agent_id] || 0) + 1
    }
  })

  return {
    totalExecutions,
    avgDuration,
    errorRate,
    agentCounts,
  }
}
