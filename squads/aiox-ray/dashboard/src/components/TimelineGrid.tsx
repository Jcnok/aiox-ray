import React, { useRef, useMemo, useState, useEffect } from 'react'
import { ExecutionBar } from './ExecutionBar'
import { groupExecutionsByAgent } from '../services/executionGrouper'
import type { TimelineData } from '../services/timelineCalculator'

interface TimelineGridProps {
  timelineData: TimelineData
  earliestTime: string
  latestTime: string
}

const LANE_HEIGHT = 48
const DEFAULT_CANVAS_WIDTH = 1200
const AGENT_LABEL_WIDTH = 90

/**
 * Grid of execution bars organized by agent lanes
 * One horizontal row per agent (Y-axis), bars positioned by time (X-axis)
 * Supports horizontal scrolling for events beyond viewport
 */
export function TimelineGrid({ timelineData, earliestTime, latestTime }: TimelineGridProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [canvasWidth, setCanvasWidth] = useState(DEFAULT_CANVAS_WIDTH)

  useEffect(() => {
    if (!containerRef.current) return
    const measured = containerRef.current.clientWidth
    if (measured > 0) {
      setCanvasWidth(Math.max(measured, DEFAULT_CANVAS_WIDTH))
    }
  }, [])

  const allExecutions = useMemo(
    () => timelineData.buckets.flatMap((b) => b.executions),
    [timelineData.buckets]
  )

  const executionsByAgent = useMemo(
    () => groupExecutionsByAgent(allExecutions),
    [allExecutions]
  )

  const agents = useMemo(
    () => timelineData.agents,
    [timelineData.agents]
  )

  const totalHeight = agents.length * LANE_HEIGHT

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-x-auto overflow-y-auto"
      style={{ maxHeight: `${Math.min(totalHeight + 40, 600)}px` }}
    >
      <div
        className="relative"
        style={{ width: `${canvasWidth}px`, minHeight: `${totalHeight}px` }}
      >
        {/* Agent lanes */}
        {agents.map((agentId, laneIndex) => (
          <div
            key={agentId}
            className="absolute w-full border-b border-gray-800"
            style={{
              top: `${laneIndex * LANE_HEIGHT}px`,
              height: `${LANE_HEIGHT}px`,
            }}
          >
            {/* Agent label */}
            <div className="absolute left-0 top-0 h-full flex items-center px-2 z-10">
              <span className="text-xs text-gray-500 font-mono truncate max-w-[80px]">
                {agentId}
              </span>
            </div>

            {/* Execution bars for this agent */}
            <div className="absolute left-[90px] right-0 top-0 h-full">
              {(executionsByAgent[agentId] || []).map((execution) => (
                <ExecutionBar
                  key={execution.execution_id}
                  execution={execution}
                  earliestTime={earliestTime}
                  latestTime={latestTime}
                  canvasWidth={canvasWidth - AGENT_LABEL_WIDTH}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Empty state per lane */}
        {agents.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            No agent lanes to display
          </div>
        )}
      </div>
    </div>
  )
}
