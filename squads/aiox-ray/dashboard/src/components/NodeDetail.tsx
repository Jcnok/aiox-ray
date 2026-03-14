import React from 'react'
import type { FlowNodeData } from '../services/graphBuilder'

interface NodeDetailProps {
  data: FlowNodeData
  position: { x: number; y: number }
}

/**
 * Tooltip shown on hover over a flow graph node
 * Displays: agent name, total calls, avg duration, error count, error rate
 */
export function NodeDetail({ data, position }: NodeDetailProps) {
  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
  }

  return (
    <div
      data-testid="node-detail-tooltip"
      className="fixed z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-lg p-3 text-xs text-gray-200 pointer-events-none"
      style={{
        left: `${position.x + 10}px`,
        top: `${position.y + 10}px`,
        minWidth: '180px',
        maxWidth: '280px',
      }}
    >
      <div className="font-semibold text-white mb-2 flex items-center gap-1">
        <span>{data.node_type === 'skill' ? '⚡' : '🤖'}</span>
        <span className="truncate">{data.agent_id}</span>
      </div>
      <div className="space-y-1">
        <div>
          <span className="text-gray-400">Total Calls: </span>
          <span>{data.total_calls}</span>
        </div>
        <div>
          <span className="text-gray-400">Avg Duration: </span>
          <span>{formatDuration(data.avg_duration_ms)}</span>
        </div>
        <div>
          <span className="text-gray-400">Error Count: </span>
          <span className={data.error_count > 0 ? 'text-red-400' : ''}>
            {data.error_count}
          </span>
        </div>
        <div>
          <span className="text-gray-400">Error Rate: </span>
          <span className={data.error_rate > 0.1 ? 'text-red-400' : ''}>
            {(data.error_rate * 100).toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  )
}
