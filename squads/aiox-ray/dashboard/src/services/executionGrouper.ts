/**
 * Execution grouping service for organizing executions by agent lanes
 * and for timeline visualization.
 */

import type { Execution } from './timelineCalculator'

export interface ExecutionsByAgent {
  [agent_id: string]: Execution[]
}

/**
 * Group executions by agent_id
 *
 * @param executions - Array of executions to group
 * @returns Object with agent_id keys and execution arrays sorted by start_time
 */
export function groupExecutionsByAgent(executions: Execution[]): ExecutionsByAgent {
  const grouped: ExecutionsByAgent = {}

  executions.forEach((execution) => {
    const agent_id = execution.agent_id || 'unknown'

    if (!grouped[agent_id]) {
      grouped[agent_id] = []
    }

    grouped[agent_id].push(execution)
  })

  // Sort each agent's executions by start_time
  Object.keys(grouped).forEach((agent_id) => {
    grouped[agent_id].sort((a, b) =>
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    )
  })

  return grouped
}

/**
 * Calculate execution position and dimensions for timeline visualization
 *
 * @param execution - Execution record
 * @param timelineStart - Earliest timestamp in timeline
 * @param timelineEnd - Latest timestamp in timeline
 * @param canvasWidth - Available width for timeline (pixels)
 * @returns Object with pixel offset and width
 */
export interface ExecutionPosition {
  offsetPx: number // X offset from timeline start
  widthPx: number // Width proportional to duration
}

export function calculateExecutionPosition(
  execution: Execution,
  timelineStart: string,
  timelineEnd: string,
  canvasWidth: number
): ExecutionPosition {
  const start = new Date(execution.start_time).getTime()
  const end = execution.end_time ? new Date(execution.end_time).getTime() : start + 1000 // 1s min for running
  const timelineStartTime = new Date(timelineStart).getTime()
  const timelineEndTime = new Date(timelineEnd).getTime()

  const totalTime = Math.max(1, timelineEndTime - timelineStartTime) // Avoid division by zero
  const executionStartOffset = Math.max(0, start - timelineStartTime)
  const executionDuration = Math.max(100, end - start) // Minimum 100ms for visibility

  const offsetPx = (executionStartOffset / totalTime) * canvasWidth
  const widthPx = Math.min(canvasWidth - offsetPx, (executionDuration / totalTime) * canvasWidth)

  return {
    offsetPx: Math.round(offsetPx),
    widthPx: Math.round(Math.max(2, widthPx)), // Minimum 2px width
  }
}

/**
 * Get color for execution status
 *
 * @param status - Execution status
 * @returns Tailwind color class
 */
export function getStatusColor(status: 'running' | 'success' | 'error'): string {
  switch (status) {
    case 'success':
      return 'bg-green-600' // #16a34a
    case 'error':
      return 'bg-red-600' // #dc2626
    case 'running':
    default:
      return 'bg-gray-600' // #4b5563
  }
}
