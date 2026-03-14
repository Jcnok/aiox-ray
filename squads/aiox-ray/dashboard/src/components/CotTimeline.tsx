import React from 'react'
import type { CotMilestone } from '../services/executionDetailBuilder'

interface CotTimelineProps {
  milestones: CotMilestone[]
}

/**
 * Displays Chain of Thought milestones in a vertical timeline format
 */
export function CotTimeline({ milestones }: CotTimelineProps) {
  if (milestones.length === 0) {
    return (
      <div className="text-gray-500 text-sm italic" data-testid="cot-empty">
        No Chain of Thought data available for this execution
      </div>
    )
  }

  return (
    <div className="space-y-0" data-testid="cot-timeline">
      {milestones.map((ms, i) => (
        <div key={i} className="flex gap-3" data-testid={`cot-milestone-${i}`}>
          {/* Timeline indicator */}
          <div className="flex flex-col items-center">
            <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-blue-300 flex-shrink-0 mt-1" />
            {i < milestones.length - 1 && (
              <div className="w-0.5 flex-1 bg-gray-600 min-h-[24px]" />
            )}
          </div>

          {/* Content */}
          <div className="pb-4 flex-1 min-w-0">
            <div className="text-sm text-gray-200 font-medium">{ms.milestone}</div>
            <div className="text-xs text-gray-500 mt-0.5">{ms.timestamp}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
