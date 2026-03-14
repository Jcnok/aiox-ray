import type { Event } from '../stores/eventStore'

export interface CotMilestone {
  milestone: string
  timestamp: string
  order_index: number
  context?: Record<string, any>
}

export interface AdeStep {
  step_name: string
  status: string
  duration_ms?: number
}

export interface ErrorInfo {
  message: string
  stack?: string
  timestamp: string
}

export interface ExecutionDetail {
  execution_id: string
  agent_id: string
  status: 'success' | 'error' | 'running'
  started_at: string
  finished_at?: string
  duration_ms?: number
  input?: Record<string, any>
  output?: Record<string, any>
  error?: ErrorInfo
  cot_milestones?: CotMilestone[]
  ade_steps?: AdeStep[]
  raw_events: Event[]
}

/**
 * Build execution detail from a list of events for one execution_id.
 * Extracts metadata, input/output, errors, CoT milestones, and ADE steps.
 */
export function buildExecutionDetail(events: Event[]): ExecutionDetail {
  if (events.length === 0) {
    return {
      execution_id: '',
      agent_id: '',
      status: 'running',
      started_at: '',
      raw_events: [],
    }
  }

  const executionId = events[0].execution_id
  let agentId = ''
  let status: 'success' | 'error' | 'running' = 'running'
  let startedAt = ''
  let finishedAt: string | undefined
  let durationMs: number | undefined
  let input: Record<string, any> | undefined
  let output: Record<string, any> | undefined
  let errorInfo: ErrorInfo | undefined
  let cotMilestones: CotMilestone[] | undefined
  let adeSteps: AdeStep[] | undefined

  for (const event of events) {
    if (!agentId && event.agent_id) {
      agentId = event.agent_id
    }

    switch (event.event_type) {
      case 'agent.started':
        startedAt = event.timestamp
        if (event.payload?.input) {
          input = event.payload.input
        }
        break

      case 'agent.finished':
        finishedAt = event.timestamp
        durationMs = event.duration_ms
        if (event.payload?.output) {
          output = event.payload.output
        }
        if (event.payload?.status === 'error') {
          status = 'error'
        } else if (event.payload?.status === 'success' && status !== 'error') {
          status = 'success'
        }
        break

      case 'error.occurred':
        status = 'error'
        errorInfo = {
          message: event.payload?.message || event.payload?.error || 'Unknown error',
          stack: event.payload?.stack,
          timestamp: event.timestamp,
        }
        break
    }

    // Extract CoT milestones from any event payload
    if (event.payload?.cot_milestones && Array.isArray(event.payload.cot_milestones)) {
      cotMilestones = (event.payload.cot_milestones as CotMilestone[])
        .slice()
        .sort((a, b) => a.order_index - b.order_index)
    }

    // Extract ADE steps from any event payload
    if (event.payload?.ade_steps && Array.isArray(event.payload.ade_steps)) {
      adeSteps = event.payload.ade_steps as AdeStep[]
    }
  }

  // If no started event, use first event timestamp
  if (!startedAt && events.length > 0) {
    startedAt = events[0].timestamp
  }

  return {
    execution_id: executionId,
    agent_id: agentId,
    status,
    started_at: startedAt,
    finished_at: finishedAt,
    duration_ms: durationMs,
    input,
    output,
    error: errorInfo,
    cot_milestones: cotMilestones,
    ade_steps: adeSteps,
    raw_events: events,
  }
}

/**
 * Format duration for display
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}m`
}

/**
 * Get status color class for Tailwind
 */
export function getStatusColor(status: 'success' | 'error' | 'running'): string {
  switch (status) {
    case 'success': return 'bg-green-500'
    case 'error': return 'bg-red-500'
    case 'running': return 'bg-gray-500'
  }
}

/**
 * Get status text color for Tailwind
 */
export function getStatusTextColor(status: 'success' | 'error' | 'running'): string {
  switch (status) {
    case 'success': return 'text-green-400'
    case 'error': return 'text-red-400'
    case 'running': return 'text-gray-400'
  }
}
