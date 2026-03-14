import React, { useState } from 'react'
import type { ExecutionDetail } from '../services/executionDetailBuilder'
import { formatDuration, getStatusColor, getStatusTextColor } from '../services/executionDetailBuilder'

interface ExecutionMetadataProps {
  detail: ExecutionDetail
}

/**
 * Displays execution metadata: ID, agent, status, duration, timestamps
 */
export function ExecutionMetadata({ detail }: ExecutionMetadataProps) {
  const [copied, setCopied] = useState(false)

  const copyExecutionId = async () => {
    try {
      await navigator.clipboard.writeText(detail.execution_id)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for environments without clipboard API
    }
  }

  return (
    <div className="space-y-2 text-sm" data-testid="execution-metadata">
      {/* Execution ID with copy button */}
      <div className="flex items-center gap-2">
        <span className="text-gray-400 w-24">Execution ID</span>
        <code className="text-gray-200 font-mono text-xs flex-1 truncate">{detail.execution_id}</code>
        <button
          onClick={copyExecutionId}
          className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
          data-testid="copy-execution-id"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {/* Agent ID */}
      <div className="flex items-center gap-2">
        <span className="text-gray-400 w-24">Agent</span>
        <span className="text-gray-200 font-mono text-xs">{detail.agent_id}</span>
      </div>

      {/* Status */}
      <div className="flex items-center gap-2">
        <span className="text-gray-400 w-24">Status</span>
        <span className={`inline-flex items-center gap-1.5 ${getStatusTextColor(detail.status)}`}>
          <span className={`w-2 h-2 rounded-full ${getStatusColor(detail.status)}`} data-testid="status-indicator" />
          {detail.status}
        </span>
      </div>

      {/* Duration */}
      {detail.duration_ms !== undefined && (
        <div className="flex items-center gap-2">
          <span className="text-gray-400 w-24">Duration</span>
          <span className="text-gray-200">{formatDuration(detail.duration_ms)}</span>
        </div>
      )}

      {/* Start time */}
      {detail.started_at && (
        <div className="flex items-center gap-2">
          <span className="text-gray-400 w-24">Started</span>
          <span className="text-gray-200 text-xs">{detail.started_at}</span>
        </div>
      )}

      {/* End time */}
      {detail.finished_at && (
        <div className="flex items-center gap-2">
          <span className="text-gray-400 w-24">Finished</span>
          <span className="text-gray-200 text-xs">{detail.finished_at}</span>
        </div>
      )}
    </div>
  )
}
