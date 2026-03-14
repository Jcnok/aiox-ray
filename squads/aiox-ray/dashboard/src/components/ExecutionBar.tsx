import React, { useState } from 'react'
import { calculateExecutionPosition, getStatusColor } from '../services/executionGrouper'
import { TimelineTooltip } from './TimelineTooltip'
import type { Execution } from '../services/timelineCalculator'

interface ExecutionBarProps {
  execution: Execution
  earliestTime: string
  latestTime: string
  canvasWidth: number
}

/**
 * Individual execution bar component
 * Positioned and sized based on execution start time and duration
 * Color-coded by status (green/red/gray)
 * Shows tooltip on hover
 */
export function ExecutionBar({
  execution,
  earliestTime,
  latestTime,
  canvasWidth,
}: ExecutionBarProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  const position = calculateExecutionPosition(execution, earliestTime, latestTime, canvasWidth)
  const statusColor = getStatusColor(execution.status)

  return (
    <>
      <div
        className={`absolute h-8 rounded cursor-pointer transition-opacity hover:opacity-75 ${statusColor}`}
        style={{
          left: `${position.offsetPx}px`,
          width: `${position.widthPx}px`,
          top: '4px',
        }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        title={`${execution.agent_id} - ${execution.execution_id}`}
      >
        {/* Text label if bar is wide enough */}
        {position.widthPx > 80 && (
          <div className="px-1 py-1 text-xs text-white font-mono truncate">
            {execution.agent_id}
          </div>
        )}
      </div>

      {/* Tooltip on hover */}
      {showTooltip && (
        <TimelineTooltip
          execution={execution}
          offsetPx={position.offsetPx}
        />
      )}
    </>
  )
}
