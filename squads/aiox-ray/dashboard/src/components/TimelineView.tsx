import React, { useMemo } from 'react'
import { TimeAxis } from './TimeAxis'
import { TimelineGrid } from './TimelineGrid'
import type { TimelineData } from '../services/timelineCalculator'

interface TimelineViewProps {
  timelineData?: TimelineData
  isLoading?: boolean
}

/**
 * Main timeline view container
 * Displays timeline axis on left with gridded execution bars on right
 * Responsive grid layout: full width on desktop, scrollable on mobile
 */
export function TimelineView({ timelineData, isLoading = false }: TimelineViewProps) {
  const hasData = useMemo(
    () => timelineData && timelineData.total_executions > 0,
    [timelineData]
  )

  if (isLoading) {
    return (
      <div className="w-full h-96 bg-gray-900 border border-gray-700 rounded-lg flex items-center justify-center">
        <div className="text-gray-400">Loading timeline...</div>
      </div>
    )
  }

  if (!hasData) {
    return (
      <div className="w-full h-96 bg-gray-900 border border-gray-700 rounded-lg flex items-center justify-center">
        <div className="text-gray-400">No execution data available</div>
      </div>
    )
  }

  return (
    <div className="w-full bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
      {/* Timeline with axis on left, grid on right */}
      <div className="flex h-auto">
        {/* Time axis (fixed left side) */}
        <TimeAxis
          earliestTime={timelineData!.earliest_time}
          latestTime={timelineData!.latest_time}
        />

        {/* Execution grid (scrollable right side) */}
        <TimelineGrid
          timelineData={timelineData!}
          earliestTime={timelineData!.earliest_time}
          latestTime={timelineData!.latest_time}
        />
      </div>
    </div>
  )
}
