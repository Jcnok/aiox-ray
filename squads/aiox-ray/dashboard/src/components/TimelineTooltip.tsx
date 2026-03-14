import React from 'react'
import type { Execution } from '../services/timelineCalculator'

interface TimelineTooltipProps {
  execution: Execution
  offsetPx: number
}

/**
 * Tooltip shown on hover over an execution bar
 * Displays execution details: id, agent, duration, status, event count
 */
export function TimelineTooltip({ execution, offsetPx }: TimelineTooltipProps) {
  const formatDuration = (ms?: number): string => {
    if (ms == null) return 'In progress'
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
  }

  const formatTime = (iso: string): string => {
    const date = new Date(iso)
    return date.toLocaleTimeString()
  }

  const statusLabel: Record<string, string> = {
    success: 'Success',
    error: 'Error',
    running: 'Running',
  }

  return (
    <div
      className="absolute z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-lg p-3 text-xs text-gray-200 pointer-events-none"
      style={{
        left: `${offsetPx}px`,
        top: '-100px',
        minWidth: '200px',
        maxWidth: '300px',
      }}
    >
      <div className="font-semibold text-white mb-1 truncate">
        {execution.execution_id}
      </div>
      <div className="space-y-1">
        <div>
          <span className="text-gray-400">Agent: </span>
          <span className="text-accent">{execution.agent_id}</span>
        </div>
        <div>
          <span className="text-gray-400">Status: </span>
          <span className={
            execution.status === 'success' ? 'text-green-400' :
            execution.status === 'error' ? 'text-red-400' :
            'text-gray-400'
          }>
            {statusLabel[execution.status] || execution.status}
          </span>
        </div>
        <div>
          <span className="text-gray-400">Duration: </span>
          <span>{formatDuration(execution.duration_ms)}</span>
        </div>
        <div>
          <span className="text-gray-400">Start: </span>
          <span>{formatTime(execution.start_time)}</span>
        </div>
        {execution.end_time && (
          <div>
            <span className="text-gray-400">End: </span>
            <span>{formatTime(execution.end_time)}</span>
          </div>
        )}
        <div>
          <span className="text-gray-400">Events: </span>
          <span>{execution.event_count}</span>
        </div>
        {execution.error_message && (
          <div className="text-red-400 mt-1 truncate">
            {execution.error_message}
          </div>
        )}
      </div>
    </div>
  )
}
